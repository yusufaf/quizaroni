import {
    DynamoDBDocumentClient,
    QueryCommand,
    UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
    findTakedownTargets,
    readTakedownConfig,
    takedownStudyset,
} from '../../scripts/unpublishStudyset';

const KEY = { PK: 'userUUID#u1', SK: 'studyset#s1' };
const NOW = '2026-10-19T12:00:00.000Z';
const INDEX_KEYS = { PK2: 'publicStudyset', SK2: 'studyset#s1' };
const OWN_ROW = { ...KEY, ...INDEX_KEYS, studysetUUID: 's1' };
// Duplicates made before #125 inherited the source's SK2 (see
// cleanupPublicDuplicates.ts), so the index can return a copy as well.
const INHERITED_COPY = {
    PK: 'userUUID#u2',
    SK: 'studyset#copy',
    ...INDEX_KEYS,
    studysetUUID: 'copy',
};

type Page = { Items: Record<string, unknown>[]; LastEvaluatedKey?: Record<string, unknown> };

const COPY_KEY = { PK: INHERITED_COPY.PK, SK: INHERITED_COPY.SK };

const makeClient = (
    pages: Page[] = [],
    onUpdate: (cmd: UpdateCommand) => Promise<unknown> = () => Promise.resolve({})
) => {
    let page = 0;
    const send = jest.fn((cmd: unknown) => {
        if (cmd instanceof QueryCommand) {
            return Promise.resolve(pages[page++] ?? { Items: [] });
        }
        if (cmd instanceof UpdateCommand) {
            return onUpdate(cmd);
        }
        return Promise.reject(new Error('unexpected command'));
    });
    return { send, docClient: { send } as unknown as DynamoDBDocumentClient };
};

describe('readTakedownConfig', () => {
    it('requires MAIN_TABLE and STUDYSET_UUID', () => {
        expect(() => readTakedownConfig({ STUDYSET_UUID: 's1' })).toThrow(/MAIN_TABLE/);
        expect(() => readTakedownConfig({ MAIN_TABLE: 't' })).toThrow(/STUDYSET_UUID/);
    });

    it('reads the optional owner and reason', () => {
        expect(
            readTakedownConfig({
                MAIN_TABLE: 't',
                STUDYSET_UUID: 's1',
                USER_UUID: 'u1',
                REASON: 'spam',
            })
        ).toEqual({
            tableName: 't',
            studysetUUID: 's1',
            userUUID: 'u1',
            reason: 'spam',
            dryRun: false,
        });
    });

    it.each([
        ['1', true],
        ['0', false],
    ])('treats DRY_RUN=%s as dryRun %s', (value, expected) => {
        expect(
            readTakedownConfig({ MAIN_TABLE: 't', STUDYSET_UUID: 's1', DRY_RUN: value }).dryRun
        ).toBe(expected);
    });
});

