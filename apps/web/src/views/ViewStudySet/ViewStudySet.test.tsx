// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DEFAULT_USER_RESPONSE } from 'shared/constants';
import ViewStudySet from './ViewStudySet';

const muiTheme = createTheme();

const ID1 = '11111111-1111-4111-8111-111111111111';
const ID2 = '22222222-2222-4222-8222-222222222222';
const OWNER = '33333333-3333-4333-8333-333333333333';
const NOW = '2026-10-01T12:00:00.000Z';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

// The Save button on the fallback reads auth itself (#140).
let authenticated = false;
vi.mock('@logto/react', () => ({
    useLogto: () => ({ isAuthenticated: authenticated }),
}));

const toastMock = vi.hoisted(() => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    POSITION: { BOTTOM_LEFT: 'bottom-left' },
}));
vi.mock('react-toastify', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-toastify')>()),
    toast: toastMock,
}));

let routeId = ID1;
// Mocked like the other component tests until #102 moves them to MemoryRouter.
vi.mock('react-router-dom', () => {
    const FakeLink = ({
        to,
        children,
        ...rest
    }: {
        to: string;
        children: React.ReactNode;
    }) => (
        <a href={to} {...rest}>
            {children}
        </a>
    );
    return {
        useNavigate: () => vi.fn(),
        useParams: () => ({ id: routeId }),
        Link: FakeLink,
        NavLink: FakeLink,
    };
});

vi.mock('theme/useTheme', () => ({
    useTheme: () => ({ muiTheme }),
}));

vi.mock('./DownloadSetModal/DownloadSetModal', () => ({ default: () => null }));
vi.mock('./ManageCategoriesDialog/ManageCategoriesDialog', () => ({
    default: () => null,
}));
vi.mock('./NotificationsDialog/NotificationsDialog', () => ({
    default: () => null,
}));
vi.mock('./PrintDialog.tsx/PrintDialog', () => ({ default: () => null }));
vi.mock('./StudysetActions/StudysetActions', () => ({ default: () => null }));
vi.mock('./StudysetSettings/StudysetSettings', () => ({ default: () => null }));
vi.mock('./ViewStudySetCard', () => ({ default: () => null }));
vi.mock('./ViewStudySetCardGrid', () => ({ default: () => null }));
vi.mock('./ViewStudysetFilters/ViewStudysetFilters', () => ({
    default: () => null,
}));
vi.mock('./StudyModesGrid/StudyModesGrid', () => ({ default: () => null }));
vi.mock('./NotesDrawer/NotesDrawer', () => ({ default: () => null }));
vi.mock('./AIChatPanel/AIChatPanel', () => ({ default: () => null }));
vi.mock('components/ScrollToTopFab/ScrollToTopFab', () => ({
    default: () => null,
}));

const ownedSet = (
    studysetUUID: string,
    overrides: Record<string, unknown> = {}
) => ({
    cards: [],
    categories: [],
    createdAt: NOW,
    description: '',
    favorited: false,
    labels: [],
    lastViewed: NOW,
    metadata: {
        backgroundColorVisible: false,
        cardCountVisible: true,
        contentOnly: false,
        customLabelTerminology: '',
        customTerminology: '',
        labelTerminology: 'Card',
        notesDrawerInitial: 'open',
        notesDrawerPosition: 'right',
        publiclyViewable: false,
        terminology: 'Term/Definition',
        textColorVisible: false,
    },
    studysetUUID,
    title: 'Owned set',
    username: 'owner',
    userUUID: OWNER,
    uuid: studysetUUID,
    ...overrides,
});

const json = (status: number, body: unknown) =>
    Promise.resolve(
        new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
        })
    );

type GetStudysetHandler = (requestedId: string) => Promise<Response>;
let getStudyset: GetStudysetHandler;
type PublicHandler = () => Promise<Response>;
let getPublicStudyset: PublicHandler;
type UpdateHandler = (requestedId: string) => Promise<Response>;
let updateStudyset: UpdateHandler;

const publicSet = () => ({
    title: "Someone else's set",
    description: '',
    username: 'other',
    subject: null,
    publishedAt: null,
    updatedAt: NOW,
    cards: [{ term: 'Term', definition: 'Definition', files: [] }],
});

const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/users/get-user')) {
        return json(200, DEFAULT_USER_RESPONSE);
    }
    if (url.endsWith('/studysets/get-all-studysets')) {
        return json(200, { studysets: [] });
    }
    if (url.endsWith('/studysets/get-studyset')) {
        const { studysetUUID } = JSON.parse(String(init?.body ?? '{}'));
        return getStudyset(studysetUUID);
    }
    if (url.endsWith('/studysets/update-studyset')) {
        const { studysetUUID } = JSON.parse(String(init?.body ?? '{}'));
        return updateStudyset(studysetUUID);
    }
    if (url.endsWith('/studysets/copy-public-studyset')) {
        return json(200, {
            message: 'Successfully saved study set',
            studyset: {},
        });
    }
    if (url.includes('/public/studyset/')) {
        return getPublicStudyset();
    }
    return json(404, { message: 'not found' });
});

