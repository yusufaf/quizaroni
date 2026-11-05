import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import type { AuthApi } from '../useAuth';
import {
    getSession,
    type SessionUser,
    signInEmail,
    signOutSession,
    signUpEmail,
} from './sessionClient';

export const SESSION_CACHE_KEY = 'quizaroni-session-user';
// The app renders nothing until the first answer, so a stalled server must
// not leave the page blank.
export const SESSION_CHECK_TIMEOUT_MS = 10_000;

type SessionState = {
    status: 'loading' | 'authenticated' | 'anonymous';
    user: SessionUser | null;
};

export type SessionContextValue = {
    user: SessionUser | null;
    isAuthenticated: boolean;
    signIn: (input: { email: string; password: string }) => Promise<void>;
    signUp: (input: {
        name: string;
        email: string;
        password: string;
    }) => Promise<void>;
    signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const readCache = (): SessionUser | null => {
    try {
        const raw = localStorage.getItem(SESSION_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<SessionUser>;
        return typeof parsed.id === 'string' && typeof parsed.email === 'string'
            ? {
                  id: parsed.id,
                  email: parsed.email,
                  name: String(parsed.name ?? ''),
              }
            : null;
    } catch {
        return null;
    }
};

const writeCache = (user: SessionUser | null): void => {
    try {
        if (user) localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(user));
        else localStorage.removeItem(SESSION_CACHE_KEY);
    } catch {
        // Storage can be unavailable (private mode); the server session still works.
    }
};

/**
 * Self-host sessions live in an HttpOnly cookie the app can't read, so the
 * last known user is cached locally: an offline PWA keeps its signed-in,
 * local-first state, and get-session corrects the cache once online.
 */
export const SessionProvider = ({ children }: { children: ReactNode }) => {
    const [state, setState] = useState<SessionState>(() => {
        const cached = readCache();
        return cached
            ? { status: 'authenticated', user: cached }
            : { status: 'loading', user: null };
    });

    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();
        const timer = setTimeout(
            () => controller.abort(),
            SESSION_CHECK_TIMEOUT_MS
        );
        getSession(controller.signal)
            .finally(() => clearTimeout(timer))
            .then(
                (user) => {
                    if (cancelled) return;
                    writeCache(user);
                    setState(
                        user
                            ? { status: 'authenticated', user }
                            : { status: 'anonymous', user: null }
                    );
                },
                () => {
                    // Offline or server down: trust a cached user, else signed out.
                    if (cancelled) return;
                    setState((prev) =>
                        prev.user ? prev : { status: 'anonymous', user: null }
                    );
                }
            );
        return () => {
            cancelled = true;
            clearTimeout(timer);
            controller.abort();
        };
    }, []);

    const signIn = useCallback<SessionContextValue['signIn']>(async (input) => {
        const user = await signInEmail(input);
        writeCache(user);
        setState({ status: 'authenticated', user });
    }, []);

    const signUp = useCallback<SessionContextValue['signUp']>(async (input) => {
        const user = await signUpEmail(input);
        writeCache(user);
        setState({ status: 'authenticated', user });
    }, []);

    const signOut = useCallback(async () => {
        await signOutSession();
        writeCache(null);
        // A full navigation drops the previous account's in-memory state.
        window.location.assign('/');
    }, []);

    const value = useMemo<SessionContextValue>(
        () => ({
            user: state.user,
            isAuthenticated: state.status === 'authenticated',
            signIn,
            signUp,
            signOut,
        }),
        [state, signIn, signUp, signOut]
    );

    // Render nothing until the first answer, so RequireAuth never redirects a
    // signed-in user to /login.
    if (state.status === 'loading') return null;

    return (
        <SessionContext.Provider value={value}>
            {children}
        </SessionContext.Provider>
    );
};

export const useSession = (): SessionContextValue => {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error('useSession must be used inside SessionProvider');
    }
    return context;
};

export const useSessionAuth = (): AuthApi => {
    const { isAuthenticated, signOut } = useSession();
    return useMemo(
        () => ({
            isAuthenticated,
            isLoading: false,
            signOut,
            getAccessToken: async () => undefined,
            clearAccessToken: async () => {},
        }),
        [isAuthenticated, signOut]
    );
};
