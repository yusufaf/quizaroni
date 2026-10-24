import {
    DynamoDBDocumentClient,
    GetCommand,
    QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Studyset, Card, CardFileMetadata } from 'models/studysets';
import { collectCardFileKeys } from 'utilities/cardFiles';

type GetStudysetParams = {
    docClient: DynamoDBDocumentClient;
    mainTable: string;
    studysetUUID: string;
    userUUID: string;
};
export const getStudysetFromDynamo = async ({
    docClient,
    mainTable,
    studysetUUID,
    userUUID,
}: GetStudysetParams) => {
    const PK = `userUUID#${userUUID}`;
    const SK = `studyset#${studysetUUID}`;

    const getCommand = new GetCommand({
        Key: {
            PK,
            SK,
        },
        TableName: mainTable,
    });

    const { Item } = await docClient.send(getCommand);

    if (!Item) {
        throw new Error(
            `Studyset with UUID ${studysetUUID} for user ${userUUID} not found`
        );
    }

    return Item as Studyset;
};

/**
 * A real set carries its own id. Stubs written by old upserts (#127, #146)
 * sit at a set's key without it, so they must not count as owning the set.
 */
export const isRealStudysetItem = (
    item: Record<string, unknown> | undefined,
    studysetUUID: string
): boolean => item?.studysetUUID === studysetUUID;

export const callerOwnsStudyset = async ({
    docClient,
    mainTable,
    studysetUUID,
    userUUID,
}: GetStudysetParams): Promise<boolean> => {
    const { Item } = await docClient.send(
        new GetCommand({
            TableName: mainTable,
            Key: {
                PK: `userUUID#${userUUID}`,
                SK: `studyset#${studysetUUID}`,
            },
            // A set created moments ago (Combine) must already count.
            ConsistentRead: true,
            ProjectionExpression: '#id',
            ExpressionAttributeNames: { '#id': 'studysetUUID' },
        })
    );
    return isRealStudysetItem(Item, studysetUUID);
};

/**
 * Every card file key the caller's other real sets store. A set duplicated
 * before #126 points at keys under the source set's prefix, which the caller
 * may not own but can already read through their own set.
 */
export const collectCallerStoredCardFileKeys = async ({
    docClient,
    mainTable,
    userUUID,
    excludeStudysetUUID,
}: {
    docClient: DynamoDBDocumentClient;
    mainTable: string;
    userUUID: string;
    excludeStudysetUUID: string;
}): Promise<Set<string>> => {
    const keys = new Set<string>();
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
        const page = await docClient.send(
            new QueryCommand({
                TableName: mainTable,
                KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk)',
                ExpressionAttributeNames: {
                    '#pk': 'PK',
                    '#sk': 'SK',
                    '#sid': 'studysetUUID',
                    '#cards': 'cards',
                },
                ExpressionAttributeValues: {
                    ':pk': `userUUID#${userUUID}`,
                    ':sk': 'studyset#',
                },
                ProjectionExpression: '#sk, #sid, #cards',
                ConsistentRead: true,
                ExclusiveStartKey,
            })
        );
        for (const item of page.Items ?? []) {
            const id = String(item.SK).slice('studyset#'.length);
            if (id === excludeStudysetUUID || !isRealStudysetItem(item, id)) {
                continue;
            }
            collectCardFileKeys(item.cards).keys.forEach((key) => keys.add(key));
        }
        ExclusiveStartKey = page.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return keys;
};

const SIGNED_URL_EXPIRATION = 86400; // 24 hours in seconds

type RegenerateSignedUrlsParams = {
    s3Client: S3Client;
    bucket: string;
    studyset: Studyset;
};

/**
 * Regenerates signed URLs for all files in a studyset's cards.
 * This should be called when retrieving studysets to ensure URLs are fresh.
 */
export const regenerateSignedUrls = async ({
    s3Client,
    bucket,
    studyset,
}: RegenerateSignedUrlsParams): Promise<Studyset> => {
    if (!studyset.cards || studyset.cards.length === 0) {
        return studyset;
    }

    const updatedCards = await Promise.all(
        studyset.cards.map(async (card) => {
            if (!card.files || card.files.length === 0) {
                return card;
            }

            const updatedFiles = await Promise.all(
                card.files.map(async (file) => {
                    if (!file.key) {
                        return file;
                    }

                    try {
                        const getObjectCommand = new GetObjectCommand({
                            Bucket: bucket,
                            Key: file.key,
                        });
                        const signedURL = await getSignedUrl(
                            s3Client,
                            getObjectCommand,
                            { expiresIn: SIGNED_URL_EXPIRATION }
                        );
                        return { ...file, signedURL };
                    } catch (error) {
                        console.error(
                            `Failed to generate signed URL for key: ${file.key}`,
                            error
                        );
                        // The stored URL has expired or names an old key.
                        return { ...file, signedURL: '' };
                    }
                })
            );

            return { ...card, files: updatedFiles };
        })
    );

    return { ...studyset, cards: updatedCards };
};

type RegenerateSignedUrlsForStudysetsParams = {
    s3Client: S3Client;
    bucket: string;
    studysets: Studyset[];
};

/**
 * Regenerates signed URLs for all files in multiple studysets.
 */
export const regenerateSignedUrlsForStudysets = async ({
    s3Client,
    bucket,
    studysets,
}: RegenerateSignedUrlsForStudysetsParams): Promise<Studyset[]> => {
    return Promise.all(
        studysets.map((studyset) =>
            regenerateSignedUrls({ s3Client, bucket, studyset })
        )
    );
};
