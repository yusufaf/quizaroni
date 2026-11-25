// @vitest-environment jsdom
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import { act, render, screen, waitFor } from '@testing-library/react';
import { LOCAL_DATA_OWNER_KEY } from 'state/local/owner';
import {
    SESSION_CACHE_KEY,
    SESSION_CHECK_TIMEOUT_MS,
    SessionProvider,
    useSession,
} from './SessionProvider';
import {
    AuthRequestError,
    deleteAccount,
    signInEmail,
    type SessionUser,
} from './sessionClient';

const { clearLocalData, deleteApiKeysOf } = vi.hoisted(() => ({
    clearLocalData: vi.fn<() => Promise<void>>(),
    deleteApiKeysOf: vi.fn<(id: string) => Promise<void>>(),
}));

vi.mock('state/local/localData', () => ({ clearLocalData }));
vi.mock('shared/ai/aiKeyStorage', () => ({ deleteApiKeysOf }));

const ADA: SessionUser = {
    id: 'u1',
    email: 'ada@example.com',
    name: 'Ada',
    role: 'user',
};

const jsonResponse = (
    body: unknown,
    status = 200,
    headers: Record<string, string> = {}
) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
    });

const fetchMock = vi.fn<typeof fetch>();

let session: ReturnType<typeof useSession> | undefined;
const Probe = () => {
    session = useSession();
    return (
        <p>{session.isAuthenticated ? `in:${session.user?.email}` : 'out'}</p>
    );
};

const renderProvider = () =>
    render(
        <SessionProvider>
            <Probe />
        </SessionProvider>
    );

const cached = () => localStorage.getItem(SESSION_CACHE_KEY);

