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
 * The set is found on the public index by STUDYSET_UUID. For a set that isn't
 * published, pass its owner as USER_UUID to hide it anyway. Duplicates made
 * before #125 can share the set's index key and would keep serving its public
 * link, so the script refuses until `cleanup:public-duplicates` has cleared them.
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
import { isInheritedPublicCopy } from './cleanupPublicDuplicates';
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

export const findStudysetKey = async ({
    docClient,
    tableName,
    studysetUUID,
    userUUID,
}: {
    docClient: DynamoDBDocumentClient;
    tableName: string;
    studysetUUID: string;
    userUUID?: string;
}): Promise<StudysetKey> => {
    if (userUUID) {
        return { PK: `userUUID#${userUUID}`, SK: `studyset#${studysetUUID}` };
    }

    const items: Record<string, unknown>[] = [];
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
                // isInheritedPublicCopy needs PK2, SK2 and studysetUUID.
                ProjectionExpression: 'PK, SK, PK2, SK2, studysetUUID',
                ExclusiveStartKey: lastEvaluatedKey as never,
            })
        );
        items.push(...(page.Items ?? []));
        lastEvaluatedKey = page.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastEvaluatedKey);

    const inheritedCopies = items.filter(isInheritedPublicCopy);
    if (inheritedCopies.length > 0) {
        throw new Error(
            `${inheritedCopies.length} duplicate(s) made before #125 share the public index key of ${studysetUUID} and would keep serving its public link. Run cleanup:public-duplicates first (DRY_RUN=1 to preview), then rerun this script.`
        );
    }
    const item = items[0] as StudysetKey | undefined;
    if (!item) {
        throw new Error(
            `Study set ${studysetUUID} is not on the public index; pass USER_UUID to hide it anyway`
        );
    }
    return { PK: item.PK, SK: item.SK };
};

export const takedownStudyset = async ({
    docClient,
    tableName,
    key,
    reason,
    now,
    dryRun,
    log = console.log,
}: {
    docClient: DynamoDBDocumentClient;
    tableName: string;
    key: StudysetKey;
    reason?: string;
    now: string;
    dryRun: boolean;
    log?: (message: string) => void;
}): Promise<{ updated: boolean }> => {
    log(
        `${dryRun ? '[dry-run] would hide' : 'hiding'} ${key.PK} ${key.SK}${
            reason ? ` (reason: ${reason})` : ''
        }`
    );
    if (dryRun) {
        return { updated: false };
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
    return { updated: true };
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

    findStudysetKey({ docClient, ...config })
        .then((key) =>
            takedownStudyset({
                docClient,
                tableName: config.tableName,
                key,
                reason: config.reason,
                now: new Date().toISOString(),
                dryRun: config.dryRun,
            })
        )
        .then(({ updated }) => {
            console.log(
                `\nDone. updated=${updated}${
                    config.dryRun ? ' (dry run — no writes performed)' : ''
                }`
            );
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}
