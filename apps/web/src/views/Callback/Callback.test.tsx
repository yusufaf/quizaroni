// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { POST_SIGN_IN_REDIRECT_KEY } from 'shared/constants';
import Callback from './Callback';

// Runs the sign-in callback after mount, as if the exchange had finished.
vi.mock('@logto/react', async () => {
    const { useEffect } = await import('react');
    return {
        useHandleSignInCallback: (onSuccess: () => void) => {
            useEffect(() => onSuccess(), []);
            return { isLoading: false };
        },
    };
});

const Where = () => {
    const { pathname, search } = useLocation();
    return <span data-testid="where">{pathname + search}</span>;
};

const renderCallback = () =>
    render(
        <MemoryRouter initialEntries={['/callback']}>
            <Routes>
                <Route path="/callback" element={<Callback />} />
                <Route path="*" element={<Where />} />
            </Routes>
        </MemoryRouter>
    );

beforeEach(() => {
    sessionStorage.clear();
});

describe('Callback', () => {
    it('returns to the stashed path and clears it', async () => {
        sessionStorage.setItem(
            POST_SIGN_IN_REDIRECT_KEY,
            '/explore?subject=biology'
        );
        renderCallback();

        expect((await screen.findByTestId('where')).textContent).toBe(
            '/explore?subject=biology'
        );
        expect(sessionStorage.getItem(POST_SIGN_IN_REDIRECT_KEY)).toBeNull();
    });

    it('goes home when nothing was stashed', async () => {
        renderCallback();
        expect((await screen.findByTestId('where')).textContent).toBe('/');
    });

    // The key is checked when written too; this covers a value from anywhere else.
    it('goes home instead of to an unsafe stashed path', async () => {
        sessionStorage.setItem(POST_SIGN_IN_REDIRECT_KEY, '//evil.com');
        renderCallback();
        expect((await screen.findByTestId('where')).textContent).toBe('/');
    });
});
