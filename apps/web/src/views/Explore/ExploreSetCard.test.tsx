// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vite-plus/test';
import { render, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import type { ExploreSetSummary } from '@quizaroni/shared-types';
import { createLightTheme } from 'shared/theme/themes';
import ExploreSetCard from './ExploreSetCard';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
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

const UUID = '11111111-1111-4111-8111-111111111111';

const item = (
    overrides: Partial<ExploreSetSummary> = {}
): ExploreSetSummary => ({
    studysetUUID: UUID,
    title: 'Cell biology',
    description: 'Organelles',
    subject: 'math',
    termCount: 12,
    previews: Array.from({ length: 5 }, (_, i) => ({
        term: `Term ${i}`,
        definition: `Def ${i}`,
    })),
    username: 'turtles',
    publishedAt: '2026-10-01T00:00:00.000Z',
    updatedAt: null,
    ...overrides,
});

const renderCard = (overrides: Partial<ExploreSetSummary> = {}) =>
    render(
        <ThemeProvider theme={createLightTheme()}>
            <ExploreSetCard item={item(overrides)} />
        </ThemeProvider>
    );

const allStyles = () =>
    Array.from(document.querySelectorAll('style'))
        .map(
            (style) =>
                style.textContent ||
                Array.from(style.sheet?.cssRules ?? [])
                    .map((rule) => rule.cssText)
                    .join('')
        )
        .join('');

const escapeRegExp = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('ExploreSetCard', () => {
    it('titles the card with an H3 link to the set', () => {
        renderCard();
        const heading = screen.getByRole('heading', { level: 3 });
        expect(
            within(heading)
                .getByRole('link', { name: 'Cell biology' })
                .getAttribute('href')
        ).toBe(`/view/${UUID}`);
    });

    it('shows the subject eyebrow, and other for a retired subject', () => {
        const { unmount } = renderCard();
        expect(screen.getByText('common:subjects.math')).toBeTruthy();
        unmount();
        renderCard({ subject: 'astrology' as ExploreSetSummary['subject'] });
        expect(screen.getByText('common:subjects.other')).toBeTruthy();
    });

    it('lists the term previews', () => {
        renderCard();
        const previews = screen.getByRole('list', { name: 'tile.previews' });
        expect(within(previews).getAllByRole('listitem')).toHaveLength(5);
    });

    it('shows the description when there are no previews', () => {
        renderCard({ previews: [] });
        expect(screen.queryByRole('list')).toBeNull();
        expect(screen.getByText('Organelles')).toBeTruthy();
    });

    it('credits the author, or Anonymous without a username', () => {
        const { unmount } = renderCard();
        expect(screen.getByText('@turtles')).toBeTruthy();
        unmount();
        renderCard({ username: null });
        expect(screen.getByText('community.anonymous')).toBeTruthy();
    });

    it('marks up the publish date as a time', () => {
        const { container } = renderCard();
        expect(container.querySelector('time')?.getAttribute('dateTime')).toBe(
            '2026-10-01T00:00:00.000Z'
        );
    });

    it('turns off motion under reduced motion', () => {
        const { container } = renderCard();
        const article = container.querySelector('article')!;
        const cls = Array.from(article.classList).find((c) =>
            c.startsWith('css-')
        );
        expect(cls).toBeTruthy();
        expect(allStyles()).toMatch(
            new RegExp(
                `@media \\(prefers-reduced-motion: ?reduce\\) ?\\{[^@]*\\.${escapeRegExp(cls!)} ?\\{[^}]*animation: ?none`
            )
        );
    });
});
