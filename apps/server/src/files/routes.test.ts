import { afterEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { session } from '../db/schema';
import {
    GIF_HTML_POLYGLOT,
    HTML_BYTES,
    PNG_BYTES,
    SVG_BYTES,
    completeUpload,
    partURLs,
    startUpload,
    uploadCardFile,
} from '../testing/files';
import {
    apiGet,
    apiPut,
    apiRequest,
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

let current: RouteHarness | undefined;

async function harness(): Promise<RouteHarness> {
    current = await createRouteHarness();
    return current;
}

afterEach(() => {
    current?.close();
    current = undefined;
});

type Uploaded = {
    key: string;
    name: string;
    size: number;
    signedURL: string;
    uploadedAt: string;
};

async function setWithCard(h: RouteHarness, cookie: string) {
    const set = await createSet(h, cookie);
    await okJson(
        studysetPost(h, '/update-studyset', {
            cookie,
            body: {
                studysetUUID: set.studysetUUID,
                updates: { cards: [{ cardUUID: 'c1', term: 't', files: [] }] },
            },
        })
    );
    return set.studysetUUID;
}

const userIdOf = (h: RouteHarness) =>
    h.db.select().from(session).all().at(-1)!.userId;

const pngOfSize = (size: number) => {
    const bytes = new Uint8Array(size);
    bytes.set(PNG_BYTES.slice(0, 16));
    return bytes;
};

describe('upload and view', () => {
    test('an uploaded image is attached to its card and served to the owner', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const set = await setWithCard(h, cookie);
        const file = await okJson<Uploaded>(
            uploadCardFile(h, cookie, {
                studysetUUID: set,
                bytes: PNG_BYTES,
                cardUUID: 'c1',
                association: 'term',
            })
        );
        expect(file).toMatchObject({
            name: 'cat.png',
            size: PNG_BYTES.length,
            signedURL: `/api/files/${file.key}`,
        });
        expect(file.key).toMatch(new RegExp(`^${set}/[0-9a-f-]{36}$`));
        const card = (await getSet(h, cookie, set)).cards[0]!;
        expect(card.files).toEqual([{ ...file, association: 'term' }]);

        const res = await apiGet(h, file.signedURL, { cookie });
        expect(res.status).toBe(200);
        expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG_BYTES);
        const etag = `"${file.key.split('/')[1]}"`;
        expect(Object.fromEntries(res.headers)).toMatchObject({
            'content-type': 'image/png',
            'content-disposition': 'inline',
            'x-content-type-options': 'nosniff',
            'cache-control': 'private, no-cache',
            'cross-origin-resource-policy': 'same-origin',
            etag,
        });
        expect(res.headers.get('content-security-policy')).toContain('sandbox');
    });

    test('revalidation re-checks who is asking', async () => {
        const h = await harness();
        const a = await signUp(h);
        const b = await signUp(h);
        const set = await setWithCard(h, a.cookie);
        const file = await okJson<Uploaded>(
            uploadCardFile(h, a.cookie, { studysetUUID: set, bytes: PNG_BYTES })
        );
        const etag = `"${file.key.split('/')[1]}"`;
        const headers = { 'If-None-Match': etag };
        const mine = await apiGet(h, file.signedURL, { cookie: a.cookie, headers });
        expect(mine.status).toBe(304);
        expect(await mine.text()).toBe('');
        expect(
            (await apiGet(h, file.signedURL, { cookie: b.cookie, headers }))
                .status
        ).toBe(404);
        expect((await apiGet(h, file.signedURL, { headers })).status).toBe(401);
    });

    test('a file with no matching card is still stored and served', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const set = await setWithCard(h, cookie);
        const before = (await getSet(h, cookie, set)).updatedAt;
        const file = await okJson<Uploaded>(
            uploadCardFile(h, cookie, {
                studysetUUID: set,
                bytes: PNG_BYTES,
                cardUUID: 'nope',
                association: 'term',
            })
        );
        expect((await apiGet(h, file.signedURL, { cookie })).status).toBe(200);
        expect((await getSet(h, cookie, set)).updatedAt).toBe(before);
    });
});

