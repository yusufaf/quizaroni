import { describe, it, expect } from 'vite-plus/test';
import type { ExploreSetSummary } from '@quizaroni/shared-types';
import {
    dedupeFeedItems,
    formatRelativeDate,
    statusKey,
    toSubjectId,
} from './communityFeed';

describe('statusKey (#137)', () => {
    it.each([
        [{ subject: false, query: false, total: false }, 'community.showing'],
        [{ subject: false, query: false, total: true }, 'community.showingOf'],
        [
            { subject: true, query: false, total: true },
            'community.showingSubjectOf',
        ],
        [
            { subject: false, query: true, total: false },
            'community.showingQuery',
        ],
        [
            { subject: false, query: true, total: true },
            'community.showingQueryOf',
        ],
        [
            { subject: true, query: true, total: false },
            'community.showingSubjectQuery',
        ],
        [
            { subject: true, query: true, total: true },
            'community.showingSubjectQueryOf',
        ],
    ])('builds the showing key for %p', (flags, key) => {
        expect(statusKey('showing', flags)).toBe(key);
    });

    it.each([
        [{ subject: false, query: false }, 'community.empty'],
        [{ subject: true, query: false }, 'community.emptySubject'],
        [{ subject: false, query: true }, 'community.emptyQuery'],
        [{ subject: true, query: true }, 'community.emptySubjectQuery'],
    ])('builds the empty key for %p, ignoring total', (flags, key) => {
        expect(statusKey('empty', { ...flags, total: true })).toBe(key);
        expect(statusKey('empty', { ...flags, total: false })).toBe(key);
    });
});

const item = (id: string): ExploreSetSummary => ({
    studysetUUID: id,
    title: `Set ${id}`,
    description: '',
    subject: 'math',
    termCount: 4,
    previews: [],
    username: null,
    publishedAt: '2026-10-01T00:00:00.000Z',
    updatedAt: null,
});

describe('dedupeFeedItems', () => {
    it('flattens pages in order and keeps the first copy of a set', () => {
        const pages = [
            { items: [item('a'), item('b')] },
            { items: [item('b'), item('c')] },
        ];
        expect(dedupeFeedItems(pages).map((i) => i.studysetUUID)).toEqual([
            'a',
            'b',
            'c',
        ]);
    });

    it('skips a page without an items array', () => {
        expect(
            dedupeFeedItems([{ items: [item('a')] }, {}, { items: 'nope' }])
        ).toHaveLength(1);
        expect(dedupeFeedItems(undefined)).toEqual([]);
    });
});

describe('toSubjectId', () => {
    it('maps an unknown or retired subject to other', () => {
        expect(toSubjectId('math')).toBe('math');
        expect(toSubjectId('astrology')).toBe('other');
        expect(toSubjectId(undefined)).toBe('other');
    });
});

describe('formatRelativeDate', () => {
    const now = new Date('2026-10-21T12:00:00.000Z');
    const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
    const MIN = 60_000;
    const HOUR = 60 * MIN;
    const DAY = 24 * HOUR;

    it.each([
        [30_000, 'now'],
        [2 * HOUR, '2 hours ago'],
        [DAY, 'yesterday'],
        [3 * 7 * DAY, '3 weeks ago'],
        [61 * DAY, '2 months ago'],
        [2 * 366 * DAY, '2 years ago'],
    ])('formats %i ms ago as %s', (ms, expected) => {
        expect(formatRelativeDate(ago(ms), now, 'en')).toBe(expected);
    });

    it('returns an empty string for an invalid date', () => {
        expect(formatRelativeDate('not a date', now, 'en')).toBe('');
    });
});
