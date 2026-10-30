// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vite-plus/test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { toast } from 'react-toastify';
import { Studyset } from 'shared/types';
import ShareDialog from './ShareDialog';

const theme = createTheme();
const ID = '11111111-1111-4111-8111-111111111111';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

// Mocked wholesale: the real react-router-dom can't load under React 18 here
// (see ImportCardsModal.test.tsx). AppStyles only uses Link for styling.
vi.mock('react-router-dom', () => ({
    Link: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('react-toastify', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        POSITION: { BOTTOM_LEFT: 'bottom-left' },
    },
}));

const writeText = vi.fn();

const makeStudyset = (overrides: Partial<Studyset> = {}) =>
    ({
        studysetUUID: ID,
        metadata: { publiclyViewable: false },
        ...overrides,
    }) as unknown as Studyset;

const published = () =>
    makeStudyset({ metadata: { publiclyViewable: true } } as Partial<Studyset>);

const renderDialog = (
    studyset: Studyset | undefined,
    onOpenPublish?: () => void
) =>
    render(
        <ThemeProvider theme={theme}>
            <ShareDialog
                open
                onClose={vi.fn()}
                studyset={studyset}
                onOpenPublish={onOpenPublish}
            />
        </ThemeProvider>
    );

describe('ShareDialog', () => {
    beforeEach(() => {
        writeText.mockReset();
        vi.mocked(toast.success).mockReset();
        vi.mocked(toast.error).mockReset();
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            configurable: true,
        });
    });

    it('shows the public link for a published set and copies it', async () => {
        writeText.mockResolvedValue(undefined);
        renderDialog(published());
        const url = `${window.location.origin}/view/${ID}`;

        const link = screen.getByLabelText(
            'dialogs.share.linkLabel'
        ) as HTMLInputElement;
        expect(link.value).toBe(url);

        fireEvent.click(
            screen.getByRole('button', { name: 'dialogs.share.copy' })
        );

        expect(writeText).toHaveBeenCalledWith(url);
        await waitFor(() =>
            expect(toast.success).toHaveBeenCalledWith(
                'dialogs.share.copied',
                expect.anything()
            )
        );
    });

    it('shows an error toast and selects the link when the clipboard write fails', async () => {
        writeText.mockRejectedValue(new Error('denied'));
        renderDialog(published());
        const link = screen.getByLabelText(
            'dialogs.share.linkLabel'
        ) as HTMLInputElement;

        fireEvent.click(
            screen.getByRole('button', { name: 'dialogs.share.copy' })
        );

        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith(
                'dialogs.share.copyFailed',
                expect.anything()
            )
        );
        expect(toast.success).not.toHaveBeenCalled();
        expect(document.activeElement).toBe(link);
        expect(link.selectionStart).toBe(0);
        expect(link.selectionEnd).toBe(link.value.length);
    });

    it('shows the publish hint instead of a link for an unpublished set', () => {
        const onOpenPublish = vi.fn();
        renderDialog(makeStudyset(), onOpenPublish);

        expect(screen.getByText('dialogs.share.notPublished')).toBeTruthy();
        expect(screen.queryByRole('textbox')).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'dialogs.share.copy' })
        ).toBeNull();

        fireEvent.click(
            screen.getByRole('button', { name: 'publish.menuPublish' })
        );
        expect(onOpenPublish).toHaveBeenCalled();
    });

    it('shows the hint without a publish button when publishing is unavailable', () => {
        renderDialog(makeStudyset());

        expect(screen.getByText('dialogs.share.notPublished')).toBeTruthy();
        expect(
            screen.queryByRole('button', { name: 'publish.menuPublish' })
        ).toBeNull();
    });

    it('treats a still-loading empty studyset as unpublished', () => {
        renderDialog({} as Studyset);

        expect(screen.getByText('dialogs.share.notPublished')).toBeTruthy();
        expect(
            screen.queryByRole('button', { name: 'dialogs.share.copy' })
        ).toBeNull();
    });
});
