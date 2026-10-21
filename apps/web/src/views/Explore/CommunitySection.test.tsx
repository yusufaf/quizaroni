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
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type {
    ExploreFeedResponse,
    ExploreSetSummary,
} from '@quizaroni/shared-types';
import { createLightTheme } from 'shared/theme/themes';
import CommunitySection from './CommunitySection';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (k: string, o?: Record<string, unknown>) =>
            o ? `${k} ${JSON.stringify(o)}` : k,
        i18n: { language: 'en' },
    }),
}));

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
    return { Link: FakeLink };
});

const uuid = (n: number) =>
    `${String(n).padStart(8, '0')}-1111-4111-8111-111111111111`;

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

const range = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => item(from + i));

type Reply =
    | ExploreFeedResponse
    | { status: number }
    | Promise<ExploreFeedResponse>;

// Replies keyed by the request's cursor ('' for the first page). A function
// reply is called per request, so a test can change it between calls.
let replies: Record<string, Reply | (() => Reply)>;
const fetchMock = vi.fn(async (url: string) => {
    const cursor = new URL(url).searchParams.get('cursor') ?? '';
    const entry = replies[cursor];
    const reply = await (typeof entry === 'function' ? entry() : entry);
    if (!reply) return new Promise<never>(() => {});
    if ('status' in reply) {
        return {
            ok: false,
            status: reply.status,
            text: async () => '',
            json: async () => ({}),
        };
    }
    return {
        ok: true,
        status: 200,
        json: async () => reply,
        text: async () => '',
    };
});

const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => {
        resolve = r;
    });
    return { promise, resolve };
};

const renderSection = () =>
    render(
        <ThemeProvider theme={createLightTheme()}>
            <QueryClientProvider
                client={
                    new QueryClient({
                        defaultOptions: { queries: { retry: false } },
                    })
                }
            >
                <CommunitySection />
            </QueryClientProvider>
        </ThemeProvider>
    );

const feed = () => screen.getByRole('list', { name: 'community.heading' });
const titles = () =>
    screen.queryAllByRole('heading', { level: 3 }).map((h) => h.textContent);
const status = () => screen.getByRole('status').textContent;
const loadMore = () =>
    screen.queryByRole('button', { name: 'community.loadMore' });

beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    replies = { '': { items: range(1, 24), nextCursor: 'c1', total: 30 } };
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('CommunitySection', () => {
    it('renders the first page as H3 links in data order', async () => {
        renderSection();
        await waitFor(() => expect(titles()).toHaveLength(24));
        expect(titles().slice(0, 3)).toEqual(['Set 1', 'Set 2', 'Set 3']);
        expect(
            within(feed()).getAllByRole('link')[0]?.getAttribute('href')
        ).toBe(`/view/${uuid(1)}`);
        expect(status()).toBe('community.showingOf {"shown":24,"total":30}');
        expect(fetchMock.mock.calls[0]?.[0]).toContain(
            '/public/explore?sort=newest&limit=24'
        );
    });

    it('marks the skeleton list busy while the first page loads', () => {
        replies = {};
        const { container } = renderSection();
        const skeletons = container.querySelector('ul[aria-busy="true"]')!;
        expect(skeletons).toBeTruthy();
        expect(
            Array.from(skeletons.children).every(
                (li) => li.getAttribute('aria-hidden') === 'true'
            )
        ).toBe(true);
        expect(status()).toBe('community.loading');
    });

    it('loads more, busy while fetching, and moves focus to the first new card', async () => {
        const page2 = deferred<ExploreFeedResponse>();
        replies.c1 = page2.promise;
        renderSection();
        await waitFor(() => expect(titles()).toHaveLength(24));

        loadMore()!.focus();
        fireEvent.click(loadMore()!);
        await waitFor(() =>
            expect(feed().getAttribute('aria-busy')).toBe('true')
        );
        expect(fetchMock.mock.calls.at(-1)?.[0]).toContain('cursor=c1');
        expect(loadMore()!.getAttribute('aria-disabled')).toBe('true');

        // The server's count grew since page 1; the last page still says 30 of 30.
        page2.resolve({ items: range(25, 30), nextCursor: null, total: 32 });
        await waitFor(() => expect(titles()).toHaveLength(30));
        expect(feed().getAttribute('aria-busy')).toBe('false');
        await waitFor(() =>
            expect(document.activeElement).toBe(
                screen.getByRole('link', { name: 'Set 25' })
            )
        );
        expect(loadMore()).toBeNull();
        expect(status()).toBe('community.showingOf {"shown":30,"total":30}');
    });

    it('renders a set repeated across pages once', async () => {
        replies.c1 = {
            items: [item(1), ...range(25, 29)],
            nextCursor: null,
            total: 29,
        };
        renderSection();
        await waitFor(() => expect(titles()).toHaveLength(24));
        fireEvent.click(loadMore()!);
        await waitFor(() => expect(titles()).toHaveLength(29));
        expect(titles().filter((title) => title === 'Set 1')).toHaveLength(1);
    });

    it('says "Showing X" when the response has no total', async () => {
        replies[''] = { items: range(1, 24), nextCursor: 'c1' };
        renderSection();
        await waitFor(() =>
            expect(status()).toBe('community.showing {"shown":24}')
        );
    });

    it('hides Load more on the last page', async () => {
        replies[''] = { items: range(1, 3), nextCursor: null, total: 3 };
        renderSection();
        await waitFor(() => expect(titles()).toHaveLength(3));
        expect(loadMore()).toBeNull();
    });

    it('shows an alert with Retry when the first page fails', async () => {
        let fail = true;
        replies[''] = () =>
            fail
                ? { status: 500 }
                : { items: range(1, 2), nextCursor: null, total: 2 };
        renderSection();
        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toContain('community.error');

        fail = false;
        fireEvent.click(
            within(alert).getByRole('button', { name: 'community.retry' })
        );
        await waitFor(() => expect(titles()).toHaveLength(2));
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('keeps the loaded feed when Load more fails', async () => {
        replies.c1 = { status: 500 };
        renderSection();
        await waitFor(() => expect(titles()).toHaveLength(24));

        loadMore()!.focus();
        fireEvent.click(loadMore()!);
        await waitFor(() => expect(status()).toBe('community.loadMoreError'));
        expect(titles()).toHaveLength(24);
        expect(screen.queryByRole('alert')).toBeNull();
        expect(loadMore()).toBeTruthy();
        expect(document.activeElement).toBe(loadMore());
    });

    it('says there are no public sets when the feed is empty', async () => {
        replies[''] = { items: [], nextCursor: null, total: 0 };
        renderSection();
        expect(await screen.findByText('community.empty')).toBeTruthy();
        expect(loadMore()).toBeNull();
    });

    it('keeps Load more when the first page came back empty but more exist', async () => {
        replies[''] = { items: [], nextCursor: 'c1', total: 2 };
        replies.c1 = { items: range(1, 2), nextCursor: null, total: 2 };
        renderSection();
        await waitFor(() => expect(loadMore()).toBeTruthy());
        expect(screen.queryByText('community.empty')).toBeNull();
        fireEvent.click(loadMore()!);
        await waitFor(() => expect(titles()).toEqual(['Set 1', 'Set 2']));
    });
});
