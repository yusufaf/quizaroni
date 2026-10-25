import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { featureStudyset, readFeatureConfig } from '../../scripts/featureStudyset';

// #141: the admin script behind the Featured row on Explore.

const KEY = { PK: 'userUUID#u1', SK: 'studyset#s1' };
const NOW = '2026-10-25T12:00:00.000Z';
const LISTED_ROW = {
    ...KEY,
    SK2: KEY.SK,
    metadata: { publiclyViewable: true },
    publishedAt: '2026-10-20T00:00:00.000Z',
};

const makeClient = (
    storedItem: Record<string, unknown> | null = LISTED_ROW,
    updateResult: () => Promise<unknown> = () => Promise.resolve({})
) => {
    const send = jest.fn((cmd: unknown) => {
        if (cmd instanceof GetCommand) {
            return Promise.resolve({ Item: storedItem ?? undefined });
        }
        if (cmd instanceof UpdateCommand) {
            return updateResult();
        }
        return Promise.reject(new Error('unexpected command'));
    });
    return { send, docClient: { send } as unknown as DynamoDBDocumentClient };
};

const sentOf = <T>(send: jest.Mock, type: new (...args: never[]) => T): T[] =>
    send.mock.calls.map(([cmd]) => cmd).filter((cmd): cmd is T => cmd instanceof type);

describe('readFeatureConfig', () => {
    it('requires MAIN_TABLE and STUDYSET_UUID', () => {
        expect(() => readFeatureConfig({ STUDYSET_UUID: 's1' })).toThrow(/MAIN_TABLE/);
        expect(() => readFeatureConfig({ MAIN_TABLE: 't' })).toThrow(/STUDYSET_UUID/);
    });

    it('reads the optional owner and the flags', () => {
        expect(
            readFeatureConfig({
                MAIN_TABLE: 't',
                STUDYSET_UUID: 's1',
                USER_UUID: 'u1',
                DRY_RUN: '1',
            })
        ).toEqual({
            tableName: 't',
            studysetUUID: 's1',
            userUUID: 'u1',
            clear: false,
            dryRun: true,
        });
    });

    it.each([
        [undefined, false],
        ['', false],
        ['0', false],
        ['FALSE', false],
        ['1', true],
        ['True', true],
    ])('reads CLEAR=%p as clear %s', (value, expected) => {
        expect(readFeatureConfig({ MAIN_TABLE: 't', STUDYSET_UUID: 's1', CLEAR: value }).clear).toBe(
            expected
        );
    });

    // Unlike DRY_RUN, a typo here would pick a write, so it is refused.
    it.each(['no', 'off', 'yes'])('rejects CLEAR=%p', (value) => {
        expect(() => readFeatureConfig({ MAIN_TABLE: 't', STUDYSET_UUID: 's1', CLEAR: value })).toThrow(
            /CLEAR/
        );
    });
});

describe('featureStudyset', () => {
    const run = (
        docClient: DynamoDBDocumentClient,
        { clear = false, dryRun = false, log = jest.fn() } = {}
    ) => featureStudyset({ docClient, tableName: 't', key: KEY, clear, now: NOW, dryRun, log });

    it('features a listed set with a guarded write', async () => {
        const { send, docClient } = makeClient();

        await expect(run(docClient)).resolves.toEqual({ updated: true });

        const [update] = sentOf(send, UpdateCommand);
        expect(update.input.Key).toEqual(KEY);
        expect(update.input.UpdateExpression).toBe('SET #featuredAt = :now');
        expect(update.input.ConditionExpression).toBe(
            'attribute_exists(PK) AND #SK2 = :sk2 AND #metadata.#publiclyViewable = :true AND attribute_type(#publishedAt, :string) AND size(#publishedAt) > :zero AND attribute_not_exists(#moderation.#hiddenAt)'
        );
        expect(update.input.ExpressionAttributeValues).toEqual({
            ':now': NOW,
            ':sk2': KEY.SK,
            ':true': true,
            ':string': 'S',
            ':zero': 0,
        });
    });

    it('reports a dry run without writing', async () => {
        const { send, docClient } = makeClient();
        const log = jest.fn();

        await expect(run(docClient, { dryRun: true, log })).resolves.toEqual({ updated: false });

        expect(sentOf(send, GetCommand)).toHaveLength(1);
        expect(sentOf(send, UpdateCommand)).toHaveLength(0);
        expect(log).toHaveBeenCalledWith(expect.stringContaining('[dry-run] would feature'));
    });

    it.each([
        ['missing', null],
        ['unpublished', { ...LISTED_ROW, metadata: { publiclyViewable: false } }],
        ['hidden', { ...LISTED_ROW, moderation: { hiddenAt: NOW } }],
        ['never published', { ...LISTED_ROW, publishedAt: undefined }],
        ['a pre-#125 copy', { ...LISTED_ROW, SK2: 'studyset#other' }],
    ])('refuses a set that is %s, in a dry run too', async (_, row) => {
        for (const dryRun of [false, true]) {
            const { send, docClient } = makeClient(row);
            await expect(run(docClient, { dryRun })).rejects.toThrow(/not listed on Explore/);
            expect(sentOf(send, UpdateCommand)).toHaveLength(0);
        }
    });

    it('turns a failed condition into the not-listed error', async () => {
        const { docClient } = makeClient(LISTED_ROW, () =>
            Promise.reject(Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' }))
        );
        await expect(run(docClient)).rejects.toThrow(/not listed on Explore/);
    });

    it('rethrows other errors', async () => {
        const { docClient } = makeClient(LISTED_ROW, () => Promise.reject(new Error('throttled')));
        await expect(run(docClient)).rejects.toThrow('throttled');
    });

    it('clears featuredAt without checking the set is listed', async () => {
        const { send, docClient } = makeClient({ ...LISTED_ROW, moderation: { hiddenAt: NOW } });

        await expect(run(docClient, { clear: true })).resolves.toEqual({ updated: true });

        expect(sentOf(send, GetCommand)).toHaveLength(0);
        const [update] = sentOf(send, UpdateCommand);
        expect(update.input.UpdateExpression).toBe('REMOVE #featuredAt');
        expect(update.input.ConditionExpression).toBe('attribute_exists(PK)');
        expect(update.input.ExpressionAttributeNames).toEqual({ '#featuredAt': 'featuredAt' });
    });
});
