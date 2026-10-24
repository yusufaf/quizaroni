import {
    APIGatewayProxyEventV2WithLambdaAuthorizer,
    APIGatewayProxyResultV2,
    Handler,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    TransactWriteCommand,
    UpdateCommand,
    UpdateCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { AuthorizerContext } from "models/auth";
import { logRequest } from "utilities/logging";
import { buildUpdatedBy } from "utilities/updatedBy";

const { mainTable = "", usersTable = "" } = process.env;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Usable both on its own and as a transaction item.
type LabelUpdate = UpdateCommandInput & { UpdateExpression: string };

type RequestBody = {
    label: string;
    studysetUUID?: string;
    updateStudysetLabel?: boolean;
};

export const handler: Handler = async (
    event: APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext>,
    context
): Promise<APIGatewayProxyResultV2> => {
    logRequest(event);

    const { sub: userUUID, username } = event.requestContext.authorizer.lambda
    const body: RequestBody = JSON.parse(event.body ?? "{}");

    const { label, studysetUUID = "", updateStudysetLabel = false } = body;

    if (updateStudysetLabel && !studysetUUID) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: "studysetUUID is required",
            }),
        };
    }

    try {
        const userPK = `user#${userUUID}`;
        const userSK = 'userData';
        const updatedAt = new Date().toISOString();

        const userLabelsUpdate: LabelUpdate = {
            Key: {
                PK: userPK,
                SK: userSK,
            },
            TableName: usersTable,
            ExpressionAttributeNames: {
                '#labels': 'labels',
            },
            ExpressionAttributeValues: {
                ':newLabel': [label],
                ':updatedAt': updatedAt,
            },
            UpdateExpression: 'SET #labels = list_append(#labels, :newLabel), updatedAt = :updatedAt',
        };

        if (updateStudysetLabel) {
            const studysetsPK = `userUUID#${userUUID}`;
            const studysetsSK = `studyset#${studysetUUID}`;
            const updatedBy = buildUpdatedBy(username);
            const studysetLabelUpdate: LabelUpdate = {
                Key: {
                    PK: studysetsPK,
                    SK: studysetsSK,
                },
                TableName: mainTable,
                ExpressionAttributeNames: {
                    '#labels': 'labels',
                },
                ExpressionAttributeValues: {
                    ':newLabelArray': [label],
                    ':emptyList': [],
                    ':updatedAt': updatedAt,
                    ...updatedBy.values,
                },
                UpdateExpression: [
                    'SET #labels = list_append(if_not_exists(#labels, :emptyList), :newLabelArray)',
                    'updatedAt = :updatedAt',
                    ...updatedBy.clauses,
                ].join(', '),
                // Labelling a missing set must not create a stub item.
                ConditionExpression: 'attribute_exists(PK)',
            };
            // One transaction, so a missing set leaves the user's labels alone.
            await docClient.send(
                new TransactWriteCommand({
                    TransactItems: [
                        { Update: studysetLabelUpdate },
                        { Update: userLabelsUpdate },
                    ],
                })
            );
        } else {
            await docClient.send(new UpdateCommand(userLabelsUpdate));
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Successfully created label",
            }),
        };
    } catch (err) {
        const { name, CancellationReasons } = err as {
            name?: string;
            CancellationReasons?: { Code?: string }[];
        };
        if (
            name === "TransactionCanceledException" &&
            CancellationReasons?.[0]?.Code === "ConditionalCheckFailed"
        ) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: "Studyset not found",
                }),
            };
        }

        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Error",
            }),
        };
    }
};
