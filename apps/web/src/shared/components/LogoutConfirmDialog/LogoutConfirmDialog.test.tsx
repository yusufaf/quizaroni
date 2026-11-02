// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import { useGlobalStore } from 'state/stores/global';
import LogoutConfirmDialog from './LogoutConfirmDialog';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

const signOutNow = vi.fn();
vi.mock('hooks/useLogout', () => ({
    useSignOut: () => signOutNow,
}));

describe('LogoutConfirmDialog', () => {
    beforeEach(() => {
        useGlobalStore.setState({ logoutConfirmOpen: true });
    });

    afterEach(() => {
        signOutNow.mockReset();
        useGlobalStore.setState({ logoutConfirmOpen: false });
    });

    it('signs out when the user confirms', async () => {
        render(<LogoutConfirmDialog />);

        fireEvent.click(
            screen.getByRole('button', { name: 'logoutConfirm.confirm' })
        );

        expect(signOutNow).toHaveBeenCalledOnce();
        expect(useGlobalStore.getState().logoutConfirmOpen).toBe(false);
    });

    it('stays signed in when the user cancels', async () => {
        render(<LogoutConfirmDialog />);

        fireEvent.click(
            screen.getByRole('button', { name: 'logoutConfirm.cancel' })
        );

        expect(signOutNow).not.toHaveBeenCalled();
        expect(useGlobalStore.getState().logoutConfirmOpen).toBe(false);
    });
});
