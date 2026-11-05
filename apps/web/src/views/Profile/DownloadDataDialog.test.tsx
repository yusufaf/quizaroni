// @vitest-environment jsdom
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createLightTheme } from 'shared/theme/themes';
import DownloadDataDialog from './DownloadDataDialog';

const mocks = vi.hoisted(() => ({
    mutateAsync: vi.fn(),
    handleClose: vi.fn(),
    toast: { error: vi.fn() },
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

afterEach(() => {
    vi.unstubAllEnvs();
});

const renderDialog = () =>
    render(
        <ThemeProvider theme={createLightTheme()}>
            <DownloadDataDialog open handleClose={mocks.handleClose} />
        </ThemeProvider>
    );

const download = () =>
    fireEvent.click(screen.getByRole('button', { name: 'Download Data' }));

const CHECKBOX_LABEL = 'Include studysets in the download';

describe('DownloadDataDialog in a self-host build', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_BACKEND', 'selfhost');
    });

    it('downloads the profile and closes', async () => {
        renderDialog();
        expect(screen.queryByLabelText(CHECKBOX_LABEL)).toBeNull();

        download();

        await waitFor(() => expect(mocks.handleClose).toHaveBeenCalled());
        expect(mocks.mutateAsync).toHaveBeenCalledWith({
            includeStudysets: false,
        });
    });

    it('stays open and shows an error when the download fails', async () => {
        mocks.mutateAsync.mockRejectedValue(new Error('boom'));
        renderDialog();

        download();

        await waitFor(() =>
            expect(mocks.toast.error).toHaveBeenCalledWith(
                'Failed to download your data'
            )
        );
        expect(mocks.handleClose).not.toHaveBeenCalled();
    });
});

describe('DownloadDataDialog in the AWS build', () => {
    it('keeps the checkbox and does not call the server', () => {
        renderDialog();
        expect(screen.getByLabelText(CHECKBOX_LABEL)).toBeTruthy();

        download();

        expect(mocks.mutateAsync).not.toHaveBeenCalled();
    });
});
