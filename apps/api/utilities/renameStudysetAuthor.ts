import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { isRealStudysetItem } from 'utilities/studysets';

const UPDATE_CHUNK_SIZE = 10;

const errorName = (err: unknown) => (err as { name?: string })?.name ?? 'Error';

/**
 * Copies a new username onto every real set the user owns, page by page, so
 * the counts stay accurate if a later page fails. Best-effort: it never
 * throws, and `complete` is false when any set or page was missed. A set's
 * public view is the same item, so this renames it there too.
 */
export const renameStudysetAuthor = async ({
    docClient,
    mainTable,
    userUUID,
    username,
}: {
    docClient: DynamoDBDocumentClient;
    mainTable: string;
    userUUID: string;
    username: string;
}): Promise<{ updated: number; failed: number; complete: boolean }> => {
    const PK = `userUUID#${userUUID}`;
    let updated = 0;
    let failed = 0;
    let ExclusiveStartKey: Record<string, unknown> | undefined;

    do {
        let page;
        try {
            page = await docClient.send(
                new QueryCommand({
                    TableName: mainTable,
                    KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk)',
                    ExpressionAttributeNames: { '#pk': 'PK', '#sk': 'SK', '#sid': 'studysetUUID' },
                    ExpressionAttributeValues: { ':pk': PK, ':sk': 'studyset#' },
                    // Sets carry their cards inline; only the key and id are needed.
                    ProjectionExpression: '#sk, #sid',
                    ConsistentRead: true,
                    ExclusiveStartKey,
                })
            );
        } catch (err) {
            console.error('Study set rename query failed', errorName(err));
            return { updated, failed, complete: false };
        }

        const keys = (page.Items ?? [])
            .map((item) => String(item.SK))
            .filter((SK, index) =>
                isRealStudysetItem(page.Items?.[index], SK.slice('studyset#'.length))
            );

        for (let start = 0; start < keys.length; start += UPDATE_CHUNK_SIZE) {
            const chunk = keys.slice(start, start + UPDATE_CHUNK_SIZE);
            const results = await Promise.allSettled(
                chunk.map((SK) =>
                    docClient.send(
                        new UpdateCommand({
                            TableName: mainTable,
                            Key: { PK, SK },
                            UpdateExpression: 'SET #username = :username',
                            // A set deleted mid-loop must not be recreated.
                            ConditionExpression: 'attribute_exists(PK)',
                            ExpressionAttributeNames: { '#username': 'username' },
                            ExpressionAttributeValues: { ':username': username },
                        })
                    )
                )
            );
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    updated += 1;
                } else {
                    failed += 1;
                    console.error('Study set rename failed', chunk[index], errorName(result.reason));
                }
            });
        }

        ExclusiveStartKey = page.LastEvaluatedKey;
    } while (ExclusiveStartKey);

    return { updated, failed, complete: failed === 0 };
};