describe('parts', () => {
    test('two parts out of order assemble in order', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const set = await setWithCard(h, cookie);
        const bytes = pngOfSize(10_000_005);
        bytes[10_000_004] = 7;
        const upload = await startUpload(h, cookie, set);
        const [u1, u2] = await partURLs(h, cookie, upload, 2);
        const r2 = await apiPut(h, u2!, bytes.slice(10_000_000), { cookie });
        const r1 = await apiPut(h, u1!, bytes.slice(0, 10_000_000), { cookie });
        const file = await okJson<Uploaded>(
            completeUpload(h, cookie, upload, [
                { PartNumber: 1, ETag: r1.headers.get('ETag')! },
                { PartNumber: 2, ETag: r2.headers.get('ETag')! },
            ])
        );
        expect(file.size).toBe(bytes.length);
        const served = new Uint8Array(
            await (await apiGet(h, file.signedURL, { cookie })).arrayBuffer()
        );
        expect(served.length).toBe(bytes.length);
        expect(served[10_000_004]).toBe(7);
    });

    test('a repeat PUT replaces the part completely', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const set = await setWithCard(h, cookie);
        const upload = await startUpload(h, cookie, set);
        const [u1] = await partURLs(h, cookie, upload, 1);
        const longer = new Uint8Array(PNG_BYTES.length + 100);
        longer.set(PNG_BYTES);
        await apiPut(h, u1!, longer, { cookie });
        const second = await apiPut(h, u1!, PNG_BYTES, { cookie });
        const file = await okJson<Uploaded>(
            completeUpload(h, cookie, upload, [
                { PartNumber: 1, ETag: second.headers.get('ETag')! },
            ])
        );
        expect(file.size).toBe(PNG_BYTES.length);
        const served = await apiGet(h, file.signedURL, { cookie });
        expect(new Uint8Array(await served.arrayBuffer())).toEqual(PNG_BYTES);
    });

    test('parallel parts cannot pass the per-file cap together', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const set = await setWithCard(h, cookie);
        const upload = await startUpload(h, cookie, set);
        const urls = await partURLs(h, cookie, upload, 3);
        const part = pngOfSize(10_000_000);
        const results = await Promise.all(
            urls.map((u) => apiPut(h, u, part, { cookie }))
        );
        const statuses = results.map((r) => r.status);
        expect(statuses).toContain(413);
        expect(statuses.every((s) => s === 200 || s === 413)).toBe(true);
        const ok = statuses.filter((s) => s === 200).length;
        expect(ok * 10_000_000).toBeLessThanOrEqual(25_000_000);
        const done = await completeUpload(
            h,
            cookie,
            upload,
            results.map((r, i) => ({
                PartNumber: i + 1,
                ETag: r.headers.get('ETag') ?? '"x"',
            }))
        );
        expect(done.status).toBe(404);
        expect(
            existsSync(join(h.files.stagingDir, upload.uploadId))
        ).toBe(false);
    });

    test('a PUT during complete is refused', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const set = await setWithCard(h, cookie);
        const upload = await startUpload(h, cookie, set);
        const [u1] = await partURLs(h, cookie, upload, 1);
        await apiPut(h, u1!, PNG_BYTES, { cookie });
        h.uploads.get(upload.uploadId, userIdOf(h))!.completing = true;
        expect((await apiPut(h, u1!, HTML_BYTES, { cookie })).status).toBe(409);
    });

    test('a complete without the parts is a 400, not a 500', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const set = await setWithCard(h, cookie);
        const upload = await startUpload(h, cookie, set);
        await partURLs(h, cookie, upload, 1);
        for (const parts of [[], [{ PartNumber: 1, ETag: '"x"' }]]) {
            const res = await completeUpload(h, cookie, upload, parts);
            expect(res.status).toBe(400);
        }
    });

    test('failed uploads free their slot', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const set = await setWithCard(h, cookie);
        for (let i = 0; i < 10; i++) {
            const upload = await startUpload(h, cookie, set);
            const res = await apiRequest(
                h,
                '/api/files/get-multipart-signed-upload-urls',
                { cookie, body: { ...upload, numParts: 4 } }
            );
            expect(res.status).toBe(400);
        }
        await startUpload(h, cookie, set);

        const upload = await startUpload(h, cookie, set);
        const [u1] = await partURLs(h, cookie, upload, 1);
        expect(
            (await apiPut(h, u1!, pngOfSize(10_000_001), { cookie })).status
        ).toBe(413);
        expect((await apiPut(h, u1!, PNG_BYTES, { cookie })).status).toBe(404);
        expect(
            (await completeUpload(h, cookie, upload, [])).status
        ).toBe(404);
    });
});

