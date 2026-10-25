import {
    APIGatewayProxyEventV2WithLambdaAuthorizer,
    APIGatewayProxyResultV2,
    Handler,
} from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    GetCommand,
    UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import type { UnpublishedOnSave } from '@quizaroni/shared-types';
import { AuthorizerContext } from 'models/auth';
import { Card } from 'models/studysets';
import { removeKeys } from 'resources/dynamo/utilities';
import {
    collectCardFileKeys,
    copyCardFiles,
    isKeyInStudyset,
    isPlainObject,
    isUUID,
    studysetUUIDOfKey,
} from 'utilities/cardFiles';
import { logRequest } from 'utilities/logging';
import { cardsGateError, UNPUBLISH_EXPRESSION } from 'utilities/publishStudyset';
import {
    callerOwnsStudyset,
    collectCallerStoredCardFileKeys,
    isRealStudysetItem,
} from 'utilities/studysets';

const { mainBucket = '', mainTable = '' } = process.env;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const s3Client = new S3Client({});

type RequestBody = {
    studysetUUID: string;
    updates: { [key: string]: any };
    isMetadataUpdate?: boolean;
};

type BuildUpdateExpressionParams = {
    updates: { [key: string]: any };
    isMetadataUpdate: boolean;
    updatedAt: string;
    updatedBy?: string;
    unpublish?: boolean;
};

const SERVER_OWNED_FIELDS = new Set([
    'subject',
    'publishedAt',
    'moderation',
    'PK2',
    'SK2',
    'studysetUUID',
    'userUUID',
    'createdAt',
    'copiedFrom',
    'username',
]);
const SERVER_OWNED_METADATA_FIELDS = new Set(['publiclyViewable']);

const respond = (statusCode: number, message: string) => ({
    statusCode,
    body: JSON.stringify({ message }),
});

class RequestError extends Error {
    constructor(readonly statusCode: number, message: string) {
        super(message);
    }
}

/**
 * Builds the DynamoDB UpdateExpression for a studyset update.
 *
 * Regression test: `updatedAt`/`updatedBy` are always server-set here, but
 * callers that spread a previously-fetched studyset into `updates` (see
 * apps/web CreateSet.tsx's saveChanges()) carry the studyset's existing
 * values for both. Left in, that produced two SET clauses for the same
 * #updatedAt/#updatedBy attribute paths, which DynamoDB rejects outright —
 * every save of an existing studyset 500'd, and the frontend's `validate()`
 * helper doesn't check response.ok, so the error was swallowed and shown to
 * the user as a successful save. This strips both from the caller-supplied
 * `updates` before building the expression.
 *
 * Publication fields (`subject`, `publishedAt`, `PK2`/`SK2`,
 * `metadata.publiclyViewable`) and `moderation` are owned by publish,
 * unpublish and the takedown script, so they are silently stripped here, as
 * are the identity fields createStudyset writes (#188) and `username`, the
 * author name a public set shows, which only server paths write (#193). A
 * top-level `metadata` object (CreateSet's full save) is merged per key
 * rather than replacing the map, so it can't reset `publiclyViewable`.
 * Client keys never become placeholder names (they get `#key<N>`/`:value<N>`),
 * so a key like `metadataKey0` can't redirect another clause to a server-owned
 * field (#193).
 * `updatedBy` is skipped when the token has no username (#180).
 * `unpublish` adds the unpublish clauses, for a save that drops a published
 * set below the publish gate (#170).
 */
