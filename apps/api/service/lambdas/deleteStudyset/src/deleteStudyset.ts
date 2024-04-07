import {
    APIGatewayProxyEventV2,
    APIGatewayProxyResultV2,
    Handler,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const { mainDynamoDBTable = "" } = process.env;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

type RequestBody = {
    studysetUUID: string;
};

export const handler: Handler = async (
    event: APIGatewayProxyEventV2,
    context
): Promise<APIGatewayProxyResultV2> => {
    console.log(JSON.stringify({ event, context }, null, 4));

    const body: RequestBody = JSON.parse(event.body ?? "");

    try {
        // const deleteCommand = new DeleteCommand({
        //     TableName: mainDynamoDBTable,
        //     Item: initialStudySet
        // })

        // await docClient.send(deleteCommand);

        return {
            statusCode: 200,
            body: JSON.stringify({
                // studysetUUID
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
