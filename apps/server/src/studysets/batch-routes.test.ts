import { afterEach, describe, expect, test } from 'bun:test';
import {
    createRouteHarness,
    type RouteHarness,
    signUp,
} from '../testing/route-harness';
import {
    createSet,
    getSet,
    listSets,
    okJson,
    studysetPost as post,
    type StudysetJson,
} from '../testing/studysets';

let current: RouteHarness | undefined;

async function harness(): Promise<RouteHarness> {
    current = await createRouteHarness();
    return current;
}

afterEach(() => {
    current?.close();
    current = undefined;
});

const CARD = {
    cardUUID: 'c1',
    term: 'term',
    definition: 'definition',
    files: [],
    notes: [{ noteUUID: 'n1', text: 'x' }],
};

async function setWithCard(h: RouteHarness, cookie: string) {
    const set = await createSet(h, cookie);
    await okJson(
        post(h, '/update-studyset', {
            cookie,
            body: {
                studysetUUID: set.studysetUUID,
                updates: { title: 'Bio', cards: [CARD] },
            },
        })
    );
    return getSet(h, cookie, set.studysetUUID);
}

describe('signed out', () => {
    test.each([
        '/duplicate-studyset',
        '/batch-duplicate-studysets',
        '/batch-delete-studysets',
    ])('%s is 401', async (path) => {
        const h = await harness();
        expect((await post(h, path)).status).toBe(401);
    });
});

describe('duplicate-studyset', () => {
    test('copies an own set with new card ids', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const source = await setWithCard(h, cookie);
        const { studyset } = await okJson<{ studyset: StudysetJson }>(
            post(h, '/duplicate-studyset', {
                cookie,
                body: { studysetUUID: source.studysetUUID },
            })
        );
        expect(studyset.title).toBe('Bio Copy');
        expect(studyset.cards[0]?.cardUUID).not.toBe('c1');
        expect(studyset.cards[0]?.term).toBe('term');
        expect(await listSets(h, cookie)).toHaveLength(2);
    });

    test("another user's set is 404 and nothing is made", async () => {
        const h = await harness();
        const a = await signUp(h);
        const b = await signUp(h);
        const source = await setWithCard(h, a.cookie);
        const res = await post(h, '/duplicate-studyset', {
            cookie: b.cookie,
            body: { studysetUUID: source.studysetUUID },
        });
        expect(res.status).toBe(404);
        expect(await listSets(h, b.cookie)).toEqual([]);
        expect(await listSets(h, a.cookie)).toEqual([source]);
    });
});

describe('batch-duplicate-studysets', () => {
    test('copies every own set', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const a1 = await setWithCard(h, cookie);
        const a2 = await setWithCard(h, cookie);
        const body = await okJson<{ studysetUUIDs: string[] }>(
            post(h, '/batch-duplicate-studysets', {
                cookie,
                body: { studysetUUIDs: [a1.studysetUUID, a2.studysetUUID] },
            })
        );
        expect(body.studysetUUIDs).toHaveLength(2);
        expect(await listSets(h, cookie)).toHaveLength(4);
    });

    test("one of another user's sets fails the batch for everyone", async () => {
        const h = await harness();
        const a = await signUp(h);
        const b = await signUp(h);
        const aSet = await setWithCard(h, a.cookie);
        const bSet = await setWithCard(h, b.cookie);
        const res = await post(h, '/batch-duplicate-studysets', {
            cookie: b.cookie,
            body: { studysetUUIDs: [bSet.studysetUUID, aSet.studysetUUID] },
        });
        expect(res.status).toBe(404);
        expect(await listSets(h, a.cookie)).toHaveLength(1);
        expect(await listSets(h, b.cookie)).toHaveLength(1);
    });

    test('more than 50 ids is 400', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const ids = Array.from({ length: 51 }, () => crypto.randomUUID());
        const res = await post(h, '/batch-duplicate-studysets', {
            cookie,
            body: { studysetUUIDs: ids },
        });
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ message: 'Too many study sets' });
    });
});

describe('batch-delete-studysets', () => {
    test('deletes own sets and reports them', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const a1 = await createSet(h, cookie);
        const a2 = await createSet(h, cookie);
        const body = await okJson<{ deletedStudysetUUIDs: string[] }>(
            post(h, '/batch-delete-studysets', {
                cookie,
                body: { studysetUUIDs: [a1.studysetUUID, a2.studysetUUID] },
            })
        );
        expect(body.deletedStudysetUUIDs.sort()).toEqual(
            [a1.studysetUUID, a2.studysetUUID].sort()
        );
        expect(await listSets(h, cookie)).toEqual([]);
    });

    test("another user's sets are skipped", async () => {
        const h = await harness();
        const a = await signUp(h);
        const b = await signUp(h);
        const aSet = await createSet(h, a.cookie);
        const body = await okJson<{ deletedStudysetUUIDs: string[] }>(
            post(h, '/batch-delete-studysets', {
                cookie: b.cookie,
                body: { studysetUUIDs: [aSet.studysetUUID] },
            })
        );
        expect(body.deletedStudysetUUIDs).toEqual([]);
        expect(await listSets(h, a.cookie)).toEqual([aSet]);
    });
});

describe('malformed bodies', () => {
    test.each(['/batch-duplicate-studysets', '/batch-delete-studysets'])(
        '%s answers 400',
        async (path) => {
            const h = await harness();
            const { cookie } = await signUp(h);
            const id = crypto.randomUUID();
            for (const body of [
                {},
                { studysetUUIDs: 'x' },
                { studysetUUIDs: [id, id] },
            ]) {
                const res = await post(h, path, { cookie, body });
                expect(res.status).toBe(400);
            }
        }
    );

    test('duplicate-studyset needs a valid id', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const res = await post(h, '/duplicate-studyset', {
            cookie,
            body: { studysetUUID: 'abc' },
        });
        expect(res.status).toBe(400);
    });
});