test('part URLs can only be issued once per upload', async () => {
    const h = await harness();
    const { cookie } = await signUp(h);
    const set = await setWithCard(h, cookie);
    const upload = await startUpload(h, cookie, set);
    await partURLs(h, cookie, upload, 2);
    const again = await apiRequest(
        h,
        '/api/files/get-multipart-signed-upload-urls',
        { cookie, body: { ...upload, numParts: 1 } }
    );
    expect(again.status).toBe(409);
    expect(h.uploads.get(upload.uploadId, userIdOf(h))?.numParts).toBe(2);
});

describe('disguised files', () => {
    test.each([
        ['svg', SVG_BYTES],
        ['html', HTML_BYTES],
    ])('%s sent as image/png is refused', async (_name, bytes) => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const set = await setWithCard(h, cookie);
        const res = await uploadCardFile(h, cookie, {
            studysetUUID: set,
            bytes,
            contentType: 'image/png',
        });
        expect(res.status).toBe(415);
        expect(existsSync(join(h.files.filesDir, set))).toBe(false);
    });

    test('declared types: svg and html refused, aliases accepted', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const set = await setWithCard(h, cookie);
        for (const [type, status] of [
            ['image/svg+xml', 415],
            ['text/html', 415],
            ['audio/mp3', 200],
            ['image/jpg', 200],
        ] as const) {
            const res = await apiRequest(
                h,
                '/api/files/initiate-multipart-upload',
                {
                    cookie,
                    body: { studysetUUID: set, fileName: 'f', contentType: type },
                }
            );
            expect([type, res.status]).toEqual([type, status]);
        }
    });

    test('a GIF/HTML polyglot is served inert', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const set = await setWithCard(h, cookie);
        const file = await okJson<Uploaded>(
            uploadCardFile(h, cookie, {
                studysetUUID: set,
                bytes: GIF_HTML_POLYGLOT,
            })
        );
        const res = await apiGet(h, file.signedURL, { cookie });
        expect(res.headers.get('content-type')).toBe('image/gif');
        expect(res.headers.get('x-content-type-options')).toBe('nosniff');
        expect(res.headers.get('content-security-policy')).toContain('sandbox');
    });

    test('bytes of no allowed type are sent as an attachment', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const set = await setWithCard(h, cookie);
        const key = `${set}/${crypto.randomUUID()}`;
        mkdirSync(join(h.files.filesDir, set), { recursive: true });
        writeFileSync(h.files.pathOf(key)!, HTML_BYTES);
        const res = await apiGet(h, `/api/files/${key}`, { cookie });
        expect(res.headers.get('content-type')).toBe('application/octet-stream');
        expect(res.headers.get('content-disposition')).toBe('attachment');
    });
});

describe('traversal and access', () => {
    test('traversal attempts never resolve', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const set = await setWithCard(h, cookie);
        const file = await okJson<Uploaded>(
            uploadCardFile(h, cookie, { studysetUUID: set, bytes: PNG_BYTES })
        );
        const fileId = file.key.split('/')[1]!;
        for (const path of [
            '/api/files/..%2F..%2Fquizaroni.db/x',
            `/api/files/${set}/..%2F..%2Fquizaroni.db`,
            `/api/files/${set.toUpperCase()}/${fileId}`,
            `/api/files/avatars/..%2F${set}/${fileId}`,
            `/api/files/${set}/${fileId}%2F..`,
        ]) {
            const res = await apiGet(h, path, { cookie });
            expect([path, res.status]).toEqual([path, 404]);
        }
        for (const key of [`${set}/../x`, `${crypto.randomUUID()}/${fileId}`]) {
            const upload = await startUpload(h, cookie, set);
            const res = await completeUpload(h, cookie, { ...upload, key }, [], {
                studysetUUID: set,
            });
            expect(res.status).toBe(400);
        }
    });

    test("another user can't read, start or finish uploads on A's set", async () => {
        const h = await harness();
        const a = await signUp(h);
        const b = await signUp(h);
        const set = await setWithCard(h, a.cookie);
        const file = await okJson<Uploaded>(
            uploadCardFile(h, a.cookie, { studysetUUID: set, bytes: PNG_BYTES })
        );
        expect(
            (await apiGet(h, file.signedURL, { cookie: b.cookie })).status
        ).toBe(404);
        expect((await apiGet(h, file.signedURL)).status).toBe(401);
        const init = await apiRequest(h, '/api/files/initiate-multipart-upload', {
            cookie: b.cookie,
            body: { studysetUUID: set, fileName: 'f', contentType: 'image/png' },
        });
        expect(init.status).toBe(403);

        const upload = await startUpload(h, a.cookie, set);
        const [u1] = await partURLs(h, a.cookie, upload, 1);
        expect(
            (await apiPut(h, u1!, PNG_BYTES, { cookie: b.cookie })).status
        ).toBe(404);
        expect(
            (await completeUpload(h, b.cookie, upload, [])).status
        ).toBe(404);
    });
});

