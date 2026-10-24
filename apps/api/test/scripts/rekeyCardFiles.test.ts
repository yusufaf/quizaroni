import { CopyObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
    DynamoDBDocumentClient,
    ScanCommand,
    UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
    cardFileKeysOf,
    deleteMigratedObjects,
    formatManifestLines,
    parseManifest,
    readRekeyConfig,
    rekeyCardFiles,
} from '../../scripts/rekeyCardFiles';

// #152: card files were stored under `${studysetUUID}/${userUUID}/${fileName}`,
// and presigned URLs carry the key. The script moves them to opaque keys.

const S = '11111111-1111-4111-8111-111111111111';
const U = '22222222-2222-4222-8222-222222222222';
const LEGACY = `${S}/${U}/my photo.png`;
const OTHER_LEGACY = `${S}/${U}/diagram.png`;
const OPAQUE = `${S}/44444444-4444-4444-8444-444444444444`;

const legacyFile = (key = LEGACY) => ({
    key,
    name: key.slice(key.lastIndexOf('/') + 1),
    size: 3,
    association: 'term',
    uploadedAt: '2026-10-01T00:00:00.000Z',
    signedURL: `https://bucket.s3.amazonaws.com/${key}`,
});

const studyset = (
    files: Record<string, unknown>[] = [legacyFile()],
    overrides: Record<string, unknown> = {}
) => ({
    PK: `userUUID#${U}`,
    SK: `studyset#${S}`,
    studysetUUID: S,
    title: 'Biology',
    cards: [{ cardUUID: 'c1', term: 't', definition: 'd', files }],
    ...overrides,
});

type Page = { Items: Record<string, unknown>[]; LastEvaluatedKey?: Record<string, unknown> };

// Each ScanCommand takes the next page, across scans.
const makeDynamo = (
    pages: Page[],
    onUpdate: (cmd: UpdateCommand) => Promise<unknown> = () => Promise.resolve({})
) => {
    const scans: ScanCommand[] = [];
    const updates: UpdateCommand[] = [];
    const send = jest.fn((cmd: unknown) => {
        if (cmd instanceof ScanCommand) {
            scans.push(cmd);
            return Promise.resolve(pages.shift() ?? { Items: [] });
        }
        if (cmd instanceof UpdateCommand) {
            updates.push(cmd);
            return onUpdate(cmd);
        }
        return Promise.reject(new Error('unexpected command'));
    });
    return { scans, updates, docClient: { send } as unknown as DynamoDBDocumentClient };
};

// `fail` names the error a CopyObjectCommand rejects with, if any.
const makeS3 = (fail: (cmd: CopyObjectCommand) => string | undefined = () => undefined) => {
    const copies: CopyObjectCommand['input'][] = [];
    const deletes: string[] = [];
    const send = jest.fn((cmd: unknown) => {
        if (cmd instanceof CopyObjectCommand) {
            const name = fail(cmd);
            if (name) return Promise.reject(Object.assign(new Error(name), { name }));
            copies.push(cmd.input);
            return Promise.resolve({});
        }
        if (cmd instanceof DeleteObjectCommand) {
            deletes.push(cmd.input.Key ?? '');
            return Promise.resolve({});
        }
        return Promise.reject(new Error('unexpected command'));
    });
    return { copies, deletes, s3Client: { send } as unknown as S3Client };
};

const seqKeys = () => {
    let n = 0;
    return (setId: string) => `${setId}/k${++n}`;
};

const rekey = (
    dynamo: ReturnType<typeof makeDynamo>,
    s3: ReturnType<typeof makeS3>,
    overrides: { dryRun?: boolean; recordMigrated?: (keys: string[]) => void } = {}
) =>
    rekeyCardFiles({
        docClient: dynamo.docClient,
        s3Client: s3.s3Client,
        tableName: 'main',
        bucket: 'bucket',
        dryRun: false,
        log: () => {},
        newFileKey: seqKeys(),
        recordMigrated: jest.fn(),
        ...overrides,
    });

