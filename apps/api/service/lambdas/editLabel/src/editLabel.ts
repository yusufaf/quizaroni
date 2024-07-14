import {
    APIGatewayProxyEventV2WithLambdaAuthorizer,
    APIGatewayProxyResultV2,
    Handler,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { BatchWriteCommand, DynamoDBDocumentClient, GetCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { AuthorizerContext } from "models/auth";
import { User } from "models/user";

const { mainTable = "", usersTable = "" } = process.env;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

type RequestBody = {
    index: number; 
    oldLabel: string;
    newLabel: string;
};

export const handler: Handler = async (
    event: APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext>,
    context
): Promise<APIGatewayProxyResultV2> => {
    console.log(JSON.stringify({ event, context }, null, 4));

    const { sub: userUUID, username } = event.requestContext.authorizer.lambda
    const body: RequestBody = JSON.parse(event.body ?? "{}");
    const { index, newLabel, oldLabel } = body;

    try {
        const userPK = `user#${userUUID}`;
        const userSK = "userData";
        const updatedAt = new Date().toISOString();

        const getCommand = new GetCommand({
            TableName: usersTable,
            Key: { PK: userPK, SK: userSK },
        });

        const { Item } = await docClient.send(getCommand);
        if (!Item) {
            throw new Error(
                `Data for user ${username} with UUID ${userUUID} not found`
            );
        }
        const user = Item as User;

        const { labels: currentLabels = [] } = user;
        const newLabels = [...currentLabels];
        newLabels[index] = newLabel;

        const editLabelCommand = new UpdateCommand({
            Key: {
                PK: userPK,
                SK: userSK,
            },
            TableName: mainTable,
            ExpressionAttributeValues: {
                ":newLabels": newLabels,
                ':updatedAt': updatedAt,
            },
            UpdateExpression: 'SET labels = :newLabels, updatedAt = :updatedAt',
        });
        await docClient.send(editLabelCommand);

        await editLabelInAffectedStudysets({
            newLabel,
            oldLabel,
            PK: userPK,
            username,
        })

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Successfully edited label",
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

const editLabelInAffectedStudysets = async ({
    newLabel,
    oldLabel,
    PK,
    username
}: {
    oldLabel: string,
    newLabel: string,
    PK: string;
    username: string;
}) => {
    // Query for all study sets of the user
    const queryCommand = new QueryCommand({
        TableName: mainTable,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
            ":pk": PK,
            ":skPrefix": "studyset",
        },
    });
    const { Items: studysets } = await docClient.send(queryCommand);

    if (!studysets || studysets.length === 0) {
        throw new Error("No study sets found for the user");
    }

    const updatedAt = new Date().toISOString();
    const updatedStudysets = studysets
        .filter((studyset) => studyset.label === oldLabel)
        .map((item) => {
            return {
                PutRequest: {
                    Item: {
                        ...item,
                        label: newLabel,
                        updatedAt: updatedAt,
                        updatedBy: username,
                    },
                },
            };
        });

    // Batch write in chunks of 25 items (DynamoDB batch write limit)
    const chunkSize = 25;
    for (let i = 0; i < updatedStudysets.length; i += chunkSize) {
        const chunk = updatedStudysets.slice(i, i + chunkSize);
        const batchWriteCommand = new BatchWriteCommand({
            RequestItems: {
                [mainTable]: chunk,
            },
        });

        await docClient.send(batchWriteCommand);
    }
};
