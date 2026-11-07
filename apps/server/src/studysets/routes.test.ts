import { afterEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { session, studyset } from '../db/schema';
import {
    createRouteHarness,
    type RouteHarness,
    signIn,
    signUp,
} from '../testing/route-harness';
import {
    createSet,
    getSet,
    listSets,
    okJson,
    studysetPost as post,
    type StudysetJson as Studyset,
} from '../testing/studysets';

const PATHS = [
    '/get-all-studysets',
    '/get-studyset',
    '/create-studyset',
    '/update-studyset',
    '/delete-studyset',
] as const;

let current: RouteHarness | undefined;

async function harness(): Promise<RouteHarness> {
    current = await createRouteHarness();
    return current;
}

afterEach(() => {
    current?.close();
    current = undefined;
});

const CLIENT_ID = '3f2a1b0c-9d8e-4f7a-8b6c-5d4e3f2a1b0c';
const OTHER_SET_ID = '7d1e2f3a-4b5c-4d6e-8f70-8192a3b4c5d6';
const CARD = {
    cardUUID: 'c1',
    term: 'term',
    definition: 'definition',
    files: [],
    categories: [],
    important: false,
    notes: [],
};

// What syncApiClient sends for a set made offline: the whole local row.
const LOCAL_SET = {
    studysetUUID: CLIENT_ID,
    userUUID: 'local-user',
    username: 'someone',
    title: 'Made offline',
    description: 'desc',
    favorited: false,
    cards: [CARD],
    categories: ['A'],
    labels: [],
    metadata: { publiclyViewable: true, terminology: 'Q/A' },
    lastViewed: '2026-10-01T00:00:00.000Z',
    createdAt: '2020-01-01T00:00:00.000Z',
};

describe('authentication', () => {
    test.each(PATHS)('%s needs a session', async (path) => {
        const h = await harness();
        for (const cookie of [
            undefined,
            '__Secure-quizaroni.session_token=junk',
        ]) {
            const res = await post(h, path, { cookie });
            expect(res.status).toBe(401);
            expect(await res.json()).toEqual({ message: 'Unauthorized' });
        }
    });

    test('a cross-origin update is blocked and writes nothing', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const set = await createSet(h, cookie);
        const res = await post(h, '/update-studyset', {
            cookie,
            body: { studysetUUID: set.studysetUUID, updates: { title: 'x' } },
            headers: { Origin: 'https://evil.example' },
        });
        expect(res.status).toBe(403);
        expect(await res.json()).toEqual({
            message: 'Cross-origin request blocked',
        });
        expect((await getSet(h, cookie, set.studysetUUID)).title).toBe(
            'Untitled Studyset'
        );
    });

    test('batch-update-studysets does not exist, so the SyncEngine falls back', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        expect((await post(h, '/batch-update-studysets', { cookie })).status).toBe(
            404
        );
        expect((await post(h, '/batch-update-studysets')).status).toBe(401);
    });
});

describe('create-studyset', () => {
    test('makes a new set for the session user', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const res = await post(h, '/create-studyset', { cookie, rawBody: '' });
        expect(res.status).toBe(200);
        expect(res.headers.get('Cache-Control')).toBe('no-store');
        const body = (await res.json()) as {
            message: string;
            studyset: Studyset;
        };
        const userId = h.db.select().from(session).get()!.userId;
        expect(body.message).toBe('Successfully created study set');
        expect(body.studyset).toMatchObject({
            userUUID: userId,
            username: null,
            title: 'Untitled Studyset',
            cards: [],
            metadata: { publiclyViewable: false },
        });
        expect(await createSet(h, cookie, {})).toMatchObject({
            title: 'Untitled Studyset',
        });
    });

    test.each([
        [{ studyset: null }, 'Invalid studyset'],
        [{ studyset: { studysetUUID: 'abc' } }, 'Invalid studysetUUID'],
        [
            { studyset: { studysetUUID: CLIENT_ID.toUpperCase() } },
            'Invalid studysetUUID',
        ],
        [
            { studyset: { studysetUUID: CLIENT_ID, cards: [1] } },
            'Invalid cards',
        ],
        [
            { studyset: { studysetUUID: CLIENT_ID, title: 7 } },
            'Invalid updates',
        ],
    ])('400 for %p', async (body, message) => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const res = await post(h, '/create-studyset', { cookie, body });
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ message });
        expect(await listSets(h, cookie)).toEqual([]);
    });
});