const deleteOld = (
    dynamo: ReturnType<typeof makeDynamo>,
    s3: ReturnType<typeof makeS3>,
    keys: string[],
    dryRun = false
) =>
    deleteMigratedObjects({
        docClient: dynamo.docClient,
        s3Client: s3.s3Client,
        tableName: 'main',
        bucket: 'bucket',
        dryRun,
        keys,
        log: () => {},
    });

describe('readRekeyConfig', () => {
    const env = { MAIN_TABLE: 't', MAIN_BUCKET: 'b', MANIFEST: '/tmp/m.jsonl' };

    it('requires MAIN_TABLE, MAIN_BUCKET and MANIFEST', () => {
        expect(() => readRekeyConfig({ ...env, MAIN_TABLE: '' })).toThrow(/MAIN_TABLE/);
        expect(() => readRekeyConfig({ ...env, MAIN_BUCKET: undefined })).toThrow(/MAIN_BUCKET/);
        expect(() => readRekeyConfig({ ...env, MANIFEST: undefined })).toThrow(/MANIFEST/);
    });

    it('reads the targets and honours DRY_RUN', () => {
        expect(readRekeyConfig(env)).toEqual({
            tableName: 't',
            bucket: 'b',
            manifestPath: '/tmp/m.jsonl',
            dryRun: false,
            deleteOld: false,
        });
        expect(readRekeyConfig({ ...env, DRY_RUN: '1' }).dryRun).toBe(true);
    });

    it('turns on the delete pass only for DELETE_OLD=1', () => {
        expect(readRekeyConfig({ ...env, DELETE_OLD: '1' }).deleteOld).toBe(true);
        for (const value of ['', 'true', '0']) {
            expect(readRekeyConfig({ ...env, DELETE_OLD: value }).deleteOld).toBe(false);
        }
    });
});

describe('manifest format', () => {
    it('round-trips keys with spaces, slashes and newlines, and dedupes', () => {
        const keys = ['a/b/my photo.png', 'x\ny.png', 'a/b/my photo.png'];

        expect(parseManifest(formatManifestLines(keys))).toEqual(['a/b/my photo.png', 'x\ny.png']);
    });

    it('ends every line with a newline, so per-item appends stay parseable', () => {
        expect(formatManifestLines(['a'])).toBe('"a"\n');
        expect(formatManifestLines([])).toBe('');
        expect(parseManifest(formatManifestLines(['a', 'b']) + formatManifestLines(['c']))).toEqual([
            'a',
            'b',
            'c',
        ]);
    });
});

describe('cardFileKeysOf', () => {
    it('ignores keys that are not non-empty strings', () => {
        const item = studyset([legacyFile(), { key: 123 }, { key: {} }, { key: '' }, {}]);

        expect(cardFileKeysOf(item)).toEqual([LEGACY]);
    });
});

