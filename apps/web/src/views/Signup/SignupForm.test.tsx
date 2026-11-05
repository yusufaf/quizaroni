// @vitest-environment jsdom
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { SessionProvider } from 'shared/auth/session/SessionProvider';
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

const renderSignup = async () => {
    render(
        <MemoryRouter
            initialEntries={[
                { pathname: '/signUp', state: { from: '/create' } },
            ]}
        >
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
    ])('shows a readable server error (%#)', async (response, message) => {
        await renderSignup();
        fetchMock.mockResolvedValueOnce(response);
        fill({});
        expect((await screen.findByRole('alert')).textContent).toBe(message);
    });
});
