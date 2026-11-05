import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import {
    HttpError,
    fetchJson,
    getCommonPostRequestProps,
    isHttpStatus,
    setAccessTokenGetter,
} from './awsAPI';

const mockFetch = (response: Partial<Response> & { json?: () => unknown }) =>
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({}),
            text: async () => '',
            ...response,
        })
    );

describe('fetchJson', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('resolves with the parsed JSON body on a 2xx response', async () => {
        mockFetch({ json: async () => ({ hello: 'world' }) });

        const result = await fetchJson('https://example.com/api/thing');

        expect(result).toEqual({ hello: 'world' });
    });

    it('throws with the status included in the message on a non-2xx response', async () => {
        mockFetch({
            ok: false,
            status: 500,
            text: async () => 'Internal Server Error',
        });

        await expect(
            fetchJson('https://example.com/api/thing')
        ).rejects.toThrow(/500/);
    });

    it('does not let a non-JSON error body mask the original status', async () => {
        mockFetch({
            ok: false,
            status: 502,
            text: async () => '<html>Bad Gateway</html>',
        });

        await expect(
            fetchJson('https://example.com/api/thing')
        ).rejects.toThrow(/502/);
    });

    it('exposes the status on the thrown error', async () => {
        mockFetch({
            ok: false,
            status: 404,
            text: async () => '{"message":"x"}',
        });

        const request = fetchJson('https://example.com/api/thing');

        await expect(request).rejects.toBeInstanceOf(HttpError);
        await expect(request).rejects.toMatchObject({ status: 404 });
    });
});

describe('isHttpStatus', () => {
    it.each([
        [new HttpError(404, 'x'), true],
        [new HttpError(500, 'x'), false],
        [new Error('404'), false],
        [null, false],
    ])('isHttpStatus(%o, 404) is %s', (error, expected) => {
        expect(isHttpStatus(error, 404)).toBe(expected);
    });
});

describe('getCommonPostRequestProps', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        setAccessTokenGetter(async () => undefined);
    });

    it('sends a bearer token and no cookies to the AWS API', async () => {
        setAccessTokenGetter(async () => 'tok');
        const props = await getCommonPostRequestProps();
        expect(props.credentials).toBe('omit');
        expect(props.headers).toEqual({
            'Content-Type': 'application/json',
            authorization: 'Bearer tok',
        });
    });

    it('sends the session cookie and no bearer token to the self-host server', async () => {
        vi.stubEnv('VITE_BACKEND', 'selfhost');
        setAccessTokenGetter(async () => 'tok');
        const props = await getCommonPostRequestProps();
        expect(props.credentials).toBe('same-origin');
        expect(props.method).toBe('POST');
        expect(props.headers).toEqual({ 'Content-Type': 'application/json' });
    });
});

describe('BASE_API_URL', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('is the same-origin /api on the self-host backend, without an API URL', async () => {
        vi.stubEnv('VITE_BACKEND', 'selfhost');
        vi.stubEnv('VITE_API_BASE_URL', '');
        vi.resetModules();
        const { BASE_API_URL } = await import('./awsAPI');
        expect(BASE_API_URL).toBe('/api');
    });

    it('still requires an API URL on the AWS backend', async () => {
        vi.stubEnv('VITE_API_BASE_URL', '');
        vi.resetModules();
        await expect(import('./awsAPI')).rejects.toThrow('VITE_API_BASE_URL');
    });
});
