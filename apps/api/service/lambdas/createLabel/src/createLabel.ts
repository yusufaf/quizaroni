import {
    APIGatewayProxyEventV2WithLambdaAuthorizer,
    APIGatewayProxyResultV2,
    Handler,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { AuthorizerContext } from "models/auth";

const { mainTable = "", usersTable = "" } = process.env;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

type RequestBody = {
    label: string;
    studysetUUID?: string;
    updateStudysetLabel?: boolean;
};

export const handler: Handler = async (
    event: APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext>,
    context
): Promise<APIGatewayProxyResultV2> => {
    console.log(JSON.stringify({ event, context }, null, 4));

    const { sub: userUUID, username } = event.requestContext.authorizer.lambda
    const body: RequestBody = JSON.parse(event.body ?? "{}");
    const { label, studysetUUID = "", updateStudysetLabel = false } = body;

    try {
        const userPK = `user#${userUUID}`;
        const userSK = 'userData';
        const updatedAt = new Date().toISOString();

        const UpdateExpression = 'SET #labels = list_append(#labels, :newLabel), #updatedAt = :updatedAt';
        const userLabelsUpdateCommand = new UpdateCommand({
            Key: {
                PK: userPK,
                SK: userSK,
            },
            TableName: usersTable,
            ExpressionAttributeNames: {
                '#labels': 'labels',
                '#updatedAt': 'updatedAt',
                '#updatedBy': 'updatedBy',
            },
            ExpressionAttributeValues: {
                ':newLabel': [label],
                ':updatedAt': updatedAt,
                ':updatedBy': username,
            },
            UpdateExpression,
        });
        await docClient.send(userLabelsUpdateCommand);

        if (updateStudysetLabel) {
            const studysetsPK = `userUUID#${userUUID}`;
            const studysetsSK = `studyset#${studysetUUID}`;
            const updatedAt = new Date().toISOString();

            const UpdateExpression = 'SET #label = :newLabel, #updatedAt = :updatedAt, #updatedBy = :updatedBy';
            const studysetLabelUpdateCommand = new UpdateCommand({
                Key: {
                    PK: studysetsPK,
                    SK: studysetsSK,
                },
                TableName: mainTable,
                ExpressionAttributeNames: {
                    '#label': 'label',
                    '#updatedAt': 'updatedAt',
                    '#updatedBy': 'updatedBy',
                },
                ExpressionAttributeValues: {
                    ':newLabel': label,
                    ':updatedAt': updatedAt,
                    ':updatedBy': username,
                },
                UpdateExpression,
            });
            await docClient.send(studysetLabelUpdateCommand);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Successfully created label",
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