describe('rekeyCardFiles', () => {
    it('only reports in a dry run', async () => {
        const dynamo = makeDynamo([{ Items: [studyset()] }]);
        const s3 = makeS3();
        const recordMigrated = jest.fn();

        const result = await rekey(dynamo, s3, { dryRun: true, recordMigrated });

        expect(result).toMatchObject({ scanned: 1, matched: 1, updated: 0, filesCopied: 0 });
        expect(s3.copies).toHaveLength(0);
        expect(s3.deletes).toHaveLength(0);
        expect(dynamo.updates).toHaveLength(0);
        expect(recordMigrated).not.toHaveBeenCalled();
    });

    it('scans only study set items', async () => {
        const dynamo = makeDynamo([{ Items: [] }]);

        await rekey(dynamo, makeS3());

        expect(dynamo.scans[0].input).toMatchObject({
            TableName: 'main',
            FilterExpression: 'begins_with(#SK, :p)',
            ExpressionAttributeNames: { '#SK': 'SK' },
            ExpressionAttributeValues: { ':p': 'studyset#' },
        });
    });

    it('skips items whose keys are already opaque', async () => {
        const dynamo = makeDynamo([{ Items: [studyset([legacyFile(OPAQUE)])] }]);
        const s3 = makeS3();

        const result = await rekey(dynamo, s3);

        expect(result).toMatchObject({ scanned: 1, matched: 0 });
        expect(s3.copies).toHaveLength(0);
        expect(dynamo.updates).toHaveLength(0);
    });

    it('copies a legacy file to an opaque key and points the card at it, keeping the old object', async () => {
        const item = studyset();
        const dynamo = makeDynamo([{ Items: [item] }]);
        const s3 = makeS3();
        const recordMigrated = jest.fn();

        const result = await rekey(dynamo, s3, { recordMigrated });

        expect(s3.copies).toEqual([
            {
                Bucket: 'bucket',
                Key: `${S}/k1`,
                CopySource: `bucket/${S}/${U}/my%20photo.png`,
            },
        ]);
        expect(dynamo.updates).toHaveLength(1);
        const { input } = dynamo.updates[0];
        expect(input.Key).toEqual({ PK: item.PK, SK: item.SK });
        expect(input.UpdateExpression).toBe('SET #cards = :cards');
        expect(input.ConditionExpression).toBe('#cards = :expected');
        expect(input.ExpressionAttributeValues?.[':expected']).toEqual(item.cards);
        expect(input.ExpressionAttributeValues?.[':cards']).toEqual([
            { ...item.cards[0], files: [{ ...legacyFile(), key: `${S}/k1`, signedURL: '' }] },
        ]);
        expect(recordMigrated).toHaveBeenCalledWith([LEGACY]);
        expect(s3.deletes).toHaveLength(0);
        expect(result).toMatchObject({ matched: 1, updated: 1, filesCopied: 1, skipped: 0 });
    });

    it('gives each item sharing a legacy key its own copy', async () => {
        const copy = studyset([legacyFile()], { SK: 'studyset#copy' });
        const dynamo = makeDynamo([{ Items: [studyset(), copy] }]);
        const s3 = makeS3();
        const recordMigrated = jest.fn();

        const result = await rekey(dynamo, s3, { recordMigrated });

        expect(s3.copies.map((c) => c.Key)).toEqual([`${S}/k1`, `${S}/k2`]);
        expect(dynamo.updates).toHaveLength(2);
        expect(recordMigrated.mock.calls).toEqual([[[LEGACY]], [[LEGACY]]]);
        expect(s3.deletes).toHaveLength(0);
        expect(result).toMatchObject({ updated: 2, filesCopied: 2 });
    });

    it('removes its copy and skips an item that changed since the scan', async () => {
        const dynamo = makeDynamo([{ Items: [studyset()] }], () =>
            Promise.reject(
                Object.assign(new Error('changed'), { name: 'ConditionalCheckFailedException' })
            )
        );
        const s3 = makeS3();
        const recordMigrated = jest.fn();

        const result = await rekey(dynamo, s3, { recordMigrated });

        expect(s3.deletes).toEqual([`${S}/k1`]);
        expect(recordMigrated).not.toHaveBeenCalled();
        expect(result).toMatchObject({ updated: 0, skipped: 1 });
    });

    it('leaves a file whose object is missing and re-keys the rest', async () => {
        const item = studyset([legacyFile(), legacyFile(OTHER_LEGACY)]);
        const dynamo = makeDynamo([{ Items: [item] }]);
        const s3 = makeS3((cmd) => (cmd.input.CopySource?.endsWith('my%20photo.png') ? 'NoSuchKey' : undefined));
        const recordMigrated = jest.fn();

        const result = await rekey(dynamo, s3, { recordMigrated });

        const files = dynamo.updates[0].input.ExpressionAttributeValues?.[':cards'][0].files;
        expect(files.map((f: { key: string }) => f.key)).toEqual([LEGACY, `${S}/k2`]);
        expect(recordMigrated).toHaveBeenCalledWith([OTHER_LEGACY]);
        expect(result).toMatchObject({ filesMissing: 1, filesCopied: 1, updated: 1 });
    });

    it('does not update an item when none of its objects exist', async () => {
        const dynamo = makeDynamo([{ Items: [studyset()] }]);
        const s3 = makeS3(() => 'NoSuchKey');

        const result = await rekey(dynamo, s3);

        expect(dynamo.updates).toHaveLength(0);
        expect(result).toMatchObject({ matched: 1, filesMissing: 1, updated: 0 });
    });

    it("removes the item's earlier copies and rejects on any other copy error", async () => {
        const item = studyset([legacyFile(), legacyFile(OTHER_LEGACY)]);
        const dynamo = makeDynamo([{ Items: [item] }]);
        const s3 = makeS3((cmd) => (cmd.input.CopySource?.endsWith('diagram.png') ? 'AccessDenied' : undefined));

        await expect(rekey(dynamo, s3)).rejects.toMatchObject({ name: 'AccessDenied' });

        expect(s3.deletes).toEqual([`${S}/k1`]);
        expect(dynamo.updates).toHaveLength(0);
    });

    it('skips an item without a studysetUUID', async () => {
        const { studysetUUID: _studysetUUID, ...withoutId } = studyset();
        const dynamo = makeDynamo([{ Items: [withoutId] }]);
        const s3 = makeS3();

        const result = await rekey(dynamo, s3);

        expect(s3.copies).toHaveLength(0);
        expect(dynamo.updates).toHaveLength(0);
        expect(result).toMatchObject({ matched: 1, skipped: 1 });
    });

    it('does not crash on malformed keys', async () => {
        const dynamo = makeDynamo([{ Items: [studyset([{ key: 123 }, legacyFile()])] }]);
        const s3 = makeS3();

        const result = await rekey(dynamo, s3);

        expect(result).toMatchObject({ updated: 1, filesCopied: 1 });
    });

    it('follows LastEvaluatedKey across scan pages', async () => {
        const dynamo = makeDynamo([
            { Items: [studyset()], LastEvaluatedKey: { PK: 'p', SK: 's' } },
            { Items: [studyset([legacyFile()], { SK: 'studyset#two' })] },
        ]);

        const result = await rekey(dynamo, makeS3());

        expect(dynamo.scans[1].input.ExclusiveStartKey).toEqual({ PK: 'p', SK: 's' });
        expect(result).toMatchObject({ scanned: 2, updated: 2 });
    });
});

