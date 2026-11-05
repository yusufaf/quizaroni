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
import {
    SESSION_CACHE_KEY,
    SessionProvider,
    useSession,
} from './SessionProvider';
import {
    AuthRequestError,
    signInEmail,
    type SessionUser,
} from './sessionClient';

const ADA: SessionUser = { id: 'u1', email: 'ada@example.com', name: 'Ada' };

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
});

describe('sessionClient', () => {
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