beforeEach(() => {
    localStorage.clear();
    session = undefined;
    fetchMock.mockReset();
    clearLocalData.mockReset().mockResolvedValue(undefined);
    deleteApiKeysOf.mockReset().mockResolvedValue(undefined);
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('SessionProvider', () => {
    it('renders a cached user at once and keeps them when the server agrees', async () => {
        localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(ADA));
        fetchMock.mockResolvedValue(jsonResponse({ session: {}, user: ADA }));
        renderProvider();
        expect(screen.getByText('in:ada@example.com')).toBeTruthy();
        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        expect(screen.getByText('in:ada@example.com')).toBeTruthy();
    });

    it('signs out locally when the server has no session', async () => {
        localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(ADA));
        fetchMock.mockResolvedValue(jsonResponse(null));
        renderProvider();
        await screen.findByText('out');
        expect(cached()).toBeNull();
    });

    it('keeps a cached user when the server is unreachable', async () => {
        localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(ADA));
        fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
        renderProvider();
        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        expect(screen.getByText('in:ada@example.com')).toBeTruthy();
        expect(cached()).not.toBeNull();
    });

    it('is signed out when unreachable with nothing cached', async () => {
        fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
        renderProvider();
        expect(await screen.findByText('out')).toBeTruthy();
    });

    const stallUntilAborted = () =>
        fetchMock.mockImplementation(
            (_url, init) =>
                new Promise<Response>((_resolve, reject) => {
                    init?.signal?.addEventListener('abort', () =>
                        reject(new DOMException('Aborted', 'AbortError'))
                    );
                })
        );

    it('keeps a cached user when the session check stalls', async () => {
        vi.useFakeTimers();
        try {
            localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(ADA));
            stallUntilAborted();
            renderProvider();
            await act(async () => {
                await vi.advanceTimersByTimeAsync(SESSION_CHECK_TIMEOUT_MS);
            });
            expect(screen.getByText('in:ada@example.com')).toBeTruthy();
            expect(JSON.parse(cached()!)).toEqual(ADA);
        } finally {
            vi.useRealTimers();
        }
    });

    it('cancels the session check when unmounted', async () => {
        let signal: AbortSignal | undefined;
        fetchMock.mockImplementation((_url, init) => {
            signal = init?.signal ?? undefined;
            return new Promise<Response>(() => {});
        });
        const { unmount } = renderProvider();
        await waitFor(() => expect(signal).toBeDefined());
        unmount();
        expect(signal!.aborted).toBe(true);
    });

    it('gives up on a stalled session check and shows the signed-out app', async () => {
        vi.useFakeTimers();
        try {
            stallUntilAborted();
            const { container } = renderProvider();
            expect(container.textContent).toBe('');
            await act(async () => {
                await vi.advanceTimersByTimeAsync(SESSION_CHECK_TIMEOUT_MS);
            });
            expect(screen.getByText('out')).toBeTruthy();
        } finally {
            vi.useRealTimers();
        }
    });

    it('renders nothing until the first answer when nothing is cached', async () => {
        let answer: (r: Response) => void = () => {};
        fetchMock.mockReturnValue(
            new Promise<Response>((resolve) => {
                answer = resolve;
            })
        );
        const { container } = renderProvider();
        expect(container.textContent).toBe('');
        await act(async () => answer(jsonResponse({ user: ADA })));
        expect(screen.getByText('in:ada@example.com')).toBeTruthy();
        expect(JSON.parse(cached()!)).toEqual(ADA);
    });

    it('signs out on the server, clears the cache and leaves the page', async () => {
        localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(ADA));
        fetchMock.mockResolvedValue(jsonResponse({ user: ADA }));
        const assign = vi.fn();
        vi.stubGlobal('location', { ...window.location, assign });
        renderProvider();
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

        fetchMock.mockResolvedValue(jsonResponse({ success: true }));
        await act(() => session!.signOut());

        const [url, init] = fetchMock.mock.calls[1]!;
        expect(url).toBe('/api/auth/sign-out');
        expect(init?.method).toBe('POST');
        expect(init?.body).toBe('{}');
        expect(cached()).toBeNull();
        expect(assign).toHaveBeenCalledWith('/');
    });

    describe('deleteAccount', () => {
        const signedIn = async () => {
            localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(ADA));
            localStorage.setItem(LOCAL_DATA_OWNER_KEY, `${ADA.id}:signed-out`);
            fetchMock.mockResolvedValue(jsonResponse({ user: ADA }));
            const assign = vi.fn();
            vi.stubGlobal('location', { ...window.location, assign });
            renderProvider();
            await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
            fetchMock.mockResolvedValue(jsonResponse({ success: true }));
            return assign;
        };

        it('wipes local data before leaving for the login page', async () => {
            const assign = await signedIn();
            let finishWipe!: () => void;
            clearLocalData.mockReturnValue(
                new Promise<void>((resolve) => {
                    finishWipe = resolve;
                })
            );

            let done = false;
            const pending = act(async () => {
                await session!.deleteAccount({ password: 'pw-123456' });
                done = true;
            });
            await waitFor(() => expect(clearLocalData).toHaveBeenCalled());
            expect(assign).not.toHaveBeenCalled();
            expect(done).toBe(false);

            finishWipe();
            await pending;

            const [url, init] = fetchMock.mock.calls[1]!;
            expect(url).toBe('/api/auth/delete-user');
            expect(JSON.parse(String(init?.body))).toEqual({
                password: 'pw-123456',
            });
            expect(deleteApiKeysOf).toHaveBeenCalledWith(ADA.id);
            expect(localStorage.getItem(LOCAL_DATA_OWNER_KEY)).toBeNull();
            expect(cached()).toBeNull();
            expect(assign).toHaveBeenCalledWith('/login?accountDeleted=1');
        });

        it('keeps the owner marker when the wipe fails, and still leaves', async () => {
            const assign = await signedIn();
            const error = vi
                .spyOn(console, 'error')
                .mockImplementation(() => {});
            clearLocalData.mockRejectedValue(new Error('Dexie is closed'));

            await act(() => session!.deleteAccount({}));

            expect(localStorage.getItem(LOCAL_DATA_OWNER_KEY)).toBe(
                `${ADA.id}:signed-out`
            );
            expect(deleteApiKeysOf).toHaveBeenCalledWith(ADA.id);
            expect(cached()).toBeNull();
            expect(assign).toHaveBeenCalledWith('/login?accountDeleted=1');
            error.mockRestore();
        });

        it('leaves everything in place when the server refuses', async () => {
            const assign = await signedIn();
            fetchMock.mockResolvedValue(
                jsonResponse({ code: 'INVALID_PASSWORD', message: 'no' }, 400)
            );

            let err: unknown;
            await act(async () => {
                err = await session!
                    .deleteAccount({ password: 'wrong' })
                    .catch((e: unknown) => e);
            });

            expect(err).toMatchObject({
                status: 400,
                code: 'INVALID_PASSWORD',
            });
            expect(clearLocalData).not.toHaveBeenCalled();
            expect(deleteApiKeysOf).not.toHaveBeenCalled();
            expect(cached()).not.toBeNull();
            expect(localStorage.getItem(LOCAL_DATA_OWNER_KEY)).not.toBeNull();
            expect(assign).not.toHaveBeenCalled();
        });
    });
});

