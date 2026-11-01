import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
    isPubliclyListed,
    PUBLIC_GSI_INDEX_NAME,
    PUBLIC_STUDYSET_PK,
    publicStudysetSK,
} from 'resources/dynamo/publicSharing';

// Bounds the pages an anonymous request can read while skipping copies.
const MAX_PAGES = 5;

/**
 * Finds a set's own row on the public index. Only that row counts: pre-#125
 * copies can share its SK2 (#171). `isPubliclyListed` enforces that and
 * re-checks the flag and moderation. The index is eventually consistent, so a
 * caller about to act on the set should re-read the base row.
 */
export const findPublicStudyset = async ({
    docClient,
    table,
    studysetUUID,
}: {
    docClient: DynamoDBDocumentClient;
    table: string;
    studysetUUID: string;
}): Promise<Record<string, unknown> | undefined> => {
    // No Limit, and keep paging: copies under this SK2 can fill a page
    // before the set's own row. No FilterExpression: DynamoDB rejects one that
    // names SK2, the index's own sort key, so `isPubliclyListed` drops copies.
    let studyset: Record<string, unknown> | undefined;
    let lastEvaluatedKey: Record<string, unknown> | undefined;
    let pages = 0;
    do {
        pages += 1;
        const result = await docClient.send(
            new QueryCommand({
                TableName: table,
                IndexName: PUBLIC_GSI_INDEX_NAME,
                KeyConditionExpression: 'PK2 = :pk AND SK2 = :sk',
                ExpressionAttributeValues: {
                    ':pk': PUBLIC_STUDYSET_PK,
                    ':sk': publicStudysetSK(studysetUUID),
                },
                ExclusiveStartKey: lastEvaluatedKey,
            })
        );
        studyset = result.Items?.find(isPubliclyListed);
        lastEvaluatedKey = result.LastEvaluatedKey as
            | Record<string, unknown>
            | undefined;
    } while (!studyset && lastEvaluatedKey && pages < MAX_PAGES);

    return studyset;
};
