/**
 * One-off cleanup: delete empty study set stubs from users' libraries.
 *
 * `update-studyset` and the label endpoints upsert, so writing to an id that
 * isn't in the caller's library created an item holding only a few fields
 * (e.g. `lastViewed`, `updatedAt`) and no cards (#127, #146). Every real
 * create path writes `cards` and `createdAt`, so an item missing both is a stub.
 *
 * Items with a `labels` attribute may be real sets wiped by #124, not upsert
 * stubs. The script keeps them by default and lists them as
 * `keeping … possible #124`. Run with DRY_RUN=1 first, save the key list, and
 * finish (or rule out) the #124 point-in-time restore before any run with
 * INCLUDE_LABELED=1.
 *
 * Usage (with AWS credentials for the target account in the environment):
 *   MAIN_TABLE=quizaroni-<deploymentType>-main AWS_REGION=us-west-2 \
 *     pnpm --filter @quizaroni/api cleanup:empty-studysets
 *   # add DRY_RUN=1 to only report what would change.
 *   # add INCLUDE_LABELED=1 to also delete items that have `labels`.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DeleteCommand,
    DynamoDBDocumentClient,
    ScanCommand,
} from '@aws-sdk/lib-dynamodb';

type StubOptions = { includeLabeled?: boolean };

type CleanupResult = {
    matched: number;
    deleted: number;
    skipped: number;
    labeledKept: number;
};

type CleanupConfig = {
    tableName: string;
    dryRun: boolean;
    includeLabeled: boolean;
};

export const isEmptyStudysetStub = (
    item: Record<string, unknown>,
    { includeLabeled = false }: StubOptions = {}
): boolean =>
    typeof item.SK === 'string' &&
    item.SK.startsWith('studyset#') &&
    !('cards' in item) &&
    !('createdAt' in item) &&
    (includeLabeled || !('labels' in item));

export const readCleanupConfig = (env: NodeJS.ProcessEnv): CleanupConfig => {
    const tableName = env.MAIN_TABLE ?? '';
    if (!tableName) {
        throw new Error(
            'Set MAIN_TABLE to the target table name, e.g. quizaroni-production-main'
        );
    }
    return {
        tableName,
        dryRun: env.DRY_RUN === '1',
        includeLabeled: env.INCLUDE_LABELED === '1',
    };
};

const deleteGuard = (
    includeLabeled: boolean
): { ConditionExpression: string; ExpressionAttributeNames: Record<string, string> } =>
    includeLabeled
        ? {
              ConditionExpression:
                  'attribute_not_exists(#cards) AND attribute_not_exists(#createdAt)',
              ExpressionAttributeNames: {
                  '#cards': 'cards',
                  '#createdAt': 'createdAt',
              },
          }
        : {
              ConditionExpression:
                  'attribute_not_exists(#cards) AND attribute_not_exists(#createdAt) AND attribute_not_exists(#labels)',
              ExpressionAttributeNames: {
                  '#cards': 'cards',
                  '#createdAt': 'createdAt',
                  '#labels': 'labels',
              },
          };

export const cleanupEmptyStudysets = async ({
    docClient,
    tableName,
    dryRun,
    includeLabeled = false,
    log = console.log,
}: {
    docClient: DynamoDBDocumentClient;
    tableName: string;
    dryRun: boolean;
    includeLabeled?: boolean;
    log?: (message: string) => void;
}): Promise<CleanupResult> => {
    const result: CleanupResult = {
        matched: 0,
        deleted: 0,
        skipped: 0,
        labeledKept: 0,
    };
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
        const page = await docClient.send(
            new ScanCommand({
                TableName: tableName,
                // Labeled items are not excluded here so they can be reported.
                FilterExpression:
                    'begins_with(#SK, :studysetPrefix) AND attribute_not_exists(#cards) AND attribute_not_exists(#createdAt)',
                ExpressionAttributeNames: {
                    '#SK': 'SK',
                    '#cards': 'cards',
                    '#createdAt': 'createdAt',
                },
                ExpressionAttributeValues: { ':studysetPrefix': 'studyset#' },
                ExclusiveStartKey: lastEvaluatedKey as never,
            })
        );

        for (const item of page.Items ?? []) {
            if (!isEmptyStudysetStub(item, { includeLabeled: true })) {
                continue;
            }
            const { PK, SK } = item as { PK: string; SK: string };

            if (!includeLabeled && 'labels' in item) {
                log(
                    `keeping ${PK} ${SK} (has labels; possible #124 wipe victim, restore via PITR before deleting)`
                );
                result.labeledKept += 1;
                continue;
            }

            result.matched += 1;
            log(
                `${dryRun ? '[dry-run] would delete' : 'deleting'} ${PK} ${SK} (lastViewed=${
                    item.lastViewed ?? '-'
                })`
            );

            if (dryRun) {
                continue;
            }

            try {
                await docClient.send(
                    new DeleteCommand({
                        TableName: tableName,
                        Key: { PK, SK },
                        ...deleteGuard(includeLabeled),
                    })
                );
                result.deleted += 1;
            } catch (error) {
                if ((error as Error)?.name === 'ConditionalCheckFailedException') {
                    result.skipped += 1;
                    continue;
                }
                throw error;
            }
        }

        lastEvaluatedKey = page.LastEvaluatedKey as
            | Record<string, unknown>
            | undefined;
    } while (lastEvaluatedKey);

    return result;
};

if (require.main === module) {
    let config: CleanupConfig;
    try {
        config = readCleanupConfig(process.env);
    } catch (error) {
        console.error((error as Error).message);
        process.exit(1);
    }

    const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

    cleanupEmptyStudysets({ docClient, ...config })
        .then(({ matched, deleted, skipped, labeledKept }) => {
            console.log(
                `\nDone. matched=${matched} deleted=${deleted} skipped=${skipped} labeledKept=${labeledKept}${
                    config.dryRun ? ' (dry run — no writes performed)' : ''
                }`
            );
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}
