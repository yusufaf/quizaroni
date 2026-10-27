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
import { pickClientEditableUserMetadata } from '@quizaroni/shared-types';
import { AuthorizerContext } from 'models/auth';
import { removeKeys } from 'resources/dynamo/utilities';
import { isPlainObject } from 'utilities/cardFiles';
import { logRequest } from 'utilities/logging';

const { usersTable = '' } = process.env;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

type RequestBody = {
    updates: unknown;
};

// Well above real settings: preset avatars are SVG data URIs of up to ~36KB.
export const MAX_UPDATES_BYTES = 128 * 1024;

// DynamoDB allows 32 levels and `metadata.<key>` already takes 2; real values nest at most 2.
const MAX_VALUE_DEPTH = 16;

const respond = (statusCode: number, message: string) => ({
    statusCode,
    body: JSON.stringify({ message }),
});

/**
 * Whether the marshaller and DynamoDB can store a value, so input that would
 * fail there gets a 400 instead of a 500. Depth is checked before descending,
 * so arbitrarily deep input never recurses past MAX_VALUE_DEPTH.
 */
const isStorableValue = (value: unknown, depth = 0): boolean => {
    if (depth > MAX_VALUE_DEPTH) return false;
    if (typeof value === 'number') {
        const magnitude = Math.abs(value);
        return (
            Number.isFinite(value) &&
            magnitude <= Number.MAX_SAFE_INTEGER &&
            (magnitude === 0 || magnitude >= 1e-130)
        );
    }
    if (Array.isArray(value)) return value.every((item) => isStorableValue(item, depth + 1));
    if (isPlainObject(value)) {
        return !('' in value) && Object.values(value).every((item) => isStorableValue(item, depth + 1));
    }
    return true;
};

/**
 * Client keys never become placeholder names (they get `#key<N>`/`:value<N>`),
 * so a key can't build an invalid placeholder (#203, #185). The caller passes
 * only allowlisted keys (#207), which excludes the server's own
 * `updatedAt`/`updatedBy`. `#metadata` is sent only when a clause uses it,
 * since DynamoDB rejects an unused name (#184). `updatedBy` is skipped when
 * the token has no username (#180).
 */
const buildUserMetadataUpdate = ({
    updates,
    updatedAt,
    updatedBy,
}: {
    updates: Record<string, unknown>;
    updatedAt: string;
    updatedBy?: string;
}) => {
    const updateExpressions = ['#updatedAt = :updatedAt'];
    const ExpressionAttributeNames: Record<string, string> = { '#updatedAt': 'updatedAt' };
    const ExpressionAttributeValues: Record<string, unknown> = { ':updatedAt': updatedAt };

    if (updatedBy) {
        updateExpressions.push('#updatedBy = :updatedBy');
        ExpressionAttributeNames['#updatedBy'] = 'updatedBy';
        ExpressionAttributeValues[':updatedBy'] = updatedBy;
    }

    Object.entries(updates).forEach(([key, value], index) => {
        updateExpressions.push(`#metadata.#key${index} = :value${index}`);
        ExpressionAttributeNames['#metadata'] = 'metadata';
        ExpressionAttributeNames[`#key${index}`] = key;
        ExpressionAttributeValues[`:value${index}`] = value;
    });

    return {
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
    };
};

const parseUpdates = (body: string | undefined): unknown => {
    try {
        return (JSON.parse(body ?? '{}') as RequestBody | null)?.updates;
    } catch {
        return undefined;
    }
};

export const handler: Handler = async (
    event: APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext>,
    context
): Promise<APIGatewayProxyResultV2> => {
    logRequest(event);

    const { sub: userUUID, username } = event.requestContext.authorizer.lambda;
    const updates = parseUpdates(event.body);

    // DynamoDB rejects an empty attribute name.
    if (!isPlainObject(updates) || '' in updates) {
        return respond(400, 'Invalid updates');
    }

    // Keys owned by other endpoints are dropped, not rejected, so an older
    // client that sends its whole metadata still saves the rest (#207).
    const allowedUpdates = pickClientEditableUserMetadata(updates);

    // Storability first: it bounds depth, and JSON.stringify overflows the
    // stack on deeply nested input that JSON.parse accepted.
    if (!Object.values(allowedUpdates).every((value) => isStorableValue(value))) {
        return respond(400, 'Invalid updates');
    }
    if (Buffer.byteLength(JSON.stringify(allowedUpdates)) > MAX_UPDATES_BYTES) {
        return respond(413, 'Updates too large');
    }

    try {
        const PK = `user#${userUUID}`;
        const SK = `userData`;
        const updatedAt = new Date().toISOString();

        const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } =
            buildUserMetadataUpdate({ updates: allowedUpdates, updatedAt, updatedBy: username });

        const updateCommand = new UpdateCommand({
            Key: {
                PK,
                SK,
            },
            TableName: usersTable,
            ExpressionAttributeNames,
            ExpressionAttributeValues,
            UpdateExpression,
        });
        await docClient.send(updateCommand);

        const getCommand = new GetCommand({
            Key: {
                PK,
                SK,
            },
            TableName: usersTable,
        });
        const getResult = await docClient.send(getCommand);
        const updatedUser = getResult.Item;

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Successfully updated user metadata',
                user: removeKeys(updatedUser ?? {}),
            }),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error updating user metadata',
            }),
        };
    }
};
