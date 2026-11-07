import { afterEach, describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PNG_BYTES, uploadCardFile } from '../testing/files';
import {
    apiGet,
    createRouteHarness,
    type RouteHarness,
    signUp,
} from '../testing/route-harness';
import {
    createSet,
    getSet,
    okJson,
    studysetPost,
} from '../testing/studysets';

// Duplicate, Combine and delete against real uploaded files.

let current: RouteHarness | undefined;

async function harness(): Promise<RouteHarness> {
    current = await createRouteHarness();
    return current;
}

afterEach(() => {
    current?.close();
    current = undefined;
});

type Uploaded = { key: string; signedURL: string };

async function uploaded(h: RouteHarness, cookie: string) {
    const set = (await createSet(h, cookie)).studysetUUID;
    await okJson(
        studysetPost(h, '/update-studyset', {
            cookie,
            body: {
                studysetUUID: set,
                updates: { cards: [{ cardUUID: 'c1', term: 't', files: [] }] },
            },
        })
    );
    const file = await okJson<Uploaded>(
        uploadCardFile(h, cookie, {
            studysetUUID: set,
            bytes: PNG_BYTES,
            cardUUID: 'c1',
            association: 'term',
        })
    );
    return { set, file };
}

const firstFile = async (h: RouteHarness, cookie: string, id: string) =>
    ((await getSet(h, cookie, id)).cards[0]?.files as Uploaded[])[0]!;

const deleteSet = (h: RouteHarness, cookie: string, studysetUUID: string) =>
    studysetPost(h, '/delete-studyset', { cookie, body: { studysetUUID } });

describe('copies', () => {
    test('a duplicate gets its own copy that outlives the source', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const { set } = await uploaded(h, cookie);
        const { studyset: copy } = await okJson<{
            studyset: { studysetUUID: string };
        }>(
            studysetPost(h, '/duplicate-studyset', {
                cookie,
                body: { studysetUUID: set },
            })
        );
        const copied = await firstFile(h, cookie, copy.studysetUUID);
        expect(copied.key).toStartWith(`${copy.studysetUUID}/`);
        await okJson(deleteSet(h, cookie, set));
        const res = await apiGet(h, copied.signedURL, { cookie });
        expect(res.status).toBe(200);
        expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG_BYTES);
    });

    test('batch duplicate copies files too', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const { set } = await uploaded(h, cookie);
        const { studysetUUIDs } = await okJson<{ studysetUUIDs: string[] }>(
            studysetPost(h, '/batch-duplicate-studysets', {
                cookie,
                body: { studysetUUIDs: [set] },
            })
        );
        const copied = await firstFile(h, cookie, studysetUUIDs[0]!);
        expect(
            (await apiGet(h, copied.signedURL, { cookie })).status
        ).toBe(200);
    });

    test('Combine re-keys and copies files from another own set', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const { set } = await uploaded(h, cookie);
        const source = await getSet(h, cookie, set);
        const target = (await createSet(h, cookie)).studysetUUID;
        await okJson(
            studysetPost(h, '/update-studyset', {
                cookie,
                body: { studysetUUID: target, updates: { cards: source.cards } },
            })
        );
        const file = await firstFile(h, cookie, target);
        expect(file.key).toStartWith(`${target}/`);
        expect((await apiGet(h, file.signedURL, { cookie })).status).toBe(200);
    });
});

describe('deletes', () => {
    test('deleting a set deletes its files', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const { set, file } = await uploaded(h, cookie);
        await okJson(deleteSet(h, cookie, set));
        expect(existsSync(join(h.files.filesDir, set))).toBe(false);
        expect((await apiGet(h, file.signedURL, { cookie })).status).toBe(404);
    });

    test("batch delete removes the caller's files only", async () => {
        const h = await harness();
        const a = await signUp(h);
        const b = await signUp(h);
        const a1 = await uploaded(h, a.cookie);
        const a2 = await uploaded(h, a.cookie);
        const b1 = await uploaded(h, b.cookie);
        await okJson(
            studysetPost(h, '/batch-delete-studysets', {
                cookie: a.cookie,
                body: { studysetUUIDs: [a1.set, a2.set, b1.set] },
            })
        );
        expect(existsSync(join(h.files.filesDir, a1.set))).toBe(false);
        expect(existsSync(join(h.files.filesDir, a2.set))).toBe(false);
        expect(
            (await apiGet(h, b1.file.signedURL, { cookie: b.cookie })).status
        ).toBe(200);
    });

    test("deleting another user's set keeps its files", async () => {
        const h = await harness();
        const a = await signUp(h);
        const b = await signUp(h);
        const { set, file } = await uploaded(h, a.cookie);
        expect((await deleteSet(h, b.cookie, set)).status).toBe(404);
        expect(
            (await apiGet(h, file.signedURL, { cookie: a.cookie })).status
        ).toBe(200);
    });
});
