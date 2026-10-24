import { Box, Button, Skeleton, Typography } from '@mui/material';
import { useEffect, useId, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import type { SubjectId } from '@quizaroni/shared-types';
import MasonryFeed from 'shared/components/MasonryFeed/MasonryFeed';
import { QUERY_PARAMS } from 'shared/constants';
import { useExploreFeed } from 'state/api/exploreAPI';
import { dedupeFeedItems } from './communityFeed';
import ExploreSetCard from './ExploreSetCard';
import { CommunitySkeletonList, VisuallyHidden } from './ExploreStyles';
import SubjectChips from './SubjectChips';
import { parseSubjectParam, withSubject } from './subjectFilter';

// Varied heights hint at the masonry layout that replaces them.
const SKELETON_HEIGHTS = [176, 232, 200, 248, 184, 216];

const skeletonSx = {
    borderRadius: '0.75rem',
    '@media (prefers-reduced-motion: reduce)': {
        animation: 'none',
    },
};

const CommunitySection = () => {
    const { t } = useTranslation(['explore', 'common']);
    const headingId = useId();
    const headingRef = useRef<HTMLHeadingElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    // Index of the first card a Load more is expected to add, and the subject
    // it was asked under.
    const pendingFocusRef = useRef<{
        index: number;
        subject: SubjectId | null;
    } | null>(null);

    const [searchParams, setSearchParams] = useSearchParams();
    const subject = parseSubjectParam(
        searchParams.get(QUERY_PARAMS.EXPLORE_SUBJECT)
    );
    // Pushes, not replaces, so Back steps through earlier selections.
    const onSubjectChange = (next: SubjectId | null) =>
        setSearchParams((prev) => withSubject(prev, next));
    const subjectLabel = subject ? t(`common:subjects.${subject}`) : null;

    const {
        data,
        isError,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isFetchNextPageError,
    } = useExploreFeed({ subject });
    const items = useMemo(() => dedupeFeedItems(data?.pages), [data]);
    const shown = items.length;
    // No `total` means the server's read was capped and has no true count.
    // Otherwise the count is the newest page's cache size, which can drift
    // from what keyset paging serves. On the last page everything reachable
    // is shown ("30 of 32" with no Load more would promise sets the user
    // can't reach). While more remain, a total at or below `shown` has
    // drifted, and "24 of 24" next to Load more would be wrong too, so the
    // count is dropped.
    const lastTotal = data?.pages.at(-1)?.total;
    let total: number | undefined;
    if (lastTotal !== undefined) {
        if (!hasNextPage) total = shown;
        else if (lastTotal > shown) total = lastTotal;
    }

    // Focus moves to the first new card once its page lands. If nothing new
    // arrived and the button is gone, the heading takes focus instead of
    // dropping it on the body. A failed load leaves focus on the button.
    // A Load more from before a subject switch is dropped, so it can't pull
    // focus off the chip; this effect re-runs in the switch's own commit.
    useEffect(() => {
        const pending = pendingFocusRef.current;
        if (pending === null || isFetchingNextPage) return;
        pendingFocusRef.current = null;
        if (pending.subject !== subject) return;
        const target =
            listRef.current?.children[pending.index]?.querySelector<HTMLElement>(
                'a'
            );
        if (target) target.focus();
        else if (!hasNextPage && !isFetchNextPageError)
            headingRef.current?.focus();
    }, [shown, isFetchingNextPage, hasNextPage, isFetchNextPageError, subject]);

    const onLoadMore = () => {
        if (isFetchingNextPage) return;
        pendingFocusRef.current = { index: shown, subject };
        void fetchNextPage();
    };

    // Naming the subject means a switch between two subjects with the same
    // count still changes the status text, so it's announced.
    let showingText: string;
    if (subjectLabel) {
        showingText =
            typeof total === 'number'
                ? t('community.showingSubjectOf', {
                      shown,
                      total,
                      subject: subjectLabel,
                  })
                : t('community.showingSubject', {
                      shown,
                      subject: subjectLabel,
                  });
    } else {
        showingText =
            typeof total === 'number'
                ? t('community.showingOf', { shown, total })
                : t('community.showing', { shown });
    }
    const emptyText = subjectLabel
        ? t('community.emptySubject', { subject: subjectLabel })
        : t('community.empty');

    let status = '';
    if (data === undefined) status = isError ? '' : t('community.loading');
    else if (isFetchNextPageError) status = t('community.loadMoreError');
    else if (shown > 0 || hasNextPage) status = showingText;
    else status = emptyText;

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
            // The status region already announces this line.
            return (
                <Typography color="text.secondary" aria-hidden="true">
                    {emptyText}
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
            {/* Outside renderBody, so a focused chip survives every state. */}
            <SubjectChips value={subject} onChange={onSubjectChange} />
            {/* Mounted for the section's whole life so screen readers notice
                the text change. */}
            <VisuallyHidden role="status">{status}</VisuallyHidden>
            {renderBody()}
        </section>
    );
};

export default CommunitySection;
