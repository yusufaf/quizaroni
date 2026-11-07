import { afterEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { session, studyset, user } from '../db/schema';
import { PNG_BYTES, uploadCardFile } from '../testing/files';
import { HOSTED_ORIGIN } from '../seo/pages';
import {
    apiGet,
    createRouteHarness,
    PUBLIC_URL,
    type RouteHarness,
    signUp,
} from '../testing/route-harness';
import { installFixtureShell } from '../testing/shell-fixture';
import { createSet, okJson, studysetPost as post } from '../testing/studysets';

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
    term: `term ${i}`,
    definition: `definition ${i}`,
    notes: [{ noteUUID: `n${i}`, text: 'secret note text' }],
    categories: ['SecretCategory'],
    files: [],
}));

async function publish(
    h: RouteHarness,
    cookie: string,
    o: { title?: string; description?: string; subject?: string } = {}
) {
    const id = (await createSet(h, cookie)).studysetUUID;
    await okJson(
        post(h, '/update-studyset', {
            cookie,
            body: {
                studysetUUID: id,
                updates: {
                    title: o.title ?? 'Cells',
                    description: o.description ?? 'about cells',
                    cards,
                    labels: ['SecretLabel'],
                },
            },
        })
    );
    await okJson(
        post(h, '/publish-studyset', {
            cookie,
            body: { studysetUUID: id, subject: o.subject ?? 'science' },
        })
    );
    return id;
}

const setTime = (h: RouteHarness, id: string, at: string) =>
    h.db
        .update(studyset)
        .set({ publishedAt: new Date(at) })
        .where(eq(studyset.studysetUUID, id))
        .run();

type Feed = {
    items: { studysetUUID: string }[];
    nextCursor: string | null;
    total?: number;
    featured?: true;
};

const feed = async (h: RouteHarness, query = '') =>
    okJson<Feed>(apiGet(h, `/api/public/explore${query}`));

describe('public study set', () => {
    test('exposes only the allowlisted fields', async () => {
        const h = await harness();
        const a = await signUp(h);
        const id = await publish(h, a.cookie);
        await okJson(
            uploadCardFile(h, a.cookie, {
                studysetUUID: id,
                bytes: PNG_BYTES,
                cardUUID: 'c0',
                association: 'term',
                fileName: 'secret-file-name.png',
            })
        );
        const res = await apiGet(h, `/api/public/studyset/${id}`);
        expect(res.status).toBe(200);
        expect(res.headers.get('cache-control')).toBe('no-cache');
        const text = await res.text();
        const { studyset: set } = JSON.parse(text);
        expect(Object.keys(set).sort()).toEqual([
            'cards',
            'description',
            'publishedAt',
            'subject',
            'title',
            'updatedAt',
            'username',
        ]);
        expect(Object.keys(set.cards[0]).sort()).toEqual([
            'definition',
            'files',
            'term',
        ]);
        expect(Object.keys(set.cards[0].files[0]).sort()).toEqual([
            'association',
            'signedURL',
        ]);
        const owner = h.db.select().from(session).get()!.userId;
        const account = h.db
            .select()
            .from(user)
            .where(eq(user.id, owner))
            .get()!;
        for (const secret of [
            owner,
            account.email,
            '"Ada"',
            'secret note text',
            'SecretLabel',
            'SecretCategory',
            'secret-file-name',
            'saveCount',
            'featuredAt',
            'hidden',
            'copiedFrom',
            'userUUID',
            '"key"',
        ]) {
            expect(text).not.toContain(secret);
        }
    });

    test('summaries have exactly the summary fields', async () => {
        const h = await harness();
        const a = await signUp(h);
        await publish(h, a.cookie);
        const { items } = await feed(h);
        expect(Object.keys(items[0]!).sort()).toEqual([
            'description',
            'previews',
            'publishedAt',
            'studysetUUID',
            'subject',
            'termCount',
            'title',
            'updatedAt',
            'username',
        ]);
        expect(JSON.stringify(items)).not.toContain('secret note text');
    });
});

