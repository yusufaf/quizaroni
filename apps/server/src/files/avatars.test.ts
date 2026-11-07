import { afterEach, describe, expect, test } from 'bun:test';
import { HTML_BYTES, PNG_BYTES, SVG_BYTES } from '../testing/files';
import {
    apiGet,
    apiRequest,
    createRouteHarness,
    type RouteHarness,
    signUp,
} from '../testing/route-harness';
import { MAX_AVATAR_BYTES } from './keys';

let current: RouteHarness | undefined;

async function harness(): Promise<RouteHarness> {
    current = await createRouteHarness();
    return current;
}

afterEach(() => {
    current?.close();
    current = undefined;
});

const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');

const upload = (h: RouteHarness, cookie: string, imageData: unknown) =>
    apiRequest(h, '/api/users/upload-profile-picture', {
        cookie,
        body: { imageData, fileName: 'me.png', contentType: 'image/png' },
    });

async function uploadOk(h: RouteHarness, cookie: string) {
    const res = await upload(h, cookie, b64(PNG_BYTES));
    expect(res.status).toBe(200);
    return ((await res.json()) as { url: string }).url;
}

const userIdOf = async (h: RouteHarness, cookie: string) =>
    (
        (await (
            await apiRequest(h, '/api/users/get-user', { cookie })
        ).json()) as { user: { userUUID: string } }
    ).user.userUUID;

describe('profile picture upload', () => {
    test('stores a PNG that only its owner can read', async () => {
        const h = await harness();
        const a = await signUp(h);
        const b = await signUp(h);
        const url = await uploadOk(h, a.cookie);
        const id = await userIdOf(h, a.cookie);
        expect(url).toMatch(
            new RegExp(`^/api/files/avatars/${id}/[0-9a-f-]{36}$`)
        );
        const mine = await apiGet(h, url, { cookie: a.cookie });
        expect(mine.status).toBe(200);
        expect(mine.headers.get('content-type')).toBe('image/png');
        expect((await apiGet(h, url, { cookie: b.cookie })).status).toBe(404);
        expect((await apiGet(h, url)).status).toBe(401);
    });

    test.each([
        ['svg', b64(SVG_BYTES)],
        ['html', b64(HTML_BYTES)],
        ['not base64', 'not base64!'],
        ['too big', b64(new Uint8Array(MAX_AVATAR_BYTES + 1))],
    ])('refuses %s', async (_name, imageData) => {
        const h = await harness();
        const { cookie } = await signUp(h);
        expect((await upload(h, cookie, imageData)).status).toBe(400);
    });

    test('a body over the route limit is 413', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const res = await upload(h, cookie, 'A'.repeat(3_200_000));
        expect(res.status).toBe(413);
    });

    test('old pictures are pruned, but never the one in use', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const first = await uploadOk(h, cookie);
        const set = await apiRequest(h, '/api/users/update-metadata', {
            cookie,
            body: { updates: { avatar: { type: 'upload', value: first } } },
        });
        expect(set.status).toBe(200);
        const second = await uploadOk(h, cookie);
        const third = await uploadOk(h, cookie);
        expect((await apiGet(h, first, { cookie })).status).toBe(200);
        expect((await apiGet(h, second, { cookie })).status).toBe(404);
        expect((await apiGet(h, third, { cookie })).status).toBe(200);
    });

    test('other user routes keep their own body limit', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const res = await apiRequest(h, '/api/users/update-metadata', {
            cookie,
            rawBody: JSON.stringify({
                updates: { homeView: 'x'.repeat(300 * 1024) },
            }),
        });
        expect(res.status).toBe(413);
    });
});
