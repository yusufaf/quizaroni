// @vitest-environment jsdom
import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
} from 'vite-plus/test';
import { render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type {
    ExploreFeedResponse,
    ExploreSetSummary,
} from '@quizaroni/shared-types';
import { createLightTheme } from 'shared/theme/themes';
import FeaturedSection from './FeaturedSection';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (k: string, o?: Record<string, unknown>) =>
            o ? `${k} ${JSON.stringify(o)}` : k,
        i18n: { language: 'en' },
    }),
}));

// The Save button reads auth itself (#140).
vi.mock('@logto/react', () => ({
    useLogto: () => ({ isAuthenticated: false }),
}));

const uuid = (n: number) =>
    `${String(n).padStart(8, '0')}-1111-4111-8111-111111111111`;

// No previews: a card's preview <li>s would mix with the row's items.
const item = (n: number): ExploreSetSummary => ({
    studysetUUID: uuid(n),
    title: `Set ${n}`,
    description: '',
    subject: 'math',
    termCount: 4,
    previews: [],
    username: 'turtles',
    publishedAt: '2026-10-01T00:00:00.000Z',
    updatedAt: null,
});

let reply: ExploreFeedResponse | { status: number } | { unexpected: true };
const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => {
    if ('status' in reply) {
        return {
            ok: false,
            status: reply.status,
            text: async () => '',
            json: async () => ({}),
        };
    }
    const body = reply;
    return {
        ok: true,
        status: 200,
        json: async () => body,
        text: async () => '',
    };
});

let queryClient: QueryClient;

const renderSection = () =>
    render(
        <ThemeProvider theme={createLightTheme()}>
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <FeaturedSection />
                </MemoryRouter>
            </QueryClientProvider>
        </ThemeProvider>
    );

// The section is also empty while loading, so wait for the query to settle
// before asserting that it stays empty.
const settled = () =>
    waitFor(() =>
        expect(['success', 'error']).toContain(
            queryClient.getQueryState(['explore-featured'])?.status
        )
    );

beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    reply = { items: [item(3), item(1), item(2)], nextCursor: null };
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('FeaturedSection', () => {
    it('renders the featured sets in server order under an H2', async () => {
        renderSection();

        const list = await screen.findByRole('list', {
            name: 'featured.heading',
        });
        expect(
            screen.getByRole('heading', { level: 2, name: 'featured.heading' })
        ).toBeTruthy();
        expect(
            within(list)
                .getAllByRole('heading', { level: 3 })
                .map((h) => h.textContent)
        ).toEqual(['Set 3', 'Set 1', 'Set 2']);
    });

    it('renders nothing when nothing is featured', async () => {
        reply = { items: [], nextCursor: null };
        const { container } = renderSection();

        await settled();

        expect(queryClient.getQueryState(['explore-featured'])?.status).toBe(
            'success'
        );
        expect(screen.queryByRole('heading')).toBeNull();
        expect(container.innerHTML).toBe('');
    });

    it('renders nothing when the request fails', async () => {
        reply = { status: 500 };
        const { container } = renderSection();

        await settled();

        expect(queryClient.getQueryState(['explore-featured'])?.status).toBe(
            'error'
        );
        expect(container.innerHTML).toBe('');
    });

    // validate() hands back the raw reply when it fails the schema.
    it('renders nothing for a reply without an items array', async () => {
        reply = { unexpected: true };
        const { container } = renderSection();

        await settled();

        expect(container.innerHTML).toBe('');
    });

    it('asks the public route for the featured row without credentials', async () => {
        renderSection();
        await settled();

        const [url, init] = fetchMock.mock.calls[0] ?? [];
        expect(url).toContain('/public/explore?featured=1');
        expect(init?.credentials).toBe('omit');
    });
});
