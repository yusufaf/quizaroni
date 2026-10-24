import {
    APIGatewayProxyEventV2,
    APIGatewayProxyResultV2,
    Handler,
} from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { Studyset } from 'models/studysets';
import { findPublicStudyset } from 'resources/dynamo/findPublicStudyset';
import {
    PublicStudysetSource,
    toPublicStudyset,
} from 'utilities/publicStudyset';
import { regenerateSignedUrls } from 'utilities/studysets';
import { logRequest } from 'utilities/logging';

const { mainTable = '', mainBucket = '' } = process.env;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const s3Client = new S3Client({});

const notFound = (): APIGatewayProxyResultV2 => ({
    statusCode: 404,
    body: JSON.stringify({
        message: 'This study set is private or does not exist.',
    }),
});

/**
 * Unauthenticated read of a single public study set. Registered without the
 * Cognito authorizer so crawlers, social scrapers, and logged-out visitors can
 * fetch it. Only the set's own index row may be served: pre-#125 copies can
 * share its SK2 (#171). `isPubliclyListed` enforces that and re-checks the
 * flag and moderation.
 */
export const handler: Handler = async (
    event: APIGatewayProxyEventV2,
    context
): Promise<APIGatewayProxyResultV2> => {
    logRequest(event);

    const studysetUUID = event.pathParameters?.studysetUUID ?? '';
    if (!studysetUUID) {
        return notFound();
    }

    try {
        const studyset = await findPublicStudyset({
            docClient,
            table: mainTable,
            studysetUUID,
        });

        if (!studyset) {
            return notFound();
        }

        // Regenerate signed URLs for any card attachments before the storage
        // keys are dropped.
        const studysetWithFreshUrls = await regenerateSignedUrls({
            s3Client,
            bucket: mainBucket,
            studyset: studyset as Studyset,
        });

        // Built from an explicit allowlist: notes, labels, categories, owner
        // ids and storage keys never leave.
        const publicStudyset = toPublicStudyset(
            studysetWithFreshUrls as PublicStudysetSource
        );

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                // Cache at the CDN/edge briefly so a viral link doesn't hammer
                // DynamoDB, while edits still propagate within minutes.
                'Cache-Control': 'public, max-age=60, s-maxage=300',
            },
            body: JSON.stringify({
                message: 'Successfully retrieved public study set',
                studyset: publicStudyset,
            }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: (error as Error).message,
            }),
        };
    }
};
