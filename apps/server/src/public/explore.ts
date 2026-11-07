import {
    EXPLORE_QUERY_MAX_CHARS,
    type ExploreSetSummary,
    type ExploreSort,
    foldForSearch,
    isSubjectId,
    normalizeText,
    searchTokens,
    type SubjectId,
    truncateText,
} from '@quizaroni/shared-types';
import { and, desc, inArray, isNotNull, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { studyset } from '../db/schema';
import { LISTED } from '../studysets/gate';
import { toSummary } from './views';

// Ported from apps/api/utilities/exploreFeed.ts; the SQLite index replaces
// the DynamoDB public index and its cache.
export const EXPLORE_DEFAULT_LIMIT = 24;
export const EXPLORE_MAX_LIMIT = 48;
export const FEATURED_LIMIT = 6;
// Search reads more of the title and description than a card shows.
export const SEARCH_FIELD_CHARS = 1000;
export const EXPLORE_INDEX_MAX = 5000;
// A wider raw prefix, so normalizing whitespace before the 1000-char cut
// matches the Lambda while keeping the read bounded.
const SEARCH_PREFIX_CHARS = 4000;

export type CursorPosition = { publishedAt: string; studysetUUID: string };

export type ExploreFilters = {
    sort: ExploreSort;
    subject?: SubjectId;
    q?: string;
};

export type IndexEntry = CursorPosition & {
    subject: SubjectId;
    searchText: string;
};

const text = (value: unknown, maxChars: number): string =>
    truncateText(normalizeText(value), maxChars);

// Every word must appear somewhere in the folded text, in any order.
export const matchesTokens = (
    folded: string,
    tokens: readonly string[]
): boolean => tokens.every((token) => folded.includes(token));

// Newest first, then id descending. Plain comparisons, so sort and cursor
// agree.
export const comparePositions = (
    a: CursorPosition,
    b: CursorPosition
): number => {
    if (a.publishedAt !== b.publishedAt) {
        return a.publishedAt > b.publishedAt ? -1 : 1;
    }
    if (a.studysetUUID !== b.studysetUUID) {
        return a.studysetUUID > b.studysetUUID ? -1 : 1;
    }
    return 0;
};

export const filterKey = (filters: ExploreFilters): string =>
    `sort=${filters.sort}${filters.subject ? `&subject=${filters.subject}` : ''}${
        filters.q ? `&q=${encodeURIComponent(filters.q)}` : ''
    }`;

export function selectEntries<T extends IndexEntry>(
    entries: readonly T[],
    filters: ExploreFilters
): readonly T[] {
    const { subject, q } = filters;
    const tokens = q ? q.split(' ') : [];
    if (!subject && tokens.length === 0) return entries;
    return entries.filter(
        (entry) =>
            (!subject || entry.subject === subject) &&
            matchesTokens(entry.searchText, tokens)
    );
}

export const encodeCursor = (position: CursorPosition, key: string): string =>
    Buffer.from(
        JSON.stringify({
            v: 1,
            f: key,
            p: position.publishedAt,
            u: position.studysetUUID,
        })
    ).toString('base64url');

export type DecodedCursor =
    | { ok: true; position: CursorPosition }
    | { ok: false; reason: 'malformed' | 'filterMismatch' };

export function decodeCursor(cursor: string, key: string): DecodedCursor {
    let parsed: { v?: unknown; f?: unknown; p?: unknown; u?: unknown };
    try {
        const value: unknown = JSON.parse(
            Buffer.from(cursor, 'base64url').toString('utf8')
        );
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return { ok: false, reason: 'malformed' };
        }
        parsed = value;
    } catch {
        return { ok: false, reason: 'malformed' };
    }
    const { v, f, p, u } = parsed;
    if (
        v !== 1 ||
        typeof f !== 'string' ||
        typeof p !== 'string' ||
        typeof u !== 'string'
    ) {
        return { ok: false, reason: 'malformed' };
    }
    if (f !== key) return { ok: false, reason: 'filterMismatch' };
    return { ok: true, position: { publishedAt: p, studysetUUID: u } };
}

// Keyset pagination over entries already in feed order. A cursor past the
// end gives an empty last page, never page 1 again.
export function paginate<T extends CursorPosition>(
    entries: readonly T[],
    { after, limit }: { after?: CursorPosition; limit: number }
): { page: T[]; next: CursorPosition | null } {
    let start = 0;
    if (after) {
        const index = entries.findIndex(
            (entry) => comparePositions(entry, after) > 0
        );
        start = index === -1 ? entries.length : index;
    }
    const page = entries.slice(start, start + limit);
    const last = page.at(-1);
    const next =
        last && start + limit < entries.length
            ? { publishedAt: last.publishedAt, studysetUUID: last.studysetUUID }
            : null;
    return { page, next };
}

