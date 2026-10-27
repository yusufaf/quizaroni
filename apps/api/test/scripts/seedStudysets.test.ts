import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import {
    SEED_DIR,
    SeedSet,
    loadSeedSets,
    resolveOwnerUsername,
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

type Row = Record<string, unknown>;

/** A fake main table keyed by `PK|SK`; a publish update marks the row listed. */
const makeClient = (rows: Map<string, Row> = new Map()) => {
    const keyOf = (key: unknown) => {
        const { PK, SK } = key as { PK: string; SK: string };
        return `${PK}|${SK}`;
    };
    const send = jest.fn((cmd: unknown) => {
        if (cmd instanceof GetCommand) {
            return Promise.resolve({ Item: rows.get(keyOf(cmd.input.Key)) });
        }
        if (cmd instanceof PutCommand) {
            rows.set(keyOf(cmd.input.Item), { ...cmd.input.Item });
            return Promise.resolve({});
        }
        if (cmd instanceof UpdateCommand) {
            const values = cmd.input.ExpressionAttributeValues ?? {};
            const row = rows.get(keyOf(cmd.input.Key));
            if (row && values[':pk2']) {
                Object.assign(row, {
                    SK2: values[':sk2'],
                    publishedAt: row.publishedAt ?? values[':publishedAt'],
                    metadata: { ...(row.metadata as object), publiclyViewable: true },
                });
            }
            return Promise.resolve({});
        }
        return Promise.reject(new Error('unexpected command'));
    });
    return { send, rows, docClient: { send } as unknown as DynamoDBDocumentClient };
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

const keyFor = (slug: string) => `userUUID#u1|studyset#${seedStudysetUUID('u1', slug)}`;

describe('readSeedConfig', () => {
    it('requires MAIN_TABLE and USER_UUID', () => {
        expect(() => readSeedConfig({ USER_UUID: 'u1' })).toThrow(/MAIN_TABLE/);
        expect(() => readSeedConfig({ MAIN_TABLE: 't-main' })).toThrow(/USER_UUID/);
    });

    it('derives the users table from MAIN_TABLE, or needs it given', () => {
        expect(readSeedConfig({ MAIN_TABLE: 'quizaroni-production-main', USER_UUID: 'u1' }).usersTable).toBe(
            'quizaroni-production-users'
        );
        expect(() => readSeedConfig({ MAIN_TABLE: 't', USER_UUID: 'u1' })).toThrow(/USERS_TABLE/);
        expect(readSeedConfig({ MAIN_TABLE: 't', USERS_TABLE: 'u', USER_UUID: 'u1' }).usersTable).toBe('u');
    });

    it('reads USERNAME, splits FEATURE and reads DRY_RUN', () => {
        expect(
            readSeedConfig({
                MAIN_TABLE: 't-main',
                USER_UUID: 'u1',
                USERNAME: ' Quizaroni ',
                FEATURE: ' set-a, ,set-b ',
                DRY_RUN: '1',
            })
        ).toEqual({
            tableName: 't-main',
            usersTable: 't-users',
            userUUID: 'u1',
            username: 'Quizaroni',
            feature: ['set-a', 'set-b'],
            dryRun: true,
        });
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

describe('resolveOwnerUsername', () => {
    const clientWith = (Item: Row | undefined) => {
        const send = jest.fn((_cmd: unknown) => Promise.resolve({ Item }));
        return { send, docClient: { send } as unknown as DynamoDBDocumentClient };
    };

    it('reads the user row from the users table', async () => {
        const { send, docClient } = clientWith({ username: 'Quizaroni' });
        await expect(resolveOwnerUsername(docClient, 'users', 'u1')).resolves.toBe('Quizaroni');
        expect((send.mock.calls[0][0] as GetCommand).input).toEqual({
            TableName: 'users',
            Key: { PK: 'user#u1', SK: 'userData' },
        });
    });

    it('prefers USERNAME, but still needs the user to exist', async () => {
        await expect(
            resolveOwnerUsername(clientWith({ username: 'old' }).docClient, 'users', 'u1', 'new')
        ).resolves.toBe('new');
        await expect(
            resolveOwnerUsername(clientWith({ username: null }).docClient, 'users', 'u1', 'new')
        ).resolves.toBe('new');
        await expect(resolveOwnerUsername(clientWith(undefined).docClient, 'users', 'u1', 'new')).rejects.toThrow(
            /No user u1 in users/
        );
    });

    it('asks for USERNAME when the account had none at sign-up', async () => {
        await expect(resolveOwnerUsername(clientWith({ username: null }).docClient, 'users', 'u1')).rejects.toThrow(
            /set USERNAME/
        );
    });
});

describe('seedStudysets', () => {
    it('creates each set and publishes it as the owner', async () => {
        const client = makeClient();
        await expect(run(client)).resolves.toEqual({ created: ['set-a', 'set-b'], incomplete: [], skipped: [] });

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

    it('timestamps each set a minute apart, first slug newest, publishedAt with createdAt', async () => {
        const client = makeClient();
        await run(client);
        const stamps = ['set-a', 'set-b'].map((slug) => {
            const row = client.rows.get(keyFor(slug)) as Row;
            return [row.createdAt, row.updatedAt, row.lastViewed, row.publishedAt];
        });
        expect(stamps).toEqual([
            Array(4).fill('2026-10-27T12:00:00.000Z'),
            Array(4).fill('2026-10-27T11:59:00.000Z'),
        ]);
    });

    it('leaves a published set untouched, even one its owner has since unpublished', async () => {
        const rows = new Map<string, Row>([
            [keyFor('set-a'), { publishedAt: '2026-10-01T00:00:00.000Z', metadata: { publiclyViewable: false } }],
        ]);
        const client = makeClient(rows);
        await expect(run(client)).resolves.toEqual({ created: ['set-b'], incomplete: [], skipped: ['set-a'] });
        expect(sentOf(client.send, PutCommand)).toHaveLength(1);
        expect(sentOf(client.send, UpdateCommand)).toHaveLength(1);
        expect(rows.get(keyFor('set-a'))?.metadata).toEqual({ publiclyViewable: false });
    });

    // Its cards may have been edited since, so publishing it could skip the gate.
    it('reports a set created but never published instead of publishing it', async () => {
        const rows = new Map<string, Row>([[keyFor('set-a'), { metadata: { publiclyViewable: false } }]]);
        const client = makeClient(rows);
        await expect(run(client)).resolves.toEqual({ created: ['set-b'], incomplete: ['set-a'], skipped: [] });
        expect(
            [...sentOf(client.send, PutCommand), ...sentOf(client.send, UpdateCommand)].map(
                (cmd) => ('Item' in cmd.input ? cmd.input.Item : cmd.input.Key)?.SK
            )
        ).toEqual([`studyset#${seedStudysetUUID('u1', 'set-b')}`, `studyset#${seedStudysetUUID('u1', 'set-b')}`]);
        expect(rows.get(keyFor('set-a'))).toEqual({ metadata: { publiclyViewable: false } });
    });

    it('skips a set another run creates between its check and its write', async () => {
        const client = makeClient();
        const send = client.send.getMockImplementation()!;
        client.send.mockImplementation((cmd: unknown) =>
            cmd instanceof PutCommand && (cmd.input.Item as Row).title === 'Set A'
                ? Promise.reject(Object.assign(new Error('taken'), { name: 'ConditionalCheckFailedException' }))
                : send(cmd)
        );
        await expect(run(client)).resolves.toEqual({ created: ['set-b'], incomplete: [], skipped: ['set-a'] });
        expect(sentOf(client.send, UpdateCommand)).toHaveLength(1);
    });

    it('writes nothing on a dry run', async () => {
        const client = makeClient();
        await expect(run(client, { dryRun: true, feature: ['set-b'] })).resolves.toEqual({
            created: ['set-a', 'set-b'],
            incomplete: [],
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

    it('features nothing if any FEATURE slug is not listed', async () => {
        const rows = new Map<string, Row>([
            [keyFor('set-b'), { publishedAt: '2026-10-01T00:00:00.000Z', metadata: { publiclyViewable: false } }],
        ]);
        const client = makeClient(rows);
        await expect(run(client, { feature: ['set-a', 'set-b'] })).rejects.toThrow(
            /FEATURE names sets that aren't listed on Explore: set-b$/
        );
        const featured = sentOf(client.send, UpdateCommand).filter(
            (cmd) => cmd.input.UpdateExpression === 'SET #featuredAt = :now'
        );
        expect(featured).toHaveLength(0);
    });

    it('refuses a FEATURE slug with no seed file before writing', async () => {
        const client = makeClient();
        await expect(run(client, { feature: ['nope'] })).rejects.toThrow(/nope/);
        expect(client.send).not.toHaveBeenCalled();
    });
});
