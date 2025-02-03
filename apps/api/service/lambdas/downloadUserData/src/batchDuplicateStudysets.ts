import {
    APIGatewayProxyEventV2WithLambdaAuthorizer,
    APIGatewayProxyResultV2,
    Handler,
} from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { AuthorizerContext } from 'models/auth';
import { removeKeys } from 'resources/dynamo/utilities';
import { Studyset } from 'models/studysets';

const { mainTable = '' } = process.env;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

type RequestBody = {
    studysetUUIDs: string[];
};

export const handler: Handler = async (
    event: APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext>,
    context
): Promise<APIGatewayProxyResultV2> => {
    console.log(JSON.stringify({ event, context }, null, 4));
    try {
        const { sub: userUUID, username } =
            event.requestContext.authorizer.lambda;
        const body: RequestBody = JSON.parse(event.body ?? '{}');
        console.log(JSON.stringify({ body }, null, 4));

        const { studysetUUIDs } = body;

        const duplicateStudysetPromises = studysetUUIDs.map((studysetUUID) =>
            duplicateIndividualStudyset({ studysetUUID, username, userUUID })
        );

        await Promise.allSettled(duplicateStudysetPromises);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Successfully duplicated study sets',
                // studyset: duplicatedStudyset,
            }),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error',
            }),
        };
    }
};

type DuplicateIndividualStudysetParams = {
    studysetUUID: string;
    username: string;
    userUUID: string;
};
const duplicateIndividualStudyset = async ({
    studysetUUID,
    username,
    userUUID,
}: DuplicateIndividualStudysetParams) => {
    const getCommand = new GetCommand({
        Key: {
            PK: `userUUID#${userUUID}`,
            SK: `studyset#${studysetUUID}`,
        },
        TableName: mainTable,
    });
    const { Item } = await docClient.send(getCommand);

    if (!Item) {
        throw new Error(
            `Studyset with UUID ${studysetUUID} for user ${username} not found`
        );
    }

    const studyset = Item as Studyset;

    const newStudysetUUID = uuidv4();
    const timestamp = new Date().toISOString();

    const duplicatedStudyset = structuredClone(studyset);
    duplicatedStudyset.SK = `studyset#${newStudysetUUID}`;
    duplicatedStudyset.title = `${duplicatedStudyset.title} Copy`;
    duplicatedStudyset.createdAt = timestamp;
    duplicatedStudyset.updatedAt = timestamp;
    duplicatedStudyset.lastViewed = timestamp;
    duplicatedStudyset.studysetUUID = newStudysetUUID;
    duplicatedStudyset.cards = duplicatedStudyset.cards.map((card) => {
        const newCardUUID = uuidv4();
        const newNotes = card.notes.map((note) => ({
            ...note,
            noteUUID: uuidv4(),
        }));

        return {
            ...card,
            cardUUID: newCardUUID,
            notes: newNotes,
        };
    });

    const putCommand = new PutCommand({
        TableName: mainTable,
        Item: duplicatedStudyset,
    });

    await docClient.send(putCommand);
};
