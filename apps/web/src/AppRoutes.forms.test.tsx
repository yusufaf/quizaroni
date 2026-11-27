// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'shared/auth/session/SessionProvider';
import AppRoutes from './AppRoutes';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
}));
vi.mock('views/Landing/Landing', () => ({ default: () => 'landing page' }));
vi.mock('views/NotFound/NotFound', () => ({ default: () => 'not found' }));

const renderAt = (path: string) => {
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('null', { status: 200 }))
    );
    render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter initialEntries={[path]}>
                <SessionProvider>
                    <AppRoutes />
                </SessionProvider>
            </MemoryRouter>
        </QueryClientProvider>
    );
};

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('AppRoutes auth forms', () => {
    it('serves the built-in login form', async () => {
        renderAt('/login');
        expect(await screen.findByLabelText(/fields\.email/)).toBeTruthy();
    });

    it('serves the built-in sign-up form', async () => {
        renderAt('/signUp');
        expect(await screen.findByLabelText(/fields\.name/)).toBeTruthy();
    });

    it('has no Logto callback route', async () => {
        renderAt('/callback');
        expect(await screen.findByText('not found')).toBeTruthy();
    });

    it('serves the forgot-password form', async () => {
        renderAt('/forgot-password');
        expect(
            await screen.findByRole('button', { name: 'forgot.submit' })
        ).toBeTruthy();
    });

    it('serves the reset-password form', async () => {
        renderAt('/reset-password?token=abc');
        expect(
            await screen.findByRole('button', { name: 'reset.submit' })
        ).toBeTruthy();
    });
});
