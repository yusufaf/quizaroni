import {
    buildTermPreviews,
    isSubjectId,
    normalizeText,
    truncateText,
} from '@quizaroni/shared-types';
import type { ExploreSetSummary, ExploreSort } from '@quizaroni/shared-types';
import { isPubliclyListed } from 'resources/dynamo/publicSharing';

export const EXPLORE_DEFAULT_LIMIT = 24;
export const EXPLORE_MAX_LIMIT = 48;
export const SUMMARY_PREVIEW_COUNT = 5;
export const SUMMARY_PREVIEW_CHARS = 120;
export const SUMMARY_DESCRIPTION_CHARS = 200;
export const SUMMARY_TITLE_CHARS = 200;

// A stored row as read from the public index. Nothing on it is validated on
// write, so every field is treated as unknown.
export type FeedSource = {
    PK?: unknown;
    SK?: unknown;
    SK2?: unknown;
    studysetUUID?: unknown;
    title?: unknown;
    description?: unknown;
    subject?: unknown;
    cards?: unknown;
    username?: unknown;
    publishedAt?: unknown;
    updatedAt?: unknown;
    metadata?: { publiclyViewable?: unknown };
    moderation?: { hiddenAt?: unknown };
};

// `key` stays server-side for the per-response recheck; only `summary` is sent.
export type FeedEntry = {
    key: { PK: string; SK: string };
    summary: ExploreSetSummary;
};

export type CursorPosition = { publishedAt: string; studysetUUID: string };

export type ExploreFilters = { sort: ExploreSort };

const text = (value: unknown, maxChars: number): string =>
    truncateText(normalizeText(value), maxChars);

/**
 * Builds a feed card from an explicit allowlist, field by field and never
 * spread, like toPublicStudyset. Previews are text only, so no file data,
 * notes or owner ids can reach the response.
 */
export const toSummary = (
    item: FeedSource & { studysetUUID: string; publishedAt: string }
): ExploreSetSummary => {
    const cards = Array.isArray(item.cards) ? item.cards : [];
    return {
        studysetUUID: item.studysetUUID,
        title: text(item.title, SUMMARY_TITLE_CHARS),
        description: text(item.description, SUMMARY_DESCRIPTION_CHARS),
        subject: isSubjectId(item.subject) ? item.subject : 'other',
        termCount: cards.filter((card) => typeof card === 'object' && card !== null).length,
        previews: buildTermPreviews(cards, SUMMARY_PREVIEW_COUNT, SUMMARY_PREVIEW_CHARS),
        username: typeof item.username === 'string' && item.username ? item.username : null,
        publishedAt: item.publishedAt,
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : null,
    };
};

// Legacy shares indexed by scripts/backfillPublicGsi.ts never went through
// the publish gate and have no publishedAt, so they stay out of the feed.
export const toFeedEntry = (item: FeedSource): FeedEntry | null => {
    const { PK, SK, studysetUUID, publishedAt } = item;
    if (!isPubliclyListed(item)) return null;
    if (typeof PK !== 'string' || typeof SK !== 'string') return null;
    if (typeof studysetUUID !== 'string' || typeof publishedAt !== 'string' || !publishedAt) {
        return null;
    }
    return { key: { PK, SK }, summary: toSummary({ ...item, studysetUUID, publishedAt }) };
};

// Newest first, then uuid descending. Plain `<`/`>` rather than localeCompare,
// so the sort and the cursor comparison agree on every runtime.
export const comparePositions = (a: CursorPosition, b: CursorPosition): number => {
    if (a.publishedAt !== b.publishedAt) return a.publishedAt > b.publishedAt ? -1 : 1;
    if (a.studysetUUID !== b.studysetUUID) return a.studysetUUID > b.studysetUUID ? -1 : 1;
    return 0;
};

export const compareEntries = (a: FeedEntry, b: FeedEntry): number =>
    comparePositions(a.summary, b.summary);

// Later filters (subject, q) are appended in a fixed order.
export const filterKey = (filters: ExploreFilters): string => `sort=${filters.sort}`;

export const encodeCursor = (position: CursorPosition, key: string): string =>
    Buffer.from(
        JSON.stringify({ v: 1, f: key, p: position.publishedAt, u: position.studysetUUID })
    ).toString('base64url');

export type DecodedCursor =
    | { ok: true; position: CursorPosition }
    | { ok: false; reason: 'malformed' | 'filterMismatch' };

export const decodeCursor = (cursor: string, key: string): DecodedCursor => {
    let parsed: { v?: unknown; f?: unknown; p?: unknown; u?: unknown };
    try {
        const value: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return { ok: false, reason: 'malformed' };
        }
        parsed = value;
    } catch {
        return { ok: false, reason: 'malformed' };
    }
    const { v, f, p, u } = parsed;
    if (v !== 1 || typeof f !== 'string' || typeof p !== 'string' || typeof u !== 'string') {
        return { ok: false, reason: 'malformed' };
    }
    if (f !== key) return { ok: false, reason: 'filterMismatch' };
    return { ok: true, position: { publishedAt: p, studysetUUID: u } };
};

/**
 * Keyset pagination over entries already sorted by compareEntries. The page
 * starts at the first entry strictly after `after`, so it still works when the
 * cursor's own entry has since left the list. A cursor past the end gives an
 * empty last page, never page 1 again.
 */
export const paginate = (
    entries: readonly FeedEntry[],
    { after, limit }: { after?: CursorPosition; limit: number }
): { page: FeedEntry[]; next: CursorPosition | null } => {
    let start = 0;
    if (after) {
        const index = entries.findIndex((entry) => comparePositions(entry.summary, after) > 0);
        start = index === -1 ? entries.length : index;
    }
    const page = entries.slice(start, start + limit);
    const last = page.at(-1);
    const next =
        last && start + limit < entries.length
            ? { publishedAt: last.summary.publishedAt, studysetUUID: last.summary.studysetUUID }
            : null;
    return { page, next };
};

export type ParsedExploreQuery =
    | { ok: true; filters: ExploreFilters; limit: number; cursor?: string }
    | { ok: false; message: string };

export const parseExploreQuery = (
    params: Record<string, string | undefined> | undefined
): ParsedExploreQuery => {
    const sort = params?.sort ?? 'newest';
    if (sort !== 'newest') return { ok: false, message: `Unsupported sort: ${sort}` };

    let limit = EXPLORE_DEFAULT_LIMIT;
    if (params?.limit !== undefined) {
        if (!/^\d+$/.test(params.limit) || Number(params.limit) < 1) {
            return { ok: false, message: 'limit must be a positive integer' };
        }
        limit = Math.min(Number(params.limit), EXPLORE_MAX_LIMIT);
    }

    const cursor = params?.cursor || undefined;
    return { ok: true, filters: { sort }, limit, ...(cursor ? { cursor } : {}) };
};