describe('a non-owner', () => {
    test('can neither read, change, delete nor claim a set', async () => {
        const h = await harness();
        const a = await signUp(h);
        const b = await signUp(h);
        const set = await createSet(h, a.cookie, {
            studyset: { ...LOCAL_SET, title: 'Mine' },
        });
        const id = set.studysetUUID;
        const attempts: [string, unknown, number, string][] = [
            [
                '/get-studyset',
                { studysetUUID: id },
                404,
                'Study set not found in your library.',
            ],
            [
                '/update-studyset',
                { studysetUUID: id, updates: { title: 'pwned' } },
                404,
                'Study set not found',
            ],
            [
                '/delete-studyset',
                { studysetUUID: id },
                404,
                'Study set not found',
            ],
            [
                '/create-studyset',
                { studyset: { studysetUUID: id, title: 'pwned' } },
                403,
                'Forbidden',
            ],
        ];
        for (const [path, body, status, message] of attempts) {
            const res = await post(h, path, { cookie: b.cookie, body });
            expect(res.status).toBe(status);
            expect(await res.json()).toEqual({ message });
            expect(await getSet(h, a.cookie, id)).toEqual(set);
        }
        expect(await listSets(h, b.cookie)).toEqual([]);
    });
});

describe('SyncEngine flow', () => {
    test('a set made offline syncs and shows on a second device', async () => {
        const h = await harness();
        const a = await signUp(h);
        const created = await createSet(h, a.cookie, { studyset: LOCAL_SET });
        const userId = h.db.select().from(session).get()!.userId;
        expect(created).toMatchObject({
            studysetUUID: CLIENT_ID,
            userUUID: userId,
            username: null,
            title: 'Made offline',
            cards: [CARD],
            categories: ['A'],
            lastViewed: LOCAL_SET.lastViewed,
            metadata: { publiclyViewable: false, terminology: 'Q/A' },
        });
        expect(created.createdAt).not.toBe(LOCAL_SET.createdAt);

        await okJson(
            post(h, '/update-studyset', {
                cookie: a.cookie,
                body: {
                    studysetUUID: CLIENT_ID,
                    updates: { ...LOCAL_SET, title: 'Renamed' },
                    isMetadataUpdate: false,
                },
            })
        );

        const secondDevice = await signIn(h, a.email, a.password);
        expect(secondDevice).not.toBe(a.cookie);
        const sets = await listSets(h, secondDevice);
        expect(sets).toHaveLength(1);
        expect(sets[0]).toMatchObject({
            studysetUUID: CLIENT_ID,
            title: 'Renamed',
            cards: [CARD],
        });
    });

    test('a retried create keeps one set', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        await createSet(h, cookie, { studyset: LOCAL_SET });
        await createSet(h, cookie, { studyset: LOCAL_SET });
        expect(await listSets(h, cookie)).toHaveLength(1);
    });

    test('an uppercased id cannot make a second set', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        await createSet(h, cookie, { studyset: LOCAL_SET });
        const res = await post(h, '/create-studyset', {
            cookie,
            body: {
                studyset: {
                    ...LOCAL_SET,
                    studysetUUID: CLIENT_ID.toUpperCase(),
                },
            },
        });
        expect(res.status).toBe(400);
        expect(await listSets(h, cookie)).toHaveLength(1);
    });
});

