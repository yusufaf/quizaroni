// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppRoutes from './AppRoutes';

const auth = { isAuthenticated: false };
vi.mock('shared/auth/useAuth', () => ({
    useAuth: () => ({
        isAuthenticated: auth.isAuthenticated,
        signOut: vi.fn(),
    }),
}));

// Each view is a text stub; this test is only about which one a path reaches.
vi.mock('views/Landing/Landing', () => ({ default: () => 'landing page' }));
vi.mock('views/Login/LoginForm', () => ({ default: () => 'login page' }));
vi.mock('views/Signup/SignupForm', () => ({ default: () => 'signup page' }));
vi.mock('views/ForgotPassword/ForgotPasswordForm', () => ({
    default: () => 'forgot page',
}));
vi.mock('views/ResetPassword/ResetPasswordForm', () => ({
    default: () => 'reset page',
}));
vi.mock('views/Admin/Admin', () => ({ default: () => 'admin page' }));
vi.mock('views/Home/Home', () => ({ default: () => 'home page' }));
vi.mock('views/Create/CreateSet', () => ({ default: () => 'create page' }));
vi.mock('views/Profile/Profile', () => ({ default: () => 'profile page' }));
vi.mock('views/ViewStudySet/ViewStudySet', () => ({
    default: () => 'view page',
}));
vi.mock('views/CombineSets/CombineSets', () => ({
    default: () => 'combine page',
}));
vi.mock('views/Explore/Explore', () => ({ default: () => 'explore page' }));
vi.mock('views/NotFound/NotFound', () => ({ default: () => 'not found' }));
vi.mock('views/Study/StudyMode', () => ({ default: () => 'study page' }));
vi.mock('views/PublicStudySet/PublicStudySet', () => ({
    default: () => 'public set page',
}));

const renderAt = (path: string) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <AppRoutes />
        </MemoryRouter>
    );

beforeEach(() => {
    auth.isAuthenticated = false;
});

describe('AppRoutes', () => {
    // #139
    it('serves Explore to a logged-out visitor', async () => {
        renderAt('/explore');

        expect(await screen.findByText('explore page')).toBeTruthy();
        expect(screen.queryByText('login page')).toBeNull();
    });

    it('serves Explore when signed in', async () => {
        auth.isAuthenticated = true;
        renderAt('/explore');

        expect(await screen.findByText('explore page')).toBeTruthy();
    });

    it('still sends a logged-out visitor from a protected route to login', async () => {
        renderAt('/profile');

        expect(await screen.findByText('login page')).toBeTruthy();
        expect(screen.queryByText('profile page')).toBeNull();
    });

    it.each([
        ['/forgot-password', 'forgot page'],
        ['/reset-password?token=abc', 'reset page'],
        ['/callback', 'not found'],
    ])('serves %s', async (path, page) => {
        renderAt(path);
        expect(await screen.findByText(page)).toBeTruthy();
    });

    it('serves the admin page when signed in', async () => {
        auth.isAuthenticated = true;
        renderAt('/admin');

        expect(await screen.findByText('admin page')).toBeTruthy();
    });

    it('sends a logged-out visitor from the admin page to login', async () => {
        renderAt('/admin');

        expect(await screen.findByText('login page')).toBeTruthy();
        expect(screen.queryByText('admin page')).toBeNull();
    });
});
