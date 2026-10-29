import { isSubjectId } from '@quizaroni/shared-types';
import type { ExploreSetSummary, SubjectId } from '@quizaroni/shared-types';

// validate() returns the raw data when a response fails its schema, so a page
// may arrive without an items array; such a page is skipped rather than
// crashing the feed. The first copy of a set wins, so an item that moved
// between pages renders once, where it first appeared.
export const dedupeFeedItems = (
    pages: readonly { items?: unknown }[] | undefined
): ExploreSetSummary[] => {
    const seen = new Set<string>();
    const items: ExploreSetSummary[] = [];
    for (const page of pages ?? []) {
        if (!Array.isArray(page.items)) continue;
        for (const item of page.items as ExploreSetSummary[]) {
            if (seen.has(item.studysetUUID)) continue;
            seen.add(item.studysetUUID);
            items.push(item);
        }
    }
    return items;
};

// The status key for the Community feed: community.{showing|empty}, then
// Subject and Query for each filter in use, then Of when a total is known
// (#137). An empty feed has no total to show.
export const statusKey = (
    base: 'showing' | 'empty',
    {
        subject,
        query,
        total,
    }: { subject: boolean; query: boolean; total: boolean }
): string =>
    `community.${base}${subject ? 'Subject' : ''}${query ? 'Query' : ''}${
        base === 'showing' && total ? 'Of' : ''
    }`;

export const toSubjectId = (value: unknown): SubjectId =>
    isSubjectId(value) ? value : 'other';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

// "now", "5 minutes ago", "yesterday", "3 weeks ago"... in the UI language.
export const formatRelativeDate = (
    iso: string,
    now: Date,
    locale: string
): string => {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const seconds = Math.max(0, Math.floor((now.getTime() - then) / 1000));

    if (seconds < MINUTE) return rtf.format(0, 'second');
    if (seconds < HOUR)
        return rtf.format(-Math.floor(seconds / MINUTE), 'minute');
    if (seconds < DAY) return rtf.format(-Math.floor(seconds / HOUR), 'hour');
    if (seconds < WEEK) return rtf.format(-Math.floor(seconds / DAY), 'day');
    if (seconds < 5 * WEEK)
        return rtf.format(-Math.floor(seconds / WEEK), 'week');
    if (seconds < YEAR)
        return rtf.format(-Math.max(1, Math.floor(seconds / MONTH)), 'month');
    return rtf.format(-Math.floor(seconds / YEAR), 'year');
};
