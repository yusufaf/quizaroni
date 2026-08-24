/**
 * One-off migration: move a single user's data from the Cognito-era dev
 * tables to the Logto-era production tables, rekeyed to their new Logto id.
 *
 * Phase 3 of the Logto migration deliberately does not migrate all dev data
 * to production — prod starts empty and users re-sign-up fresh. This user is
 * the one exception (real study sets worth preserving; decided explicitly in
 * an earlier session). See logto-migration-phase3-handoff.md, step 4.
 *
 * Usage (with AWS credentials for the target account in the environment):
 *   SOURCE_USERS_TABLE=quizaroni-development-users \
 *   SOURCE_MAIN_TABLE=quizaroni-development-main \
 *   TARGET_USERS_TABLE=quizaroni-production-users \
 *   TARGET_MAIN_TABLE=quizaroni-production-main \
 *   OLD_SUB=<cognito-sub> \
 *   NEW_LOGTO_ID=<logto-user-id> \
 *     pnpm --filter @quizaroni/api migrate:logto-user
 *   # add DRY_RUN=1 to only report what would move.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    QueryCommand,
} from '@aws-sdk/lib-dynamodb';

const {
    SOURCE_USERS_TABLE = '',
    SOURCE_MAIN_TABLE = '',
    TARGET_USERS_TABLE = '',
    TARGET_MAIN_TABLE = '',
    OLD_SUB = '',
    NEW_LOGTO_ID = '',
} = process.env;
const dryRun = process.env.DRY_RUN === '1';

for (const [name, value] of Object.entries({
    SOURCE_USERS_TABLE,
    SOURCE_MAIN_TABLE,
    TARGET_USERS_TABLE,
    TARGET_MAIN_TABLE,
    OLD_SUB,
    NEW_LOGTO_ID,
})) {
    if (!value) {
        console.error(`Set ${name}, e.g. quizaroni-development-users`);
        process.exit(1);
    }
}

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// PK/userUUID aren't the only place the old sub shows up — card file
// attachments store their S3 object key (and a since-expired presigned
// signedURL) inline, e.g. `${studysetUUID}/${OLD_SUB}/${fileName}`. Those
// keys were separately re-copied in the target bucket under the new id (see
// the migration handoff doc), so every embedded reference has to move too or
// getStudyset's signed-URL refresh will look up a key that doesn't exist.
// A UUID this specific won't collide with legitimate unrelated data, so a
// blanket string replace across the whole item is simpler and safer than
// hand-walking `cards[].files[].key`.
const rekey = <T,>(item: T): T =>
    JSON.parse(JSON.stringify(item).split(OLD_SUB).join(NEW_LOGTO_ID));

const run = async () => {
    // ---- users table: one item ----
    const userResult = await docClient.send(
        new GetCommand({
            TableName: SOURCE_USERS_TABLE,
            Key: { PK: `user#${OLD_SUB}`, SK: 'userData' },
        })
    );

    if (!userResult.Item) {
        console.error(
            `No item found in ${SOURCE_USERS_TABLE} for PK=user#${OLD_SUB}, SK=userData`
        );
        process.exit(1);
    }

    const newUserItem = rekey({
        ...userResult.Item,
        PK: `user#${NEW_LOGTO_ID}`,
    });

    console.log(
        `users: ${dryRun ? 'would copy' : 'copying'} user#${OLD_SUB} -> user#${NEW_LOGTO_ID}` +
            ` (username: ${String(userResult.Item.username)})`
    );

    if (!dryRun) {
        // Overwrite deliberately: the webhook already provisioned a fresh
        // (empty) row for NEW_LOGTO_ID on sign-up. This replaces it with the
        // migrated data, unlike the webhook's own attribute_not_exists guard.
        await docClient.send(
            new PutCommand({ TableName: TARGET_USERS_TABLE, Item: newUserItem })
        );
    }

    // ---- main table: every item under PK = userUUID#<OLD_SUB> ----
    let queried = 0;
    let written = 0;
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
        const result = await docClient.send(
            new QueryCommand({
                TableName: SOURCE_MAIN_TABLE,
                KeyConditionExpression: 'PK = :pk',
                ExpressionAttributeValues: { ':pk': `userUUID#${OLD_SUB}` },
                ExclusiveStartKey: lastEvaluatedKey as never,
            })
        );

        for (const item of result.Items ?? []) {
            queried += 1;
            const newItem = rekey({
                ...item,
                PK: `userUUID#${NEW_LOGTO_ID}`,
            });

            if (!dryRun) {
                await docClient.send(
                    new PutCommand({ TableName: TARGET_MAIN_TABLE, Item: newItem })
                );
            }
            written += 1;
        }

        lastEvaluatedKey = result.LastEvaluatedKey as
            | Record<string, unknown>
            | undefined;
    } while (lastEvaluatedKey);

    console.log(
        `main: ${dryRun ? 'would copy' : 'copied'} ${written}/${queried} item(s)` +
            (dryRun ? '' : written === queried ? ' — counts match' : ' — MISMATCH')
    );

    if (!dryRun && written !== queried) {
        console.error('Item count mismatch — investigate before trusting the migration.');
        process.exit(1);
    }
};

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
