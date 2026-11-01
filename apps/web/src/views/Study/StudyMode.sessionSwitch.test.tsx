// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vite-plus/test';
import {
    render,
    screen,
    waitFor,
    cleanup,
    fireEvent,
} from '@testing-library/react';
import { useStudySessionStore } from 'state/stores/studySession';
import StudyMode from './StudyMode';
import { ShortcutProvider } from 'shared/keyboard/ShortcutRegistry';

const ui = () => (
    <ShortcutProvider>
        <StudyMode />
    </ShortcutProvider>
);

const SET_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SET_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const card = (id: string, term: string) => ({
    cardUUID: id,
    term,
    definition: `${term} def`,
    files: [],
});

const sets: Record<string, any> = {
    [SET_A]: {
        studysetUUID: SET_A,
        title: 'Set A',
        cards: [
            card('a1', 'Alpha one'),
            card('a2', 'Alpha two'),
            card('a3', 'Alpha three'),
        ],
    },
    [SET_B]: {
        studysetUUID: SET_B,
        title: 'Set B',
        cards: [
            card('b1', 'Bravo one'),
            card('b2', 'Bravo two'),
            card('b3', 'Bravo three'),
            card('b4', 'Bravo four'),
        ],
    },
};

let routeParams: { studysetId: string; mode: string } = {
    studysetId: SET_A,
    mode: 'flashcards',
};
let dueByStudyset: Record<string, string[]> = {};

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn(),
    useParams: () => routeParams,
    Navigate: () => null,
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
    NavLink: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock('state/api/studysetsAPI', () => ({
    useGetStudyset: ({ studysetUUID }: { studysetUUID: string }) => ({
        data: { studyset: sets[studysetUUID] },
        isLoading: false,
    }),
}));
vi.mock('state/api/usersAPI', () => ({
    useGetUser: () => ({ data: undefined }),
}));
vi.mock('state/local/repositories', () => ({
    cardProgressRepository: {
        getByCard: vi.fn(async () => undefined),
        getDueForStudyset: vi.fn(async (id: string) =>
            (dueByStudyset[id] ?? []).map((cardUUID) => ({ cardUUID }))
        ),
        upsert: vi.fn(async () => undefined),
    },
}));
vi.mock('components/ImageGallery/ImageGallery', () => ({
    default: () => null,
}));

describe('StudyMode session switching', () => {
    beforeEach(() => {
        cleanup();
        useStudySessionStore.setState({ activeSession: null });
        dueByStudyset = {};
    });

    it('opening set B while a set A flashcards session is active shows set B', async () => {
        routeParams = { studysetId: SET_A, mode: 'flashcards' };
        const { unmount } = render(ui());
        await screen.findByText('Alpha one');
        useStudySessionStore.getState().updateCurrentCard(1);
        await screen.findByText('Alpha two');
        unmount();

        routeParams = { studysetId: SET_B, mode: 'flashcards' };
        render(ui());
        await waitFor(() =>
            expect(
                useStudySessionStore.getState().activeSession?.studysetUUID
            ).toBe(SET_B)
        );
        expect(await screen.findByText('Bravo one')).toBeTruthy();
    });

    it("opening review for set B while a set A flashcards session is active shows B's due cards", async () => {
        dueByStudyset = { [SET_B]: ['b2'] };
        routeParams = { studysetId: SET_A, mode: 'flashcards' };
        const { unmount } = render(ui());
        await screen.findByText('Alpha one');
        unmount();

        routeParams = { studysetId: SET_B, mode: 'review' };
        render(ui());
        expect(await screen.findByText('Bravo two')).toBeTruthy();
        expect(useStudySessionStore.getState().activeSession?.mode).toBe(
            'review'
        );
    });

    it('switching from flashcards to review on the same set starts a review session', async () => {
        dueByStudyset = { [SET_A]: ['a3'] };
        routeParams = { studysetId: SET_A, mode: 'flashcards' };
        const { rerender } = render(ui());
        await screen.findByText('Alpha one');

        routeParams = { studysetId: SET_A, mode: 'review' };
        rerender(ui());
        expect(await screen.findByText('Alpha three')).toBeTruthy();
        expect(useStudySessionStore.getState().activeSession?.mode).toBe(
            'review'
        );
    });

    it('toggling audio in review mode keeps the review session', async () => {
        dueByStudyset = { [SET_A]: ['a3'] };
        routeParams = { studysetId: SET_A, mode: 'review' };
        render(ui());
        await screen.findByText('Alpha three');

        // The header and the bottom toolbar both have an audio toggle (#149).
        fireEvent.click(
            screen.getAllByRole('button', { name: 'header.audioOff' })[0]!
        );

        const session = useStudySessionStore.getState().activeSession;
        expect(session?.mode).toBe('review');
        expect(session?.settings.audioEnabled).toBe(true);
        expect(session?.cards.map((c) => c.cardUUID)).toEqual(['a3']);
    });

    it.each(['multiple-choice', 'matching', 'type-write'])(
        'opening %s for set B while a set A flashcards session is active starts a session for B in that mode',
        async (mode) => {
            useStudySessionStore.getState().startSession({
                studysetUUID: SET_A,
                mode: 'flashcards',
                cards: sets[SET_A].cards,
                settings: {
                    shuffleCards: false,
                    timedMode: false,
                    audioEnabled: false,
                    autoAdvance: false,
                    difficulty: 'medium',
                    hideImages: false,
                },
            });

            routeParams = { studysetId: SET_B, mode };
            render(ui());
            await waitFor(() => {
                const session = useStudySessionStore.getState().activeSession;
                expect(session?.studysetUUID).toBe(SET_B);
                expect(session?.mode).toBe(mode);
            });
        }
    );
});