describe('caps', () => {
    test('numParts, part numbers and part lists are checked', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const set = await setWithCard(h, cookie);
        for (const numParts of [0, 4, 1.5, '1']) {
            const upload = await startUpload(h, cookie, set);
            const res = await apiRequest(
                h,
                '/api/files/get-multipart-signed-upload-urls',
                { cookie, body: { ...upload, numParts } }
            );
            expect(res.status).toBe(400);
        }
        const early = await startUpload(h, cookie, set);
        expect(
            (
                await apiPut(
                    h,
                    `/api/files/upload-part/${early.uploadId}/1`,
                    PNG_BYTES,
                    { cookie }
                )
            ).status
        ).toBe(400);
        const upload = await startUpload(h, cookie, set);
        await partURLs(h, cookie, upload, 2);
        for (const n of ['0', '3', 'x']) {
            const res = await apiPut(
                h,
                `/api/files/upload-part/${upload.uploadId}/${n}`,
                PNG_BYTES,
                { cookie }
            );
            expect([n, res.status]).toEqual([n, 400]);
        }
        const p1 = await apiPut(
            h,
            `/api/files/upload-part/${upload.uploadId}/1`,
            PNG_BYTES,
            { cookie }
        );
        const p2 = await apiPut(
            h,
            `/api/files/upload-part/${upload.uploadId}/2`,
            PNG_BYTES,
            { cookie }
        );
        const e1 = p1.headers.get('ETag')!;
        const e2 = p2.headers.get('ETag')!;
        for (const parts of [
            [
                { PartNumber: 1, ETag: e1 },
                { PartNumber: 3, ETag: e2 },
            ],
            [
                { PartNumber: 1, ETag: e1 },
                { PartNumber: 2, ETag: '"wrong"' },
            ],
            [
                { PartNumber: 2, ETag: e2 },
                { PartNumber: 1, ETag: e1 },
            ],
        ]) {
            expect(
                (await completeUpload(h, cookie, upload, parts)).status
            ).toBe(400);
        }
    });

    test('sequential parts past 25 MB are refused', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const set = await setWithCard(h, cookie);
        const upload = await startUpload(h, cookie, set);
        const urls = await partURLs(h, cookie, upload, 3);
        const part = pngOfSize(10_000_000);
        expect((await apiPut(h, urls[0]!, part, { cookie })).status).toBe(200);
        expect((await apiPut(h, urls[1]!, part, { cookie })).status).toBe(200);
        expect((await apiPut(h, urls[2]!, part, { cookie })).status).toBe(413);
    });

    test('the 11th open upload is 429 and a blank set id is 400', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const set = await setWithCard(h, cookie);
        for (let i = 0; i < 10; i++) await startUpload(h, cookie, set);
        const res = await apiRequest(h, '/api/files/initiate-multipart-upload', {
            cookie,
            body: { studysetUUID: set, fileName: 'f', contentType: 'image/png' },
        });
        expect(res.status).toBe(429);
        const blank = await apiRequest(h, '/api/files/initiate-multipart-upload', {
            cookie,
            body: { studysetUUID: '', fileName: 'f', contentType: 'image/png' },
        });
        expect(blank.status).toBe(400);
    });
});

test('a set deleted during an upload leaves no file behind', async () => {
    const h = await harness();
    const { cookie } = await signUp(h);
    const set = await setWithCard(h, cookie);
    const upload = await startUpload(h, cookie, set);
    const [u1] = await partURLs(h, cookie, upload, 1);
    const part = await apiPut(h, u1!, PNG_BYTES, { cookie });
    await okJson(
        studysetPost(h, '/delete-studyset', {
            cookie,
            body: { studysetUUID: set },
        })
    );
    const res = await completeUpload(h, cookie, upload, [
        { PartNumber: 1, ETag: part.headers.get('ETag')! },
    ]);
    expect(res.status).toBe(404);
    const dir = join(h.files.filesDir, set);
    expect(existsSync(dir) ? readdirSync(dir) : []).toEqual([]);
});
