// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
}));
vi.mock('views/Landing/Landing', () => ({ default: () => 'landing page' }));
vi.mock('views/Callback/Callback', () => ({ default: () => 'callback page' }));
vi.mock('views/NotFound/NotFound', () => ({ default: () => 'not found' }));

// useAuth picks its backend at module load, so the env is stubbed before a
// fresh import. SessionProvider comes from the same fresh module graph, or it
// would create a different context from the one the forms read.
const renderSelfHostAt = async (path: string) => {
    vi.stubEnv('VITE_BACKEND', 'selfhost');
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('null', { status: 200 }))
    );
    vi.resetModules();
    const { default: AppRoutes } = await import('./AppRoutes');
    const { SessionProvider } =
        await import('shared/auth/session/SessionProvider');
    render(
        <MemoryRouter initialEntries={[path]}>
            <SessionProvider>
                <AppRoutes />
            </SessionProvider>
        </MemoryRouter>
    );
};

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe('AppRoutes on the self-host backend', () => {
    it('serves the built-in login form', async () => {
        await renderSelfHostAt('/login');
        expect(await screen.findByLabelText(/fields\.email/)).toBeTruthy();
    });

    it('serves the built-in sign-up form', async () => {
        await renderSelfHostAt('/signUp');
        expect(await screen.findByLabelText(/fields\.name/)).toBeTruthy();
    });

    it('has no Logto callback route', async () => {
        await renderSelfHostAt('/callback');
        expect(await screen.findByText('not found')).toBeTruthy();
        expect(screen.queryByText('callback page')).toBeNull();
    });
});
