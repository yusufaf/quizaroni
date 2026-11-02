// @vitest-environment jsdom
import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
} from 'vite-plus/test';
import {
    act,
    render,
    screen,
    waitFor,
    cleanup,
    fireEvent,
} from '@testing-library/react';
import { useStudySessionStore } from 'state/stores/studySession';
import StudyMode from './StudyMode';
import { ShortcutProvider } from 'shared/keyboard/ShortcutRegistry';
import { useGlobalKeyListener } from 'shared/keyboard/useGlobalKeyListener';

const ui = () => (
    <ShortcutProvider>
        <StudyMode />
    </ShortcutProvider>
);

// App mounts the keydown listener that dispatches shortcuts.
const KeyListener = () => {
    useGlobalKeyListener();
    return null;
};
const uiWithKeys = () => (
    <ShortcutProvider>
        <KeyListener />
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
// endSession() persists gamification to Dexie and syncs it to the API; keep
// both out of jsdom.
vi.mock('state/local/repositories/GamificationRepository', () => ({
    gamificationRepository: {
        getState: vi.fn(async () => undefined),
        saveState: vi.fn(async () => undefined),
        getCustomAchievements: vi.fn(async () => []),
        saveCustomAchievement: vi.fn(async (a) => a),
        deleteCustomAchievement: vi.fn(async () => undefined),
    },
}));
vi.mock('state/local/sync/gamificationSync', () => ({
    pushGamificationToServer: vi.fn(async () => null),
    mergeGamificationFromUser: vi.fn((local) => local),
}));
vi.mock('shared/utilities/confetti', () => ({ fireConfetti: vi.fn() }));

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

    it('reopening the same set and mode resumes its session', async () => {
        routeParams = { studysetId: SET_A, mode: 'flashcards' };
        const { unmount } = render(ui());
        await screen.findByText('Alpha one');
        useStudySessionStore.getState().updateCurrentCard(1);
        await screen.findByText('Alpha two');
        const session = useStudySessionStore.getState().activeSession;
        unmount();

        render(ui());
        expect(await screen.findByText('Alpha two')).toBeTruthy();
        expect(useStudySessionStore.getState().activeSession).toBe(session);
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

describe('StudyMode pending timers (#243)', () => {
    beforeEach(() => {
        cleanup();
        useStudySessionStore.setState({ activeSession: null });
        dueByStudyset = {};
        // Only timeouts: RTL and Matching's clock interval stay real.
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const startOn = (mode: string, currentCardIndex: number) => {
        useStudySessionStore.getState().startSession({
            studysetUUID: SET_A,
            mode,
            cards: sets[SET_A].cards,
            settings: {
                shuffleCards: false,
                timedMode: false,
                audioEnabled: false,
                autoAdvance: true,
                difficulty: 'medium',
                hideImages: false,
            },
            currentCardIndex,
        } as any);
        routeParams = { studysetId: SET_A, mode };
    };

    const totalSessions = () =>
        useStudySessionStore.getState().statistics.totalSessions;

    // Unmounts the first view, opens the next route, then lets the first
    // view's timer come due.
    const switchAndWait = (
        unmount: () => void,
        next: { studysetId: string; mode: string },
        delay: number
    ) => {
        unmount();
        routeParams = next;
        render(ui());
        const fresh = useStudySessionStore.getState().activeSession;
        const sessionsBefore = totalSessions();
        act(() => {
            vi.advanceTimersByTime(delay);
        });
        return { fresh, sessionsBefore };
    };

    const expectUntouched = (fresh: unknown, sessionsBefore: number) => {
        expect(useStudySessionStore.getState().activeSession).toBe(fresh);
        expect(totalSessions()).toBe(sessionsBefore);
    };

    const gradeLastFlashcard = async () => {
        startOn('flashcards', 2);
        const view = render(ui());
        await act(async () => {});
        fireEvent.click(screen.getByText('Alpha three'));
        await act(async () => {});
        fireEvent.click(screen.getByRole('button', { name: /ratings.good/ }));
        return view;
    };

    it('multiple-choice: answering the last card then opening flashcards leaves the new session alone', () => {
        startOn('multiple-choice', 2);
        const { unmount } = render(ui());
        fireEvent.click(screen.getByText('Alpha three def'));
        fireEvent.click(
            screen.getByRole('button', { name: 'actions.submitAnswer' })
        );

        const { fresh, sessionsBefore } = switchAndWait(
            unmount,
            { studysetId: SET_A, mode: 'flashcards' },
            2000
        );
        expectUntouched(fresh, sessionsBefore);
    });

    it('multiple-choice: answering a middle card then opening another set keeps its card index', () => {
        startOn('multiple-choice', 0);
        const { unmount } = render(ui());
        fireEvent.click(screen.getByText('Alpha one def'));
        fireEvent.click(
            screen.getByRole('button', { name: 'actions.submitAnswer' })
        );

        const { fresh, sessionsBefore } = switchAndWait(
            unmount,
            { studysetId: SET_B, mode: 'flashcards' },
            2000
        );
        expectUntouched(fresh, sessionsBefore);
        expect(
            useStudySessionStore.getState().activeSession?.currentCardIndex
        ).toBe(0);
    });

    it('type-write: answering the last card then opening another set leaves the new session alone', () => {
        startOn('type-write', 2);
        const { unmount } = render(ui());
        fireEvent.change(screen.getByRole('textbox'), {
            target: { value: 'Alpha three def' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'actions.submitAnswer' })
        );

        const { fresh, sessionsBefore } = switchAndWait(
            unmount,
            { studysetId: SET_B, mode: 'flashcards' },
            2500
        );
        expectUntouched(fresh, sessionsBefore);
    });

    it('flashcards: grading the last card then opening multiple choice leaves the new session alone', async () => {
        const { unmount } = await gradeLastFlashcard();

        const { fresh, sessionsBefore } = switchAndWait(
            unmount,
            { studysetId: SET_A, mode: 'multiple-choice' },
            500
        );
        expectUntouched(fresh, sessionsBefore);
    });

    it('matching: finishing the game then opening flashcards leaves the new session alone', () => {
        startOn('matching', 0);
        const { unmount } = render(ui());
        for (const term of ['Alpha one', 'Alpha two', 'Alpha three']) {
            fireEvent.click(screen.getByText(term));
            fireEvent.click(screen.getByText(`${term} def`));
        }

        const { fresh, sessionsBefore } = switchAndWait(
            unmount,
            { studysetId: SET_A, mode: 'flashcards' },
            1000
        );
        expectUntouched(fresh, sessionsBefore);
    });

    it("type-write: pressing Enter on the last card's feedback doesn't let the timer end the next session", () => {
        startOn('type-write', 2);
        render(uiWithKeys());
        fireEvent.change(screen.getByRole('textbox'), {
            target: { value: 'Alpha three def' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'actions.submitAnswer' })
        );
        const sessionsBeforeEnter = totalSessions();
        fireEvent.keyDown(document.body, { key: 'Enter' });

        const fresh = useStudySessionStore.getState().activeSession;
        const sessionsAfterEnd = totalSessions();
        expect(sessionsAfterEnd).toBe(sessionsBeforeEnter + 1);
        act(() => {
            vi.advanceTimersByTime(2500);
        });
        expectUntouched(fresh, sessionsAfterEnd);
    });

    it("flashcards: finishing manually right after grading the last card doesn't end the next session", async () => {
        await gradeLastFlashcard();
        const sessionsBeforeFinish = totalSessions();
        fireEvent.click(screen.getByRole('button', { name: 'actions.finish' }));

        const fresh = useStudySessionStore.getState().activeSession;
        const sessionsAfterEnd = totalSessions();
        expect(sessionsAfterEnd).toBe(sessionsBeforeFinish + 1);
        act(() => {
            vi.advanceTimersByTime(500);
        });
        expectUntouched(fresh, sessionsAfterEnd);
    });
});
