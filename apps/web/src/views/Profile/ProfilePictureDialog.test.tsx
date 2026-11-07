// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createLightTheme } from 'shared/theme/themes';
import { DEFAULT_USER_DATA } from 'shared/constants';
import ProfilePictureDialog from './ProfilePictureDialog';

vi.mock('react-toastify', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('state/api/usersAPI', () => ({
    useUpdateUserMetadata: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useUploadProfilePicture: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

afterEach(() => {
    vi.unstubAllEnvs();
});

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
    it('offers the upload in a self-host build', () => {
        vi.stubEnv('VITE_BACKEND', 'selfhost');
        renderDialog();
        expect(screen.getByText('Preset Avatars')).toBeTruthy();
        expect(screen.getByText('Upload Custom Image')).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'Choose File' })
        ).toBeTruthy();
    });

    it('offers the upload in the AWS build', () => {
        renderDialog();
        expect(screen.getByText('Upload Custom Image')).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'Choose File' })
        ).toBeTruthy();
    });
});
