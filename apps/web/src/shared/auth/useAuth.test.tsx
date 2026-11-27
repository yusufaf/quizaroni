// @vitest-environment jsdom
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
    SESSION_CACHE_KEY,
    SessionProvider,
    useSession,
} from './session/SessionProvider';
import { useAuth } from './useAuth';

const ADA = { id: 'u1', email: 'ada@example.com', name: 'Ada', role: 'user' };

const wrapper = ({ children }: { children: ReactNode }) => (
    <SessionProvider>{children}</SessionProvider>
);

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('useAuth', () => {
    it('is authenticated once the session has a cached user', () => {
        // get-session never answers, so the provider keeps the cached user.
        vi.stubGlobal(
            'fetch',
            vi.fn(() => new Promise<Response>(() => {}))
        );
        localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(ADA));

        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current.isAuthenticated).toBe(true);
    });

    it('is not authenticated when the server has no session', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response('null', { status: 200 }))
        );

        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => expect(result.current).not.toBeNull());
        expect(result.current.isAuthenticated).toBe(false);
    });

    it('signs out through the session', () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => new Promise<Response>(() => {}))
        );
        localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(ADA));

        const { result } = renderHook(
            () => ({ auth: useAuth(), session: useSession() }),
            { wrapper }
        );

        expect(result.current.auth.signOut).toBe(
            result.current.session.signOut
        );
    });

    it('throws outside SessionProvider', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => renderHook(() => useAuth())).toThrow(/SessionProvider/);
    });
});
