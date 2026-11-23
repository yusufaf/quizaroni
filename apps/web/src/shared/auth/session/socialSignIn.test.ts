// @vitest-environment jsdom
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import { AuthRequestError, startSocialSignIn } from './sessionClient';

const fetchMock = vi.fn<typeof fetch>();

const respond = (body: unknown, status = 200, headers = {}) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
    });

const GOOGLE_URL = 'https://accounts.google.com/o/oauth2/v2/auth?state=abc';
const GITHUB_URL = 'https://github.com/login/oauth/authorize?state=abc';

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('startSocialSignIn', () => {
    it('asks the server for the URL without a redirect and returns it', async () => {
        fetchMock.mockResolvedValue(
            respond({ url: GOOGLE_URL, redirect: false })
        );
        const url = await startSocialSignIn({
            provider: 'google',
            callbackURL: '/explore',
            errorCallbackURL: '/login',
        });
        expect(url).toBe(GOOGLE_URL);
        const [path, init] = fetchMock.mock.calls[0]!;
        expect(path).toBe('/api/auth/sign-in/social');
        expect(init?.method).toBe('POST');
        expect(init?.credentials).toBe('same-origin');
        expect(JSON.parse(String(init?.body))).toEqual({
            provider: 'google',
            callbackURL: '/explore',
            errorCallbackURL: '/login',
            disableRedirect: true,
        });
    });

    it('sends requestSignUp only when asked', async () => {
        fetchMock.mockResolvedValue(respond({ url: GITHUB_URL }));
        await startSocialSignIn({
            provider: 'github',
            callbackURL: '/',
            errorCallbackURL: '/signUp',
            requestSignUp: true,
        });
        expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toEqual({
            provider: 'github',
            callbackURL: '/',
            errorCallbackURL: '/signUp',
            requestSignUp: true,
            disableRedirect: true,
        });
    });

    it.each([
        ['google', GITHUB_URL],
        ['github', GOOGLE_URL],
        ['google', 'https://accounts.google.com.evil.example/auth'],
        ['google', 'http://accounts.google.com/auth'],
        ['google', 'javascript:alert(1)'],
        ['google', '/relative'],
        ['google', 'not a url'],
        ['google', 42],
        ['google', undefined],
    ] as const)(
        'refuses an unexpected URL for %s: %j',
        async (provider, url) => {
            fetchMock.mockResolvedValue(respond({ url }));
            await expect(
                startSocialSignIn({
                    provider,
                    callbackURL: '/',
                    errorCallbackURL: '/login',
                })
            ).rejects.toBeInstanceOf(AuthRequestError);
        }
    );

    it('turns a 429 into an error carrying the retry delay', async () => {
        fetchMock.mockResolvedValue(
            respond({ message: 'Too many requests' }, 429, {
                'x-retry-after': '30',
            })
        );
        await expect(
            startSocialSignIn({
                provider: 'google',
                callbackURL: '/',
                errorCallbackURL: '/login',
            })
        ).rejects.toMatchObject({ status: 429, retryAfter: 30 });
    });
});
