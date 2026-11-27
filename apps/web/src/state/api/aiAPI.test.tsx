// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AI_STATUS_KEY, useAIChatEnabled } from './aiAPI';

const respond = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });

const render = () => {
    const client = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { client, ...renderHook(() => useAIChatEnabled(), { wrapper }) };
};

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('useAIChatEnabled', () => {
    it('is undefined while the status loads, then follows the server', async () => {
        const fetch = vi
            .fn()
            .mockResolvedValue(respond(200, { enabled: true }));
        vi.stubGlobal('fetch', fetch);
        const { result } = render();
        expect(result.current).toBeUndefined();
        await waitFor(() => expect(result.current).toBe(true));
        expect(fetch.mock.calls[0]![0]).toBe('/api/ai/status');
    });

    it('is false when the instance turns AI chat off', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(respond(200, { enabled: false }))
        );
        const { result } = render();
        await waitFor(() => expect(result.current).toBe(false));
    });

    it('is false when the status request fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(respond(500, { message: 'x' }))
        );
        const { result } = render();
        await waitFor(() => expect(result.current).toBe(false));
    });

    it('keeps the last answer when a later refetch fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const fetch = vi
            .fn()
            .mockResolvedValue(respond(200, { enabled: true }));
        vi.stubGlobal('fetch', fetch);
        const { result, client } = render();
        await waitFor(() => expect(result.current).toBe(true));
        fetch.mockResolvedValue(respond(500, { message: 'x' }));
        await act(() => client.refetchQueries({ queryKey: AI_STATUS_KEY }));
        expect(client.getQueryState(AI_STATUS_KEY)?.status).toBe('error');
        expect(result.current).toBe(true);
    });
});
