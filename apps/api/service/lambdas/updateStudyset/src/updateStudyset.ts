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
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { AuthorizerContext } from 'models/auth';
import { removeKeys } from 'resources/dynamo/utilities';

const { mainBucket = '', mainTable = '' } = process.env;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const s3Client = new S3Client({});

type RequestBody = {
    studysetUUID: string;
    updates: { [key: string]: any };
    isMetadataUpdate?: boolean;
};

export const handler: Handler = async (
    event: APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext>,
    context
): Promise<APIGatewayProxyResultV2> => {
    console.log(JSON.stringify({ event, context }, null, 4));

    const { sub: userUUID, username } = event.requestContext.authorizer.lambda;
    const body: RequestBody = JSON.parse(event.body ?? '{}');
    console.log(JSON.stringify({ body }, null, 4));

    const { isMetadataUpdate = false, studysetUUID, updates } = body;

    try {
        const PK = `userUUID#${userUUID}`;
        const SK = `studyset#${studysetUUID}`;
        const updatedAt = new Date().toISOString();

        // Handle S3 file cleanup if cards are being updated
        if (updates.cards) {
            try {
                // Fetch existing studyset to compare files
                const getCommand = new GetCommand({
                    Key: { PK, SK },
                    TableName: mainTable,
                });
                const getResult = await docClient.send(getCommand);
                const existingStudyset = getResult.Item;

                if (existingStudyset && existingStudyset.cards) {
                    // Collect all file keys from old studyset
                    const oldFileKeys = new Set<string>();
                    existingStudyset.cards.forEach((card: any) => {
                        if (card.files && Array.isArray(card.files)) {
                            card.files.forEach((file: any) => {
                                if (file.key) {
                                    oldFileKeys.add(file.key);
                                }
                            });
                        }
                    });

                    // Collect all file keys from new studyset
                    const newFileKeys = new Set<string>();
                    updates.cards.forEach((card: any) => {
                        if (card.files && Array.isArray(card.files)) {
                            card.files.forEach((file: any) => {
                                if (file.key) {
                                    newFileKeys.add(file.key);
                                }
                            });
                        }
                    });

                    // Find removed files
                    const removedFileKeys = [...oldFileKeys].filter(
                        (key) => !newFileKeys.has(key)
                    );

                    // Delete removed files from S3
                    if (removedFileKeys.length > 0) {
                        console.log(
                            `Deleting ${removedFileKeys.length} removed files from S3:`,
                            removedFileKeys
                        );

                        for (const fileKey of removedFileKeys) {
                            try {
                                const deleteCommand = new DeleteObjectCommand({
                                    Bucket: mainBucket,
                                    Key: fileKey,
                                });
                                await s3Client.send(deleteCommand);
                                console.log(`Successfully deleted file: ${fileKey}`);
                            } catch (deleteError) {
                                console.error(
                                    `Failed to delete file ${fileKey}:`,
                                    deleteError
                                );
                                // Continue with update even if S3 delete fails
                            }
                        }
                    }
                }
            } catch (fileCleanupError) {
                console.error('Error during file cleanup:', fileCleanupError);
                // Continue with update even if file cleanup fails
            }
        }

        // Ensure `updatedAt` and `updatedBy` are at the top level
        const topLevelUpdates = {
            updatedAt,
            updatedBy: username,
        };

        const updateExpressions: string[] = [];
        const ExpressionAttributeNames: Record<string, string> = {};
        const ExpressionAttributeValues: Record<string, any> = {};

        // Handle top-level updates for `updatedAt` and `updatedBy`
        for (const [key, value] of Object.entries(topLevelUpdates)) {
            const attributeKey = `#${key}`;
            const attributeValue = `:${key}`;
            updateExpressions.push(`${attributeKey} = ${attributeValue}`);
            ExpressionAttributeNames[attributeKey] = key;
            ExpressionAttributeValues[attributeValue] = value;
        }

        if (isMetadataUpdate) {
            // Ensure #metadata is set only once
            ExpressionAttributeNames[`#metadata`] = 'metadata';
        }

        for (const [key, value] of Object.entries(updates)) {
            const attributeValue = `:${key}`;

            // Determine the correct key path for metadata vs. standard update
            const attributeKey = isMetadataUpdate
                ? `#metadata.#${key}`
                : `#${key}`;

            // Add the key to ExpressionAttributeNames (same for both cases)
            ExpressionAttributeNames[`#${key}`] = key;

            // Push the update expression
            updateExpressions.push(`${attributeKey} = ${attributeValue}`);

            // Add the value to ExpressionAttributeValues
            ExpressionAttributeValues[attributeValue] = value;
        }

        const UpdateExpression = `SET ${updateExpressions.join(', ')}`;

        console.log({
            ExpressionAttributeNames,
            ExpressionAttributeValues,
            UpdateExpression,
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
        });
        await docClient.send(updateCommand);

        const getCommand = new GetCommand({
            Key: {
                PK: `userUUID#${userUUID}`,
                SK: `studyset#${studysetUUID}`,
            },
            TableName: mainTable,
        });
        const getResult = await docClient.send(getCommand);
        const updatedStudyset = getResult.Item;

        console.log(JSON.stringify({ updatedStudyset }, null, 4));

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Successfully updated study set',
                studyset: removeKeys(updatedStudyset ?? {}),
            }),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error updating study set',
            }),
        };
    }
};
