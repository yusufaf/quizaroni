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

import SignupForm from './SignupForm';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
}));

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
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

const renderSignup = async (search = '') => {
    render(
        <MemoryRouter
            initialEntries={[
                { pathname: '/signUp', search, state: { from: '/create' } },
            ]}
        >
            <Url />
            <SessionProvider>
                <Routes>
                    <Route path="/signUp" element={<SignupForm />} />
                    <Route path="*" element={<Where />} />
                </Routes>
            </SessionProvider>
        </MemoryRouter>
    );
    await screen.findByLabelText(/fields\.name/);
};

const fill = (o: {
    name?: string;
    email?: string;
    password?: string;
    confirm?: string;
}) => {
    const values = {
        name: 'Ada',
        email: 'ada@example.com',
        password: 'pw-123456',
        ...o,
    };
    const set = (label: RegExp, value: string) =>
        fireEvent.change(screen.getByLabelText(label), { target: { value } });
    set(/fields\.name/, values.name);
    set(/fields\.email/, values.email);
    set(/^fields\.password/, values.password);
    set(/fields\.confirmPassword/, o.confirm ?? values.password);
    fireEvent.click(screen.getByRole('button', { name: 'signup.submit' }));
};

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

describe('SignupForm', () => {
    it('labels every input', async () => {
        await renderSignup();
        for (const label of [
            /fields\.name/,
            /fields\.email/,
            /^fields\.password/,
            /fields\.confirmPassword/,
        ]) {
            expect(screen.getByLabelText(label)).toBeTruthy();
        }
    });

    it('creates the account and goes to the return path', async () => {
        await renderSignup();
        fetchMock.mockResolvedValueOnce(
            json({
                token: 't',
                user: { id: 'u1', email: 'ada@example.com', name: 'Ada' },
            })
        );
        fill({ name: ' Ada ', email: ' ada@example.com ' });
        expect(await screen.findByText('at:/create')).toBeTruthy();
        const [url, init] = fetchMock.mock.calls[1]!;
        expect(url).toBe('/api/auth/sign-up/email');
        expect(JSON.parse(String(init?.body))).toEqual({
            name: 'Ada',
            email: 'ada@example.com',
            password: 'pw-123456',
        });
    });

    it('catches a password mismatch without a request', async () => {
        await renderSignup();
        fill({ confirm: 'something-else' });
        expect(await screen.findByText('errors.passwordMismatch')).toBeTruthy();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('catches a short password without a request', async () => {
        await renderSignup();
        fill({ password: 'short' });
        expect(await screen.findByText('errors.passwordLength')).toBeTruthy();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it.each([
        [
            json({ code: 'REGISTRATION_CLOSED' }, 403),
            'errors.registrationClosed',
        ],
        [
            json({ code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' }, 422),
            'errors.emailTaken',
        ],
        [json({ code: 'INVITE_INVALID' }, 403), 'errors.inviteInvalid'],
    ])('shows a readable server error (%#)', async (response, message) => {
        await renderSignup();
        fetchMock.mockResolvedValueOnce(response);
        fill({});
        expect((await screen.findByRole('alert')).textContent).toBe(message);
    });

    it('sends the invite from the link and says so', async () => {
        await renderSignup('?invite=tok-123');
        expect(screen.getByText('signup.inviteNotice')).toBeTruthy();
        fetchMock.mockResolvedValueOnce(
            json({
                token: 't',
                user: { id: 'u1', email: 'ada@example.com', name: 'Ada' },
            })
        );
        fill({});
        expect(await screen.findByText('at:/create')).toBeTruthy();
        const [, init] = fetchMock.mock.calls[1]!;
        expect(JSON.parse(String(init?.body))).toEqual({
            name: 'Ada',
            email: 'ada@example.com',
            password: 'pw-123456',
            inviteToken: 'tok-123',
        });
    });

    it('shows no invite notice without an invite', async () => {
        await renderSignup();
        expect(screen.queryByText('signup.inviteNotice')).toBeNull();
    });

    it('offers the providers when registration is open', async () => {
        providers.value = {
            providers: ['google', 'github'],
            registrationOpen: true,
        };
        await renderSignup();
        expect(
            screen.getAllByRole('button', { name: /social\.continueWith/ })
        ).toHaveLength(2);
        expect(screen.getByText('social.or')).toBeTruthy();
    });

    it('hides the providers when registration is closed', async () => {
        providers.value = { providers: ['google'], registrationOpen: false };
        await renderSignup();
        expect(
            screen.queryByRole('button', { name: /social\.continueWith/ })
        ).toBeNull();
    });

    it('hides the providers on an invite link', async () => {
        providers.value = { providers: ['google'], registrationOpen: true };
        await renderSignup('?invite=tok-123');
        expect(
            screen.queryByRole('button', { name: /social\.continueWith/ })
        ).toBeNull();
        expect(screen.queryByText('social.or')).toBeNull();
    });

    it.each([
        ['signup_disabled', 'errors.noLinkedAccount'],
        ['SOCIAL_EMAIL_UNVERIFIED', 'errors.socialEmailUnverified'],
        ['REGISTRATION_CLOSED', 'errors.registrationClosed'],
        ['INVITE_INVALID', 'errors.inviteInvalid'],
        ['access_denied', 'errors.socialCancelled'],
        ['constructor', 'errors.socialFailed'],
    ])('shows the message for ?error=%s', async (code, message) => {
        await renderSignup(`?error=${code}`);
        expect((await screen.findByRole('alert')).textContent).toBe(message);
    });

    it('never shows the provider description, and clears the query keeping the state', async () => {
        await renderSignup(
            '?error=access_denied&error_description=Pwned%20by%20me&invite=tok-1'
        );
        expect(await screen.findByText('errors.socialCancelled')).toBeTruthy();
        // The URL probe shows the raw query until it is cleared; the page itself
        // must never show the description.
        expect(
            screen.queryByText(/Pwned/, {
                ignore: 'script, style, [data-testid="url"]',
            })
        ).toBeNull();
        await waitFor(() =>
            expect(screen.getByTestId('url').textContent).toBe(
                '/signUp?invite=tok-1|{"from":"/create"}'
            )
        );
        expect(screen.queryByText(/Pwned/)).toBeNull();
        expect(screen.getByText('errors.socialCancelled')).toBeTruthy();
    });
});
