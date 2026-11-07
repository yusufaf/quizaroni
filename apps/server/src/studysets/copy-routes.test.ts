import { afterEach, describe, expect, test } from 'bun:test';
import { PNG_BYTES, uploadCardFile } from '../testing/files';
import {
    apiGet,
    createRouteHarness,
    type RouteHarness,
    signUp,
} from '../testing/route-harness';
import {
    createSet,
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

const cards = Array.from({ length: 4 }, (_, i) => ({
    cardUUID: `c${i}`,
    term: `t${i}`,
    definition: `d${i}`,
    files: [],
}));

async function publishedWithImage(h: RouteHarness, cookie: string) {
    const id = (await createSet(h, cookie)).studysetUUID;
    await okJson(
        post(h, '/update-studyset', {
            cookie,
            body: { studysetUUID: id, updates: { title: 'Cells', cards } },
        })
    );
    await okJson(
        uploadCardFile(h, cookie, {
            studysetUUID: id,
            bytes: PNG_BYTES,
            cardUUID: 'c0',
            association: 'term',
        })
    );
    await okJson(
        post(h, '/publish-studyset', {
            cookie,
            body: { studysetUUID: id, subject: 'science' },
        })
    );
    return id;
}

describe('copy-public-studyset', () => {
    test('needs a session', async () => {
        const h = await harness();
        expect((await post(h, '/copy-public-studyset')).status).toBe(401);
    });

    test('saves a copy whose image outlives the source', async () => {
        const h = await harness();
        const a = await signUp(h);
        const b = await signUp(h);
        const source = await publishedWithImage(h, a.cookie);
        const { studyset } = await okJson<{ studyset: StudysetJson }>(
            post(h, '/copy-public-studyset', {
                cookie: b.cookie,
                body: { studysetUUID: source },
            })
        );
        expect((await listSets(h, b.cookie)).map((s) => s.title)).toEqual([
            'Cells',
        ]);
        const image = (studyset.cards[0]?.files as { signedURL: string }[])[0]!;
        expect(
            (await apiGet(h, image.signedURL, { cookie: b.cookie })).status
        ).toBe(200);
        await okJson(
            post(h, '/delete-studyset', {
                cookie: a.cookie,
                body: { studysetUUID: source },
            })
        );
        expect(
            (await apiGet(h, image.signedURL, { cookie: b.cookie })).status
        ).toBe(200);
    });

    test("a private set can't be saved", async () => {
        const h = await harness();
        const a = await signUp(h);
        const b = await signUp(h);
        const id = (await createSet(h, a.cookie)).studysetUUID;
        const res = await post(h, '/copy-public-studyset', {
            cookie: b.cookie,
            body: { studysetUUID: id },
        });
        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({
            message: 'This study set is private or does not exist.',
        });
        expect(await listSets(h, b.cookie)).toEqual([]);
    });
});