describe('update-studyset', () => {
    test('a partial update keeps the rest and advances updatedAt', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const set = await createSet(h, cookie, { studyset: LOCAL_SET });
        await Bun.sleep(5);
        const { studyset } = await okJson<{ studyset: Studyset }>(
            post(h, '/update-studyset', {
                cookie,
                body: { studysetUUID: CLIENT_ID, updates: { favorited: true } },
            })
        );
        expect(studyset).toMatchObject({
            title: set.title,
            cards: set.cards,
            favorited: true,
            createdAt: set.createdAt,
        });
        expect(studyset.updatedAt > set.updatedAt).toBe(true);
        expect(await getSet(h, cookie, CLIENT_ID)).toEqual(studyset);
    });

    test('a metadata update merges per key', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        await createSet(h, cookie, { studyset: LOCAL_SET });
        await okJson(
            post(h, '/update-studyset', {
                cookie,
                body: {
                    studysetUUID: CLIENT_ID,
                    updates: { notesSortBy: 'date', publiclyViewable: true },
                    isMetadataUpdate: true,
                },
            })
        );
        expect((await getSet(h, cookie, CLIENT_ID)).metadata).toMatchObject({
            notesSortBy: 'date',
            terminology: 'Q/A',
            publiclyViewable: false,
        });
    });

    test('a full CreateSet save writes only editable fields', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const stored = await createSet(h, cookie, { studyset: LOCAL_SET });
        const viewed = '2026-11-01T12:00:00.000Z';
        const { studyset } = await okJson<{ studyset: Studyset }>(
            post(h, '/update-studyset', {
                cookie,
                body: {
                    studysetUUID: CLIENT_ID,
                    updates: {
                        ...stored,
                        title: 'Edited',
                        lastViewed: viewed,
                        userUUID: 'someone-else',
                        username: 'impostor',
                        createdAt: '2000-01-01T00:00:00.000Z',
                        publishedAt: viewed,
                    },
                },
            })
        );
        expect(studyset).toMatchObject({
            title: 'Edited',
            lastViewed: viewed,
            userUUID: stored.userUUID,
            username: null,
            createdAt: stored.createdAt,
        });
        expect(studyset).not.toHaveProperty('publishedAt');
    });

    test.each([
        [{ studysetUUID: 'abc', updates: {} }, 'Invalid studysetUUID'],
        [{ studysetUUID: CLIENT_ID }, 'Invalid updates'],
        [{ studysetUUID: CLIENT_ID, updates: [] }, 'Invalid updates'],
        [
            { studysetUUID: CLIENT_ID, updates: { cards: 'x' } },
            'Invalid cards',
        ],
    ])('400 for %p', async (body, message) => {
        const h = await harness();
        const { cookie } = await signUp(h);
        await createSet(h, cookie, { studyset: LOCAL_SET });
        const res = await post(h, '/update-studyset', { cookie, body });
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ message });
    });

    test("403 for a new file key under another set's id", async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        await createSet(h, cookie, { studyset: LOCAL_SET });
        const res = await post(h, '/update-studyset', {
            cookie,
            body: {
                studysetUUID: CLIENT_ID,
                updates: {
                    cards: [{ ...CARD, files: [{ key: `${OTHER_SET_ID}/f` }] }],
                },
            },
        });
        expect(res.status).toBe(403);
        expect((await getSet(h, cookie, CLIENT_ID)).cards).toEqual([CARD]);
    });

    test('404 for an unknown set', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const res = await post(h, '/update-studyset', {
            cookie,
            body: { studysetUUID: OTHER_SET_ID, updates: { title: 'x' } },
        });
        expect(res.status).toBe(404);
    });

    test('413 for a set over the cap and for an oversized body', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        await createSet(h, cookie, { studyset: LOCAL_SET });
        const bigCards = Array.from({ length: 45 }, (_, i) => ({
            ...CARD,
            cardUUID: `c${i}`,
            definition: 'x'.repeat(10 * 1024),
        }));
        const tooBig = await post(h, '/update-studyset', {
            cookie,
            body: { studysetUUID: CLIENT_ID, updates: { cards: bigCards } },
        });
        expect(tooBig.status).toBe(413);
        expect(await tooBig.json()).toEqual({ message: 'Study set too large' });

        const huge = await post(h, '/update-studyset', {
            cookie,
            rawBody: JSON.stringify({ x: 'x'.repeat(600 * 1024) }),
        });
        expect(huge.status).toBe(413);
        expect(await huge.json()).toEqual({ message: 'Payload too large' });
        expect((await getSet(h, cookie, CLIENT_ID)).cards).toEqual([CARD]);
    });
});

