// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { renderHook } from '@testing-library/react';
import { useLogtoAuth } from './useAuth';

const logto = {
    isAuthenticated: false,
    isLoading: undefined as boolean | undefined,
    signOut: vi.fn(),
    getAccessToken: vi.fn(),
    clearAccessToken: vi.fn(),
};

vi.mock('@logto/react', () => ({
    useLogto: () => logto,
}));

beforeEach(() => {
    logto.isAuthenticated = false;
    logto.isLoading = undefined;
    vi.clearAllMocks();
});

describe('useLogtoAuth', () => {
    it('gives no access token when signed out', async () => {
        const { result } = renderHook(() => useLogtoAuth());
        expect(await result.current.getAccessToken()).toBeUndefined();
        expect(logto.getAccessToken).not.toHaveBeenCalled();
    });

    it('asks Logto for an API token when signed in', async () => {
        logto.isAuthenticated = true;
        logto.getAccessToken.mockResolvedValue('token');
        const { result } = renderHook(() => useLogtoAuth());
        expect(await result.current.getAccessToken()).toBe('token');
        expect(logto.getAccessToken).toHaveBeenCalledWith(
            import.meta.env.VITE_LOGTO_API_RESOURCE
        );
    });

    it('signs out back to this origin', async () => {
        const { result } = renderHook(() => useLogtoAuth());
        await result.current.signOut();
        expect(logto.signOut).toHaveBeenCalledWith(window.location.origin);
    });

    it('treats an unknown loading state as loaded', () => {
        const { result } = renderHook(() => useLogtoAuth());
        expect(result.current.isLoading).toBe(false);
    });
});
