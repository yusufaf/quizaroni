import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { Studyset } from 'models/studysets';

type GetStudysetParams = {
    docClient: DynamoDBDocumentClient;
    mainTable: string;
    studysetUUID: string;
    userUUID: string;
};
export const getStudysetFromDynamo = async ({
    docClient,
    mainTable,
    studysetUUID,
    userUUID,
}: GetStudysetParams) => {
    const PK = `userUUID#${userUUID}`;
    const SK = `studyset#${studysetUUID}`;

    const getCommand = new GetCommand({
        Key: {
            PK,
            SK,
        },
        TableName: mainTable,
    });

    const { Item } = await docClient.send(getCommand);

    if (!Item) {
        throw new Error(
            `Studyset with UUID ${studysetUUID} for user ${userUUID} not found`
        );
    }

    console.log('Studyset returned \n', JSON.stringify(Item, null, 4));

    return Item as Studyset;
};
