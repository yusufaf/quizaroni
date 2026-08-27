import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchJson } from './awsAPI';

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
});
