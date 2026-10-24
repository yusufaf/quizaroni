import {
    APIGatewayProxyEventV2WithLambdaAuthorizer,
    APIGatewayProxyResultV2,
    Handler,
} from "aws-lambda";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { AuthorizerContext } from "models/auth";
import { studysetUUIDOfKey } from "utilities/cardFiles";
import { logRequest } from "utilities/logging";
import { callerOwnsStudyset } from "utilities/studysets";

const { mainBucket = "", mainTable = "" } = process.env;

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3Client = new S3Client();

type RequestBody = {
    key: string;
};

export const handler: Handler = async (
    event: APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext>,
    context
): Promise<APIGatewayProxyResultV2> => {
    logRequest(event);

    const { sub: userUUID } = event.requestContext.authorizer.lambda;
    const body: RequestBody = JSON.parse(event.body ?? "{}");
    
    const { key } = body;    

    const studysetUUID = studysetUUIDOfKey(key);
    if (!studysetUUID) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Invalid file key" }),
        };
    }

    try {
        if (!(await callerOwnsStudyset({ docClient, mainTable, studysetUUID, userUUID }))) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: "Forbidden" }),
            };
        }


        const deleteCommand = new DeleteObjectCommand({
            Bucket: mainBucket,
            Key: key,
        })
        const deleteResponse = await s3Client.send(deleteCommand);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Successfully deleted file",
            }),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Error deleting file",
            }),
        };
    }
};
