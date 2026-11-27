// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createLightTheme } from 'shared/theme/themes';
import DownloadDataDialog from './DownloadDataDialog';

const mocks = vi.hoisted(() => ({
    mutateAsync: vi.fn(),
    handleClose: vi.fn(),
    toast: { error: vi.fn() },
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('react-toastify', () => ({ toast: mocks.toast }));

vi.mock('state/api/usersAPI', () => ({
    useDownloadUserData: () => ({
        mutateAsync: mocks.mutateAsync,
        isPending: false,
    }),
}));

beforeEach(() => {
    vi.clearAllMocks();
    mocks.mutateAsync.mockResolvedValue(undefined);
});

const renderDialog = () =>
    render(
        <ThemeProvider theme={createLightTheme()}>
            <DownloadDataDialog open handleClose={mocks.handleClose} />
        </ThemeProvider>
    );

const download = () =>
    fireEvent.click(
        screen.getByRole('button', { name: 'downloadDataDialog.confirmButton' })
    );

const CHECKBOX_LABEL = 'downloadDataDialog.includeStudysets';

describe('DownloadDataDialog', () => {
    it('downloads the profile alone by default and closes', async () => {
        renderDialog();
        expect(screen.getByLabelText(CHECKBOX_LABEL)).toBeTruthy();

        download();

        await waitFor(() => expect(mocks.handleClose).toHaveBeenCalled());
        expect(mocks.mutateAsync).toHaveBeenCalledWith({
            includeStudysets: false,
        });
    });

    it('includes study sets when the box is ticked', async () => {
        renderDialog();
        fireEvent.click(screen.getByLabelText(CHECKBOX_LABEL));

        download();

        await waitFor(() => expect(mocks.handleClose).toHaveBeenCalled());
        expect(mocks.mutateAsync).toHaveBeenCalledWith({
            includeStudysets: true,
        });
    });

    it('stays open and shows an error when the download fails', async () => {
        mocks.mutateAsync.mockRejectedValue(new Error('boom'));
        renderDialog();

        download();

        await waitFor(() =>
            expect(mocks.toast.error).toHaveBeenCalledWith(
                'downloadDataDialog.downloadFailed'
            )
        );
        expect(mocks.handleClose).not.toHaveBeenCalled();
    });
});
