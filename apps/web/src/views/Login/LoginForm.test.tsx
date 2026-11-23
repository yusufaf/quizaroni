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
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { SessionProvider } from 'shared/auth/session/SessionProvider';

const providers = vi.hoisted(() => ({
    value: undefined as
        | { providers: string[]; registrationOpen: boolean }
        | undefined,
}));
vi.mock('state/api/authProvidersAPI', () => ({
    useAuthProviders: () => providers.value,
}));

import LoginForm from './LoginForm';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (k: string, o?: Record<string, unknown>) =>
            o ? `${k}:${JSON.stringify(o)}` : k,
        i18n: { language: 'en' },
    }),
}));

const json = (
    body: unknown,
    status = 200,
    headers: Record<string, string> = {}
) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
    });

const fetchMock = vi.fn<typeof fetch>();

const Where = () => <p>at:{useLocation().pathname}</p>;

const Url = () => {
    const { pathname, search, state } = useLocation();
    return (
        <p data-testid="url">
            {pathname}
            {search}|{JSON.stringify(state ?? null)}
        </p>
    );
};

const renderLogin = async (state?: unknown, search = '') => {
    render(
        <MemoryRouter initialEntries={[{ pathname: '/login', search, state }]}>
            <Url />
            <SessionProvider>
                <Routes>
                    <Route path="/login" element={<LoginForm />} />
                    <Route path="*" element={<Where />} />
                </Routes>
            </SessionProvider>
        </MemoryRouter>
    );
    return screen.findByLabelText(/fields\.email/);
};

const submit = (email: string, password = 'pw-123456') => {
    fireEvent.change(screen.getByLabelText(/fields\.email/), {
        target: { value: email },
    });
    fireEvent.change(screen.getByLabelText(/fields\.password/), {
        target: { value: password },
    });
    fireEvent.click(screen.getByRole('button', { name: 'login.submit' }));
};

const ADA = { id: 'u1', email: 'ada@example.com', name: 'Ada' };

beforeEach(() => {
    providers.value = undefined;
    localStorage.clear();
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(json(null));
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('LoginForm', () => {
    it('labels every input', async () => {
        await renderLogin();
        expect(screen.getByLabelText(/fields\.email/)).toBeTruthy();
        expect(screen.getByLabelText(/fields\.password/)).toBeTruthy();
    });

    it('signs in with a trimmed email and goes to the return path', async () => {
        await renderLogin({ from: '/explore?subject=biology' });
        fetchMock.mockResolvedValueOnce(json({ token: 't', user: ADA }));
        submit(' ada@example.com ');
        expect(await screen.findByText('at:/explore')).toBeTruthy();
        const [url, init] = fetchMock.mock.calls[1]!;
        expect(url).toBe('/api/auth/sign-in/email');
        expect(JSON.parse(String(init?.body))).toEqual({
            email: 'ada@example.com',
            password: 'pw-123456',
        });
    });

    it('ignores an unsafe return path', async () => {
        await renderLogin({ from: '//evil.com' });
        fetchMock.mockResolvedValueOnce(json({ token: 't', user: ADA }));
        submit('ada@example.com');
        expect(await screen.findByText('at:/')).toBeTruthy();
    });

    it.each([
        [
            json({ code: 'INVALID_EMAIL_OR_PASSWORD' }, 401),
            'errors.invalidCredentials',
        ],
        [
            json({ message: 'slow down' }, 429, { 'x-retry-after': '42' }),
            'errors.rateLimited:{"seconds":42}',
        ],
        [json({ message: 'slow down' }, 429), 'errors.rateLimitedLater'],
        [json({ code: 'INVALID_EMAIL' }, 400), 'errors.invalidEmail'],
    ])('shows a readable error (%#)', async (response, message) => {
        await renderLogin();
        fetchMock.mockResolvedValueOnce(response);
        submit('ada@example.com');
        expect((await screen.findByRole('alert')).textContent).toBe(message);
    });

    it('links to the forgot-password page', async () => {
        await renderLogin();
        expect(
            screen
                .getByRole('link', { name: 'login.forgotLink' })
                .getAttribute('href')
        ).toBe('/forgot-password');
    });

    it('confirms a password reset', async () => {
        await renderLogin({ notice: 'passwordReset' });
        expect(screen.getByRole('status').textContent).toBe(
            'login.passwordResetNotice'
        );
    });

    it('shows no notice by default', async () => {
        await renderLogin();
        expect(screen.queryByRole('status')).toBeNull();
    });

    it('shows no provider buttons until the server lists some', async () => {
        await renderLogin();
        expect(screen.queryByText('social.or')).toBeNull();
        expect(
            screen.queryByRole('button', { name: /social\.continueWith/ })
        ).toBeNull();
    });

    it('offers the configured providers above the email form', async () => {
        providers.value = {
            providers: ['google', 'github'],
            registrationOpen: false,
        };
        await renderLogin();
        const buttons = screen.getAllByRole('button', {
            name: /social\.continueWith/,
        });
        expect(buttons).toHaveLength(2);
        const email = screen.getByLabelText(/fields\.email/);
        expect(
            buttons[0]!.compareDocumentPosition(email) &
                Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
    });

    it.each([
        ['account_not_linked', 'errors.accountNotLinked'],
        ['signup_disabled', 'errors.noLinkedAccount'],
        ['SOCIAL_EMAIL_UNVERIFIED', 'errors.socialEmailUnverified'],
        ['access_denied', 'errors.socialCancelled'],
        ['REGISTRATION_CLOSED', 'errors.registrationClosed'],
        ['state_mismatch', 'errors.socialFailed'],
        ['constructor', 'errors.socialFailed'],
        ['__proto__', 'errors.socialFailed'],
    ])('shows the message for ?error=%s', async (code, message) => {
        await renderLogin(undefined, `?error=${code}`);
        expect((await screen.findByRole('alert')).textContent).toBe(message);
    });

    it('never shows the provider description, and clears the query keeping the state', async () => {
        const state = { from: '/explore' };
        await renderLogin(
            state,
            '?error=access_denied&error_description=Pwned%20by%20me&keep=1'
        );
        expect((await screen.findByRole('alert')).textContent).toBe(
            'errors.socialCancelled'
        );
        await waitFor(() =>
            expect(screen.getByTestId('url').textContent).toBe(
                '/login?keep=1|{"from":"/explore"}'
            )
        );
        expect(screen.queryByText(/Pwned/)).toBeNull();
        expect(screen.getByRole('alert').textContent).toBe(
            'errors.socialCancelled'
        );
    });

    it('shows no error without the query', async () => {
        await renderLogin();
        expect(screen.queryByRole('alert')).toBeNull();
    });
});
