import {
    APIGatewayProxyEventV2WithLambdaAuthorizer,
    APIGatewayProxyResultV2,
    Handler,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    GetCommand,
    UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { AuthorizerContext } from "models/auth";
import { removeKeys } from "resources/dynamo/utilities";

const { mainTable = "" } = process.env;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

type RequestBody = {
    studysetUUID: string;
    updates: { [key: string]: any };
};

export const handler: Handler = async (
    event: APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext>,
    context
): Promise<APIGatewayProxyResultV2> => {
    console.log(JSON.stringify({ event, context }, null, 4));

    const { sub: userUUID, username } = event.requestContext.authorizer.lambda;
    const body: RequestBody = JSON.parse(event.body ?? "{}");
    const { studysetUUID, updates } = body;

    try {
        const PK = `userUUID#${userUUID}`;
        const SK = `studyset#${studysetUUID}`;
        const updatedAt = new Date().toISOString();

        updates.updatedAt = updatedAt;
        // Functionality of multiple users being able to edit the same studyset
        updates.updatedBy = username;

        const updateExpressions: string[] = [];
        const ExpressionAttributeNames: Record<string, string> = {};
        const ExpressionAttributeValues: Record<string, any> = {};
        for (const key in updates) {
            const attributeKey = `#${key}`;
            const attributeValue = `:${key}`;

            updateExpressions.push(`${attributeKey} = ${attributeValue}`);
            ExpressionAttributeNames[attributeKey] = key;
            ExpressionAttributeValues[attributeValue] = updates[key];
        }

        const UpdateExpression = `SET ${updateExpressions.join(", ")}`;

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
                message: "Successfully updated study set",
                studyset: removeKeys(updatedStudyset ?? {}),
            }),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Error updating study set",
            }),
        };
    }
};
