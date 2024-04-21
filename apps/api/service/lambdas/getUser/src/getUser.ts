import {
    APIGatewayProxyEventV2WithLambdaAuthorizer,
    APIGatewayProxyResultV2,
    Handler,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { AuthorizerContext } from "models/auth";
import { removeKeys } from "resources/dynamo/utilities";

const { mainTable = "" } = process.env;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

type RequestBody = {};

export const handler: Handler = async (
    event: APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext>,
    context
): Promise<APIGatewayProxyResultV2> => {
    console.log(JSON.stringify({ event, context }, null, 4));

    const { sub: userUUID, username } = event.requestContext.authorizer.lambda

    try {
        const getCommand = new GetCommand({
            Key: {
                PK: `user#${userUUID}`,
            },
            TableName: mainTable,
        })

        const result = await docClient.send(getCommand);
        const user = result.Item;

        if (!user) {
            throw new Error(`Data for user ${username} with UUID ${userUUID} not found`)
        }

        removeKeys(user);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Successfully retrieved study set data",
                user,
            }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: error.message,
            }),
        };
    }
};
