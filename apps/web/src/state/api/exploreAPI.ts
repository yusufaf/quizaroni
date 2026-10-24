import { useInfiniteQuery } from '@tanstack/react-query';
import type { ExploreSort } from '@quizaroni/shared-types';
import { BASE_API_URL, fetchJson } from './awsAPI';
import { validate } from 'shared/validation';
import { ExploreFeedResponseSchema } from 'shared/schemas';

export const EXPLORE_PAGE_SIZE = 24;
// Matches the API's 60s cache: refetching sooner would only get the same page.
export const EXPLORE_STALE_TIME_MS = 60_000;

export const exploreFeedUrl = ({
    sort,
    cursor,
    limit,
}: {
    sort: ExploreSort;
    cursor: string | null;
    limit: number;
}): string => {
    const params = new URLSearchParams({ sort, limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return `${BASE_API_URL}/public/explore?${params}`;
};

/** Newest public sets for the Community feed, a page per Load more. */
export const useExploreFeed = ({
    sort = 'newest',
}: { sort?: ExploreSort } = {}) =>
    useInfiniteQuery({
        queryKey: ['explore-feed', { sort }],
        queryFn: async ({ pageParam, signal }) =>
            validate({
                schema: ExploreFeedResponseSchema,
                data: await fetchJson(
                    exploreFeedUrl({
                        sort,
                        cursor: pageParam,
                        limit: EXPLORE_PAGE_SIZE,
                    }),
                    // A public route: no token, no cookies.
                    { method: 'GET', credentials: 'omit', signal }
                ),
                type: 'response',
                context: 'ExploreFeed',
            }),
        initialPageParam: null as string | null,
        getNextPageParam: (last) => last.nextCursor ?? null,
        staleTime: EXPLORE_STALE_TIME_MS,
    });
