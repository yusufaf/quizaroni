import {
    APIGatewayProxyEventV2WithLambdaAuthorizer,
    APIGatewayProxyResultV2,
    Handler,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { AuthorizerContext } from "models/auth";

const { mainTable = "" } = process.env;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

type RequestBody = {
    studysetUpdates: [string, string[]][]; // [studysetUUID, labels[]]
};

export const handler: Handler = async (
    event: APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext>,
    context
): Promise<APIGatewayProxyResultV2> => {
    console.log(JSON.stringify({ event, context }, null, 4));

    const { sub: userUUID, username } = event.requestContext.authorizer.lambda;
    const body: RequestBody = JSON.parse(event.body ?? "{}");
    const { studysetUpdates = [] } = body;

    try {
        const updatedAt = new Date().toISOString();

        // DynamoDB batch write has a limit of 25 items per request
        // Split into chunks if necessary
        const BATCH_SIZE = 25;
        const chunks: [string, string[]][][] = [];

        for (let i = 0; i < studysetUpdates.length; i += BATCH_SIZE) {
            chunks.push(studysetUpdates.slice(i, i + BATCH_SIZE));
        }

        // Process each chunk
        for (const chunk of chunks) {
            const writeRequests = chunk.map(([studysetUUID, labels]) => ({
                PutRequest: {
                    Item: {
                        PK: `userUUID#${userUUID}`,
                        SK: `studyset#${studysetUUID}`,
                        labels,
                        updatedAt,
                        updatedBy: username,
                    },
                },
            }));

            const batchWriteCommand = new BatchWriteCommand({
                RequestItems: {
                    [mainTable]: writeRequests,
                },
            });

            await docClient.send(batchWriteCommand);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Successfully updated ${studysetUpdates.length} studyset(s)`,
            }),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Error updating studyset labels",
                error: err instanceof Error ? err.message : "Unknown error",
            }),
        };
    }
};
