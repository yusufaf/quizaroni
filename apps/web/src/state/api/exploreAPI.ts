import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { ExploreSort, SubjectId } from '@quizaroni/shared-types';
import { BASE_API_URL, fetchJson } from './awsAPI';
import { validate } from 'shared/validation';
import { ExploreFeedResponseSchema } from 'shared/schemas';

export const EXPLORE_PAGE_SIZE = 24;
// Matches the API's 60s cache: refetching sooner would only get the same page.
export const EXPLORE_STALE_TIME_MS = 60_000;

export const exploreFeedUrl = ({
    sort,
    subject,
    cursor,
    limit,
}: {
    sort: ExploreSort;
    subject: SubjectId | null;
    cursor: string | null;
    limit: number;
}): string => {
    const params = new URLSearchParams({ sort });
    if (subject) params.set('subject', subject);
    params.set('limit', String(limit));
    if (cursor) params.set('cursor', cursor);
    return `${BASE_API_URL}/public/explore?${params}`;
};

/**
 * Newest public sets for the Community feed, a page per Load more. With no
 * placeholderData, a subject not yet cached shows the skeleton rather than
 * the previous subject's cards.
 */
export const useExploreFeed = ({
    sort = 'newest',
    subject = null,
}: { sort?: ExploreSort; subject?: SubjectId | null } = {}) =>
    useInfiniteQuery({
        queryKey: ['explore-feed', { sort, subject }],
        queryFn: async ({ pageParam, signal }) =>
            validate({
                schema: ExploreFeedResponseSchema,
                data: await fetchJson(
                    exploreFeedUrl({
                        sort,
                        subject,
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

export const featuredSetsUrl = (): string =>
    `${BASE_API_URL}/public/explore?featured=1`;

/** The curated Featured row above the Community feed (#141). */
export const useFeaturedSets = () =>
    useQuery({
        queryKey: ['explore-featured'],
        queryFn: async ({ signal }) =>
            validate({
                schema: ExploreFeedResponseSchema,
                data: await fetchJson(featuredSetsUrl(), {
                    method: 'GET',
                    credentials: 'omit',
                    signal,
                }),
                type: 'response',
                context: 'ExploreFeatured',
            }),
        staleTime: EXPLORE_STALE_TIME_MS,
    });
