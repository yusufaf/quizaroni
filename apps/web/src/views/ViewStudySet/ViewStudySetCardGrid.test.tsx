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
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DEFAULT_USER_RESPONSE, EMPTY_CARD } from 'shared/constants';
import { useGetStudyset } from 'state/api/studysetsAPI';
import ViewStudySetCardGrid from './ViewStudySetCardGrid';

const muiTheme = createTheme();
const ID = '11111111-1111-4111-8111-111111111111';
const OWNER = '33333333-3333-4333-8333-333333333333';
const NOW = '2026-10-01T12:00:00.000Z';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

const toastMock = vi.hoisted(() => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    POSITION: { BOTTOM_LEFT: 'bottom-left' },
}));
vi.mock('react-toastify', () => ({ toast: toastMock }));

vi.mock('theme/useTheme', () => ({
    useTheme: () => ({ muiTheme }),
}));

const ownedSet = (studysetUUID: string) => ({
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
});

const json = (status: number, body: unknown) =>
    Promise.resolve(
        new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
        })
    );

const cardA = { ...EMPTY_CARD, cardUUID: 'card-a', term: 'A', definition: 'a' };
const cardB = { ...EMPTY_CARD, cardUUID: 'card-b', term: 'B', definition: 'b' };

// A fake server that applies each update only when the test releases it.
let server = { ...ownedSet(ID), cards: [cardA, cardB] };
let held: Array<() => void> = [];

const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/users/get-user')) {
        return json(200, DEFAULT_USER_RESPONSE);
    }
    if (url.endsWith('/studysets/get-all-studysets')) {
        return json(200, { studysets: [] });
    }
    if (url.endsWith('/studysets/get-studyset')) {
        return json(200, { studyset: structuredClone(server) });
    }
    if (url.endsWith('/studysets/update-studyset')) {
        const body = JSON.parse(String(init?.body));
        return new Promise<Response>((resolve) =>
            held.push(() => {
                server = { ...server, ...body.updates };
                void json(200, { message: 'ok', studyset: server }).then(
                    resolve
                );
            })
        );
    }
    return json(404, { message: 'not found' });
});

const updateCalls = () =>
    fetchMock.mock.calls.filter(([input]) =>
        String(input).endsWith('/studysets/update-studyset')
    );

const releaseNext = async () => {
    await waitFor(() => expect(held.length).toBeGreaterThan(0));
    held.shift()!();
};

const Harness = () => {
    const { data } = useGetStudyset({ studysetUUID: ID });
    const set = data?.studyset;
    return set ? (
        <>
            {set.cards.map((card, index) => (
                <ViewStudySetCardGrid
                    key={card.cardUUID}
                    card={card}
                    index={index}
                    selectedStudyset={set}
                />
            ))}
        </>
    ) : null;
};

const renderGrid = () => {
    const qc = new QueryClient({
        defaultOptions: {
            queries: { retry: false, retryDelay: 0, staleTime: 1000 * 60 * 5 },
            mutations: { retry: false },
        },
    });
    render(
        <ThemeProvider theme={muiTheme}>
            <QueryClientProvider client={qc}>
                <Harness />
            </QueryClientProvider>
        </ThemeProvider>
    );
};

const starButtons = () =>
    screen.findAllByRole('button', { name: 'Mark as important' });

beforeEach(() => {
    server = { ...ownedSet(ID), cards: [cardA, cardB] };
    held = [];
    fetchMock.mockClear();
    toastMock.error.mockClear();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

// #222: each click builds the whole cards array, so overlapping saves must
// build on each other instead of on the last server copy.
describe('ViewStudySetCardGrid important toggle', () => {
    it('fills the star as soon as you mark a card important', async () => {
        renderGrid();

        fireEvent.click((await starButtons())[0]!);
        await waitFor(() => expect(updateCalls()).toHaveLength(1));

        expect(await screen.findAllByTestId('StarIcon')).toHaveLength(1);
    });

    it('keeps both cards important when you mark them in quick succession', async () => {
        renderGrid();

        fireEvent.click((await starButtons())[0]!);
        await waitFor(() => expect(updateCalls()).toHaveLength(1));
        // Lets the click's render land, as it would before a person's next click.
        await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
        fireEvent.click((await starButtons())[1]!);
        await releaseNext();
        await releaseNext();

        await waitFor(() =>
            expect(server.cards.map((card) => card.important)).toEqual([
                true,
                true,
            ])
        );
        await waitFor(() =>
            expect(screen.getAllByTestId('StarIcon')).toHaveLength(2)
        );
        expect(toastMock.error).not.toHaveBeenCalled();
    });
});
