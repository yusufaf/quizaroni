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

const renderLogin = async (state?: unknown) => {
    render(
        <MemoryRouter initialEntries={[{ pathname: '/login', state }]}>
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
});
