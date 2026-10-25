import { Box, Typography } from '@mui/material';
import { useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFeaturedSets } from 'state/api/exploreAPI';
import { dedupeFeedItems } from './communityFeed';
import ExploreSetCard from './ExploreSetCard';
import { FeaturedGrid, FeaturedItem } from './ExploreStyles';

/**
 * Curated public sets above the Community feed (#141). Nothing renders while
 * loading, on an error, or when nothing is featured: the row is a garnish,
 * and a skeleton would flash and vanish whenever nothing is featured.
 */
const FeaturedSection = () => {
    const { t } = useTranslation('explore');
    const headingId = useId();
    const { data } = useFeaturedSets();
    // Same guard as the feed: a reply that fails its schema renders nothing.
    const items = useMemo(() => dedupeFeedItems(data && [data]), [data]);

    if (items.length === 0) return null;

    return (
        <Box component="section" aria-labelledby={headingId} sx={{ mt: 5 }}>
            <Typography
                component="h2"
                variant="h5"
                id={headingId}
                sx={{ mb: 2 }}
            >
                {t('featured.heading')}
            </Typography>
            {/* role="list": WebKit drops list semantics, and with them the
                label, from a ul with list-style: none. */}
            <FeaturedGrid role="list" aria-labelledby={headingId}>
                {items.map((item) => (
                    <FeaturedItem key={item.studysetUUID}>
                        <ExploreSetCard item={item} />
                    </FeaturedItem>
                ))}
            </FeaturedGrid>
        </Box>
    );
};

export default FeaturedSection;
