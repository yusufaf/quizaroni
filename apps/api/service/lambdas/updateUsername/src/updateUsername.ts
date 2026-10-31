import {
    APIGatewayProxyEventV2WithLambdaAuthorizer,
    APIGatewayProxyResultV2,
    Handler,
} from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { isValidUsername } from '@quizaroni/shared-types';
import { AuthorizerContext } from 'models/auth';
import { removeKeys } from 'resources/dynamo/utilities';
import { logRequest } from 'utilities/logging';
import { updateLogtoUsername } from 'utilities/logtoManagement';
import { renameStudysetAuthor } from 'utilities/renameStudysetAuthor';

const { usersTable = '', mainTable = '' } = process.env;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const respond = (statusCode: number, message: string) => ({
    statusCode,
    body: JSON.stringify({ message }),
});

const parseUsername = (body: string | undefined): unknown => {
    try {
        const raw = (JSON.parse(body ?? '{}') as { username?: unknown } | null)?.username;
        return typeof raw === 'string' ? raw.trim() : raw;
    } catch {
        return undefined;
    }
};

const isConditionFailure = (err: unknown) =>
    (err as { name?: string }).name === 'ConditionalCheckFailedException';

/**
 * Logto owns the username (and its uniqueness) and stamps it into the token's
 * claim, so it is renamed first; a "taken" name never touches our data. Every
 * step after it is safe to redo, so a client retry after a failure converges.
 */
export const handler: Handler = async (
    event: APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext>,
    context
): Promise<APIGatewayProxyResultV2> => {
    logRequest(event);

    const { sub: userUUID } = event.requestContext.authorizer.lambda;
    const username = parseUsername(event.body);

    if (!isValidUsername(username)) {
        return respond(400, 'Invalid username');
    }

    const Key = { PK: `user#${userUUID}`, SK: 'userData' };

    try {
        // Without a provisioned row the IdP must not be renamed: a row without
        // metadata is a stub (#208), as in updateUserMetadata.
        const { Item } = await docClient.send(
            new GetCommand({
                TableName: usersTable,
                Key,
                ProjectionExpression: '#PK, #metadata',
                ExpressionAttributeNames: { '#PK': 'PK', '#metadata': 'metadata' },
                ConsistentRead: true,
            })
        );
        if (!Item || Item.metadata === undefined) {
            return respond(404, 'User not found');
        }

        const result = await updateLogtoUsername({ userId: userUUID, username });
        if (result === 'taken') {
            return respond(409, 'Username taken');
        }

        const { Attributes } = await docClient.send(
            new UpdateCommand({
                TableName: usersTable,
                Key,
                UpdateExpression: 'SET #username = :username, #updatedAt = :updatedAt, #updatedBy = :username',
                ConditionExpression: 'attribute_exists(PK) AND attribute_exists(#metadata)',
                ExpressionAttributeNames: {
                    '#username': 'username',
                    '#updatedAt': 'updatedAt',
                    '#updatedBy': 'updatedBy',
                    '#metadata': 'metadata',
                },
                ExpressionAttributeValues: {
                    ':username': username,
                    ':updatedAt': new Date().toISOString(),
                },
                ReturnValues: 'ALL_NEW',
            })
        );

        // Logto and the profile are already renamed, so a miss here is
        // reported, not a 500. Publishing re-stamps a set's name later anyway.
        let rename = { updated: 0, failed: 0, complete: false };
        try {
            rename = await renameStudysetAuthor({ docClient, mainTable, userUUID, username });
        } catch (err) {
            console.error('Study set rename failed', (err as { name?: string })?.name);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Successfully updated username',
                user: removeKeys(Attributes ?? {}),
                studysetsUpdated: rename.updated,
                studysetsFailed: rename.failed,
                studysetsRenameComplete: rename.complete,
            }),
        };
    } catch (err) {
        if (isConditionFailure(err)) {
            return respond(404, 'User not found');
        }
        console.error(err);
        return respond(500, 'Error updating username');
    }
};
