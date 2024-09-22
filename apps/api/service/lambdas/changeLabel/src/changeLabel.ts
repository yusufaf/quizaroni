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
    newLabel: string;
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
    
    const { newLabel, studysetUUID = "" } = body;

    try {
        const updatedAt = new Date().toISOString();

        const changeLabelCommand = new UpdateCommand({
            Key: {
                PK: `userUUID#${userUUID}`,
                SK: `studyset#${studysetUUID}`,
            },
            TableName: mainTable,
            ExpressionAttributeValues: {
                ':newLabel': newLabel,
                ':updatedAt': updatedAt,
            },
            UpdateExpression: 'SET label = :newLabel, updatedAt = :updatedAt',
        });
        await docClient.send(changeLabelCommand);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Successfully changed label",
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
