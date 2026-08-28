// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ImportCardsModal from './ImportCardsModal';
import { Card } from 'shared/types';

const theme = createTheme();

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

// react-router-dom is mocked wholesale (not via vi.importActual) because
// this repo's react-router-dom@7 currently pulls in an internal
// react-router@8 dependency that requires a React 19 export (useOptimistic)
// not present in this app's React 18 - loading the real package throws in
// the jsdom test environment. AppStyles.tsx (imported transitively via
// StyledDialogActions) uses `Link` for styling only, never rendered here.
vi.mock('react-router-dom', () => ({
    Link: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('react-toastify', () => ({
    toast: { success: vi.fn(), warning: vi.fn() },
}));

const parseApkgMock = vi.fn();
vi.mock('utilities/ankiApkg', () => ({
    parseApkg: (...args: unknown[]) => parseApkgMock(...args),
    MAX_APKG_BYTES: 50 * 1024 * 1024,
}));

const makeCard = (term: string, definition: string): Card => ({
    term,
    definition,
    cardUUID: `${term}-uuid`,
    categories: [],
    files: [],
    notes: [],
    important: false,
});

const renderModal = (
    props?: Partial<React.ComponentProps<typeof ImportCardsModal>>
) => {
    const setShowImportModal = vi.fn();
    const onImportCards = vi.fn();
    render(
        <ThemeProvider theme={theme}>
            <ImportCardsModal
                setShowImportModal={setShowImportModal}
                onImportCards={onImportCards}
                {...props}
            />
        </ThemeProvider>
    );
    return { setShowImportModal, onImportCards };
};

const pasteQuizletText = (text: string) => {
    fireEvent.click(
        screen.getByRole('button', { name: 'create.formatQuizlet' })
    );
    const textarea = screen.getByPlaceholderText(
        'create.pastePlaceholderQuizlet'
    );
    fireEvent.change(textarea, { target: { value: text } });
};

describe('ImportCardsModal preview step', () => {
    beforeEach(() => {
        parseApkgMock.mockReset();
    });

    it('shows a preview table after parsing instead of importing immediately', async () => {
        const { onImportCards } = renderModal();

        pasteQuizletText(
            'Mitochondria\tThe powerhouse of the cell\nDNA\tGenetic material'
        );
        fireEvent.click(screen.getByRole('button', { name: 'create.preview' }));

        expect(await screen.findByRole('table')).toBeTruthy();
        expect(screen.getByText('Mitochondria')).toBeTruthy();
        expect(screen.getByText('DNA')).toBeTruthy();
        expect(onImportCards).not.toHaveBeenCalled();
    });

    it('imports only the confirmed rows from the preview', async () => {
        const { onImportCards, setShowImportModal } = renderModal();

        pasteQuizletText(
            'Mitochondria\tThe powerhouse of the cell\nDNA\tGenetic material'
        );
        fireEvent.click(screen.getByRole('button', { name: 'create.preview' }));
        await screen.findByRole('table');

        const dnaRow = screen.getByText('DNA').closest('tr');
        expect(dnaRow).not.toBeNull();
        fireEvent.click(within(dnaRow as HTMLElement).getByRole('checkbox'));

        fireEvent.click(
            screen.getByRole('button', { name: /create\.previewImportCount/ })
        );

        expect(onImportCards).toHaveBeenCalledTimes(1);
        const imported = onImportCards.mock.calls[0]?.[0] as Card[];
        expect(imported.map((c) => c.term)).toEqual(['Mitochondria']);
        expect(setShowImportModal).toHaveBeenCalledWith(false);
    });

    it('disables the confirm button when every row is deselected', async () => {
        renderModal();

        pasteQuizletText(
            'Mitochondria\tThe powerhouse of the cell\nDNA\tGenetic material'
        );
        fireEvent.click(screen.getByRole('button', { name: 'create.preview' }));
        await screen.findByRole('table');

        const selectAll = screen.getByRole('checkbox', {
            name: 'create.previewSelectAll',
        });
        fireEvent.click(selectAll);

        const confirmButton = screen.getByRole('button', {
            name: 'create.previewNoneSelected',
        }) as HTMLButtonElement;
        expect(confirmButton.disabled).toBe(true);
    });

    it('flags and deselects cards whose term already exists in the set', async () => {
        const { onImportCards } = renderModal({
            existingCards: [makeCard('DNA', 'existing definition')],
        });

        pasteQuizletText(
            'Mitochondria\tThe powerhouse of the cell\nDNA\tGenetic material'
        );
        fireEvent.click(screen.getByRole('button', { name: 'create.preview' }));
        await screen.findByRole('table');

        expect(screen.getByText('create.previewDuplicate')).toBeTruthy();

        fireEvent.click(
            screen.getByRole('button', { name: /create\.previewImportCount/ })
        );

        const imported = onImportCards.mock.calls[0]?.[0] as Card[];
        expect(imported.map((c) => c.term)).toEqual(['Mitochondria']);
    });

    it('returns to the editor with the source text intact when Back is clicked', async () => {
        renderModal();

        pasteQuizletText(
            'Mitochondria\tThe powerhouse of the cell\nDNA\tGenetic material'
        );
        fireEvent.click(screen.getByRole('button', { name: 'create.preview' }));
        await screen.findByRole('table');

        fireEvent.click(
            screen.getByRole('button', { name: 'create.previewBack' })
        );

        const textarea = screen.getByPlaceholderText(
            'create.pastePlaceholderQuizlet'
        ) as HTMLTextAreaElement;
        expect(textarea.value).toContain('Mitochondria');
        expect(screen.queryByRole('table')).toBeNull();
    });

    it('surfaces a parse error without entering the preview step', async () => {
        renderModal();

        pasteQuizletText('this row has no separator at all');
        fireEvent.click(screen.getByRole('button', { name: 'create.preview' }));

        expect(
            await screen.findByText(/No rows contained the chosen separator/)
        ).toBeTruthy();
        expect(screen.queryByRole('table')).toBeNull();
    });
});
