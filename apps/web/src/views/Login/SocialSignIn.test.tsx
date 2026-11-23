// @vitest-environment jsdom
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (k: string, o?: Record<string, unknown>) =>
            o ? `${k}:${JSON.stringify(o)}` : k,
        i18n: { language: 'en' },
    }),
}));

const providers = vi.hoisted(() => ({
    value: undefined as
        | { providers: string[]; registrationOpen: boolean }
        | undefined,
}));
vi.mock('state/api/authProvidersAPI', () => ({
    useAuthProviders: () => providers.value,
}));

import SocialSignIn from './SocialSignIn';

const GOOGLE_URL = 'https://accounts.google.com/o/oauth2/v2/auth?state=abc';

const fetchMock = vi.fn<typeof fetch>();
const assign = vi.fn();

const respond = (body: unknown, status = 200, headers = {}) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
    });

const renderSocial = (
    mode: 'login' | 'signup' = 'login',
    state?: unknown,
    onError = vi.fn()
) => {
    render(
        <MemoryRouter initialEntries={[{ pathname: '/login', state }]}>
            <SocialSignIn mode={mode} onError={onError} />
        </MemoryRouter>
    );
    return onError;
};

const bodyOfCall = () =>
    JSON.parse(String(fetchMock.mock.calls[0]![1]?.body)) as Record<
        string,
        unknown
    >;

beforeEach(() => {
    providers.value = {
        providers: ['google', 'github'],
        registrationOpen: true,
    };
    fetchMock.mockReset();
    assign.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('location', { origin: window.location.origin, assign });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('SocialSignIn', () => {
    it('shows nothing while the providers are unknown', () => {
        providers.value = undefined;
        renderSocial();
        expect(screen.queryByRole('button')).toBeNull();
        expect(screen.queryByText('social.or')).toBeNull();
    });

    it('shows nothing when no provider is configured', () => {
        providers.value = { providers: [], registrationOpen: true };
        renderSocial();
        expect(screen.queryByRole('button')).toBeNull();
        expect(screen.queryByText('social.or')).toBeNull();
    });

    it('names each button by its visible text and shows the divider', () => {
        renderSocial();
        expect(
            screen.getByRole('button', {
                name: 'social.continueWith:{"provider":"Google"}',
            })
        ).toBeTruthy();
        expect(
            screen.getByRole('button', {
                name: 'social.continueWith:{"provider":"GitHub"}',
            })
        ).toBeTruthy();
        expect(screen.getByText('social.or')).toBeTruthy();
    });

    it('shows only the configured providers', () => {
        providers.value = { providers: ['github'], registrationOpen: true };
        renderSocial();
        expect(screen.getAllByRole('button')).toHaveLength(1);
        expect(screen.getByRole('button').textContent).toContain('GitHub');
    });

    it('hides the sign-up buttons when registration is closed', () => {
        providers.value = { providers: ['google'], registrationOpen: false };
        renderSocial('signup');
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('keeps the login buttons when registration is closed', () => {
        providers.value = { providers: ['google'], registrationOpen: false };
        renderSocial('login');
        expect(screen.getAllByRole('button')).toHaveLength(1);
    });

    it('starts a login without asking to sign up, then goes to the provider', async () => {
        fetchMock.mockResolvedValue(respond({ url: GOOGLE_URL }));
        renderSocial('login', { from: '/explore?subject=biology' });
        fireEvent.click(screen.getByRole('button', { name: /Google/ }));
        await waitFor(() => expect(assign).toHaveBeenCalledWith(GOOGLE_URL));
        expect(fetchMock.mock.calls[0]![0]).toBe('/api/auth/sign-in/social');
        expect(bodyOfCall()).toEqual({
            provider: 'google',
            callbackURL: '/explore?subject=biology',
            errorCallbackURL: '/login',
            disableRedirect: true,
        });
    });

    it('starts a sign-up with requestSignUp and the sign-up error page', async () => {
        fetchMock.mockResolvedValue(
            respond({ url: 'https://github.com/login/oauth/authorize?x=1' })
        );
        renderSocial('signup');
        fireEvent.click(screen.getByRole('button', { name: /GitHub/ }));
        await waitFor(() => expect(assign).toHaveBeenCalled());
        expect(bodyOfCall()).toEqual({
            provider: 'github',
            callbackURL: '/',
            errorCallbackURL: '/signUp',
            requestSignUp: true,
            disableRedirect: true,
        });
    });

    it.each([
        ['an unsafe path', '//evil.example'],
        ['an encoded slash', '/set/a%2Fb'],
        ['an encoded backslash', '/set/a%5cb'],
        ['no path', undefined],
    ])('falls back to the home page for %s', async (_name, from) => {
        fetchMock.mockResolvedValue(respond({ url: GOOGLE_URL }));
        renderSocial('login', { from });
        fireEvent.click(screen.getByRole('button', { name: /Google/ }));
        await waitFor(() => expect(assign).toHaveBeenCalled());
        expect(bodyOfCall().callbackURL).toBe('/');
    });

    it('disables every button while a request is under way', async () => {
        fetchMock.mockReturnValue(new Promise(() => {}));
        renderSocial();
        fireEvent.click(screen.getByRole('button', { name: /Google/ }));
        await waitFor(() => {
            for (const button of screen.getAllByRole('button')) {
                expect((button as HTMLButtonElement).disabled).toBe(true);
            }
        });
    });

    it('refuses a URL on another origin and re-enables the buttons', async () => {
        fetchMock.mockResolvedValue(
            respond({ url: 'https://evil.example/o/oauth2/v2/auth' })
        );
        const onError = renderSocial();
        fireEvent.click(screen.getByRole('button', { name: /Google/ }));
        await waitFor(() =>
            expect(onError).toHaveBeenLastCalledWith('errors.network')
        );
        expect(assign).not.toHaveBeenCalled();
        expect(
            (
                screen.getByRole('button', {
                    name: /Google/,
                }) as HTMLButtonElement
            ).disabled
        ).toBe(false);
    });

    it('reports a rate limit', async () => {
        fetchMock.mockResolvedValue(
            respond({ message: 'slow down' }, 429, { 'x-retry-after': '30' })
        );
        const onError = renderSocial();
        fireEvent.click(screen.getByRole('button', { name: /GitHub/ }));
        await waitFor(() =>
            expect(onError).toHaveBeenLastCalledWith(
                'errors.rateLimited:{"seconds":30}'
            )
        );
        expect(onError).toHaveBeenCalledWith(null);
    });

    it('hides the Google logo from assistive technology', () => {
        renderSocial();
        const icon = screen
            .getByRole('button', { name: /Google/ })
            .querySelector('svg');
        expect(icon?.getAttribute('aria-hidden')).toBe('true');
    });
});
