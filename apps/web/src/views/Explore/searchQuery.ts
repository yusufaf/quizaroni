import { EXPLORE_QUERY_MAX_CHARS, searchTokens } from '@quizaroni/shared-types';
import { QUERY_PARAMS } from 'shared/constants';

export const SEARCH_DEBOUNCE_MS = 300;

// Capped like the API's limit, by code point, so a hand-edited URL can't
// send a q the API refuses (which would leave the feed stuck on its error).
export const parseQueryParam = (value: string | null): string =>
    Array.from((value ?? '').trim())
        .slice(0, EXPLORE_QUERY_MAX_CHARS)
        .join('')
        .trim();

// The query that counts as a search. `?q=?!` has no words, so the API
// ignores it, and the page mustn't claim a search either. The field itself
// reads parseQueryParam, so what was typed stays in the box.
export const activeQuery = (value: string | null): string => {
    const query = parseQueryParam(value);
    return searchTokens(query).length > 0 ? query : '';
};

// A copy, so the subject survives and `prev` isn't mutated.
export const withQuery = (
    prev: URLSearchParams,
    query: string
): URLSearchParams => {
    const next = new URLSearchParams(prev);
    const trimmed = query.trim();
    if (trimmed) next.set(QUERY_PARAMS.EXPLORE_QUERY, trimmed);
    else next.delete(QUERY_PARAMS.EXPLORE_QUERY);
    return next;
};

// Marks the history entry the field pushed when a search started, so
// clearing that search can step back instead of adding a duplicate entry.
export const SEARCH_START_STATE = { exploreSearchStart: true } as const;

export const isSearchStart = (state: unknown): boolean =>
    typeof state === 'object' &&
    state !== null &&
    (state as { exploreSearchStart?: unknown }).exploreSearchStart === true;
