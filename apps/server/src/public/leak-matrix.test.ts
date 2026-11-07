import { afterEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { studyset } from '../db/schema';
import { PNG_BYTES, uploadCardFile } from '../testing/files';
import {
    apiGet,
    createRouteHarness,
    type RouteHarness,
    signUp,
} from '../testing/route-harness';
import { installFixtureShell } from '../testing/shell-fixture';
import { createSet, okJson, studysetPost as post } from '../testing/studysets';

// Every public path, checked once while the set is listed and again after
// one listing condition is forced off, so no absence check passes just
// because the path doesn't serve the set at all.

let current: RouteHarness | undefined;

afterEach(() => {
    current?.close();
    current = undefined;
});

const TITLE = 'Leak matrix set';

const cards = Array.from({ length: 4 }, (_, i) => ({
    cardUUID: `c${i}`,
    term: `t${i}`,
    definition: `d${i}`,
    files: [],
}));

type Feed = { items: { studysetUUID: string }[] };

async function setup() {
    const h = await createRouteHarness();
    current = h;
    installFixtureShell(h);
    const a = await signUp(h);
    const b = await signUp(h);
    const id = (await createSet(h, a.cookie)).studysetUUID;
    await okJson(
        post(h, '/update-studyset', {
            cookie: a.cookie,
            body: { studysetUUID: id, updates: { title: TITLE, cards } },
        })
    );
    const image = await okJson<{ key: string; signedURL: string }>(
        uploadCardFile(h, a.cookie, {
            studysetUUID: id,
            bytes: PNG_BYTES,
            cardUUID: 'c1',
            association: 'term',
        })
    );
    await okJson(
        post(h, '/publish-studyset', {
            cookie: a.cookie,
            body: { studysetUUID: id, subject: 'science' },
        })
    );
    h.db.update(studyset)
        .set({ featuredAt: new Date() })
        .where(eq(studyset.studysetUUID, id))
        .run();
    return { h, a, b, id, image };
}

type Setup = Awaited<ReturnType<typeof setup>>;

const feedIds = async (h: RouteHarness, query = '') =>
    (
        await okJson<Feed>(apiGet(h, `/api/public/explore${query}`))
    ).items.map((item) => item.studysetUUID);

const sitemap = async (h: RouteHarness) =>
    (await apiGet(h, '/sitemap.xml')).text();

const copy = (s: Setup) =>
    post(s.h, '/copy-public-studyset', {
        cookie: s.b.cookie,
        body: { studysetUUID: s.id },
    });

async function expectListed(s: Setup) {
    const { h, id, image } = s;
    expect((await apiGet(h, `/api/public/studyset/${id}`)).status).toBe(200);
    expect(await feedIds(h)).toContain(id);
    expect(await feedIds(h, '?featured=1')).toContain(id);
    expect(await sitemap(h)).toContain(`/view/${id}`);
    const view = await apiGet(h, `/view/${id}`);
    expect(view.status).toBe(200);
    expect(view.headers.get('x-robots-tag')).toBeNull();
    expect(await view.text()).toMatch(
        new RegExp(`property="og:title" content="${TITLE}`)
    );
    expect((await apiGet(h, image.signedURL)).status).toBe(200);
    expect((await copy(s)).status).toBe(200);
}

async function expectUnlisted(s: Setup) {
    const { h, id, image } = s;
    expect((await apiGet(h, `/api/public/studyset/${id}`)).status).toBe(404);
    expect(await feedIds(h)).not.toContain(id);
    expect(await feedIds(h, '?featured=1')).not.toContain(id);
    expect(await sitemap(h)).not.toContain(id);
    const view = await apiGet(h, `/view/${id}`);
    expect(view.headers.get('x-robots-tag')).toBe('noindex');
    const html = await view.text();
    expect(html).toContain('name="robots" content="noindex"');
    expect(html).not.toMatch(/property="og:(title|url)"/);
    expect(html).not.toContain(TITLE);
    expect((await copy(s)).status).toBe(404);
    expect((await apiGet(h, image.signedURL)).status).toBe(404);
    const etag = `"${image.key.split('/')[1]}"`;
    const revalidate = await apiGet(h, image.signedURL, {
        headers: { 'If-None-Match': etag },
    });
    expect(revalidate.status).toBe(404);
}

const force = (s: Setup, change: Partial<typeof studyset.$inferInsert>) =>
    s.h.db
        .update(studyset)
        .set(change)
        .where(eq(studyset.studysetUUID, s.id))
        .run();

describe('an unlisted set leaks nowhere', () => {
    test.each([
        ['hidden while still public and featured', { hiddenAt: new Date() }],
        ['private while featured and published', { isPublic: false }],
        ['public but never published', { publishedAt: null }],
    ] as const)('%s', async (_, change) => {
        const s = await setup();
        await expectListed(s);
        force(s, change);
        await expectUnlisted(s);
        const own = await apiGet(s.h, s.image.signedURL, {
            cookie: s.a.cookie,
        });
        expect(own.status).toBe(200);
    });

    test('deleted', async () => {
        const s = await setup();
        await expectListed(s);
        s.h.db.delete(studyset).where(eq(studyset.studysetUUID, s.id)).run();
        await expectUnlisted(s);
    });
});
