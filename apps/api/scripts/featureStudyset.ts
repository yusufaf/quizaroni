/**
 * Curate the Featured row on Explore (#141): set or clear `featuredAt` on a
 * public study set.
 *
 * Only a set listed on Explore (published, not hidden) can be featured; this
 * is checked before the write, so a dry run reports a refusal too, and again
 * by the write's condition. Unpublishing or a takedown clears `featuredAt`.
 * Featuring an already featured set moves it to the front of the row.
 *
 * The row usually updates within the feed's 60s cache (up to 15 min if the
 * index read is failing); clearing, unpublishing or hiding takes effect on
 * the next response.
 *
 * The set is looked up on the public index by STUDYSET_UUID, as in
 * unpublishStudyset.ts; pass its owner as USER_UUID to clear a set that is no
 * longer published.
 *
 * Usage (with AWS credentials for the target account in the environment):
 *   MAIN_TABLE=quizaroni-<deploymentType>-main AWS_REGION=us-west-2 \
 *     STUDYSET_UUID=<id> [USER_UUID=<owner>] [CLEAR=1] \
 *     pnpm --filter @quizaroni/api feature:studyset
 *   # add DRY_RUN=1 to only report what would change.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { isPubliclyListed } from '../resources/dynamo/publicSharing';
import { isDryRun } from './dryRun';
import { findStudysetKey } from './unpublishStudyset';

type FeatureConfig = {
    tableName: string;
    studysetUUID: string;
    userUUID?: string;
    clear: boolean;
    dryRun: boolean;
};

type StudysetKey = { PK: string; SK: string };

// Stricter than DRY_RUN: there, a typo falls back to a report; here, either
// reading of a typo would be a write.
const parseClear = (value: string | undefined): boolean => {
    const normalized = (value ?? '').toLowerCase();
    if (['', '0', 'false'].includes(normalized)) return false;
    if (['1', 'true'].includes(normalized)) return true;
    throw new Error(
        `CLEAR must be 1/true to unfeature or 0/false/unset to feature (got "${value}")`
    );
};

export const readFeatureConfig = (env: NodeJS.ProcessEnv): FeatureConfig => {
    const tableName = env.MAIN_TABLE ?? '';
    if (!tableName) {
        throw new Error(
            'Set MAIN_TABLE to the target table name, e.g. quizaroni-production-main'
        );
    }
    const studysetUUID = env.STUDYSET_UUID ?? '';
    if (!studysetUUID) {
        throw new Error('Set STUDYSET_UUID to the id of the set to feature or clear');
    }
    return {
        tableName,
        studysetUUID,
        userUUID: env.USER_UUID || undefined,
        clear: parseClear(env.CLEAR),
        dryRun: isDryRun(env.DRY_RUN),
    };
};

const notListedError = (sk: string) =>
    new Error(
        `Study set ${sk} is not listed on Explore (unpublished, hidden or never published); only a listed set can be featured`
    );

/** Same rule as the feed: listed, with a publishedAt (legacy shares have none). */
export const isListedForFeature = async (
    docClient: DynamoDBDocumentClient,
    tableName: string,
    key: StudysetKey
): Promise<boolean> => {
    const { Item } = await docClient.send(
        new GetCommand({
            TableName: tableName,
            Key: key,
            ProjectionExpression:
                'PK, SK, #SK2, #metadata.#publiclyViewable, #publishedAt, #moderation.#hiddenAt',
            ExpressionAttributeNames: {
                '#SK2': 'SK2',
                '#metadata': 'metadata',
                '#publiclyViewable': 'publiclyViewable',
                '#publishedAt': 'publishedAt',
                '#moderation': 'moderation',
                '#hiddenAt': 'hiddenAt',
            },
        })
    );
    const published = typeof Item?.publishedAt === 'string' && Item.publishedAt !== '';
    return isPubliclyListed(Item) && published;
};

export const featureStudyset = async ({
    docClient,
    tableName,
    key,
    clear,
    now,
    dryRun,
    log = console.log,
}: {
    docClient: DynamoDBDocumentClient;
    tableName: string;
    key: StudysetKey;
    clear: boolean;
    now: string;
    dryRun: boolean;
    log?: (message: string) => void;
}): Promise<{ updated: boolean }> => {
    if (!clear && !(await isListedForFeature(docClient, tableName, key))) {
        throw notListedError(key.SK);
    }

    log(
        `${dryRun ? '[dry-run] would ' : ''}${clear ? 'unfeature' : 'feature'} ${key.PK} ${key.SK}`
    );
    if (dryRun) {
        return { updated: false };
    }

    if (clear) {
        await docClient.send(
            new UpdateCommand({
                TableName: tableName,
                Key: key,
                UpdateExpression: 'REMOVE #featuredAt',
                ConditionExpression: 'attribute_exists(PK)',
                ExpressionAttributeNames: { '#featuredAt': 'featuredAt' },
            })
        );
        return { updated: true };
    }

    try {
        // The condition repeats the check above for a set unpublished or
        // hidden between the read and this write.
        await docClient.send(
            new UpdateCommand({
                TableName: tableName,
                Key: key,
                UpdateExpression: 'SET #featuredAt = :now',
                ConditionExpression:
                    'attribute_exists(PK) AND #SK2 = :sk2 AND #metadata.#publiclyViewable = :true AND attribute_type(#publishedAt, :string) AND size(#publishedAt) > :zero AND attribute_not_exists(#moderation.#hiddenAt)',
                ExpressionAttributeNames: {
                    '#featuredAt': 'featuredAt',
                    '#SK2': 'SK2',
                    '#metadata': 'metadata',
                    '#publiclyViewable': 'publiclyViewable',
                    '#publishedAt': 'publishedAt',
                    '#moderation': 'moderation',
                    '#hiddenAt': 'hiddenAt',
                },
                ExpressionAttributeValues: {
                    ':now': now,
                    ':sk2': key.SK,
                    ':true': true,
                    ':string': 'S',
                    ':zero': 0,
                },
            })
        );
    } catch (error) {
        if ((error as Error).name === 'ConditionalCheckFailedException') {
            throw notListedError(key.SK);
        }
        throw error;
    }
    return { updated: true };
};

if (require.main === module) {
    let config: FeatureConfig;
    try {
        config = readFeatureConfig(process.env);
    } catch (error) {
        console.error((error as Error).message);
        process.exit(1);
    }

    const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

    findStudysetKey({ docClient, ...config })
        .then((key) =>
            featureStudyset({
                docClient,
                tableName: config.tableName,
                key,
                clear: config.clear,
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
