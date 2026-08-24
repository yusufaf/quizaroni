import {
    APIGatewayProxyEventV2,
    APIGatewayProxyResultV2,
    Handler,
} from "aws-lambda";
import { createHmac, timingSafeEqual } from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const { usersTable = "", logtoWebhookSigningKey = "" } = process.env;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

type LogtoUser = {
    id: string;
    username: string | null;
    primaryEmail: string | null;
};

type LogtoWebhookPayload = {
    event: string;
    data?: LogtoUser;
};

// Pulled out of the handler so the User.Created event-shape parsing —
// `data`, not `user`, is where Logto actually nests the created user — is
// unit-testable without an AWS SDK double.
export const extractCreatedUser = (payload: LogtoWebhookPayload): LogtoUser | null =>
    payload.event === "User.Created" && payload.data ? payload.data : null;

export const verifySignature = (rawBody: string, signature: string): boolean => {
    if (!logtoWebhookSigningKey || !signature) {
        return false;
    }

    const expected = createHmac("sha256", logtoWebhookSigningKey)
        .update(rawBody)
        .digest("hex");

    const expectedBuffer = Buffer.from(expected, "utf8");
    const signatureBuffer = Buffer.from(signature, "utf8");

    return (
        expectedBuffer.length === signatureBuffer.length &&
        timingSafeEqual(expectedBuffer, signatureBuffer)
    );
};

/**
 * Registered in the Logto console (Console > Webhooks) against the
 * User.Created event. This is the Logto-era replacement for
 * postConfirmationTrigger.ts (Cognito's post-confirmation Lambda trigger),
 * which stops firing once sign-up moves off Cognito — without this, a new
 * Logto sign-up would have no DynamoDB user row and every downstream
 * endpoint (getUser included) would fail for that user.
 *
 * @see https://docs.logto.io/developers/webhooks
 */
export const handler: Handler = async (
    event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
    const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body ?? "", "base64").toString("utf8")
        : (event.body ?? "");

    const signature =
        event.headers?.["logto-signature-sha-256"] ??
        event.headers?.["Logto-Signature-Sha-256"] ??
        "";

    if (!verifySignature(rawBody, signature)) {
        console.error("Rejected webhook: signature mismatch");
        return {
            statusCode: 401,
            body: JSON.stringify({ message: "Invalid signature" }),
        };
    }

    let payload: LogtoWebhookPayload;
    try {
        payload = JSON.parse(rawBody);
    } catch (error) {
        console.error("Rejected webhook: invalid JSON body", error);
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Invalid JSON" }),
        };
    }

    const createdUser = extractCreatedUser(payload);
    if (!createdUser) {
        // Ack anything else so Logto doesn't retry — this endpoint is only
        // registered against User.Created, but ack unknown events safely
        // rather than 400 them.
        return { statusCode: 200, body: JSON.stringify({ message: "Ignored" }) };
    }

    const { id: userUUID, username, primaryEmail: email } = createdUser;
    const timestamp = new Date().toISOString();

    try {
        await docClient.send(
            new PutCommand({
                TableName: usersTable,
                Item: {
                    PK: `user#${userUUID}`,
                    SK: "userData",
                    createdAt: timestamp,
                    email,
                    emailVerified: true,
                    labels: [],
                    metadata: {
                        defaultTheme: "dark",
                        homeView: "table",
                        namedColors: [],
                        visibleColumns: {},
                        preferredDateFormat: "MM/DD/YYYY",
                        defaultDownloadFormat: "JSON",
                    },
                    updatedAt: timestamp,
                    username,
                    userUUID,
                },
                // Never overwrite an existing row — Logto can retry a
                // webhook delivery, and a duplicate User.Created for an
                // already-provisioned user should be a no-op, not a reset of
                // whatever the user has changed since.
                ConditionExpression: "attribute_not_exists(PK)",
            })
        );

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "User provisioned" }),
        };
    } catch (error) {
        // A ConditionalCheckFailedException means the row already exists —
        // that's a successful no-op, not an error to report or retry.
        if ((error as { name?: string }).name === "ConditionalCheckFailedException") {
            return {
                statusCode: 200,
                body: JSON.stringify({ message: "Already provisioned" }),
            };
        }

        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: (error as Error).message }),
        };
    }
};
