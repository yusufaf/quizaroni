// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createLightTheme } from 'shared/theme/themes';
import { DEFAULT_USER_DATA } from 'shared/constants';
import ProfilePictureDialog from './ProfilePictureDialog';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('react-toastify', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('state/api/usersAPI', () => ({
    useUpdateUserMetadata: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useUploadProfilePicture: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const renderDialog = () =>
    render(
        <ThemeProvider theme={createLightTheme()}>
            <ProfilePictureDialog
                open
                onClose={vi.fn()}
                userData={{ ...DEFAULT_USER_DATA, userUUID: 'user-1' }}
            />
        </ThemeProvider>
    );

describe('ProfilePictureDialog', () => {
    it('offers the upload', () => {
        renderDialog();
        expect(
            screen.getByText('profilePictureDialog.presetAvatars')
        ).toBeTruthy();
        expect(
            screen.getByText('profilePictureDialog.uploadCustomImage')
        ).toBeTruthy();
        expect(
            screen.getByRole('button', {
                name: 'profilePictureDialog.chooseFile',
            })
        ).toBeTruthy();
    });
});
