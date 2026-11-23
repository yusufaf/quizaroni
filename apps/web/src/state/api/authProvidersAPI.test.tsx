// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const backend = vi.hoisted(() => ({ selfHost: true }));
vi.mock('shared/auth/backend', () => ({ isSelfHost: () => backend.selfHost }));

import { useAuthProviders } from './authProvidersAPI';

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
    return renderHook(() => useAuthProviders(), { wrapper });
};

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    backend.selfHost = true;
});

describe('useAuthProviders', () => {
    it('is undefined in the hosted build, without asking the server', () => {
        backend.selfHost = false;
        const fetch = vi.fn();
        vi.stubGlobal('fetch', fetch);
        const { result } = render();
        expect(result.current).toBeUndefined();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('is undefined while loading, then follows the server', async () => {
        const fetch = vi.fn().mockResolvedValue(
            respond(200, {
                providers: ['google', 'github'],
                registrationOpen: true,
            })
        );
        vi.stubGlobal('fetch', fetch);
        const { result } = render();
        expect(result.current).toBeUndefined();
        await waitFor(() =>
            expect(result.current).toEqual({
                providers: ['google', 'github'],
                registrationOpen: true,
            })
        );
        expect(fetch.mock.calls[0]![0]).toBe('/api/auth/providers');
    });

    it('drops providers this version does not know', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                respond(200, {
                    providers: ['gitlab', 'github'],
                    registrationOpen: false,
                })
            )
        );
        const { result } = render();
        await waitFor(() =>
            expect(result.current).toEqual({
                providers: ['github'],
                registrationOpen: false,
            })
        );
    });

    it.each([
        ['a failed request', () => respond(500, { message: 'x' })],
        ['a malformed answer', () => respond(200, { providers: 'google' })],
    ])('stays undefined after %s', async (_name, make) => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const fetch = vi.fn().mockImplementation(async () => make());
        vi.stubGlobal('fetch', fetch);
        const { result } = render();
        await waitFor(() => expect(fetch).toHaveBeenCalled());
        await new Promise((r) => setTimeout(r, 20));
        expect(result.current).toBeUndefined();
    });
});