describe('sessionClient', () => {
    describe('deleteAccount', () => {
        it('posts the password same-origin, or an empty body without one', async () => {
            fetchMock.mockResolvedValue(jsonResponse({ success: true }));
            await deleteAccount({ password: 'pw-123456' });
            await deleteAccount({});
            const [url, init] = fetchMock.mock.calls[0]!;
            expect(url).toBe('/api/auth/delete-user');
            expect(init?.method).toBe('POST');
            expect(init?.credentials).toBe('same-origin');
            expect(JSON.parse(String(init?.body))).toEqual({
                password: 'pw-123456',
            });
            expect(fetchMock.mock.calls[1]![1]?.body).toBe('{}');
        });

        it('throws the server error with its code', async () => {
            fetchMock.mockResolvedValue(
                jsonResponse({ code: 'SESSION_EXPIRED', message: 'old' }, 400)
            );
            const err = await deleteAccount({}).catch((e: unknown) => e);
            expect(err).toBeInstanceOf(AuthRequestError);
            expect(err).toMatchObject({ status: 400, code: 'SESSION_EXPIRED' });
        });
    });

    it('signs in same-origin with JSON and returns only the public user fields', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse({
                token: 'secret-token',
                user: { ...ADA, role: 'user', image: null },
            })
        );
        const user = await signInEmail({
            email: 'ada@example.com',
            password: 'pw-123456',
        });
        expect(user).toEqual(ADA);
        const [url, init] = fetchMock.mock.calls[0]!;
        expect(url).toBe('/api/auth/sign-in/email');
        expect(init?.credentials).toBe('same-origin');
        expect(new Headers(init?.headers).get('content-type')).toBe(
            'application/json'
        );
        expect(JSON.parse(String(init?.body))).toEqual({
            email: 'ada@example.com',
            password: 'pw-123456',
        });
    });

    it('turns a 429 into an error carrying the retry delay', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse({ message: 'Too many requests' }, 429, {
                'x-retry-after': '42',
            })
        );
        const err = await signInEmail({ email: 'a@b.co', password: 'x' }).catch(
            (e: unknown) => e
        );
        expect(err).toBeInstanceOf(AuthRequestError);
        expect(err).toMatchObject({ status: 429, retryAfter: 42 });
    });

    it('keeps the Better Auth error code', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse(
                { code: 'REGISTRATION_CLOSED', message: 'invite-only' },
                403
            )
        );
        const err = await signInEmail({ email: 'a@b.co', password: 'x' }).catch(
            (e: unknown) => e
        );
        expect(err).toMatchObject({
            status: 403,
            code: 'REGISTRATION_CLOSED',
            retryAfter: undefined,
        });
    });
});
