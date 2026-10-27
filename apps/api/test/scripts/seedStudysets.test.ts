import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import {
    SEED_DIR,
    SeedSet,
    loadSeedSets,
    readOwnerUsername,
    readSeedConfig,
    seedStudysetUUID,
    seedStudysets,
    validateSeedSet,
} from '../../scripts/seedStudysets';

// #123: starter sets for Explore, published by the team account.

const cards = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ term: `term ${i}`, definition: `definition ${i}` }));

const SET_A: SeedSet = {
    slug: 'set-a',
    title: 'Set A',
    description: 'About A.',
    subject: 'science',
    cards: cards(4),
};
const SET_B: SeedSet = { ...SET_A, slug: 'set-b', title: 'Set B', subject: 'history' };
const NOW = new Date('2026-10-27T12:00:00.000Z');

const LISTED_ROW = {
    metadata: { publiclyViewable: true },
    publishedAt: '2026-10-27T12:00:00.000Z',
};

/** A fake table: `existing` holds the keys of rows that are already there. */
const makeClient = (existing: Set<string> = new Set()) => {
    const send = jest.fn((cmd: unknown) => {
        if (cmd instanceof GetCommand) {
            const { PK, SK } = cmd.input.Key as { PK: string; SK: string };
            const item = existing.has(`${PK}|${SK}`) ? { PK, SK, SK2: SK, ...LISTED_ROW } : undefined;
            return Promise.resolve({ Item: item });
        }
        if (cmd instanceof PutCommand) {
            const { PK, SK } = cmd.input.Item as { PK: string; SK: string };
            existing.add(`${PK}|${SK}`);
            return Promise.resolve({});
        }
        if (cmd instanceof UpdateCommand) {
            return Promise.resolve({});
        }
        return Promise.reject(new Error('unexpected command'));
    });
    return { send, docClient: { send } as unknown as DynamoDBDocumentClient };
};

const sentOf = <T>(send: jest.Mock, type: new (...args: never[]) => T): T[] =>
    send.mock.calls.map(([cmd]) => cmd).filter((cmd): cmd is T => cmd instanceof type);

const run = (
    client: ReturnType<typeof makeClient>,
    overrides: Partial<Parameters<typeof seedStudysets>[0]> = {}
) =>
    seedStudysets({
        docClient: client.docClient,
        tableName: 't',
        userUUID: 'u1',
        username: 'Quizaroni',
        sets: [SET_A, SET_B],
        feature: [],
        now: NOW,
        dryRun: false,
        log: () => undefined,
        ...overrides,
    });

describe('readSeedConfig', () => {
    it('requires MAIN_TABLE and USER_UUID', () => {
        expect(() => readSeedConfig({ USER_UUID: 'u1' })).toThrow(/MAIN_TABLE/);
        expect(() => readSeedConfig({ MAIN_TABLE: 't' })).toThrow(/USER_UUID/);
    });

    it('splits FEATURE and reads DRY_RUN', () => {
        expect(
            readSeedConfig({ MAIN_TABLE: 't', USER_UUID: 'u1', FEATURE: ' set-a, ,set-b ', DRY_RUN: '1' })
        ).toEqual({ tableName: 't', userUUID: 'u1', feature: ['set-a', 'set-b'], dryRun: true });
    });
});

describe('validateSeedSet', () => {
    it('accepts a set that passes the publish gate', () => {
        expect(validateSeedSet(SET_A, 'set-a')).toEqual([]);
    });

    it('reports every problem at once', () => {
        const problems = validateSeedSet(
            { slug: 'other', title: ' ', subject: 'astrology', cards: [...cards(2), { term: 'x' }] },
            'set-a'
        );
        expect(problems).toEqual([
            'slug must match the file name ("set-a")',
            'title is missing',
            'description is missing',
            'every card needs a term and a definition',
            'publish gate: {"code":"invalidSubject"}',
            'publish gate: {"code":"notEnoughCards","required":4,"actual":2}',
        ]);
    });
});

describe('loadSeedSets', () => {
    let dir: string;
    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'seed-'));
    });
    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
    });

    it('loads the files in slug order', () => {
        writeFileSync(join(dir, 'set-b.json'), JSON.stringify(SET_B));
        writeFileSync(join(dir, 'set-a.json'), JSON.stringify(SET_A));
        expect(loadSeedSets(dir).map((set) => set.slug)).toEqual(['set-a', 'set-b']);
    });

    it('refuses to load anything if one file is invalid', () => {
        writeFileSync(join(dir, 'set-a.json'), JSON.stringify(SET_A));
        writeFileSync(join(dir, 'set-b.json'), '{ not json');
        expect(() => loadSeedSets(dir)).toThrow(/set-b\.json/);
    });

    it('refuses an empty directory', () => {
        expect(() => loadSeedSets(dir)).toThrow(/No seed files/);
    });

    it('passes for every committed seed file', () => {
        const sets = loadSeedSets(SEED_DIR);
        expect(sets.length).toBeGreaterThanOrEqual(20);
        expect(new Set(sets.map((set) => set.title)).size).toBe(sets.length);
    });
});

