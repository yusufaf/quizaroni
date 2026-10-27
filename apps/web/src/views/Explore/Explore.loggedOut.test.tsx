// @vitest-environment jsdom
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type {
    ExploreFeedResponse,
    ExploreSetSummary,
} from '@quizaroni/shared-types';
import { setAccessTokenGetter } from 'state/api/awsAPI';
import { createLightTheme } from 'shared/theme/themes';
import Explore from './Explore';

// #139: Explore for a logged-out visitor. Featured and Community are real
// here (Explore.test.tsx stubs them), so their requests are checked too.

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (k: string, o?: Record<string, unknown>) =>
            o ? `${k} ${JSON.stringify(o)}` : k,
        i18n: { language: 'en' },
    }),
}));

const tokenSpy = vi.fn(async () => 'token');
const logto = {
    isAuthenticated: false,
    isLoading: false,
    getAccessToken: tokenSpy,
};
vi.mock('@logto/react', () => ({ useLogto: () => logto }));

const dueSpy = vi.fn();
const lastStudiedSpy = vi.fn();
vi.mock('state/local/repositories', () => ({
    cardProgressRepository: {
        getDueCountsBySet: (...args: unknown[]) => dueSpy(...args),
        getLastStudiedBySet: (...args: unknown[]) => lastStudiedSpy(...args),
    },
}));

const item = (n: number, title: string): ExploreSetSummary => ({
    studysetUUID: `${String(n).padStart(8, '0')}-1111-4111-8111-111111111111`,
    title,
    description: '',
    subject: 'math',
    termCount: 4,
    previews: [],
    username: 'turtles',
    publishedAt: '2026-10-01T00:00:00.000Z',
    updatedAt: null,
});

const reply = (body: ExploreFeedResponse) => ({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => '',
});

const fetchMock = vi.fn(async (url: string, _init?: RequestInit) =>
    url.includes('featured=1')
        ? reply({
              items: [item(1, 'Featured set')],
              nextCursor: null,
              featured: true,
          })
        : reply({ items: [item(2, 'Community set')], nextCursor: null })
);

const StateProbe = () => (
    <span data-testid="state">{JSON.stringify(useLocation().state)}</span>
);

const renderExplore = () =>
    render(
        <ThemeProvider theme={createLightTheme()}>
            <QueryClientProvider
                client={
                    new QueryClient({
                        defaultOptions: { queries: { retry: false } },
                    })
                }
            >
                <MemoryRouter initialEntries={['/explore?subject=biology']}>
                    <Routes>
                        <Route path="/explore" element={<Explore />} />
                        <Route path="/signUp" element={<StateProbe />} />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>
        </ThemeProvider>
    );

const heading = (name: string) => screen.queryByRole('heading', { name });

beforeEach(() => {
    logto.isAuthenticated = false;
    logto.isLoading = false;
    tokenSpy.mockClear();
    dueSpy.mockReset().mockResolvedValue(new Map());
    lastStudiedSpy.mockReset().mockResolvedValue(new Map());
    fetchMock.mockClear();
    // The raw spy, not App.tsx's guarded getter: any authenticated request
    // would call it.
    setAccessTokenGetter(tokenSpy);
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('Explore, logged out', () => {
    it('makes only unauthenticated public requests', async () => {
        renderExplore();

        await screen.findByText('Featured set');
        await screen.findByText('Community set');

        expect(tokenSpy).not.toHaveBeenCalled();
        expect(fetchMock).toHaveBeenCalled();
        for (const [url, init] of fetchMock.mock.calls) {
            expect(url).toContain('/public/explore');
            expect(url).not.toContain('get-all-studysets');
            expect(init?.method).toBe('GET');
            expect(init?.credentials).toBe('omit');
            expect(new Headers(init?.headers).has('authorization')).toBe(false);
        }
        expect(dueSpy).not.toHaveBeenCalled();
        expect(lastStudiedSpy).not.toHaveBeenCalled();
    });

    it('hides For you and shows the sign-up banner, Featured and Community', async () => {
        renderExplore();

        expect(
            await screen.findByRole('heading', {
                level: 2,
                name: 'featured.heading',
            })
        ).toBeTruthy();
        expect(heading('signUpBanner.heading')).toBeTruthy();
        expect(heading('community.heading')).toBeTruthy();
        expect(heading('forYou.heading')).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'empty.createSet' })
        ).toBeNull();
    });

    it('keeps a return path on the banner link', async () => {
        renderExplore();

        const link = screen.getByRole('link', { name: 'signUpBanner.cta' });
        expect(link.getAttribute('href')).toBe('/signUp');
        fireEvent.click(link);

        expect((await screen.findByTestId('state')).textContent).toBe(
            '{"from":"/explore?subject=biology"}'
        );
    });

    it('shows neither the banner nor For you while Logto is loading', async () => {
        logto.isLoading = true;
        renderExplore();

        await screen.findByText('Community set');
        expect(heading('signUpBanner.heading')).toBeNull();
        expect(heading('forYou.heading')).toBeNull();
        expect(heading('community.heading')).toBeTruthy();
    });
});
