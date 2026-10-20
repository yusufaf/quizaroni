import {
    DynamoDBDocumentClient,
    QueryCommand,
    UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
    findStudysetKey,
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

const makeClient = (pages: Page[] = []) => {
    let page = 0;
    const send = jest.fn((cmd: unknown) => {
        if (cmd instanceof QueryCommand) {
            return Promise.resolve(pages[page++] ?? { Items: [] });
        }
        if (cmd instanceof UpdateCommand) {
            return Promise.resolve({});
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

describe('findStudysetKey', () => {
    it('looks the set up on the public index', async () => {
        const { send, docClient } = makeClient([{ Items: [OWN_ROW] }]);

        await expect(
            findStudysetKey({ docClient, tableName: 't', studysetUUID: 's1' })
        ).resolves.toEqual(KEY);

        const [query] = send.mock.calls[0] as [QueryCommand];
        expect(query.input.IndexName).toBe('PK2');
        expect(query.input.ExpressionAttributeValues).toEqual({
            ':pk2': 'publicStudyset',
            ':sk2': 'studyset#s1',
        });
    });

    it('follows the index past the first page', async () => {
        const { send, docClient } = makeClient([
            { Items: [], LastEvaluatedKey: { PK2: 'publicStudyset' } },
            { Items: [OWN_ROW] },
        ]);

        await expect(
            findStudysetKey({ docClient, tableName: 't', studysetUUID: 's1' })
        ).resolves.toEqual(KEY);
        expect(send).toHaveBeenCalledTimes(2);
    });

    it('throws when the set is not on the public index', async () => {
        const { docClient } = makeClient([{ Items: [] }]);

        await expect(
            findStudysetKey({ docClient, tableName: 't', studysetUUID: 's1' })
        ).rejects.toThrow(/USER_UUID/);
    });

    // A copy under the same SK2 would keep serving the public link after the
    // takedown, so the moderator has to clear those first.
    it.each([
        ['with the set itself', [INHERITED_COPY, OWN_ROW]],
        ['without the set itself', [INHERITED_COPY]],
        [
            'when the copy has no studysetUUID',
            [{ PK: 'userUUID#u2', SK: 'studyset#copy', ...INDEX_KEYS }, OWN_ROW],
        ],
    ])('refuses while inherited copies share the index key (%s)', async (_label, items) => {
        const { docClient } = makeClient([{ Items: items }]);

        await expect(
            findStudysetKey({ docClient, tableName: 't', studysetUUID: 's1' })
        ).rejects.toThrow(/cleanup:public-duplicates/);
    });

    it('builds the key from USER_UUID for a set that is not on the index', async () => {
        const { docClient } = makeClient([{ Items: [] }]);

        await expect(
            findStudysetKey({ docClient, tableName: 't', studysetUUID: 's1', userUUID: 'u1' })
        ).resolves.toEqual(KEY);
    });

    it('still refuses inherited copies when USER_UUID is given', async () => {
        const { docClient } = makeClient([{ Items: [INHERITED_COPY] }]);

        await expect(
            findStudysetKey({ docClient, tableName: 't', studysetUUID: 's1', userUUID: 'u1' })
        ).rejects.toThrow(/cleanup:public-duplicates/);
    });
});

describe('takedownStudyset', () => {
    it('writes nothing on a dry run', async () => {
        const { send, docClient } = makeClient();

        await expect(
            takedownStudyset({
                docClient,
                tableName: 't',
                key: KEY,
                now: NOW,
                dryRun: true,
                log: () => {},
            })
        ).resolves.toEqual({ updated: false });
        expect(send).not.toHaveBeenCalled();
    });

    it('hides the set and removes it from the public index', async () => {
        const { send, docClient } = makeClient();

        await expect(
            takedownStudyset({
                docClient,
                tableName: 't',
                key: KEY,
                reason: 'spam',
                now: NOW,
                dryRun: false,
                log: () => {},
            })
        ).resolves.toEqual({ updated: true });

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
});