describe('seedStudysetUUID', () => {
    it('is stable per owner and slug, and shaped like a v5 UUID', () => {
        const id = seedStudysetUUID('u1', 'set-a');
        expect(id).toBe(seedStudysetUUID('u1', 'set-a'));
        expect(id).not.toBe(seedStudysetUUID('u2', 'set-a'));
        expect(id).not.toBe(seedStudysetUUID('u1', 'set-b'));
        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
});

describe('readOwnerUsername', () => {
    const clientWith = (Item: Record<string, unknown> | undefined) =>
        ({ send: jest.fn(() => Promise.resolve({ Item })) }) as unknown as DynamoDBDocumentClient;

    it('reads the username from the user row', async () => {
        await expect(readOwnerUsername(clientWith({ username: 'Quizaroni' }), 't', 'u1')).resolves.toBe(
            'Quizaroni'
        );
    });

    it('refuses an unknown user or one without a username', async () => {
        await expect(readOwnerUsername(clientWith(undefined), 't', 'u1')).rejects.toThrow(/No user u1/);
        await expect(readOwnerUsername(clientWith({ username: null }), 't', 'u1')).rejects.toThrow(
            /no username/
        );
    });
});

describe('seedStudysets', () => {
    it('creates each set and publishes it as the owner', async () => {
        const client = makeClient();
        await expect(run(client)).resolves.toEqual({ created: ['set-a', 'set-b'], skipped: [] });

        const [put] = sentOf(client.send, PutCommand);
        const id = seedStudysetUUID('u1', 'set-a');
        expect(put.input.ConditionExpression).toBe('attribute_not_exists(PK)');
        expect(put.input.Item).toMatchObject({
            PK: 'userUUID#u1',
            SK: `studyset#${id}`,
            studysetUUID: id,
            userUUID: 'u1',
            username: 'Quizaroni',
            title: 'Set A',
            description: 'About A.',
            metadata: { publiclyViewable: false },
        });
        expect((put.input.Item as { cards: unknown[] }).cards[0]).toEqual({
            cardUUID: expect.any(String),
            term: 'term 0',
            definition: 'definition 0',
            categories: [],
            files: [],
            important: false,
            notes: [],
        });

        const [update] = sentOf(client.send, UpdateCommand);
        expect(update.input.Key).toEqual({ PK: 'userUUID#u1', SK: `studyset#${id}` });
        expect(update.input.ExpressionAttributeValues).toMatchObject({
            ':subject': 'science',
            ':sk2': `studyset#${id}`,
            ':username': 'Quizaroni',
            ':true': true,
        });
    });

    it('staggers publishedAt a minute apart, first slug newest', async () => {
        const client = makeClient();
        await run(client);
        const publishedAt = sentOf(client.send, UpdateCommand).map(
            (cmd) => cmd.input.ExpressionAttributeValues?.[':publishedAt']
        );
        expect(publishedAt).toEqual(['2026-10-27T12:00:00.000Z', '2026-10-27T11:59:00.000Z']);
    });

    it('leaves a set that already exists untouched', async () => {
        const id = seedStudysetUUID('u1', 'set-a');
        const client = makeClient(new Set([`userUUID#u1|studyset#${id}`]));
        await expect(run(client)).resolves.toEqual({ created: ['set-b'], skipped: ['set-a'] });
        expect(sentOf(client.send, PutCommand)).toHaveLength(1);
        expect(sentOf(client.send, UpdateCommand)).toHaveLength(1);
    });

    it('writes nothing on a dry run', async () => {
        const client = makeClient();
        await expect(run(client, { dryRun: true, feature: ['set-b'] })).resolves.toEqual({
            created: ['set-a', 'set-b'],
            skipped: [],
        });
        expect(sentOf(client.send, PutCommand)).toHaveLength(0);
        expect(sentOf(client.send, UpdateCommand)).toHaveLength(0);
    });

    it('features the FEATURE slugs, the first one newest', async () => {
        const client = makeClient();
        await run(client, { feature: ['set-b', 'set-a'] });
        const featured = sentOf(client.send, UpdateCommand)
            .filter((cmd) => cmd.input.UpdateExpression === 'SET #featuredAt = :now')
            .map((cmd) => [cmd.input.Key?.SK, cmd.input.ExpressionAttributeValues?.[':now']]);
        expect(featured).toEqual([
            [`studyset#${seedStudysetUUID('u1', 'set-b')}`, '2026-10-27T12:00:00.000Z'],
            [`studyset#${seedStudysetUUID('u1', 'set-a')}`, '2026-10-27T11:59:59.000Z'],
        ]);
    });

    it('refuses a FEATURE slug with no seed file before writing', async () => {
        const client = makeClient();
        await expect(run(client, { feature: ['nope'] })).rejects.toThrow(/nope/);
        expect(client.send).not.toHaveBeenCalled();
    });
});
