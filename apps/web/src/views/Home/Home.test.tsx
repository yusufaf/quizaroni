// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DEFAULT_USER_RESPONSE } from 'shared/constants';
import Home from './Home';

const muiTheme = createTheme();

const ID = '11111111-1111-4111-8111-111111111111';
const ID_B = '22222222-2222-4222-8222-222222222222';
const OWNER = '33333333-3333-4333-8333-333333333333';
const NOW = '2026-10-01T12:00:00.000Z';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

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
        Link: FakeLink,
        NavLink: FakeLink,
    };
});

vi.mock('theme/useTheme', () => ({
    useTheme: () => ({ muiTheme }),
}));

const validSet = {
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
    studysetUUID: ID,
    title: 'Biology Basics',
    username: 'owner',
    userUUID: OWNER,
};

const otherSet = { ...validSet, studysetUUID: ID_B, title: 'Chemistry Basics' };

const json = (status: number, body: unknown) =>
    Promise.resolve(
        new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
        })
    );

// The stub has no cards or title, so isCompleteStudyset drops it.
const stub = { lastViewed: NOW, updatedAt: NOW, updatedBy: OWNER };
let studysets: Array<Record<string, unknown>> = [];

const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/users/get-user')) {
        return json(200, DEFAULT_USER_RESPONSE);
    }
    if (url.endsWith('/studysets/update-studyset')) {
        const { studysetUUID, updates } = JSON.parse(String(init?.body));
        studysets = studysets.map((set) =>
            set.studysetUUID === studysetUUID ? { ...set, ...updates } : set
        );
        const studyset = studysets.find(
            (set) => set.studysetUUID === studysetUUID
        );
        return json(200, { message: 'ok', studyset });
    }
    if (url.endsWith('/studysets/get-all-studysets')) {
        return json(200, { studysets });
    }
    return json(404, { message: 'not found' });
});

const renderHome = () => {
    const qc = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    render(
        <ThemeProvider theme={muiTheme}>
            <QueryClientProvider client={qc}>
                <Home />
            </QueryClientProvider>
        </ThemeProvider>
    );
};

describe('Home', () => {
    beforeEach(() => {
        studysets = [validSet, stub];
        fetchMock.mockClear();
        vi.stubGlobal('fetch', fetchMock);
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        localStorage.clear();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it.each(['grid', 'html'])(
        'renders your sets when the list includes an item without cards (%s view)',
        async (view) => {
            localStorage.setItem('homeView', view);
            renderHome();

            expect(await screen.findByText('Biology Basics')).toBeTruthy();
        }
    );

    it('credits the creator on a grid card', async () => {
        localStorage.setItem('homeView', 'grid');
        renderHome();

        await screen.findByText('Biology Basics');
        expect(screen.getByText('Created by owner')).toBeTruthy();
    });

    // A set made by an account without a username stores null (#226).
    it('leaves out the credit when the set has no username', async () => {
        studysets = [{ ...validSet, username: null }, stub];
        localStorage.setItem('homeView', 'grid');
        renderHome();

        await screen.findByText('Biology Basics');
        expect(screen.queryByText(/Created by/)).toBeNull();
    });

    it('gives each grid card its own key', async () => {
        studysets = [validSet, otherSet, stub];
        localStorage.setItem('homeView', 'grid');
        renderHome();

        await screen.findByText('Chemistry Basics');
        const keyErrors = vi
            .mocked(console.error)
            .mock.calls.filter(([msg]) => String(msg).includes('key'));
        expect(keyErrors).toEqual([]);
    });

    // Favorite leaves the menu open, and its save refetches the list (#227).
    it('keeps the context menu on its set after the list refetches', async () => {
        studysets = [validSet, otherSet, stub];
        const open = vi.fn();
        vi.stubGlobal('open', open);
        localStorage.setItem('homeView', 'table');
        renderHome();

        const row = (await screen.findByText('Chemistry Basics')).closest(
            '[data-id]'
        )!;
        fireEvent.contextMenu(row);
        const menu = await screen.findByRole('menu');
        fireEvent.click(within(menu).getByText('Favorite'));

        expect(
            await within(screen.getByRole('menu')).findByText('Unfavorite')
        ).toBeTruthy();
        fireEvent.click(
            within(screen.getByRole('menu')).getByText('View in new tab')
        );
        expect(open).toHaveBeenCalledWith(
            expect.stringContaining(`/view/${ID_B}`)
        );
    });
});
