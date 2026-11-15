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
import ResetPasswordForm from './ResetPasswordForm';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
}));

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });

const fetchMock = vi.fn<typeof fetch>();

const Where = () => {
    const location = useLocation();
    return (
        <p>
            at:{location.pathname}:{JSON.stringify(location.state)}
        </p>
    );
};

const renderAt = (path: string) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/reset-password" element={<ResetPasswordForm />} />
                <Route path="*" element={<Where />} />
            </Routes>
        </MemoryRouter>
    );

const fill = (password: string, confirm = password) => {
    fireEvent.change(screen.getByLabelText(/reset\.newPassword/), {
        target: { value: password },
    });
    fireEvent.change(screen.getByLabelText(/fields\.confirmPassword/), {
        target: { value: confirm },
    });
    fireEvent.click(screen.getByRole('button', { name: 'reset.submit' }));
};

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('ResetPasswordForm', () => {
    it('without a token, says the link is invalid and offers a new one', () => {
        renderAt('/reset-password');
        expect(screen.getByRole('alert').textContent).toBe(
            'errors.resetLinkInvalid'
        );
        expect(
            screen
                .getByRole('link', { name: 'reset.requestNew' })
                .getAttribute('href')
        ).toBe('/forgot-password');
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('catches a mismatch without a request', async () => {
        renderAt('/reset-password?token=abc');
        fill('new-password-1', 'other-password-1');
        expect(await screen.findByText('errors.passwordMismatch')).toBeTruthy();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('resets the password and goes to login with a notice', async () => {
        renderAt('/reset-password?token=abc%2Bdef');
        fetchMock.mockResolvedValueOnce(json({ status: true }));
        fill('new-password-1');
        expect(
            await screen.findByText('at:/login:{"notice":"passwordReset"}')
        ).toBeTruthy();
        const [url, init] = fetchMock.mock.calls[0]!;
        expect(url).toBe('/api/auth/reset-password');
        expect(JSON.parse(String(init?.body))).toEqual({
            token: 'abc+def',
            newPassword: 'new-password-1',
        });
    });

    it('explains an expired or used link', async () => {
        renderAt('/reset-password?token=abc');
        fetchMock.mockResolvedValueOnce(json({ code: 'INVALID_TOKEN' }, 400));
        fill('new-password-1');
        expect((await screen.findByRole('alert')).textContent).toBe(
            'errors.resetLinkInvalid'
        );
        expect(
            screen.getByRole('link', { name: 'reset.requestNew' })
        ).toBeTruthy();
    });
});
