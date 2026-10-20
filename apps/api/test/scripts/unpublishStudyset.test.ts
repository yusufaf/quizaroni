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

const makeClient = (queryItems: Record<string, unknown>[] = []) => {
    const send = jest.fn((cmd: unknown) => {
        if (cmd instanceof QueryCommand) {
            return Promise.resolve({ Items: queryItems });
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
        const { send, docClient } = makeClient([KEY]);

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

    it('throws when the set is not on the public index', async () => {
        const { docClient } = makeClient([]);

        await expect(
            findStudysetKey({ docClient, tableName: 't', studysetUUID: 's1' })
        ).rejects.toThrow(/USER_UUID/);
    });

    // Duplicates made before #125 inherited the source's SK2 (see
    // cleanupPublicDuplicates.ts), so the index can return a copy as well.
    it('picks the set itself, not a copy that inherited its index key', async () => {
        const copy = { PK: 'userUUID#u2', SK: 'studyset#copy' };
        const { docClient } = makeClient([copy, KEY]);

        await expect(
            findStudysetKey({ docClient, tableName: 't', studysetUUID: 's1' })
        ).resolves.toEqual(KEY);
    });

    it('throws when only inherited copies are on the index', async () => {
        const { docClient } = makeClient([{ PK: 'userUUID#u2', SK: 'studyset#copy' }]);

        await expect(
            findStudysetKey({ docClient, tableName: 't', studysetUUID: 's1' })
        ).rejects.toThrow(/USER_UUID/);
    });

    it('builds the key from USER_UUID without querying', async () => {
        const { send, docClient } = makeClient();

        await expect(
            findStudysetKey({ docClient, tableName: 't', studysetUUID: 's1', userUUID: 'u1' })
        ).resolves.toEqual(KEY);
        expect(send).not.toHaveBeenCalled();
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