describe('explore feed', () => {
    async function threeSets(h: RouteHarness) {
        const a = await signUp(h);
        const ids = [
            await publish(h, a.cookie, { title: 'Old', subject: 'science' }),
            await publish(h, a.cookie, { title: 'Mid', subject: 'math' }),
            await publish(h, a.cookie, {
                title: 'New',
                subject: 'science',
                description: 'mitochondria',
            }),
        ];
        ids.forEach((id, i) =>
            setTime(h, id, `2026-0${i + 1}-01T00:00:00.000Z`)
        );
        return ids as [string, string, string];
    }

    test('newest first, with subject and search filters', async () => {
        const h = await harness();
        const [old, mid, newest] = await threeSets(h);
        expect((await feed(h)).items.map((i) => i.studysetUUID)).toEqual([
            newest,
            mid,
            old,
        ]);
        expect(
            (await feed(h, '?subject=math')).items.map((i) => i.studysetUUID)
        ).toEqual([mid]);
        expect(
            (await feed(h, '?q=mitochondria')).items.map((i) => i.studysetUUID)
        ).toEqual([newest]);
        expect((await apiGet(h, '/api/public/explore?sort=popular')).status).toBe(
            400
        );
    });

    test('pages through every set once', async () => {
        const h = await harness();
        const ids = await threeSets(h);
        const seen: string[] = [];
        let cursor: string | null = null;
        do {
            const page: Feed = await feed(
                h,
                `?limit=1${cursor ? `&cursor=${cursor}` : ''}`
            );
            expect(page.total).toBe(3);
            seen.push(...page.items.map((i) => i.studysetUUID));
            cursor = page.nextCursor;
        } while (cursor);
        expect(seen.sort()).toEqual([...ids].sort());
    });

    test('the featured row is ordered by featuredAt', async () => {
        const h = await harness();
        const [old, mid] = await threeSets(h);
        h.db.update(studyset)
            .set({ featuredAt: new Date('2026-05-01') })
            .where(eq(studyset.studysetUUID, old!))
            .run();
        h.db.update(studyset)
            .set({ featuredAt: new Date('2026-06-01') })
            .where(eq(studyset.studysetUUID, mid!))
            .run();
        const row = await feed(h, '?featured=1');
        expect(row.featured).toBe(true);
        expect(row.items.map((i) => i.studysetUUID)).toEqual([mid, old]);
    });

    test('a hidden set is gone from the API', async () => {
        const h = await harness();
        const a = await signUp(h);
        const id = await publish(h, a.cookie);
        h.db.update(studyset)
            .set({ hiddenAt: new Date(), featuredAt: new Date() })
            .where(eq(studyset.studysetUUID, id))
            .run();
        expect((await apiGet(h, `/api/public/studyset/${id}`)).status).toBe(404);
        expect((await feed(h)).items).toEqual([]);
        expect((await feed(h, '?featured=1')).items).toEqual([]);
    });
});

describe('SEO pages', () => {
    test('a published set page carries its own meta tags', async () => {
        const h = await harness();
        installFixtureShell(h);
        const a = await signUp(h);
        const id = await publish(h, a.cookie, { title: 'Cell biology' });
        const res = await apiGet(h, `/view/${id}`);
        expect(res.status).toBe(200);
        expect(res.headers.get('x-robots-tag')).toBeNull();
        const html = await res.text();
        expect(html).toContain('<title>Cell biology · Quizaroni</title>');
        expect(html).toContain(
            `<meta property="og:url" content="${PUBLIC_URL}/view/${id}" />`
        );
        expect(html).not.toContain(HOSTED_ORIGIN);
    });

    test('a private or unknown set page is noindex and names nothing', async () => {
        const h = await harness();
        installFixtureShell(h);
        const a = await signUp(h);
        const draft = (await createSet(h, a.cookie)).studysetUUID;
        for (const id of [draft, 'b'.repeat(32), 'not-an-id']) {
            const res = await apiGet(h, `/view/${id}`);
            expect(res.status).toBe(200);
            expect(res.headers.get('x-robots-tag')).toBe('noindex');
            const html = await res.text();
            expect(html).toContain('name="robots" content="noindex"');
            expect(html).not.toMatch(/property="og:/);
            expect(html).not.toContain(HOSTED_ORIGIN);
        }
    });

    test('other pages name this instance', async () => {
        const h = await harness();
        installFixtureShell(h);
        for (const path of ['/', '/index.html', '/explore']) {
            const html = await (await apiGet(h, path)).text();
            expect(html).toContain(`<link rel="canonical" href="${PUBLIC_URL}/" />`);
            expect(html).not.toContain(HOSTED_ORIGIN);
        }
    });

    test('the sitemap lists exactly the published sets', async () => {
        const h = await harness();
        const a = await signUp(h);
        const published = [
            await publish(h, a.cookie),
            await publish(h, a.cookie),
        ];
        await createSet(h, a.cookie);
        const hidden = await publish(h, a.cookie);
        h.db.update(studyset)
            .set({ hiddenAt: new Date() })
            .where(eq(studyset.studysetUUID, hidden))
            .run();
        const res = await apiGet(h, '/sitemap.xml');
        expect(res.headers.get('content-type')).toContain('application/xml');
        const locs = [...(await res.text()).matchAll(/<loc>([^<]*)<\/loc>/g)].map(
            (m) => m[1]
        );
        expect(locs[0]).toBe(`${PUBLIC_URL}/`);
        expect(locs.slice(1).sort()).toEqual(
            published.map((id) => `${PUBLIC_URL}/view/${id}`).sort()
        );
    });

    test('robots.txt points at this instance sitemap', async () => {
        const h = await harness();
        const res = await apiGet(h, '/robots.txt');
        expect(res.headers.get('content-type')).toContain('text/plain');
        expect(await res.text()).toContain(`Sitemap: ${PUBLIC_URL}/sitemap.xml`);
    });
});

