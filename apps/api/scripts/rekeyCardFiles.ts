/**
 * One-off migration: move card files to opaque S3 keys.
 *
 * Card files used to be stored under `${studysetUUID}/${userUUID}/${fileName}`
 * (or `${studysetUUID}/${ownerUUID}/${n}-${fileName}` for duplicates). A
 * presigned URL carries its key, so public image URLs exposed the owner id
 * and the uploaded file name (#152). New uploads and duplicates now use
 * `${studysetUUID}/${fileUUID}`; this script moves the existing ones.
 *
 * It runs in two passes:
 * - Re-key: for each study set with legacy keys, copy every legacy object to
 *   a new opaque key, then point the cards at the copies with a conditional
 *   update (skipped if the cards changed since the scan). Legacy objects are
 *   never deleted here; each migrated key is appended to the MANIFEST file.
 * - Delete (DELETE_OLD=1, at least 7 days later): delete the manifest keys
 *   that no study set references any more.
 * Deletion is deferred because an editor tab opened before the migration
 * saves its full stale cards: updateStudyset then deletes the new copies and
 * writes the legacy keys back. The legacy objects have to outlive those tabs;
 * the next re-key run migrates such sets again.
 *
 * Both passes are safe to rerun. The re-key pass holds the matched items in
 * memory and the delete pass every referenced key, which is fine at the
 * current scale.
 *
 * Run only after the API that writes opaque keys is deployed to that
 * environment, and rerun the re-key pass until it reports filesCopied=0.
 *
 * Usage (with AWS credentials for the target account in the environment):
 *   MAIN_TABLE=quizaroni-<deploymentType>-main \
 *   MAIN_BUCKET=quizaroni-<deploymentType>-main \
 *   MANIFEST=<path outside the repo> AWS_REGION=us-west-2 \
 *     pnpm --filter @quizaroni/api migrate:card-file-keys
 *   # add DRY_RUN=1 to only report what would change.
 *   # add DELETE_OLD=1 (same MANIFEST) for the delete pass.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    CopyObjectCommand,
    DeleteObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import {
    DynamoDBDocumentClient,
    ScanCommand,
    UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import * as fs from 'fs';
import {
    cardFileKey,
    encodeCopySourceKey,
    isOpaqueCardFileKey,
} from '../utilities/cardFiles';
import { isDryRun } from './dryRun';

type StudysetItem = Record<string, unknown> & { PK: string; SK: string };

type FileLike = Record<string, unknown> & { key?: unknown };

type CardLike = Record<string, unknown> & { files?: unknown };

type RekeyResult = {
    scanned: number;
    matched: number;
    updated: number;
    skipped: number;
    filesCopied: number;
    filesMissing: number;
};

type DeleteResult = {
    candidates: number;
    stillReferenced: number;
    deleted: number;
};

type RekeyConfig = {
    tableName: string;
    bucket: string;
    manifestPath: string;
    dryRun: boolean;
    deleteOld: boolean;
};

const required = (env: NodeJS.ProcessEnv, name: string, hint: string) => {
    const value = env[name] ?? '';
    if (!value) {
        throw new Error(`Set ${name} to ${hint}`);
    }
    return value;
};

export const readRekeyConfig = (env: NodeJS.ProcessEnv): RekeyConfig => ({
    tableName: required(
        env,
        'MAIN_TABLE',
        'the target table name, e.g. quizaroni-production-main'
    ),
    bucket: required(
        env,
        'MAIN_BUCKET',
        'the target bucket name, e.g. quizaroni-production-main'
    ),
    manifestPath: required(
        env,
        'MANIFEST',
        'a file path outside the repo; the delete pass reads it back'
    ),
    dryRun: isDryRun(env.DRY_RUN),
    // Destructive, so only an exact value turns it on.
    deleteOld: env.DELETE_OLD === '1',
});

const cardsOf = (item: StudysetItem): CardLike[] =>
    Array.isArray(item.cards) ? item.cards : [];

const filesOf = (card: CardLike): FileLike[] =>
    Array.isArray(card?.files) ? card.files : [];

// Stored cards aren't validated on write, so skip anything but string keys.
export const cardFileKeysOf = (item: StudysetItem): string[] => [
    ...new Set(
        cardsOf(item)
            .flatMap(filesOf)
            .map((file) => file?.key)
            .filter((key): key is string => typeof key === 'string' && key !== '')
    ),
];

export const legacyCardFileKeys = (item: StudysetItem): string[] =>
    cardFileKeysOf(item).filter(
        (key) => !isOpaqueCardFileKey(key, item.studysetUUID as string | undefined)
    );

// One JSON string per line, since a file name can hold any character. Every
// line ends with a newline because the file is built one append per item.
export const formatManifestLines = (keys: string[]): string =>
    keys.map((key) => `${JSON.stringify(key)}\n`).join('');

export const parseManifest = (text: string): string[] => [
    ...new Set(
        text
            .split('\n')
            .filter((line) => line.trim() !== '')
            .map((line) => JSON.parse(line) as string)
    ),
];

export async function* scanStudysets({
    docClient,
    tableName,
}: {
    docClient: DynamoDBDocumentClient;
    tableName: string;
}): AsyncGenerator<StudysetItem> {
    let lastEvaluatedKey: Record<string, unknown> | undefined;
    do {
        const page = await docClient.send(
            new ScanCommand({
                TableName: tableName,
                FilterExpression: 'begins_with(#SK, :p)',
                ExpressionAttributeNames: { '#SK': 'SK' },
                ExpressionAttributeValues: { ':p': 'studyset#' },
                ExclusiveStartKey: lastEvaluatedKey as never,
            })
        );
        for (const item of page.Items ?? []) {
            yield item as StudysetItem;
        }
        lastEvaluatedKey = page.LastEvaluatedKey as
            | Record<string, unknown>
            | undefined;
    } while (lastEvaluatedKey);
}

const errorName = (error: unknown) => (error as Error)?.name;

export const rekeyCardFiles = async ({
    docClient,
    s3Client,
    tableName,
    bucket,
    dryRun,
    log = console.log,
    newFileKey = cardFileKey,
    recordMigrated,
}: {
    docClient: DynamoDBDocumentClient;
    s3Client: S3Client;
    tableName: string;
    bucket: string;
    dryRun: boolean;
    log?: (message: string) => void;
    newFileKey?: (studysetUUID: string) => string;
    recordMigrated: (oldKeys: string[]) => void;
}): Promise<RekeyResult> => {
    const result: RekeyResult = {
        scanned: 0,
        matched: 0,
        updated: 0,
        skipped: 0,
        filesCopied: 0,
        filesMissing: 0,
    };

    const matched: StudysetItem[] = [];
    for await (const item of scanStudysets({ docClient, tableName })) {
        result.scanned += 1;
        if (legacyCardFileKeys(item).length > 0) {
            matched.push(item);
        }
    }
    result.matched = matched.length;

    for (const item of matched) {
        const { PK, SK } = item;
        const setId = item.studysetUUID;
        if (typeof setId !== 'string' || setId === '') {
            log(`no studysetUUID: ${PK} ${SK}`);
            result.skipped += 1;
            continue;
        }

        const legacyKeys = legacyCardFileKeys(item);
        log(
            `${dryRun ? '[dry-run] would re-key' : 're-keying'} ${PK} ${SK} (${
                legacyKeys.length
            } files)`
        );
        if (dryRun) {
            continue;
        }

        const newKeys = new Map<string, string>();
        const removeCopies = () =>
            Promise.all(
                [...newKeys.values()].map((Key) =>
                    s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key }))
                )
            );

        for (const oldKey of legacyKeys) {
            const newKey = newFileKey(setId);
            try {
                await s3Client.send(
                    new CopyObjectCommand({
                        Bucket: bucket,
                        Key: newKey,
                        CopySource: `${bucket}/${encodeCopySourceKey(oldKey)}`,
                    })
                );
            } catch (error) {
                if (errorName(error) === 'NoSuchKey') {
                    // Leave the card as it is; the public filter hides it.
                    result.filesMissing += 1;
                    log(`missing: ${PK} ${SK} ${oldKey}`);
                    continue;
                }
                await removeCopies();
                throw error;
            }
            newKeys.set(oldKey, newKey);
        }
        if (newKeys.size === 0) {
            continue;
        }

        const cards = cardsOf(item).map((card) =>
            Array.isArray(card?.files)
                ? {
                      ...card,
                      files: filesOf(card).map((file) => {
                          const newKey =
                              typeof file?.key === 'string'
                                  ? newKeys.get(file.key)
                                  : undefined;
                          // The stored URL names the legacy key.
                          return newKey
                              ? { ...file, key: newKey, signedURL: '' }
                              : file;
                      }),
                  }
                : card
        );

        try {
            // updatedAt/updatedBy stay as they are: this isn't a user edit.
            await docClient.send(
                new UpdateCommand({
                    TableName: tableName,
                    Key: { PK, SK },
                    UpdateExpression: 'SET #cards = :cards',
                    ConditionExpression: '#cards = :expected',
                    ExpressionAttributeNames: { '#cards': 'cards' },
                    ExpressionAttributeValues: {
                        ':cards': cards,
                        ':expected': item.cards,
                    },
                })
            );
        } catch (error) {
            if (errorName(error) === 'ConditionalCheckFailedException') {
                log(`changed since the scan, skipped: ${PK} ${SK}`);
                await removeCopies();
                result.skipped += 1;
                continue;
            }
            throw error;
        }

        result.updated += 1;
        result.filesCopied += newKeys.size;
        recordMigrated([...newKeys.keys()]);
    }

    return result;
};

export const deleteMigratedObjects = async ({
    docClient,
    s3Client,
    tableName,
    bucket,
    dryRun,
    keys,
    log = console.log,
}: {
    docClient: DynamoDBDocumentClient;
    s3Client: S3Client;
    tableName: string;
    bucket: string;
    dryRun: boolean;
    keys: string[];
    log?: (message: string) => void;
}): Promise<DeleteResult> => {
    const referenced = new Set<string>();
    for await (const item of scanStudysets({ docClient, tableName })) {
        for (const key of cardFileKeysOf(item)) {
            referenced.add(key);
        }
    }

    const candidates = [...new Set(keys)];
    const result: DeleteResult = {
        candidates: candidates.length,
        stillReferenced: 0,
        deleted: 0,
    };

    for (const Key of candidates) {
        if (referenced.has(Key)) {
            // A stale save wrote it back; the next re-key run moves it again.
            result.stillReferenced += 1;
            log(`kept (still referenced): ${Key}`);
            continue;
        }
        if (dryRun) {
            log(`[dry-run] would delete ${Key}`);
            continue;
        }
        await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key }));
        result.deleted += 1;
        log(`deleted ${Key}`);
    }

    return result;
};

if (require.main === module) {
    let config: RekeyConfig;
    try {
        config = readRekeyConfig(process.env);
    } catch (error) {
        console.error((error as Error).message);
        process.exit(1);
    }

    const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
    const s3Client = new S3Client({});
    const { tableName, bucket, manifestPath, dryRun, deleteOld } = config;
    const suffix = dryRun ? ' (dry run — no writes performed)' : '';

    const run = deleteOld
        ? async () => {
              const keys = parseManifest(fs.readFileSync(manifestPath, 'utf8'));
              const { candidates, stillReferenced, deleted } =
                  await deleteMigratedObjects({
                      docClient,
                      s3Client,
                      tableName,
                      bucket,
                      dryRun,
                      keys,
                  });
              console.log(
                  `\nDone. candidates=${candidates} stillReferenced=${stillReferenced} deleted=${deleted}${suffix}`
              );
          }
        : async () => {
              const r = await rekeyCardFiles({
                  docClient,
                  s3Client,
                  tableName,
                  bucket,
                  dryRun,
                  // Appending per item keeps what an aborted run migrated.
                  recordMigrated: (keys) =>
                      fs.appendFileSync(manifestPath, formatManifestLines(keys)),
              });
              console.log(
                  `\nDone. scanned=${r.scanned} matched=${r.matched} updated=${r.updated} skipped=${r.skipped} filesCopied=${r.filesCopied} filesMissing=${r.filesMissing}${suffix}`
              );
          };

    run().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
