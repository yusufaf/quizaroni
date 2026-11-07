import { afterEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { studyset } from '../db/schema';
import {
    createRouteHarness,
    type RouteHarness,
    signUp,
} from '../testing/route-harness';
import {
    createSet,
    getSet,
    okJson,
    studysetPost as post,
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

const cards = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
        cardUUID: `c${i}`,
        term: `t${i}`,
        definition: `d${i}`,
    }));

async function setWithCards(h: RouteHarness, cookie: string, n: number) {
    const set = await createSet(h, cookie);
    await okJson(
        post(h, '/update-studyset', {
            cookie,
            body: {
                studysetUUID: set.studysetUUID,
                updates: { title: 'Cells', cards: cards(n) },
            },
        })
    );
    return set.studysetUUID;
}

describe('a duplicate of a hidden set', () => {
    test("can't be published", async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const id = await setWithCards(h, cookie, 4);
        h.db.update(studyset)
            .set({ hiddenAt: new Date() })
            .where(eq(studyset.studysetUUID, id))
            .run();
        const { studyset: copy } = await okJson<{
            studyset: { studysetUUID: string };
        }>(post(h, '/duplicate-studyset', { cookie, body: { studysetUUID: id } }));
        const res = await post(h, '/publish-studyset', {
            cookie,
            body: { studysetUUID: copy.studysetUUID, subject: 'science' },
        });
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({
            message: 'Study set cannot be published',
            errors: [{ code: 'hidden' }],
        });
    });
});

describe('publish-studyset', () => {
    test('needs a session and a valid id', async () => {
        const h = await harness();
        expect((await post(h, '/publish-studyset')).status).toBe(401);
        const { cookie } = await signUp(h);
        const res = await post(h, '/publish-studyset', {
            cookie,
            body: { studysetUUID: 'abc', subject: 'science' },
        });
        expect(res.status).toBe(400);
    });

    test("another user can't publish A's set", async () => {
        const h = await harness();
        const a = await signUp(h);
        const b = await signUp(h);
        const id = await setWithCards(h, a.cookie, 4);
        const res = await post(h, '/publish-studyset', {
            cookie: b.cookie,
            body: { studysetUUID: id, subject: 'science' },
        });
        expect(res.status).toBe(404);
        expect(
            (await getSet(h, a.cookie, id)).metadata.publiclyViewable
        ).toBe(false);
    });

    test('the gate lists every problem', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const id = await setWithCards(h, cookie, 3);
        const res = await post(h, '/publish-studyset', {
            cookie,
            body: { studysetUUID: id, subject: 'astrology' },
        });
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({
            message: 'Study set cannot be published',
            errors: [
                { code: 'invalidSubject' },
                { code: 'notEnoughCards', required: 4, actual: 3 },
            ],
        });
    });

    test('publishes and unpublishes', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const id = await setWithCards(h, cookie, 4);
        const published = await okJson<{ message: string }>(
            post(h, '/publish-studyset', {
                cookie,
                body: { studysetUUID: id, subject: 'science' },
            })
        );
        expect(published.message).toBe('Published study set');
        const set = await getSet(h, cookie, id);
        expect(set).toMatchObject({
            subject: 'science',
            metadata: { publiclyViewable: true },
        });
        expect(set.publishedAt).toBeString();

        await okJson(
            post(h, '/unpublish-studyset', {
                cookie,
                body: { studysetUUID: id },
            })
        );
        const after = await getSet(h, cookie, id);
        expect(after.metadata.publiclyViewable).toBe(false);
        expect(after.publishedAt).toBe(set.publishedAt);
    });

    test('a cross-origin publish is blocked', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const id = await setWithCards(h, cookie, 4);
        const res = await post(h, '/publish-studyset', {
            cookie,
            body: { studysetUUID: id, subject: 'science' },
            headers: { Origin: 'https://evil.example' },
        });
        expect(res.status).toBe(403);
    });

    test('a save cannot set publication fields', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const id = await setWithCards(h, cookie, 4);
        await okJson(
            post(h, '/update-studyset', {
                cookie,
                body: {
                    studysetUUID: id,
                    updates: {
                        isPublic: true,
                        publishedAt: '2026-01-01T00:00:00.000Z',
                        subject: 'science',
                        hiddenAt: null,
                        featuredAt: '2026-01-01T00:00:00.000Z',
                        saveCount: 9,
                        copiedFrom: id,
                        metadata: { publiclyViewable: true },
                    },
                },
            })
        );
        const set = await getSet(h, cookie, id);
        expect(set.metadata.publiclyViewable).toBe(false);
        expect(set).not.toHaveProperty('subject');
        expect(set).not.toHaveProperty('publishedAt');
        expect(set).not.toHaveProperty('copiedFrom');
    });
});

test('update-studyset reports an unpublish caused by the save', async () => {
    const h = await harness();
    const { cookie } = await signUp(h);
    const id = await setWithCards(h, cookie, 4);
    await okJson(
        post(h, '/publish-studyset', {
            cookie,
            body: { studysetUUID: id, subject: 'science' },
        })
    );
    const res = await okJson<{ unpublished?: unknown }>(
        post(h, '/update-studyset', {
            cookie,
            body: { studysetUUID: id, updates: { cards: cards(2) } },
        })
    );
    expect(res.unpublished).toEqual({
        errors: [{ code: 'notEnoughCards', required: 4, actual: 2 }],
    });
    expect((await getSet(h, cookie, id)).metadata.publiclyViewable).toBe(false);
});
