import {
    APIGatewayProxyEventV2WithLambdaAuthorizer,
    APIGatewayProxyResultV2,
    Handler,
} from "aws-lambda";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand  } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { AuthorizerContext } from "models/auth";

const { mainTable = "" } = process.env;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

type RequestBody = {
    studysetUUID: string;
};

export const handler: Handler = async (
    event: APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext>,
    context
): Promise<APIGatewayProxyResultV2> => {
    console.log(JSON.stringify({ event, context }, null, 4));
    const { sub: userUUID } = event.requestContext.authorizer.lambda
    const body: RequestBody = JSON.parse(event.body ?? "");

    try {
        const SK = `userUUID#${userUUID}`;
        const queryCommand = new QueryCommand({
            TableName: mainTable,
            KeyConditionExpression: "#sortKey = :sortKeyValue",
            ExpressionAttributeNames: {
                "#sortKey": "SK"
            },
            ExpressionAttributeValues: {
                ":sortKeyValue": SK
            }
        });
        const { Items: studysets } = await docClient.send(queryCommand);

        return {
            statusCode: 200,
            body: JSON.stringify({
                studysets: studysets ?? []
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
