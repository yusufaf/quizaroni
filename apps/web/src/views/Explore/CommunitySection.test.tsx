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
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
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

// The Save button reads auth itself (#140).
vi.mock('@logto/react', () => ({
    useLogto: () => ({ isAuthenticated: false }),
}));

const uuid = (n: number) =>
    `${String(n).padStart(8, '0')}-1111-4111-8111-111111111111`;

const item = (n: number, title = `Set ${n}`): ExploreSetSummary => ({
    studysetUUID: uuid(n),
    title,
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

// Replies keyed by the request's cursor ('' for the first page), prefixed
// with `subject:` when the request has one, and that with `q=<q>|` when it
// has a query. A function reply is called per request, so a test can change
// it between calls.
let replies: Record<string, Reply | (() => Reply)>;
const fetchMock = vi.fn(async (url: string) => {
    const params = new URL(url).searchParams;
    const cursor = params.get('cursor') ?? '';
    const subject = params.get('subject');
    const q = params.get('q');
    const base = subject ? `${subject}:${cursor}` : cursor;
    const entry = replies[q ? `q=${q}|${base}` : base];
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

// Shows the router's search string and steps back through its history.
const LocationProbe = () => {
    const { search } = useLocation();
    const navigate = useNavigate();
    return (
        <>
            <span data-testid="search">{search}</span>
            <button type="button" onClick={() => void navigate(-1)}>
                probe-back
            </button>
        </>
    );
};

const renderSection = (entry = '/explore') =>
    render(
        <ThemeProvider theme={createLightTheme()}>
            <QueryClientProvider
                client={
                    new QueryClient({
                        defaultOptions: { queries: { retry: false } },
                    })
                }
            >
                <MemoryRouter initialEntries={[entry]}>
                    <CommunitySection />
                    <LocationProbe />
                </MemoryRouter>
            </QueryClientProvider>
        </ThemeProvider>
    );

const feed = () => screen.getByRole('list', { name: 'community.heading' });
const titles = () =>
    screen.queryAllByRole('heading', { level: 3 }).map((h) => h.textContent);
const status = () => screen.getByRole('status').textContent;
const loadMore = () =>
    screen.queryByRole('button', { name: 'community.loadMore' });
const chips = () =>
    screen.getByRole('group', { name: 'community.subjectFilter' });
const chip = (name: string) => within(chips()).getByRole('button', { name });
const isPressed = (name: string) =>
    chip(name).getAttribute('aria-pressed') === 'true';
const search = () => screen.getByTestId('search').textContent;
const fetchedUrls = () => fetchMock.mock.calls.map(([url]) => url);
const subjectItems = (prefix: string, from: number, count: number) =>
    Array.from({ length: count }, (_, i) =>
        item(from + i, `${prefix} ${i + 1}`)
    );

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

    it.each([20, 24])(
        'drops a drifted count (total %i) while more remain, and on a capped last page',
        async (drifted) => {
            replies[''] = {
                items: range(1, 24),
                nextCursor: 'c1',
                total: drifted,
            };
            replies.c1 = { items: range(25, 26), nextCursor: null };
            renderSection();
            await waitFor(() =>
                expect(status()).toBe('community.showing {"shown":24}')
            );
            expect(loadMore()).toBeTruthy();
            fireEvent.click(loadMore()!);
            await waitFor(() =>
                expect(status()).toBe('community.showing {"shown":26}')
            );
        }
    );

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
        await waitFor(() => expect(status()).toBe('community.empty'));
        // Visible copy plus the status region.
        expect(screen.getAllByText('community.empty')).toHaveLength(2);
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

    describe('subject filter (#136)', () => {
        it('starts on All and fetches without a subject', async () => {
            renderSection();
            await waitFor(() => expect(titles()).toHaveLength(24));
            expect(isPressed('community.allSubjects')).toBe(true);
            expect(fetchedUrls()[0]).not.toContain('subject=');
        });

        it('filters by the clicked chip, in the URL, keeping focus on it', async () => {
            replies['math:'] = {
                items: subjectItems('Math', 100, 3),
                nextCursor: null,
                total: 3,
            };
            renderSection();
            await waitFor(() => expect(titles()).toHaveLength(24));

            const math = chip('common:subjects.math');
            math.focus();
            fireEvent.click(math);

            await waitFor(() =>
                expect(titles()).toEqual(['Math 1', 'Math 2', 'Math 3'])
            );
            expect(isPressed('common:subjects.math')).toBe(true);
            expect(isPressed('community.allSubjects')).toBe(false);
            expect(search()).toBe('?subject=math');
            expect(fetchedUrls().at(-1)).toContain('subject=math');
            expect(document.activeElement).toBe(math);
        });

        it('restores the subject from the URL on load', async () => {
            replies['science:'] = {
                items: subjectItems('Science', 100, 2),
                nextCursor: null,
                total: 2,
            };
            renderSection('/explore?subject=science');
            await waitFor(() =>
                expect(titles()).toEqual(['Science 1', 'Science 2'])
            );
            expect(isPressed('common:subjects.science')).toBe(true);
            expect(fetchedUrls()[0]).toContain('subject=science');
        });

        it('steps back to the previous subject', async () => {
            replies['math:'] = {
                items: subjectItems('Math', 100, 2),
                nextCursor: null,
                total: 2,
            };
            replies['science:'] = {
                items: subjectItems('Science', 200, 1),
                nextCursor: null,
                total: 1,
            };
            renderSection();
            await waitFor(() => expect(titles()).toHaveLength(24));

            fireEvent.click(chip('common:subjects.math'));
            await waitFor(() => expect(titles()).toEqual(['Math 1', 'Math 2']));
            fireEvent.click(chip('common:subjects.science'));
            await waitFor(() => expect(titles()).toEqual(['Science 1']));

            fireEvent.click(screen.getByRole('button', { name: 'probe-back' }));
            await waitFor(() => expect(titles()).toEqual(['Math 1', 'Math 2']));
            expect(isPressed('common:subjects.math')).toBe(true);
            expect(search()).toBe('?subject=math');
        });

        it('names the subject in the empty state, seen and announced', async () => {
            replies['law:'] = { items: [], nextCursor: null, total: 0 };
            renderSection();
            await waitFor(() => expect(titles()).toHaveLength(24));

            fireEvent.click(chip('common:subjects.law'));
            const text =
                'community.emptySubject {"subject":"common:subjects.law"}';
            await waitFor(() => expect(status()).toBe(text));
            expect(screen.getAllByText(text)).toHaveLength(2);
            expect(screen.queryByText('community.empty')).toBeNull();
            expect(chips()).toBeTruthy();
            expect(loadMore()).toBeNull();
        });

        it('reads a retired subject in the URL as Other, leaving the URL', async () => {
            replies['other:'] = {
                items: subjectItems('Other', 100, 1),
                nextCursor: null,
                total: 1,
            };
            renderSection('/explore?subject=astrology');
            await waitFor(() => expect(titles()).toEqual(['Other 1']));
            expect(isPressed('common:subjects.other')).toBe(true);
            expect(isPressed('community.allSubjects')).toBe(false);
            expect(fetchedUrls()[0]).toContain('subject=other');
            expect(fetchedUrls()[0]).not.toContain('astrology');
            expect(search()).toBe('?subject=astrology');

            fireEvent.click(chip('community.allSubjects'));
            await waitFor(() => expect(search()).toBe(''));
            expect(isPressed('community.allSubjects')).toBe(true);
        });

        it('loads more within the subject', async () => {
            replies['math:'] = {
                items: subjectItems('Math', 100, 24),
                nextCursor: 'm1',
                total: 26,
            };
            replies['math:m1'] = {
                items: subjectItems('More math', 200, 2),
                nextCursor: null,
                total: 26,
            };
            renderSection('/explore?subject=math');
            await waitFor(() => expect(titles()).toHaveLength(24));

            fireEvent.click(loadMore()!);
            await waitFor(() => expect(titles()).toHaveLength(26));
            const last = new URL(fetchedUrls().at(-1)!).searchParams;
            expect(last.get('subject')).toBe('math');
            expect(last.get('cursor')).toBe('m1');
        });

        it('keeps focus on the chip when a Load more lands after a switch', async () => {
            const page2 = deferred<ExploreFeedResponse>();
            replies.c1 = page2.promise;
            replies['math:'] = {
                items: subjectItems('Math', 100, 2),
                nextCursor: null,
                total: 2,
            };
            renderSection();
            await waitFor(() => expect(titles()).toHaveLength(24));

            fireEvent.click(loadMore()!);
            await waitFor(() =>
                expect(fetchedUrls().at(-1)).toContain('cursor=c1')
            );
            const math = chip('common:subjects.math');
            math.focus();
            fireEvent.click(math);
            await waitFor(() => expect(titles()).toEqual(['Math 1', 'Math 2']));

            page2.resolve({
                items: range(25, 30),
                nextCursor: null,
                total: 30,
            });
            await new Promise((r) => setTimeout(r, 0));
            expect(document.activeElement).toBe(math);
        });

        it('announces a switch between subjects with the same count', async () => {
            replies['math:'] = {
                items: subjectItems('Math', 100, 3),
                nextCursor: null,
                total: 3,
            };
            replies['science:'] = {
                items: subjectItems('Science', 200, 3),
                nextCursor: null,
                total: 3,
            };
            const showing = (id: string) =>
                `community.showingSubjectOf {"shown":3,"total":3,"subject":"common:subjects.${id}"}`;
            renderSection();
            await waitFor(() => expect(titles()).toHaveLength(24));

            fireEvent.click(chip('common:subjects.math'));
            await waitFor(() => expect(status()).toBe(showing('math')));
            fireEvent.click(chip('common:subjects.science'));
            await waitFor(() => expect(status()).toBe(showing('science')));
            // Math is cached now, so this switch has no loading step between.
            fireEvent.click(chip('common:subjects.math'));
            await waitFor(() => expect(status()).toBe(showing('math')));
        });
    });

    describe('search (#137)', () => {
        it('sends q and announces what it found', async () => {
            replies['q=bio|'] = {
                items: subjectItems('Bio', 100, 2),
                nextCursor: null,
                total: 2,
            };
            renderSection('/explore?q=bio');
            await waitFor(() => expect(titles()).toEqual(['Bio 1', 'Bio 2']));
            expect(fetchedUrls()[0]).toContain('q=bio');
            expect(status()).toBe(
                'community.showingQueryOf {"shown":2,"total":2,"query":"bio"}'
            );
        });

        it('announces no results through the status region', async () => {
            replies['q=bio|'] = { items: [], nextCursor: null, total: 0 };
            renderSection('/explore?q=bio');
            const text = 'community.emptyQuery {"query":"bio"}';
            await waitFor(() => expect(status()).toBe(text));
            const visible = screen
                .getAllByText(text)
                .find((el) => el.getAttribute('role') !== 'status');
            expect(visible?.getAttribute('aria-hidden')).toBe('true');
        });

        it('names the subject and the query together', async () => {
            replies['q=bio|math:'] = {
                items: subjectItems('Math bio', 100, 1),
                nextCursor: null,
                total: 1,
            };
            renderSection('/explore?subject=math&q=bio');
            await waitFor(() =>
                expect(status()).toBe(
                    'community.showingSubjectQueryOf {"shown":1,"total":1,"subject":"common:subjects.math","query":"bio"}'
                )
            );
        });

        it('says no sets in the subject match the query', async () => {
            replies['q=bio|math:'] = { items: [], nextCursor: null, total: 0 };
            renderSection('/explore?subject=math&q=bio');
            await waitFor(() =>
                expect(status()).toBe(
                    'community.emptySubjectQuery {"subject":"common:subjects.math","query":"bio"}'
                )
            );
        });

        it('treats a query with no words as no search', async () => {
            renderSection('/explore?q=%3F!');
            await waitFor(() => expect(titles()).toHaveLength(24));
            expect(fetchedUrls()[0]).not.toContain('q=');
            expect(status()).toBe(
                'community.showingOf {"shown":24,"total":30}'
            );
        });
    });
});
