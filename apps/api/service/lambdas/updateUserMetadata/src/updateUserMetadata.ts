import {
    APIGatewayProxyEventV2WithLambdaAuthorizer,
    APIGatewayProxyResultV2,
    Handler,
} from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    GetCommand,
    UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { AuthorizerContext } from 'models/auth';
import { removeKeys } from 'resources/dynamo/utilities';
import { isPlainObject } from 'utilities/cardFiles';
import { logRequest } from 'utilities/logging';

const { usersTable = '' } = process.env;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

type RequestBody = {
    updates: unknown;
};

const respond = (statusCode: number, message: string) => ({
    statusCode,
    body: JSON.stringify({ message }),
});

/**
 * Client keys never become placeholder names (they get `#key<N>`/`:value<N>`),
 * so a key can't overwrite the server's `updatedAt`/`updatedBy` or build an
 * invalid placeholder (#203, #185). Both are server-set, so copies in
 * `updates` are dropped. `#metadata` is sent only when a clause uses it, since
 * DynamoDB rejects an unused name (#184). `updatedBy` is skipped when the
 * token has no username (#180).
 */
const buildUserMetadataUpdate = ({
    updates,
    updatedAt,
    updatedBy,
}: {
    updates: Record<string, unknown>;
    updatedAt: string;
    updatedBy?: string;
}) => {
    const updateExpressions = ['#updatedAt = :updatedAt'];
    const ExpressionAttributeNames: Record<string, string> = { '#updatedAt': 'updatedAt' };
    const ExpressionAttributeValues: Record<string, unknown> = { ':updatedAt': updatedAt };

    if (updatedBy) {
        updateExpressions.push('#updatedBy = :updatedBy');
        ExpressionAttributeNames['#updatedBy'] = 'updatedBy';
        ExpressionAttributeValues[':updatedBy'] = updatedBy;
    }

    const {
        updatedAt: _ignoredUpdatedAt,
        updatedBy: _ignoredUpdatedBy,
        ...clientUpdates
    } = updates;

    Object.entries(clientUpdates).forEach(([key, value], index) => {
        updateExpressions.push(`#metadata.#key${index} = :value${index}`);
        ExpressionAttributeNames[`#key${index}`] = key;
        ExpressionAttributeValues[`:value${index}`] = value;
    });
    if (Object.keys(clientUpdates).length > 0) {
        ExpressionAttributeNames['#metadata'] = 'metadata';
    }

    return {
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
    };
};

export const handler: Handler = async (
    event: APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext>,
    context
): Promise<APIGatewayProxyResultV2> => {
    logRequest(event);

    const { sub: userUUID, username } = event.requestContext.authorizer.lambda;
    const updates = (JSON.parse(event.body ?? '{}') as RequestBody | null)?.updates;

    // DynamoDB rejects an empty attribute name.
    if (!isPlainObject(updates) || '' in updates) {
        return respond(400, 'Invalid updates');
    }

    try {
        const PK = `user#${userUUID}`;
        const SK = `userData`;
        const updatedAt = new Date().toISOString();

        const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } =
            buildUserMetadataUpdate({ updates, updatedAt, updatedBy: username });

        const updateCommand = new UpdateCommand({
            Key: {
                PK,
                SK,
            },
            TableName: usersTable,
            ExpressionAttributeNames,
            ExpressionAttributeValues,
            UpdateExpression,
        });
        await docClient.send(updateCommand);

        const getCommand = new GetCommand({
            Key: {
                PK,
                SK,
            },
            TableName: usersTable,
        });
        const getResult = await docClient.send(getCommand);
        const updatedUser = getResult.Item;

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Successfully updated user metadata',
                user: removeKeys(updatedUser ?? {}),
            }),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error updating user metadata',
            }),
        };
    }
};
