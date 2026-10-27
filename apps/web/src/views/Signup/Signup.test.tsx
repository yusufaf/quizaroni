// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { POST_SIGN_IN_REDIRECT_KEY } from 'shared/constants';
import Signup from './Signup';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
}));

const signInSpy = vi.fn();
vi.mock('@logto/react', () => ({
    useLogto: () => ({ isAuthenticated: false, signIn: signInSpy }),
}));

const renderAt = (state?: unknown) =>
    render(
        <MemoryRouter initialEntries={[{ pathname: '/signUp', state }]}>
            <Signup />
        </MemoryRouter>
    );

const stored = () => sessionStorage.getItem(POST_SIGN_IN_REDIRECT_KEY);

beforeEach(() => {
    sessionStorage.clear();
    signInSpy.mockClear();
});

describe('Signup', () => {
    it('keeps the return path through the redirect to Logto', () => {
        renderAt({ from: '/explore?subject=biology' });

        expect(stored()).toBe('/explore?subject=biology');
        expect(signInSpy).toHaveBeenCalledWith(
            `${window.location.origin}/callback`,
            'signUp'
        );
    });

    it('ignores an unsafe return path', () => {
        renderAt({ from: '//evil.com' });

        expect(stored()).toBeNull();
        expect(signInSpy).toHaveBeenCalled();
    });

    it('clears an earlier return path when none is passed', () => {
        sessionStorage.setItem(POST_SIGN_IN_REDIRECT_KEY, '/old');
        renderAt();

        expect(stored()).toBeNull();
        expect(signInSpy).toHaveBeenCalled();
    });
});