export const buildUpdateExpression = ({
    updates,
    isMetadataUpdate,
    updatedAt,
    updatedBy,
    unpublish = false,
}: BuildUpdateExpressionParams) => {
    const topLevelUpdates = { updatedAt, updatedBy };

    const updateExpressions: string[] = [];
    const ExpressionAttributeNames: Record<string, string> = {};
    const ExpressionAttributeValues: Record<string, any> = {};

    // Handle top-level updates for `updatedAt` and `updatedBy`
    for (const [key, value] of Object.entries(topLevelUpdates)) {
        if (!value) continue;
        const attributeKey = `#${key}`;
        const attributeValue = `:${key}`;
        updateExpressions.push(`${attributeKey} = ${attributeValue}`);
        ExpressionAttributeNames[attributeKey] = key;
        ExpressionAttributeValues[attributeValue] = value;
    }

    const {
        updatedAt: _ignoredUpdatedAt,
        updatedBy: _ignoredUpdatedBy,
        ...clientUpdates
    } = updates;

    let clientKeyCount = 0;
    const setClientKey = (key: string, value: unknown, inMetadata: boolean) => {
        const index = clientKeyCount++;
        updateExpressions.push(`${inMetadata ? '#metadata.' : ''}#key${index} = :value${index}`);
        ExpressionAttributeNames[`#key${index}`] = key;
        ExpressionAttributeValues[`:value${index}`] = value;
    };

    for (const [key, value] of Object.entries(clientUpdates)) {
        if (isMetadataUpdate) {
            if (SERVER_OWNED_METADATA_FIELDS.has(key)) continue;
            setClientKey(key, value, true);
        } else if (key === 'metadata') {
            if (!isPlainObject(value)) continue;
            for (const [metadataKey, metadataValue] of Object.entries(value)) {
                if (!SERVER_OWNED_METADATA_FIELDS.has(metadataKey)) {
                    setClientKey(metadataKey, metadataValue, true);
                }
            }
        } else if (!SERVER_OWNED_FIELDS.has(key)) {
            setClientKey(key, value, false);
        }
    }

    if (unpublish) {
        updateExpressions.push(...UNPUBLISH_EXPRESSION.set);
        Object.assign(ExpressionAttributeNames, UNPUBLISH_EXPRESSION.names);
        Object.assign(ExpressionAttributeValues, UNPUBLISH_EXPRESSION.values);
    }

    // An unused name makes DynamoDB reject the whole update.
    if (updateExpressions.some((expression) => expression.startsWith('#metadata.'))) {
        ExpressionAttributeNames['#metadata'] = 'metadata';
    }

    const UpdateExpression = `SET ${updateExpressions.join(', ')}${
        unpublish ? ` ${UNPUBLISH_EXPRESSION.remove}` : ''
    }`;

    return { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues };
};

type CardFilePlan = { cards: Card[]; removed: string[]; published: boolean };

/**
 * A save may store the set's own card file keys, keys the set already stores
 * (pre-#126 duplicates until the #189 migration re-keys them), and keys from
 * the caller's other sets, which are copied into this one (Combine). Anything
 * else is rejected before any write.
 */
const planCardFiles = async ({
    cards,
    studysetUUID,
    userUUID,
}: {
    cards: unknown;
    studysetUUID: string;
    userUUID: string;
}): Promise<CardFilePlan> => {
    const incoming = collectCardFileKeys(cards);
    if (incoming.malformed) throw new RequestError(400, 'Invalid cards');

    const { Item } = await docClient.send(
        new GetCommand({
            Key: { PK: `userUUID#${userUUID}`, SK: `studyset#${studysetUUID}` },
            TableName: mainTable,
            ConsistentRead: true,
        })
    );
    if (!isRealStudysetItem(Item, studysetUUID)) {
        throw new RequestError(404, 'Study set not found');
    }
    const stored = collectCardFileKeys(Item?.cards).keys;

    const toCopy = new Set(
        [...incoming.keys].filter(
            (key) => !isKeyInStudyset(key, studysetUUID) && !stored.has(key)
        )
    );

    let finalCards = cards as Card[];
    if (toCopy.size > 0) {
        const setOfKey = new Map(
            [...toCopy].map((key) => [key, studysetUUIDOfKey(key)])
        );
        const sourceSets = new Set<string>();
        for (const id of setOfKey.values()) {
            if (!id) throw new RequestError(400, 'Invalid file key');
            sourceSets.add(id);
        }

        const owned = new Set<string>();
        await Promise.all(
            [...sourceSets].map(async (id) => {
                const isOwned = await callerOwnsStudyset({
                    docClient,
                    mainTable,
                    studysetUUID: id,
                    userUUID,
                });
                if (isOwned) owned.add(id);
            })
        );
        const unowned = [...toCopy].filter(
            (key) => !owned.has(setOfKey.get(key) as string)
        );
        if (unowned.length > 0) {
            const referenced = await collectCallerStoredCardFileKeys({
                docClient,
                mainTable,
                userUUID,
                excludeStudysetUUID: studysetUUID,
            });
            if (unowned.some((key) => !referenced.has(key))) {
                throw new RequestError(403, 'Forbidden');
            }
        }

        finalCards = await copyCardFiles({
            s3Client,
            bucket: mainBucket,
            cards: finalCards,
            studysetUUID,
            shouldCopy: (key) => toCopy.has(key),
        });
    }

    const finalKeys = collectCardFileKeys(finalCards).keys;
    const removed = [...stored].filter(
        (key) => !finalKeys.has(key) && isKeyInStudyset(key, studysetUUID)
    );
    return {
        cards: finalCards,
        removed,
        published: Item?.metadata?.publiclyViewable === true,
    };
};

