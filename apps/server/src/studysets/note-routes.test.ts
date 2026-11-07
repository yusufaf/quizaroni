import { afterEach, describe, expect, test } from 'bun:test';
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

async function setWithCard(h: RouteHarness, cookie: string) {
    const set = await createSet(h, cookie);
    await okJson(
        post(h, '/update-studyset', {
            cookie,
            body: {
                studysetUUID: set.studysetUUID,
                updates: { cards: [{ cardUUID: 'c1', term: 't', notes: [] }] },
            },
        })
    );
    return set.studysetUUID;
}

const notesOf = async (h: RouteHarness, cookie: string, id: string) =>
    (await getSet(h, cookie, id)).cards[0]?.notes as {
        noteUUID: string;
        text: string;
    }[];

describe('note routes', () => {
    test.each(['/create-note', '/edit-note', '/delete-note'])(
        '%s is 401 signed out',
        async (path) => {
            const h = await harness();
            expect((await post(h, path)).status).toBe(401);
        }
    );

    test('create, edit and delete round trip', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const id = await setWithCard(h, cookie);
        const { noteUUID } = await okJson<{ noteUUID: string }>(
            post(h, '/create-note', {
                cookie,
                body: { cardUUID: 'c1', studysetUUID: id },
            })
        );
        expect(await notesOf(h, cookie, id)).toMatchObject([
            { noteUUID, text: '' },
        ]);
        await okJson(
            post(h, '/edit-note', {
                cookie,
                body: { cardUUID: 'c1', noteUUID, studysetUUID: id, text: 'hi' },
            })
        );
        expect((await notesOf(h, cookie, id))[0]?.text).toBe('hi');
        await okJson(
            post(h, '/delete-note', {
                cookie,
                body: { cardUUID: 'c1', noteUUID, studysetUUID: id },
            })
        );
        expect(await notesOf(h, cookie, id)).toEqual([]);
    });

    test("another user's calls are 404 and change nothing", async () => {
        const h = await harness();
        const a = await signUp(h);
        const b = await signUp(h);
        const id = await setWithCard(h, a.cookie);
        const { noteUUID } = await okJson<{ noteUUID: string }>(
            post(h, '/create-note', {
                cookie: a.cookie,
                body: { cardUUID: 'c1', studysetUUID: id },
            })
        );
        const before = await getSet(h, a.cookie, id);
        for (const [path, body] of [
            ['/create-note', { cardUUID: 'c1', studysetUUID: id }],
            [
                '/edit-note',
                { cardUUID: 'c1', noteUUID, studysetUUID: id, text: 'pwned' },
            ],
            ['/delete-note', { cardUUID: 'c1', noteUUID, studysetUUID: id }],
        ] as const) {
            const res = await post(h, path, { cookie: b.cookie, body });
            expect(res.status).toBe(404);
            expect(await res.json()).toEqual({
                message: 'Study set not found',
            });
        }
        expect(await getSet(h, a.cookie, id)).toEqual(before);
    });

    test('bad input is 400', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const id = await setWithCard(h, cookie);
        const cases: [string, unknown, string][] = [
            ['/create-note', { cardUUID: 'c1', studysetUUID: 'abc' }, 'Invalid studysetUUID'],
            ['/create-note', { studysetUUID: id }, 'Invalid cardUUID'],
            ['/delete-note', { cardUUID: 'c1', studysetUUID: id }, 'Invalid noteUUID'],
            [
                '/edit-note',
                { cardUUID: 'c1', noteUUID: 'n', studysetUUID: id, text: 1 },
                'Invalid text',
            ],
        ];
        for (const [path, body, text] of cases) {
            const res = await post(h, path, { cookie, body });
            expect(res.status).toBe(400);
            expect(await res.json()).toEqual({ message: text });
        }
    });

    test('a missing card is 404 Card not found', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const id = await setWithCard(h, cookie);
        const res = await post(h, '/create-note', {
            cookie,
            body: { cardUUID: 'nope', studysetUUID: id },
        });
        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({ message: 'Card not found' });
    });
});
