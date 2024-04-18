import {
    APIGatewayProxyEventV2WithLambdaAuthorizer,
    APIGatewayProxyResultV2,
    Handler,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { AuthorizerContext } from "models/auth";

const { mainDynamoDBTable = "" } = process.env;

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
    const body: RequestBody = JSON.parse(event.body ?? "");

    try {
        const studysetUUID = uuidv4();
        const timestamp = new Date().getTime();
        const initialMetadata = {
            backgroundColorVisible: false,
            createOnly: false,
            customLabelTerminology: "",
            customTerminology: "",
            labelTerminolgy: "Card",
            notesDrawerPosition: "right",
            publiclyViewable: false,
            terminology: "Term/Definition",
            textColorVisible: false,
        }
        const initialStudySet = {
            PK: `studyset#${studysetUUID}`,
            SK: `userUUID#${userUUID}`,
            cards: [],
            categories: [],
            createdAt: timestamp,
            favorited: false,
            label: "",
            lastViewed: timestamp,
            metadata: initialMetadata,
            updatedAt: timestamp,
            studysetUUID,
            username,
            userUUID,
        }

        const putCommand = new PutCommand({
            TableName: mainDynamoDBTable,
            Item: initialStudySet
        })

        await docClient.send(putCommand);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Successfully created study set",
                studyset: initialStudySet,
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