export const handler: Handler = async (
    event: APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext>,
    context
): Promise<APIGatewayProxyResultV2> => {
    logRequest(event);

    const { sub: userUUID, username } = event.requestContext.authorizer.lambda;
    const body: RequestBody = JSON.parse(event.body ?? '{}');

    const { isMetadataUpdate = false, studysetUUID, updates } = body;

    if (!isUUID(studysetUUID)) return respond(400, 'Invalid studysetUUID');
    if (!isPlainObject(updates)) return respond(400, 'Invalid updates');

    try {
        const PK = `userUUID#${userUUID}`;
        const SK = `studyset#${studysetUUID}`;
        const updatedAt = new Date().toISOString();

        let finalUpdates = updates;
        let removed: string[] = [];
        let gateError: ReturnType<typeof cardsGateError>;
        // A metadata update writes `metadata.cards`, which holds no files.
        if (!isMetadataUpdate && updates.cards !== undefined) {
            const plan = await planCardFiles({
                cards: updates.cards,
                studysetUUID,
                userUUID,
            });
            finalUpdates = { ...updates, cards: plan.cards };
            removed = plan.removed;
            gateError = plan.published ? cardsGateError(plan.cards) : undefined;
        }

        const { ExpressionAttributeNames, ExpressionAttributeValues, UpdateExpression } =
            buildUpdateExpression({
                updates: finalUpdates,
                isMetadataUpdate,
                updatedAt,
                updatedBy: username,
                unpublish: gateError !== undefined,
            });

        const updateCommand = new UpdateCommand({
            Key: {
                PK,
                SK,
            },
            TableName: mainTable,
            ExpressionAttributeNames,
            ExpressionAttributeValues,
            UpdateExpression,
            // An item created at another set's id would pass as owning that
            // set's files.
            ConditionExpression: 'attribute_exists(PK)',
        });
        await docClient.send(updateCommand);

        // The editor drops a just-uploaded file from its cards, so deleting
        // removed keys would delete new uploads. Logged until that's fixed.
        if (removed.length > 0) {
            console.log('Removed card files left in S3 (deletes deferred):', removed);
        }

        const getCommand = new GetCommand({
            Key: {
                PK: `userUUID#${userUUID}`,
                SK: `studyset#${studysetUUID}`,
            },
            TableName: mainTable,
        });
        const getResult = await docClient.send(getCommand);
        const updatedStudyset = getResult.Item;

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Successfully updated study set',
                studyset: removeKeys(updatedStudyset ?? {}),
                ...(gateError && {
                    unpublished: { errors: [gateError] } satisfies UnpublishedOnSave,
                }),
            }),
        };
    } catch (err) {
        if (err instanceof RequestError) {
            return respond(err.statusCode, err.message);
        }
        if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
            return respond(404, 'Study set not found');
        }
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error updating study set',
            }),
        };
    }
};