describe('deleteMigratedObjects', () => {
    it('deletes manifest keys no item references and keeps referenced ones', async () => {
        const dynamo = makeDynamo([{ Items: [studyset([legacyFile(OTHER_LEGACY)])] }]);
        const s3 = makeS3();

        const result = await deleteOld(dynamo, s3, [LEGACY, OTHER_LEGACY, LEGACY]);

        expect(s3.deletes).toEqual([LEGACY]);
        expect(result).toEqual({ candidates: 2, stillReferenced: 1, deleted: 1 });
    });

    it('deletes nothing in a dry run', async () => {
        const dynamo = makeDynamo([{ Items: [] }]);
        const s3 = makeS3();

        const result = await deleteOld(dynamo, s3, [LEGACY], true);

        expect(s3.deletes).toHaveLength(0);
        expect(result).toEqual({ candidates: 1, stillReferenced: 0, deleted: 0 });
    });

    // An editor tab opened before the migration saves its stale cards
    // afterwards: updateStudyset deletes the new copy and writes the legacy
    // key back. The legacy object must survive, and the next run re-keys it.
    it('keeps a legacy object that a stale editor save brought back', async () => {
        const recorded: string[] = [];
        await rekey(makeDynamo([{ Items: [studyset()] }]), makeS3(), {
            recordMigrated: (keys) => recorded.push(...keys),
        });
        expect(recorded).toEqual([LEGACY]);

        const s3 = makeS3();
        const result = await deleteOld(makeDynamo([{ Items: [studyset()] }]), s3, recorded);

        expect(s3.deletes).toHaveLength(0);
        expect(result.stillReferenced).toBe(1);

        const rerun = makeDynamo([{ Items: [studyset()] }]);
        const again = await rekey(rerun, makeS3());
        expect(again).toMatchObject({ matched: 1, updated: 1 });
    });
});
