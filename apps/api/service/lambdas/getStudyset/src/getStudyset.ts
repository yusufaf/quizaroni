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

type RequestBody = {
    studysetUUID: string;
};

export const handler: Handler = async (
    event: APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext>,
    context
): Promise<APIGatewayProxyResultV2> => {
    console.log(JSON.stringify({ event, context }, null, 4));

    const { sub: userUUID, username } = event.requestContext.authorizer.lambda
    const body: RequestBody = JSON.parse(event.body ?? "{}");
    console.log(JSON.stringify({body}, null, 4));

    const { studysetUUID } = body;

    try {
        const getCommand = new GetCommand({
            Key: {
                PK: `userUUID#${userUUID}`,
                SK: `studyset#${studysetUUID}`,
            },
            TableName: mainTable,
        })
        // TODO: Think about shared sessions

        const result = await docClient.send(getCommand);
        const studyset = result.Item;

        if (!studyset) {
            throw new Error(`Studyset with UUID ${studysetUUID} for user ${username} not found`)
        }

        removeKeys(studyset);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Successfully retrieved study set data",
                studyset,
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