export type ParsedExploreQuery =
    | { ok: true; filters: ExploreFilters; limit: number; cursor?: string }
    | { ok: true; featured: true; limit: number }
    | { ok: false; message: string };

export function parseExploreQuery(
    params: Record<string, string | undefined> | undefined
): ParsedExploreQuery {
    const sort = params?.sort ?? 'newest';
    if (sort !== 'newest') {
        return { ok: false, message: `Unsupported sort: ${sort}` };
    }

    let limit = EXPLORE_DEFAULT_LIMIT;
    if (params?.limit !== undefined) {
        if (!/^\d+$/.test(params.limit) || Number(params.limit) < 1) {
            return { ok: false, message: 'limit must be a positive integer' };
        }
        limit = Math.min(Number(params.limit), EXPLORE_MAX_LIMIT);
    }

    const featured = params?.featured || undefined;
    if (featured !== undefined) {
        if (featured !== '1') {
            return { ok: false, message: 'Unsupported featured' };
        }
        if (
            params?.subject ||
            params?.cursor ||
            searchTokens(params?.q ?? '').length > 0
        ) {
            return {
                ok: false,
                message: 'featured does not combine with subject, q or cursor',
            };
        }
        return {
            ok: true,
            featured: true,
            limit: Math.min(
                params?.limit === undefined ? FEATURED_LIMIT : limit,
                FEATURED_LIMIT
            ),
        };
    }

    const subject = params?.subject || undefined;
    if (subject !== undefined && !isSubjectId(subject)) {
        return { ok: false, message: 'Unsupported subject' };
    }

    const rawQuery = params?.q?.trim() ?? '';
    if (Array.from(rawQuery).length > EXPLORE_QUERY_MAX_CHARS) {
        return { ok: false, message: 'q is too long' };
    }
    // A q with no words ('?!') is no q, so its filter key is unchanged.
    const q = searchTokens(rawQuery).join(' ');

    const cursor = params?.cursor || undefined;
    return {
        ok: true,
        filters: { sort, ...(subject ? { subject } : {}), ...(q ? { q } : {}) },
        limit,
        ...(cursor ? { cursor } : {}),
    };
}

// The listed sets in feed order, without their cards.
export function loadIndex(db: Db): { entries: IndexEntry[]; truncated: boolean } {
    const rows = db
        .select({
            studysetUUID: studyset.studysetUUID,
            publishedAt: studyset.publishedAt,
            subject: studyset.subject,
            title: sql<string>`substr(${studyset.title}, 1, ${SEARCH_PREFIX_CHARS})`,
            description: sql<string>`substr(${studyset.description}, 1, ${SEARCH_PREFIX_CHARS})`,
        })
        .from(studyset)
        .where(LISTED)
        .orderBy(desc(studyset.publishedAt), desc(studyset.studysetUUID))
        .limit(EXPLORE_INDEX_MAX + 1)
        .all();
    const truncated = rows.length > EXPLORE_INDEX_MAX;
    const entries = rows.slice(0, EXPLORE_INDEX_MAX).flatMap((row) =>
        row.publishedAt
            ? [
                  {
                      studysetUUID: row.studysetUUID,
                      publishedAt: row.publishedAt.toISOString(),
                      subject: isSubjectId(row.subject) ? row.subject : 'other',
                      searchText: foldForSearch(
                          `${text(row.title, SEARCH_FIELD_CHARS)} ${text(row.description, SEARCH_FIELD_CHARS)}`
                      ),
                  },
              ]
            : []
    );
    return { entries, truncated };
}

// Re-reads the page's sets under LISTED; one hidden or deleted in between
// (by the CLI or hand-run SQL) is skipped.
export function summariesFor(db: Db, ids: string[]): ExploreSetSummary[] {
    if (ids.length === 0) return [];
    const rows = db
        .select()
        .from(studyset)
        .where(and(inArray(studyset.studysetUUID, ids), LISTED))
        .all();
    const byId = new Map(rows.map((row) => [row.studysetUUID, row]));
    return ids.flatMap((id) => {
        const row = byId.get(id);
        return row ? [toSummary(row)] : [];
    });
}

export function featuredSummaries(db: Db, limit: number): ExploreSetSummary[] {
    return db
        .select()
        .from(studyset)
        .where(and(LISTED, isNotNull(studyset.featuredAt)))
        .orderBy(
            desc(studyset.featuredAt),
            desc(studyset.publishedAt),
            desc(studyset.studysetUUID)
        )
        .limit(limit)
        .all()
        .map(toSummary);
}
