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
import { MemoryRouter } from 'react-router-dom';
import ForgotPasswordForm from './ForgotPasswordForm';

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

const renderForm = () =>
    render(
        <MemoryRouter initialEntries={['/forgot-password']}>
            <ForgotPasswordForm />
        </MemoryRouter>
    );

const submit = (email: string) => {
    fireEvent.change(screen.getByLabelText(/fields\.email/), {
        target: { value: email },
    });
    fireEvent.click(screen.getByRole('button', { name: 'forgot.submit' }));
};

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('ForgotPasswordForm', () => {
    it('requests a reset and shows the same message for any email', async () => {
        renderForm();
        fetchMock.mockResolvedValueOnce(json({ status: true }));
        submit(' ada@example.com ');
        expect((await screen.findByRole('status')).textContent).toBe(
            'forgot.sent:{"email":"ada@example.com"}'
        );
        const [url, init] = fetchMock.mock.calls[0]!;
        expect(url).toBe('/api/auth/request-password-reset');
        expect(JSON.parse(String(init?.body))).toEqual({
            email: 'ada@example.com',
        });
        expect(screen.getByRole('link', { name: 'forgot.backToLogin' })).toBeTruthy();
    });

    it('shows the rate-limit message', async () => {
        renderForm();
        fetchMock.mockResolvedValueOnce(
            json({ message: 'slow down' }, 429, { 'x-retry-after': '30' })
        );
        submit('ada@example.com');
        expect((await screen.findByRole('alert')).textContent).toBe(
            'errors.rateLimited:{"seconds":30}'
        );
        expect(screen.getByRole('button', { name: 'forgot.submit' })).toBeTruthy();
    });
});
