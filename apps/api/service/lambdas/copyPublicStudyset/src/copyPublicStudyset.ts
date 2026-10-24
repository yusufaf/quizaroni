import {
    APIGatewayProxyEventV2WithLambdaAuthorizer,
    APIGatewayProxyResultV2,
    Handler,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { AuthorizerContext } from "models/auth";
import { Studyset } from "models/studysets";
import { findPublicStudyset } from "resources/dynamo/findPublicStudyset";
import { isPubliclyListed } from "resources/dynamo/publicSharing";
import { removeKeys } from "resources/dynamo/utilities";
import { copyCardFiles, isPlainObject, isUUID } from "utilities/cardFiles";
import { buildPublicCopy } from "utilities/copyPublicStudyset";
import { logRequest } from "utilities/logging";

const { mainTable = "", mainBucket = "" } = process.env;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const s3Client = new S3Client({});

const notFound = (): APIGatewayProxyResultV2 => ({
    statusCode: 404,
    body: JSON.stringify({
        message: "This study set is private or does not exist.",
    }),
});

const parseStudysetUUID = (body: string | undefined): string | undefined => {
    try {
        const parsed: unknown = JSON.parse(body ?? "{}");
        if (!isPlainObject(parsed)) return undefined;
        return isUUID(parsed.studysetUUID) ? parsed.studysetUUID : undefined;
    } catch {
        return undefined;
    }
};

/**
 * Saves someone else's public set into the caller's library (#140). Only a
 * publicly listed set can be saved; anything else is a 404, the same as the
 * public read. The source item is only read, never written.
 */
export const handler: Handler = async (
    event: APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext>,
    context
): Promise<APIGatewayProxyResultV2> => {
    logRequest(event);

    const { sub: userUUID, username } = event.requestContext.authorizer.lambda;
    const studysetUUID = parseStudysetUUID(event.body);
    if (!studysetUUID) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Invalid studysetUUID" }),
        };
    }

    try {
        const row = await findPublicStudyset({ docClient, table: mainTable, studysetUUID });
        if (!row) {
            return notFound();
        }

        // The index is eventually consistent: re-read the base row so a set
        // just unpublished, taken down or deleted can't be saved.
        const { Item } = await docClient.send(
            new GetCommand({
                TableName: mainTable,
                Key: { PK: row.PK, SK: row.SK },
                ConsistentRead: true,
            })
        );
        if (!Item || !isPubliclyListed(Item)) {
            return notFound();
        }

        const newStudysetUUID = randomUUID();
        const timestamp = new Date().toISOString();

        const copy = buildPublicCopy(Item as Studyset, {
            newUUID: newStudysetUUID,
            now: timestamp,
            saver: { userUUID, username },
        });
        copy.cards = await copyCardFiles({
            s3Client,
            bucket: mainBucket,
            cards: copy.cards,
            studysetUUID: newStudysetUUID,
        });

        await docClient.send(
            new PutCommand({
                TableName: mainTable,
                Item: copy,
            })
        );

        removeKeys(copy);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Successfully saved study set",
                studyset: copy,
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