describe('get-studyset', () => {
    test.each([
        [{ studysetUUID: 'abc' }],
        [{}],
        [{ studysetUUID: CLIENT_ID.toUpperCase() }],
        [{ studysetUUID: OTHER_SET_ID }],
    ])('404 for %p', async (body) => {
        const h = await harness();
        const { cookie } = await signUp(h);
        await createSet(h, cookie, { studyset: LOCAL_SET });
        const res = await post(h, '/get-studyset', { cookie, body });
        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({
            message: 'Study set not found in your library.',
        });
    });
});

describe('delete-studyset', () => {
    test('is idempotent for the owner', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        await createSet(h, cookie, { studyset: LOCAL_SET });
        for (let i = 0; i < 2; i++) {
            expect(
                await okJson(
                    post(h, '/delete-studyset', {
                        cookie,
                        body: { studysetUUID: CLIENT_ID },
                    })
                )
            ).toEqual({ message: 'Successfully deleted study set' });
        }
        expect(await listSets(h, cookie)).toEqual([]);
    });

    test('400 for a bad id', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const res = await post(h, '/delete-studyset', {
            cookie,
            body: { studysetUUID: 'abc' },
        });
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ message: 'Invalid studysetUUID' });
    });
});

describe('body handling', () => {
    test.each(['/update-studyset', '/delete-studyset', '/create-studyset'])(
        '%s answers 400 for bad JSON and non-object bodies',
        async (path) => {
            const h = await harness();
            const { cookie } = await signUp(h);
            const bad = await post(h, path, { cookie, rawBody: '{nope' });
            expect(bad.status).toBe(400);
            expect(await bad.json()).toEqual({ message: 'Invalid JSON' });
            if (path === '/create-studyset') return;
            for (const rawBody of ['null', '[]']) {
                const res = await post(h, path, { cookie, rawBody });
                expect(res.status).toBe(400);
            }
        }
    );
});

describe('Combine', () => {
    test("cards with files from another own set are re-keyed; another user's are refused", async () => {
        const h = await harness();
        const a = await signUp(h);
        const b = await signUp(h);
        const s1 = await createSet(h, a.cookie);
        const file = { key: `${s1.studysetUUID}/f`, name: 'f.png' };
        // No upload route exists yet, so the file is put in place directly.
        h.db.update(studyset)
            .set({ cards: [{ ...CARD, files: [file] }] })
            .where(eq(studyset.studysetUUID, s1.studysetUUID))
            .run();
        const s2 = await createSet(h, a.cookie);
        const { studyset: combined } = await okJson<{ studyset: Studyset }>(
            post(h, '/update-studyset', {
                cookie: a.cookie,
                body: {
                    studysetUUID: s2.studysetUUID,
                    updates: { cards: [{ ...CARD, files: [file] }] },
                },
            })
        );
        const files = combined.cards[0]?.files as { key: string }[];
        expect(files[0]?.key).toStartWith(`${s2.studysetUUID}/`);

        const bSet = await createSet(h, b.cookie);
        const res = await post(h, '/update-studyset', {
            cookie: b.cookie,
            body: {
                studysetUUID: bSet.studysetUUID,
                updates: { cards: [{ ...CARD, files: [file] }] },
            },
        });
        expect(res.status).toBe(403);
        expect((await getSet(h, b.cookie, bSet.studysetUUID)).cards).toEqual([]);
    });
});
