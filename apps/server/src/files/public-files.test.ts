import { afterEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { studyset } from '../db/schema';
import { PNG_BYTES, uploadCardFile } from '../testing/files';
import {
    apiGet,
    apiRequest,
    createRouteHarness,
    type RouteHarness,
    signUp,
} from '../testing/route-harness';
import { createSet, okJson, studysetPost as post } from '../testing/studysets';

// Anonymous reads of a published set's images.

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

type Uploaded = { key: string; signedURL: string };

async function setup(h: RouteHarness) {
    const a = await signUp(h);
    const id = (await createSet(h, a.cookie)).studysetUUID;
    await okJson(
        post(h, '/update-studyset', {
            cookie: a.cookie,
            body: { studysetUUID: id, updates: { cards } },
        })
    );
    const shown = await okJson<Uploaded>(
        uploadCardFile(h, a.cookie, {
            studysetUUID: id,
            bytes: PNG_BYTES,
            cardUUID: 'c0',
            association: 'term',
        })
    );
    const cardless = await okJson<Uploaded>(
        uploadCardFile(h, a.cookie, { studysetUUID: id, bytes: PNG_BYTES })
    );
    await okJson(
        post(h, '/publish-studyset', {
            cookie: a.cookie,
            body: { studysetUUID: id, subject: 'science' },
        })
    );
    return { a, id, shown, cardless };
}

const setRow = (h: RouteHarness, id: string, change: Record<string, unknown>) =>
    h.db
        .update(studyset)
        .set(change)
        .where(eq(studyset.studysetUUID, id))
        .run();

describe('published sets', () => {
    test('anyone can read a shown image', async () => {
        const h = await harness();
        const { shown } = await setup(h);
        const b = await signUp(h);
        for (const cookie of [undefined, b.cookie]) {
            const res = await apiGet(h, shown.signedURL, { cookie });
            expect(res.status).toBe(200);
            expect(res.headers.get('x-content-type-options')).toBe('nosniff');
            expect(res.headers.get('cache-control')).toBe('private, no-cache');
        }
    });

    test('a file no card shows stays private', async () => {
        const h = await harness();
        const { a, cardless } = await setup(h);
        expect((await apiGet(h, cardless.signedURL)).status).toBe(404);
        expect(
            (await apiGet(h, cardless.signedURL, { cookie: a.cookie })).status
        ).toBe(200);
    });

    test('an attachment that is not a term or definition image stays private', async () => {
        const h = await harness();
        const { id, shown } = await setup(h);
        const row = h.db
            .select()
            .from(studyset)
            .where(eq(studyset.studysetUUID, id))
            .get()!;
        const changed = row.cards.map((card) => ({
            ...card,
            files: (card.files as { association: string }[]).map((f) => ({
                ...f,
                association: 'audio',
            })),
        }));
        setRow(h, id, { cards: changed });
        expect((await apiGet(h, shown.signedURL)).status).toBe(404);
    });

    test('unpublish and hide close the image again', async () => {
        const h = await harness();
        const { a, id, shown } = await setup(h);
        const etag = `"${shown.key.split('/')[1]}"`;
        const headers = { 'If-None-Match': etag };
        expect((await apiGet(h, shown.signedURL, { headers })).status).toBe(304);
        await okJson(
            post(h, '/unpublish-studyset', {
                cookie: a.cookie,
                body: { studysetUUID: id },
            })
        );
        expect((await apiGet(h, shown.signedURL, { headers })).status).toBe(404);
        setRow(h, id, { isPublic: true, hiddenAt: new Date() });
        expect((await apiGet(h, shown.signedURL)).status).toBe(404);
        expect(
            (await apiGet(h, shown.signedURL, { cookie: a.cookie })).status
        ).toBe(200);
    });

    test('avatars and writes still need a session', async () => {
        const h = await harness();
        const { id } = await setup(h);
        const avatar = `/api/files/avatars/u1/${crypto.randomUUID()}`;
        expect((await apiGet(h, avatar)).status).toBe(401);
        const res = await apiRequest(h, '/api/files/initiate-multipart-upload', {
            body: { studysetUUID: id, fileName: 'f', contentType: 'image/png' },
        });
        expect(res.status).toBe(401);
    });
});
