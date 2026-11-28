// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import { HttpError } from 'state/api/apiClient';
import { CustomThemeProvider } from './ThemeProvider';
import type { ThemeContextType } from './ThemeContext';
import { THEME_SYNC_DEBOUNCE_MS, ThemeSync } from './ThemeSync';
import { readStoredTheme, THEME_STORAGE_KEY } from './prefs';
import { stubMatchMedia } from './themeTestUtils';
import { useTheme } from './useTheme';

type Metadata = Record<string, unknown>;

const h = vi.hoisted(() => ({
    auth: { isAuthenticated: false },
    query: {
        data: undefined as
            | {
                  message: string;
                  user: { userUUID: string; metadata: Metadata };
              }
            | undefined,
        dataUpdatedAt: 0,
        refetch: vi.fn(),
    },
    mutateAsync: vi.fn(),
    toastError: vi.fn(),
}));

vi.mock('state/api/usersAPI', () => ({
    useGetUser: () => h.query,
    useUpdateUserMetadata: () => ({ mutateAsync: h.mutateAsync }),
}));
vi.mock('shared/auth/useAuth', () => ({
    useAuth: () => ({ isAuthenticated: h.auth.isAuthenticated }),
}));
vi.mock('react-toastify', () => ({ toast: { error: h.toastError } }));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

// One fake account store; the success path merges like the real server.
const server = {
    accounts: {} as Record<string, Metadata>,
    failures: [] as number[],
    holdNext: false,
    held: null as null | { release(): void; reject(status: number): void },
};
let currentUser = 'A';
let seq = 0;

const metadataOf = (user: string): Metadata => (server.accounts[user] ??= {});

const load = (user = currentUser) => {
    currentUser = user;
    h.auth.isAuthenticated = true;
    h.query.data = {
        message: 'ok',
        user: { userUUID: user, metadata: structuredClone(metadataOf(user)) },
    };
    h.query.dataUpdatedAt = ++seq;
};

const signOut = () => {
    h.auth.isAuthenticated = false;
    h.query.data = undefined;
};

const posts = () =>
    h.mutateAsync.mock.calls.map(
        (call) => (call[0] as { updates: Metadata }).updates
    );

const ctxs: Record<string, ThemeContextType> = {};
const Probe = ({ name }: { name: string }) => {
    ctxs[name] = useTheme();
    return null;
};

const Tree = ({ name = 'a', probe = true }) => (
    <CustomThemeProvider>
        <ThemeSync />
        {probe && <Probe name={name} />}
    </CustomThemeProvider>
);

const settle = () => act(() => vi.advanceTimersByTimeAsync(0));
const debounce = () =>
    act(() => vi.advanceTimersByTimeAsync(THEME_SYNC_DEBOUNCE_MS));

const edit = async (
    patch: Parameters<ThemeContextType['setThemePrefs']>[0],
    name = 'a'
) => {
    act(() => ctxs[name]!.setThemePrefs(patch));
    await debounce();
};

beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    stubMatchMedia(false);
    server.accounts = {};
    server.failures = [];
    server.holdNext = false;
    server.held = null;
    currentUser = 'A';
    signOut();
    h.query.dataUpdatedAt = 0;
    h.query.refetch = vi.fn();
    h.toastError.mockReset();
    h.mutateAsync.mockReset();
    h.mutateAsync.mockImplementation(
        async ({ updates }: { updates: Metadata }) => {
            if (server.holdNext) {
                server.holdNext = false;
                await new Promise<void>((resolve, reject) => {
                    server.held = {
                        release: resolve,
                        reject: (status) =>
                            reject(new HttpError(status, 'held')),
                    };
                });
            } else {
                const status = server.failures.shift();
                if (status) throw new HttpError(status, 'failed');
            }
            const { themeAccents, ...rest } = updates;
            const stored = metadataOf(currentUser);
            Object.assign(stored, rest);
            if (themeAccents) {
                stored.themeAccents = {
                    ...(stored.themeAccents as Metadata | undefined),
                    ...(themeAccents as Metadata),
                };
            }
            return { message: 'ok' };
        }
    );
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('ThemeSync', () => {
    it("applies another device's change without posting", async () => {
        load();
        const { rerender } = render(<Tree />);
        await settle();
        metadataOf('A').themeMode = 'dark';
        load();
        rerender(<Tree />);
        await settle();
        expect(ctxs.a!.prefs.themeMode).toBe('dark');
        expect(h.mutateAsync).not.toHaveBeenCalled();
    });

    it('pushes an edit that failed to save on the next load', async () => {
        load();
        const first = render(<Tree />);
        await settle();
        server.failures.push(500);
        await edit({ themeMode: 'dark' });
        expect(readStoredTheme().sync.pending).toEqual({ themeMode: 'dark' });
        first.unmount();

        load();
        render(<Tree />);
        await settle();
        expect(posts().at(-1)).toEqual({ themeMode: 'dark' });
        expect(readStoredTheme().sync.pending).toEqual({});
    });

    it('keeps a toggled mode across a reload and sends only the setting', async () => {
        load();
        const first = render(<Tree />);
        await settle();
        act(() => ctxs.a!.toggleDarkMode());
        await edit({ themeAccents: { 'quizaroni-light': 'orange' } });
        expect(posts()).toEqual([
            { themeAccents: { 'quizaroni-light': 'orange' } },
        ]);
        first.unmount();
        load();
        render(<Tree />);
        await settle();
        expect(ctxs.a!.theme).toBe('dark');
        expect(metadataOf('A').themeMode).toBeUndefined();
    });

    it('keeps a local edit when a refetch lands during the debounce', async () => {
        load();
        const { rerender } = render(<Tree />);
        await settle();
        act(() => ctxs.a!.setThemePrefs({ themeMode: 'dark' }));
        metadataOf('A').themeMode = 'light';
        load();
        rerender(<Tree />);
        await settle();
        expect(ctxs.a!.prefs.themeMode).toBe('dark');
        await debounce();
        expect(posts()).toEqual([{ themeMode: 'dark' }]);
    });

    it('still saves after the settings control unmounts mid-debounce', async () => {
        load();
        const { rerender } = render(<Tree />);
        await settle();
        act(() => ctxs.a!.setThemePrefs({ themeMode: 'dark' }));
        rerender(<Tree probe={false} />);
        await debounce();
        expect(posts()).toEqual([{ themeMode: 'dark' }]);
    });

    it('sends one request per trigger', async () => {
        load();
        const { rerender } = render(<Tree />);
        await settle();
        act(() => ctxs.a!.setThemePrefs({ themeMode: 'dark' }));
        await act(() => vi.advanceTimersByTimeAsync(100));
        await edit({ themeMode: 'light' });
        expect(posts()).toEqual([{ themeMode: 'light' }]);
        rerender(<Tree />);
        await settle();
        expect(h.mutateAsync).toHaveBeenCalledTimes(1);
    });

    it('reverts and toasts on a rejected save', async () => {
        load();
        render(<Tree />);
        await settle();
        server.failures.push(400);
        await edit({ themeMode: 'dark' });
        expect(readStoredTheme().sync.pending).toEqual({});
        expect(ctxs.a!.prefs.themeMode).toBe('system');
        expect(h.toastError).toHaveBeenCalledTimes(1);
        expect(h.toastError).toHaveBeenCalledWith('errors.saveFailed');
    });

    it('keeps pending on a server error and toasts once per edit burst', async () => {
        load();
        render(<Tree />);
        await settle();
        server.failures.push(500, 500, 500);
        await edit({ themeMode: 'dark' });
        expect(readStoredTheme().sync.pending).toEqual({ themeMode: 'dark' });
        expect(h.toastError).toHaveBeenCalledTimes(1);

        act(() => {
            window.dispatchEvent(new Event('online'));
        });
        await settle();
        expect(h.mutateAsync).toHaveBeenCalledTimes(2);
        expect(h.toastError).toHaveBeenCalledTimes(1);

        await edit({ themeMode: 'light' });
        expect(h.toastError).toHaveBeenCalledTimes(2);
    });

    it('applies server data that arrives during a save afterwards', async () => {
        load();
        const { rerender } = render(<Tree />);
        await settle();
        server.holdNext = true;
        await edit({ themeMode: 'dark' });
        expect(server.held).not.toBeNull();

        // A GET from before the POST: old mode, plus another device's accent.
        h.query.data = {
            message: 'ok',
            user: {
                userUUID: 'A',
                metadata: {
                    themeMode: 'light',
                    themeAccents: { 'quizaroni-dark': 'orange' },
                },
            },
        };
        h.query.dataUpdatedAt = ++seq;
        rerender(<Tree />);
        await settle();
        expect(ctxs.a!.prefs.themeAccents).toEqual({});

        await act(async () => server.held!.release());
        await settle();
        expect(ctxs.a!.prefs.themeAccents).toEqual({
            'quizaroni-dark': 'orange',
        });
        expect(ctxs.a!.prefs.themeMode).toBe('dark');
    });

    it('applies the whole queued update when the held save fails', async () => {
        load();
        const { rerender } = render(<Tree />);
        await settle();
        server.holdNext = true;
        await edit({ themeMode: 'dark' });
        h.query.data = {
            message: 'ok',
            user: {
                userUUID: 'A',
                metadata: { themeAccents: { 'quizaroni-dark': 'orange' } },
            },
        };
        h.query.dataUpdatedAt = ++seq;
        rerender(<Tree />);
        await settle();
        await act(async () => server.held!.reject(500));
        await settle();
        expect(ctxs.a!.prefs.themeAccents).toEqual({
            'quizaroni-dark': 'orange',
        });
        // The failed key is kept, and applying the queued data retries it.
        expect(ctxs.a!.prefs.themeMode).toBe('dark');
        expect(posts()).toEqual([{ themeMode: 'dark' }, { themeMode: 'dark' }]);
        expect(metadataOf('A').themeMode).toBe('dark');
    });

    it('converges two tabs that share storage', async () => {
        load();
        const tabA = render(<Tree name="a" />);
        await settle();
        server.failures.push(500);
        await edit({ themeMode: 'light' }, 'a');

        const tabB = render(<Tree name="b" />);
        await settle();
        expect(metadataOf('A').themeMode).toBe('light');

        await edit({ themeMode: 'dark' }, 'a');
        act(() => {
            window.dispatchEvent(
                new StorageEvent('storage', { key: THEME_STORAGE_KEY })
            );
        });
        load();
        tabB.rerender(<Tree name="b" />);
        tabA.rerender(<Tree name="a" />);
        await settle();

        expect(ctxs.a!.theme).toBe('dark');
        expect(ctxs.b!.theme).toBe('dark');
        expect(readStoredTheme().sync.pending).toEqual({});
        expect(metadataOf('A').themeMode).toBe('dark');
    });

    it('uploads signed-out picks the account lacks on first sign-in', async () => {
        const { rerender } = render(<Tree />);
        await settle();
        act(() => ctxs.a!.setThemePrefs({ themeMode: 'dark' }));
        load('A');
        rerender(<Tree />);
        await settle();
        expect(posts()).toEqual([{ themeMode: 'dark' }]);
    });

    it('lets an account with a saved mode win on sign-in', async () => {
        server.accounts.A = { themeMode: 'light' };
        const { rerender } = render(<Tree />);
        await settle();
        act(() => ctxs.a!.setThemePrefs({ themeMode: 'dark' }));
        load('A');
        rerender(<Tree />);
        await settle();
        expect(ctxs.a!.prefs.themeMode).toBe('light');
        expect(h.mutateAsync).not.toHaveBeenCalled();
    });

    it("does not leak the previous account's settings", async () => {
        server.accounts.A = { themeMode: 'dark' };
        load('A');
        const { rerender } = render(<Tree />);
        await settle();

        signOut();
        rerender(<Tree />);
        await settle();
        load('B');
        rerender(<Tree />);
        await settle();
        expect(h.mutateAsync).not.toHaveBeenCalled();

        signOut();
        rerender(<Tree />);
        await settle();
        load('B');
        rerender(<Tree />);
        await settle();
        expect(h.mutateAsync).not.toHaveBeenCalled();
    });

    it('uploads only the signed-out pick when another account signs in', async () => {
        server.accounts.A = { themeMode: 'dark' };
        load('A');
        const { rerender } = render(<Tree />);
        await settle();
        signOut();
        rerender(<Tree />);
        await settle();
        act(() => ctxs.a!.setThemePrefs({ themeMode: 'light' }));
        load('B');
        rerender(<Tree />);
        await settle();
        expect(posts()).toEqual([{ themeMode: 'light' }]);
    });

    it('resets sync on sign-out and keeps the settings', async () => {
        server.accounts.A = { themeMode: 'dark' };
        load('A');
        const { rerender } = render(<Tree />);
        await settle();
        signOut();
        rerender(<Tree />);
        await settle();
        const stored = readStoredTheme();
        expect(stored.sync.userId).toBeNull();
        expect(stored.sync.pending).toEqual({});
        expect(stored.sync.synced).toEqual({ themeMode: 'dark' });
        expect(stored.prefs.themeMode).toBe('dark');
    });

    it('loads the user when it comes back online after an offline start', async () => {
        h.auth.isAuthenticated = true;
        const { rerender } = render(<Tree />);
        await settle();
        act(() => ctxs.a!.setThemePrefs({ themeMode: 'dark' }));
        await debounce();
        act(() => {
            window.dispatchEvent(new Event('online'));
        });
        await settle();
        expect(h.query.refetch).toHaveBeenCalled();
        expect(h.mutateAsync).not.toHaveBeenCalled();

        load('A');
        rerender(<Tree />);
        await settle();
        expect(posts()).toEqual([{ themeMode: 'dark' }]);
    });
});
