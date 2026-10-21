import { Box, Button, Skeleton, Typography } from '@mui/material';
import { useEffect, useId, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import MasonryFeed from 'shared/components/MasonryFeed/MasonryFeed';
import { useExploreFeed } from 'state/api/exploreAPI';
import { dedupeFeedItems } from './communityFeed';
import ExploreSetCard from './ExploreSetCard';
import { CommunitySkeletonList, VisuallyHidden } from './ExploreStyles';

// Varied heights hint at the masonry layout that replaces them.
const SKELETON_HEIGHTS = [176, 232, 200, 248, 184, 216];

const skeletonSx = {
    borderRadius: '0.75rem',
    '@media (prefers-reduced-motion: reduce)': {
        animation: 'none',
    },
};

const CommunitySection = () => {
    const { t } = useTranslation('explore');
    const headingId = useId();
    const headingRef = useRef<HTMLHeadingElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    // Index of the first card a Load more is expected to add.
    const pendingFocusRef = useRef<number | null>(null);

    const {
        data,
        isError,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isFetchNextPageError,
    } = useExploreFeed();
    const items = useMemo(() => dedupeFeedItems(data?.pages), [data]);
    const shown = items.length;
    // On the last page everything reachable is shown. The server's count can
    // be ahead (sets published since page 1 sort before the cursor), and
    // "30 of 32" with no Load more would promise sets the user can't reach.
    const total = hasNextPage ? data?.pages.at(-1)?.total : shown;

    // Focus moves to the first new card once its page lands. If nothing new
    // arrived and the button is gone, the heading takes focus instead of
    // dropping it on the body. A failed load leaves focus on the button.
    useEffect(() => {
        const pending = pendingFocusRef.current;
        if (pending === null || isFetchingNextPage) return;
        pendingFocusRef.current = null;
        const target =
            listRef.current?.children[pending]?.querySelector<HTMLElement>('a');
        if (target) target.focus();
        else if (!hasNextPage && !isFetchNextPageError)
            headingRef.current?.focus();
    }, [shown, isFetchingNextPage, hasNextPage, isFetchNextPageError]);

    const onLoadMore = () => {
        if (isFetchingNextPage) return;
        pendingFocusRef.current = shown;
        void fetchNextPage();
    };

    const showingText =
        typeof total === 'number'
            ? t('community.showingOf', { shown, total })
            : t('community.showing', { shown });

    let status = '';
    if (data === undefined) status = isError ? '' : t('community.loading');
    else if (isFetchNextPageError) status = t('community.loadMoreError');
    else if (shown > 0 || hasNextPage) status = showingText;

    const renderBody = () => {
        if (data === undefined && isError) {
            return (
                <Box
                    role="alert"
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        flexWrap: 'wrap',
                    }}
                >
                    <Typography>{t('community.error')}</Typography>
                    {/* Contained: the light theme's text buttons fail 4.5:1. */}
                    <Button variant="contained" onClick={() => void refetch()}>
                        {t('community.retry')}
                    </Button>
                </Box>
            );
        }
        if (data === undefined) {
            return (
                <CommunitySkeletonList role="list" aria-busy="true">
                    {SKELETON_HEIGHTS.map((height, i) => (
                        <li key={i} aria-hidden="true">
                            <Skeleton
                                variant="rectangular"
                                height={height}
                                sx={skeletonSx}
                            />
                        </li>
                    ))}
                </CommunitySkeletonList>
            );
        }
        if (shown === 0 && !hasNextPage) {
            return (
                <Typography color="text.secondary">
                    {t('community.empty')}
                </Typography>
            );
        }
        return (
            <>
                {/* The recheck can empty a page; with more to load, keep the
                    button rather than claiming there are no sets. */}
                {shown > 0 && (
                    <MasonryFeed
                        items={items}
                        getKey={(item) => item.studysetUUID}
                        renderItem={(item) => <ExploreSetCard item={item} />}
                        busy={isFetchingNextPage}
                        aria-labelledby={headingId}
                        listRef={listRef}
                    />
                )}
                {hasNextPage && (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            flexWrap: 'wrap',
                        }}
                    >
                        {/* aria-disabled, not disabled: disabling the focused
                            button would drop focus to the body mid-load. */}
                        <Button
                            variant="contained"
                            onClick={onLoadMore}
                            aria-disabled={isFetchingNextPage}
                        >
                            {t('community.loadMore')}
                        </Button>
                        {/* The status region already announces this line. */}
                        <Typography color="text.secondary" aria-hidden="true">
                            {showingText}
                        </Typography>
                    </Box>
                )}
            </>
        );
    };

    return (
        <section aria-labelledby={headingId}>
            <Typography
                component="h2"
                variant="h5"
                id={headingId}
                ref={headingRef}
                tabIndex={-1}
                sx={{ mb: 2, '&:focus': { outline: 'none' } }}
            >
                {t('community.heading')}
            </Typography>
            {/* Mounted for the section's whole life so screen readers notice
                the text change. */}
            <VisuallyHidden role="status">{status}</VisuallyHidden>
            {renderBody()}
        </section>
    );
};

export default CommunitySection;
