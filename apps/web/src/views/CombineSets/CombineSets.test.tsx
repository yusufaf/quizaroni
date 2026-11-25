// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vite-plus/test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Studyset } from 'shared/types';
import CombineSets from './CombineSets';

const theme = createTheme();

const SET_A = {
    studysetUUID: '11111111-1111-4111-8111-111111111111',
    title: 'Set A',
    labels: ['a'],
    metadata: {},
    cards: [
        {
            cardUUID: 'card-a',
            term: 'term A',
            definition: 'def A',
            categories: [],
            important: false,
        },
    ],
} as unknown as Studyset;

const SET_B = {
    studysetUUID: '22222222-2222-4222-8222-222222222222',
    title: 'Set B',
    labels: ['b'],
    metadata: {},
    cards: [
        {
            cardUUID: 'card-b',
            term: 'term B',
            definition: 'def B',
            categories: [],
            important: false,
        },
    ],
} as unknown as Studyset;

// A fresh object per render would re-run the page's allSets effect forever.
const ALL = { data: { studysets: [SET_A, SET_B] } };

const navigateSpy = vi.fn();
// Mocked wholesale: the real react-router-dom can't load under React 18 here
// (see ImportCardsModal.test.tsx). AppStyles only uses Link for styling.
vi.mock('react-router-dom', () => ({
    useNavigate: () => navigateSpy,
    useParams: () => ({ id: SET_A.studysetUUID }),
    Link: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

const toastMock = vi.hoisted(() => ({
    error: vi.fn(),
    POSITION: { BOTTOM_LEFT: 'bottom-left' },
}));
vi.mock('react-toastify', () => ({ toast: toastMock }));

const createMock = vi.fn();
vi.mock('state/api/studysetsAPI', () => ({
    useGetAllStudysets: () => ALL,
    useCreateStudyset: () => ({ mutateAsync: createMock }),
}));

const combineButton = () =>
    screen.getByRole('button', {
        name: 'combineSets.combineAndGo',
    }) as HTMLButtonElement;

const combineBothSets = () => {
    render(
        <ThemeProvider theme={theme}>
            <CombineSets />
        </ThemeProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'combineSets.addSet' }));
    fireEvent.click(combineButton());
};

const expectFailureHandled = async () => {
    await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
    expect(toastMock.error).toHaveBeenCalledWith(
        'combineSets.failed',
        expect.objectContaining({ toastId: 'combineSets:failed' })
    );
    expect(navigateSpy).not.toHaveBeenCalled();
    await waitFor(() => expect(combineButton().disabled).toBe(false));
};

describe('CombineSets', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates the combined set in one request and opens it', async () => {
        createMock.mockImplementation(async (s?: { studysetUUID: string }) => ({
            studyset: { studysetUUID: s?.studysetUUID },
        }));

        combineBothSets();

        await waitFor(() => expect(navigateSpy).toHaveBeenCalled());
        expect(createMock).toHaveBeenCalledTimes(1);
        const sent = createMock.mock.calls[0]![0];
        expect(sent).toEqual(
            expect.objectContaining({
                studysetUUID: expect.stringMatching(/^[0-9a-f-]{36}$/),
                title: 'combineSets.defaultTitleFromSets',
                cards: expect.arrayContaining([
                    expect.objectContaining({ term: 'term A' }),
                    expect.objectContaining({ term: 'term B' }),
                ]),
                labels: expect.any(Array),
            })
        );
        for (const card of sent.cards) {
            expect(card.studysetUUID).toBe(sent.studysetUUID);
        }
        expect(navigateSpy).toHaveBeenCalledWith(`/view/${sent.studysetUUID}`);
    });

    it('shows an error and keeps the page usable when the combine fails', async () => {
        createMock.mockRejectedValue(new Error('boom'));
        const consoleSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {});

        combineBothSets();

        await expectFailureHandled();
        consoleSpy.mockRestore();
    });

    it('treats a response for a different set as a failure', async () => {
        createMock.mockResolvedValue({
            studyset: { studysetUUID: 'server-made-id' },
        });
        const consoleSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {});

        combineBothSets();

        await expectFailureHandled();
        consoleSpy.mockRestore();
    });
});
