/**
 * Moderation takedown: hide a study set and take it off Explore.
 *
 * Sets `moderation.hiddenAt` (and `moderation.reason` when REASON is given),
 * turns `metadata.publiclyViewable` off and removes the PK2/SK2 public-index
 * keys. A hidden set 404s at its public link, is left out of the sitemap list,
 * and its owner can't republish it. Content is not deleted.
 *
 * There is no un-hide tool: to restore a set, remove its `moderation`
 * attribute by hand; the owner can then publish it again.
 *
 * The set is always looked up on the public index by STUDYSET_UUID. For a set
 * that isn't published, pass its owner as USER_UUID to hide it anyway; for a
 * published set, USER_UUID must match the owner on the index.
 *
 * Duplicates made before #125 can sit on the index under this set's key and
 * would keep serving its public link. The takedown removes their PK2/SK2 too
 * (only while SK2 still points at this set) and changes nothing else on them.
 *
 * Usage (with AWS credentials for the target account in the environment):
 *   MAIN_TABLE=quizaroni-<deploymentType>-main AWS_REGION=us-west-2 \
 *     STUDYSET_UUID=<id> [USER_UUID=<owner>] [REASON="..."] \
 *     pnpm --filter @quizaroni/api unpublish:studyset
 *   # add DRY_RUN=1 to only report what would change.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    QueryCommand,
    UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
    PUBLIC_GSI_INDEX_NAME,
    PUBLIC_STUDYSET_PK,
    publicStudysetSK,
} from '../resources/dynamo/publicSharing';
import { isDryRun } from './dryRun';

type TakedownConfig = {
    tableName: string;
    studysetUUID: string;
    userUUID?: string;
    reason?: string;
    dryRun: boolean;
};

type StudysetKey = { PK: string; SK: string };

export const readTakedownConfig = (env: NodeJS.ProcessEnv): TakedownConfig => {
    const tableName = env.MAIN_TABLE ?? '';
    if (!tableName) {
        throw new Error(
            'Set MAIN_TABLE to the target table name, e.g. quizaroni-production-main'
        );
    }
    const studysetUUID = env.STUDYSET_UUID ?? '';
    if (!studysetUUID) {
        throw new Error('Set STUDYSET_UUID to the id of the set to take down');
    }
    return {
        tableName,
        studysetUUID,
        userUUID: env.USER_UUID || undefined,
        reason: env.REASON || undefined,
        dryRun: isDryRun(env.DRY_RUN),
    };
};

export type TakedownTargets = {
    key: StudysetKey;
    // Other rows under this set's SK2: pre-#125 copies serving its public link.
    inheritedCopies: StudysetKey[];
};

export const findTakedownTargets = async ({
    docClient,
    tableName,
    studysetUUID,
    userUUID,
}: {
    docClient: DynamoDBDocumentClient;
    tableName: string;
    studysetUUID: string;
    userUUID?: string;
}): Promise<TakedownTargets> => {
    const ownSK = `studyset#${studysetUUID}`;
    const rows: StudysetKey[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined;
    do {
        const page = await docClient.send(
            new QueryCommand({
                TableName: tableName,
                IndexName: PUBLIC_GSI_INDEX_NAME,
                KeyConditionExpression: 'PK2 = :pk2 AND SK2 = :sk2',
                ExpressionAttributeValues: {
                    ':pk2': PUBLIC_STUDYSET_PK,
                    ':sk2': publicStudysetSK(studysetUUID),
                },
                ProjectionExpression: 'PK, SK',
                ExclusiveStartKey: lastEvaluatedKey as never,
            })
        );
        rows.push(...((page.Items ?? []) as StudysetKey[]));
        lastEvaluatedKey = page.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastEvaluatedKey);

    const own = rows.find((row) => row.SK === ownSK);
    const inheritedCopies = rows
        .filter((row) => row.SK !== ownSK)
        .map(({ PK, SK }) => ({ PK, SK }));

    if (userUUID) {
        const PK = `userUUID#${userUUID}`;
        if (own && own.PK !== PK) {
            throw new Error(
                `Study set ${studysetUUID} is on the public index under ${own.PK}, not ${PK}; fix USER_UUID or leave it out`
            );
        }
        return { key: { PK, SK: ownSK }, inheritedCopies };
    }
    if (!own) {
        throw new Error(
            `Study set ${studysetUUID} is not on the public index; pass USER_UUID to hide it anyway`
        );
    }
    return { key: { PK: own.PK, SK: own.SK }, inheritedCopies };
};

export const takedownStudyset = async ({
    docClient,
    tableName,
    studysetUUID,
    targets: { key, inheritedCopies },
    reason,
    now,
    dryRun,
    log = console.log,
}: {
    docClient: DynamoDBDocumentClient;
    tableName: string;
    studysetUUID: string;
    targets: TakedownTargets;
    reason?: string;
    now: string;
    dryRun: boolean;
    log?: (message: string) => void;
}): Promise<{ updated: boolean; copiesCleared: number }> => {
    log(
        `${dryRun ? '[dry-run] would hide' : 'hiding'} ${key.PK} ${key.SK}${
            reason ? ` (reason: ${reason})` : ''
        }`
    );
    if (inheritedCopies.length > 0) {
        log(
            `${dryRun ? '[dry-run] would remove' : 'removing'} the public index key from ${
                inheritedCopies.length
            } pre-#125 cop${inheritedCopies.length === 1 ? 'y' : 'ies'}`
        );
    }
    if (dryRun) {
        return { updated: false, copiesCleared: 0 };
    }

    await docClient.send(
        new UpdateCommand({
            TableName: tableName,
            Key: key,
            UpdateExpression:
                'SET #moderation = :moderation, #metadata.#publiclyViewable = :false REMOVE #PK2, #SK2',
            ConditionExpression: 'attribute_exists(PK)',
            ExpressionAttributeNames: {
                '#moderation': 'moderation',
                '#metadata': 'metadata',
                '#publiclyViewable': 'publiclyViewable',
                '#PK2': 'PK2',
                '#SK2': 'SK2',
            },
            ExpressionAttributeValues: {
                ':moderation': { hiddenAt: now, ...(reason ? { reason } : {}) },
                ':false': false,
            },
        })
    );

    let copiesCleared = 0;
    for (const copy of inheritedCopies) {
        try {
            // Index keys only, and only while the copy still points at this set.
            await docClient.send(
                new UpdateCommand({
                    TableName: tableName,
                    Key: copy,
                    UpdateExpression: 'REMOVE #PK2, #SK2',
                    ConditionExpression: '#SK2 = :sk2',
                    ExpressionAttributeNames: { '#PK2': 'PK2', '#SK2': 'SK2' },
                    ExpressionAttributeValues: { ':sk2': publicStudysetSK(studysetUUID) },
                })
            );
            copiesCleared += 1;
        } catch (error) {
            if ((error as Error)?.name !== 'ConditionalCheckFailedException') {
                throw error;
            }
        }
    }
    return { updated: true, copiesCleared };
};

if (require.main === module) {
    let config: TakedownConfig;
    try {
        config = readTakedownConfig(process.env);
    } catch (error) {
        console.error((error as Error).message);
        process.exit(1);
    }

    const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

    findTakedownTargets({ docClient, ...config })
        .then((targets) =>
            takedownStudyset({
                docClient,
                tableName: config.tableName,
                studysetUUID: config.studysetUUID,
                targets,
                reason: config.reason,
                now: new Date().toISOString(),
                dryRun: config.dryRun,
            })
        )
        .then(({ updated, copiesCleared }) => {
            console.log(
                `
Done. updated=${updated} copiesCleared=${copiesCleared}${
                    config.dryRun ? ' (dry run — no writes performed)' : ''
                }`
            );
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}