const callsTo = (suffix: string) =>
    fetchMock.mock.calls.filter(([input]) => String(input).endsWith(suffix));
const updateCalls = () => callsTo('/studysets/update-studyset');
const updateBody = (index: number) =>
    JSON.parse(String(updateCalls()[index]?.[1]?.body));
const publicCalls = () =>
    fetchMock.mock.calls.filter(([input]) =>
        String(input).includes('/public/studyset/')
    );

// staleTime mirrors state/queryClient.ts so cached data behaves as in the app.
// useGetStudyset sets its own retry, which beats retry: false here, so
// retryDelay: 0 keeps its retries fast.
const renderView = (seed?: (qc: QueryClient) => void) => {
    const qc = new QueryClient({
        defaultOptions: {
            queries: { retry: false, retryDelay: 0, staleTime: 1000 * 60 * 5 },
        },
    });
    seed?.(qc);
    const tree = () => (
        <ThemeProvider theme={muiTheme}>
            <QueryClientProvider client={qc}>
                <ViewStudySet />
            </QueryClientProvider>
        </ThemeProvider>
    );
    const result = render(tree());
    return { qc, container: result.container, rerender: () => result.rerender(tree()) };
};

beforeEach(() => {
    routeId = ID1;
    authenticated = false;
    toastMock.success.mockClear();
    toastMock.error.mockClear();
    getPublicStudyset = () => json(404, { message: 'not found' });
    updateStudyset = (id) =>
        json(200, { message: 'ok', studyset: ownedSet(id) });
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('ViewStudySet lastViewed', () => {
    it('does not call update-studyset when get-studyset fails with a server error', async () => {
        getStudyset = () => json(500, { message: 'boom' });
        const { qc, container } = renderView();

        await waitFor(() =>
            expect(callsTo('/studysets/get-studyset').length).toBeGreaterThan(0)
        );
        await waitFor(() =>
            expect(container.querySelector('.MuiSkeleton-root')).toBeNull()
        );
        expect(qc.getMutationCache().getAll()).toHaveLength(0);
        expect(updateCalls()).toHaveLength(0);
    });

    it('does not call update-studyset when get-studyset returns a stub without that id', async () => {
        getStudyset = () =>
            json(200, {
                studyset: { lastViewed: NOW, updatedAt: NOW, updatedBy: OWNER },
            });
        const { qc, container } = renderView();

        await waitFor(() =>
            expect(callsTo('/studysets/get-studyset').length).toBeGreaterThan(0)
        );
        await waitFor(() =>
            expect(container.querySelector('.MuiSkeleton-root')).toBeNull()
        );
        expect(qc.getMutationCache().getAll()).toHaveLength(0);
        expect(updateCalls()).toHaveLength(0);
    });

    // Regression guard for the happy path: green before and after the fix.
    it('records lastViewed once after your own set loads', async () => {
        getStudyset = () => json(200, { studyset: ownedSet(ID1) });
        renderView();

        await waitFor(() => expect(updateCalls()).toHaveLength(1));
        expect(updateBody(0)).toEqual({
            studysetUUID: ID1,
            updates: { lastViewed: expect.any(String) },
        });
        await waitFor(() => expect(callsTo('/studysets/get-studyset')).toHaveLength(2));
        expect(updateCalls()).toHaveLength(1);
    });

    // #218: lastViewed is a background write the user didn't ask for.
    it('does not toast when recording lastViewed fails', async () => {
        getStudyset = () => json(200, { studyset: ownedSet(ID1) });
        updateStudyset = () => json(500, { message: 'boom' });
        const { qc } = renderView();

        await waitFor(() => expect(updateCalls()).toHaveLength(1));
        await waitFor(() =>
            expect(qc.getMutationCache().getAll()[0]?.state.status).toBe(
                'error'
            )
        );
        expect(toastMock.error).not.toHaveBeenCalled();
    });

    it('does not trust a cached copy of a set that has since been deleted', async () => {
        getStudyset = () => json(404, { message: 'not found' });
        const { qc } = renderView((client) =>
            client.setQueryData(['studysets', ID1], { studyset: ownedSet(ID1) })
        );

        await waitFor(() =>
            expect(qc.getQueryState(['studysets', ID1])?.status).toBe('error')
        );
        await screen.findByText('publicView.unavailableTitle');
        expect(qc.getMutationCache().getAll()).toHaveLength(0);
        expect(updateCalls()).toHaveLength(0);
    });

    it('records lastViewed after refetching a fresh cached set', async () => {
        getStudyset = () => json(200, { studyset: ownedSet(ID1) });
        renderView((client) =>
            client.setQueryData(['studysets', ID1], { studyset: ownedSet(ID1) })
        );

        await waitFor(() => expect(updateCalls()).toHaveLength(1));
        expect(updateBody(0)).toEqual({
            studysetUUID: ID1,
            updates: { lastViewed: expect.any(String) },
        });
        expect(callsTo('/studysets/get-studyset').length).toBeGreaterThan(0);
    });

    it('records lastViewed again when the route switches to another owned set', async () => {
        getStudyset = (requestedId) => json(200, { studyset: ownedSet(requestedId) });
        const { rerender } = renderView();

        await waitFor(() => expect(updateCalls()).toHaveLength(1));
        routeId = ID2;
        rerender();

        await waitFor(() => expect(updateCalls()).toHaveLength(2));
        expect(updateBody(1)).toMatchObject({ studysetUUID: ID2 });
    });
});

describe('ViewStudySet for a set outside your library', () => {
    it("shows another user's public set read-only, with no writes and no sign-up CTA", async () => {
        getStudyset = () => json(404, { message: 'not found' });
        getPublicStudyset = () => json(200, { studyset: publicSet() });
        const { qc } = renderView();

        await screen.findByText("Someone else's set");

        expect(screen.queryByText('publicView.ctaButton')).toBeNull();
        expect(screen.queryByText('viewStudySet.backToStudySets')).toBeNull();
        expect(callsTo('/studysets/get-studyset')).toHaveLength(1);
        expect(updateCalls()).toHaveLength(0);
        expect(qc.getMutationCache().getAll()).toHaveLength(0);
    });

    // A prefix invalidation of ['studysets'] refetched the 404'd set, which
    // dropped the view out of this fallback and remounted the button.
    it("keeps the Saved state after saving someone else's set", async () => {
        authenticated = true;
        getStudyset = () => json(404, { message: 'not found' });
        getPublicStudyset = () => json(200, { studyset: publicSet() });
        renderView();

        fireEvent.click(
            await screen.findByRole('button', { name: 'save.action' })
        );
        const getsBefore = callsTo('/studysets/get-studyset').length;

        await screen.findByRole('button', { name: 'save.saved' });
        await waitFor(() =>
            expect(toastMock.success).toHaveBeenCalledWith('save.success', {
                position: 'bottom-left',
            })
        );
        expect(callsTo('/studysets/copy-public-studyset')).toHaveLength(1);
        expect(callsTo('/studysets/get-studyset')).toHaveLength(getsBefore);
        expect(screen.getByRole('button', { name: 'save.saved' })).toBeTruthy();
    });

    it('shows the unavailable state when the set is private or missing', async () => {
        getStudyset = () => json(404, { message: 'not found' });
        renderView();

        await screen.findByText('publicView.unavailableTitle');

        expect(updateCalls()).toHaveLength(0);
    });
});

describe('ViewStudySet for your own set', () => {
    it('renders the owner view and never calls the public endpoint', async () => {
        getStudyset = () => json(200, { studyset: ownedSet(ID1) });
        renderView();

        await screen.findByText('viewStudySet.backToStudySets');
        await waitFor(() => expect(updateCalls()).toHaveLength(1));
        expect(publicCalls()).toHaveLength(0);
    });

    it('does not fall back on a server error', async () => {
        getStudyset = () => json(500, { message: 'boom' });
        const { container } = renderView();

        await waitFor(() =>
            expect(callsTo('/studysets/get-studyset').length).toBeGreaterThan(0)
        );
        await waitFor(() =>
            expect(container.querySelector('.MuiSkeleton-root')).toBeNull()
        );
        expect(screen.getByText('viewStudySet.backToStudySets')).toBeTruthy();
        expect(publicCalls()).toHaveLength(0);
    });

    it('credits the creator', async () => {
        getStudyset = () => json(200, { studyset: ownedSet(ID1) });
        renderView();

        await screen.findByText('Owned set');
        expect(screen.getByText('viewStudySet.createdBy')).toBeTruthy();
    });

    // A set made by an account without a username stores null (#226).
    it('leaves out the credit when the set has no username', async () => {
        getStudyset = () =>
            json(200, { studyset: ownedSet(ID1, { username: null }) });
        renderView();

        await screen.findByText('Owned set');
        expect(screen.queryByText('viewStudySet.createdBy')).toBeNull();
    });
});