describe('findTakedownTargets', () => {
    const find = (docClient: DynamoDBDocumentClient, userUUID?: string) =>
        findTakedownTargets({ docClient, tableName: 't', studysetUUID: 's1', userUUID });

    it('looks the set up on the public index', async () => {
        const { send, docClient } = makeClient([{ Items: [OWN_ROW] }]);

        await expect(find(docClient)).resolves.toEqual({ key: KEY, inheritedCopies: [] });

        const [query] = send.mock.calls[0] as [QueryCommand];
        expect(query.input.IndexName).toBe('PK2');
        expect(query.input.ExpressionAttributeValues).toEqual({
            ':pk2': 'publicStudyset',
            ':sk2': 'studyset#s1',
        });
    });

    it('follows the index past the first page', async () => {
        const { send, docClient } = makeClient([
            { Items: [INHERITED_COPY], LastEvaluatedKey: { PK2: 'publicStudyset' } },
            { Items: [OWN_ROW] },
        ]);

        await expect(find(docClient)).resolves.toEqual({
            key: KEY,
            inheritedCopies: [COPY_KEY],
        });
        expect(send).toHaveBeenCalledTimes(2);
    });

    // Duplicates made before #125 kept the source's SK2; any row under it
    // whose SK isn't the set's own is one, with or without a studysetUUID.
    it('returns copies under the key as well as the set', async () => {
        const { studysetUUID: _id, ...copyWithoutId } = INHERITED_COPY;
        const { docClient } = makeClient([{ Items: [copyWithoutId, OWN_ROW] }]);

        await expect(find(docClient)).resolves.toEqual({
            key: KEY,
            inheritedCopies: [COPY_KEY],
        });
    });

    it('throws when the set is not on the public index', async () => {
        const { docClient } = makeClient([{ Items: [INHERITED_COPY] }]);

        await expect(find(docClient)).rejects.toThrow(/USER_UUID/);
    });

    it('builds the key from USER_UUID for a set that is not on the index', async () => {
        const { send, docClient } = makeClient([{ Items: [INHERITED_COPY] }]);

        await expect(find(docClient, 'u1')).resolves.toEqual({
            key: KEY,
            inheritedCopies: [COPY_KEY],
        });
        const [query] = send.mock.calls[0] as [QueryCommand];
        expect(query.input.ExpressionAttributeValues?.[':sk2']).toBe('studyset#s1');
    });

    it('rejects a USER_UUID that does not own the indexed set', async () => {
        const { docClient } = makeClient([{ Items: [OWN_ROW] }]);

        await expect(find(docClient, 'u9')).rejects.toThrow(/userUUID#u1/);
    });
});

describe('takedownStudyset', () => {
    const run = (
        docClient: DynamoDBDocumentClient,
        { dryRun = false, inheritedCopies = [] as typeof KEY[] } = {}
    ) =>
        takedownStudyset({
            docClient,
            tableName: 't',
            studysetUUID: 's1',
            targets: { key: KEY, inheritedCopies },
            reason: 'spam',
            now: NOW,
            dryRun,
            log: () => {},
        });

    it('writes nothing on a dry run', async () => {
        const { send, docClient } = makeClient();

        await expect(run(docClient, { dryRun: true, inheritedCopies: [COPY_KEY] })).resolves.toEqual({
            updated: false,
            copiesCleared: 0,
        });
        expect(send).not.toHaveBeenCalled();
    });

    it('hides the set and removes it from the public index', async () => {
        const { send, docClient } = makeClient();

        await expect(run(docClient)).resolves.toEqual({ updated: true, copiesCleared: 0 });

        const [update] = send.mock.calls[0] as [UpdateCommand];
        expect(update).toBeInstanceOf(UpdateCommand);
        expect(update.input.Key).toEqual(KEY);
        expect(update.input.UpdateExpression).toContain('REMOVE #PK2, #SK2');
        expect(update.input.ExpressionAttributeValues?.[':moderation']).toEqual({
            hiddenAt: NOW,
            reason: 'spam',
        });
        expect(update.input.ConditionExpression).toBe('attribute_exists(PK)');
    });

    it("removes only the index keys from copies still under the set's key", async () => {
        const { send, docClient } = makeClient();

        await expect(run(docClient, { inheritedCopies: [COPY_KEY] })).resolves.toEqual({
            updated: true,
            copiesCleared: 1,
        });

        const [, copyUpdate] = send.mock.calls.map(([cmd]) => cmd as UpdateCommand);
        expect(copyUpdate.input.Key).toEqual(COPY_KEY);
        expect(copyUpdate.input.UpdateExpression).toBe('REMOVE #PK2, #SK2');
        expect(copyUpdate.input.ConditionExpression).toBe('#SK2 = :sk2');
        expect(copyUpdate.input.ExpressionAttributeValues).toEqual({ ':sk2': 'studyset#s1' });
    });

    it('skips a copy that moved off the key meanwhile', async () => {
        const { docClient } = makeClient([], (cmd) =>
            cmd.input.Key?.PK === COPY_KEY.PK
                ? Promise.reject(Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' }))
                : Promise.resolve({})
        );

        await expect(run(docClient, { inheritedCopies: [COPY_KEY] })).resolves.toEqual({
            updated: true,
            copiesCleared: 0,
        });
    });
});
