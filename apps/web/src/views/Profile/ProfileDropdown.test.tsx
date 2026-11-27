// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfileDropdown from './ProfileDropdown';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
}));

let session: { user: { role: string } | null } = { user: null };
vi.mock('shared/auth/session/SessionProvider', () => ({
    useSession: () => session,
}));

vi.mock('theme/useTheme', async () => {
    const { createTheme } = await import('@mui/material/styles');
    return { useTheme: () => ({ muiTheme: createTheme() }) };
});

vi.mock('state/stores/global', () => ({
    useGlobalStore: () => ({ setFeedbackDialogOpen: vi.fn() }),
}));

const renderMenu = () => {
    const anchor = document.createElement('div');
    document.body.appendChild(anchor);
    render(
        <MemoryRouter>
            <ProfileDropdown
                dropdownRef={{ current: anchor }}
                showDropdown
                onClose={vi.fn()}
            />
        </MemoryRouter>
    );
};

beforeEach(() => {
    session = { user: null };
});

describe('ProfileDropdown', () => {
    it('shows Admin to the instance admin', () => {
        session = { user: { role: 'admin' } };
        renderMenu();
        expect(
            screen
                .getByRole('menuitem', { name: 'menuItem' })
                .getAttribute('href')
        ).toBe('/admin');
    });

    it('hides Admin from other users', () => {
        session = { user: { role: 'user' } };
        renderMenu();
        expect(screen.queryByRole('menuitem', { name: 'menuItem' })).toBeNull();
        expect(screen.getByRole('menuitem', { name: 'Profile' })).toBeTruthy();
    });
});
