import {
    APIGatewayProxyEventV2WithLambdaAuthorizer,
    APIGatewayProxyResultV2,
    Handler,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { AuthorizerContext } from "models/auth";

const { mainTable = "" } = process.env;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

type RequestBody = {
    labels: string[];
    studysetUUID: string;
};

export const handler: Handler = async (
    event: APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext>,
    context
): Promise<APIGatewayProxyResultV2> => {
    console.log(JSON.stringify({ event, context }, null, 4));

    const { sub: userUUID } = event.requestContext.authorizer.lambda
    const body: RequestBody = JSON.parse(event.body ?? "{}");
    console.log(JSON.stringify({body}, null, 4));
    
    const { labels, studysetUUID = "" } = body;

    try {
        const updatedAt = new Date().toISOString();

        const updateLabelsCommand = new UpdateCommand({
            Key: {
                PK: `userUUID#${userUUID}`,
                SK: `studyset#${studysetUUID}`,
            },
            TableName: mainTable,
            ExpressionAttributeValues: {
                ':labels': labels,
                ':updatedAt': updatedAt,
            },
            UpdateExpression: 'SET labels = :labels, updatedAt = :updatedAt',
        });
        await docClient.send(updateLabelsCommand);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Successfully updated studyset labels",
            }),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Error",
            }),
        };
    }
};
