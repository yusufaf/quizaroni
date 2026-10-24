import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import { TypographyStyle } from '@mui/material/styles';
import { Link } from 'react-router-dom';
import {
    MASONRY_COLUMN_GAP,
    MASONRY_GRID_COLUMNS,
} from 'shared/components/MasonryFeed/masonryLayout';

const TILE_RADIUS = '0.75rem';

// Spreading a whole theme variant doesn't type-check (it can carry @font-face).
const typeScale = ({
    fontFamily,
    fontSize,
    fontWeight,
    lineHeight,
    letterSpacing,
}: TypographyStyle) => ({
    fontFamily,
    fontSize,
    fontWeight,
    lineHeight,
    letterSpacing,
});

const tileEnter = keyframes({
    from: { opacity: 0, transform: 'translateY(0.75rem)' },
    to: { opacity: 1, transform: 'none' },
});

export const ForYouGrid = styled('ul')(({ theme }) => ({
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(16rem, 100%), 1fr))',
    // Fixed rows grow with the font-size setting (fontSize is 14 * scale).
    gridAutoRows: `${11 * (theme.typography.fontSize / 14)}rem`,
    gap: '1rem',
}));

export const VisuallyHidden = styled('span')({
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
    border: 0,
});

export const ForYouItem = styled('li')({
    minWidth: 0,
});

// Only tiles that are links lift on hover; a lift on anything else would
// suggest it can be clicked.
export const TileArticle = styled('article', {
    shouldForwardProp: (prop) => prop !== 'interactive',
})<{ interactive?: boolean }>(({ theme, interactive }) => ({
    position: 'relative',
    height: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    padding: '1rem 1.25rem',
    borderRadius: TILE_RADIUS,
    background: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow:
        theme.palette.mode === 'dark'
            ? '0 2px 8px rgba(0, 0, 0, 0.3)'
            : '0 2px 8px rgba(0, 0, 0, 0.06)',
    transition:
        'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s, border-color 0.3s, background 0.3s',
    // `backwards`, not `both`: a forwards fill would hold the last frame's
    // transform and override the hover lift.
    animation: `${tileEnter} 0.3s cubic-bezier(0.4, 0, 0.2, 1) backwards`,
    ...(interactive && {
        '&:hover': {
            transform: 'translateY(-4px)',
            borderColor: theme.palette.primary.main,
            background: theme.palette.action.hover,
            boxShadow:
                theme.palette.mode === 'dark'
                    ? '0 8px 24px rgba(0, 0, 0, 0.5)'
                    : '0 8px 24px rgba(0, 0, 0, 0.12)',
        },
    }),
    '@media (prefers-reduced-motion: reduce)': {
        animation: 'none',
        transition: 'none',
        ...(interactive && {
            '&:hover': {
                transform: 'none',
            },
        }),
    },
}));

export const TileEyebrow = styled('p')(({ theme }) => ({
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontSize: theme.typography.caption.fontSize,
    lineHeight: 1.5,
    fontWeight: 700,
    color: theme.palette.other.primaryText,
}));

export const TileTitle = styled('h3', {
    shouldForwardProp: (prop) => prop !== 'lines',
})<{ lines?: number }>(({ theme, lines = 2 }) => ({
    ...typeScale(theme.typography.h6),
    margin: 0,
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    overflowWrap: 'anywhere',
}));

// The ::after stretches the title link over the whole tile, and carries the
// focus ring so it outlines the tile rather than the title.
export const TileLink = styled(Link)(({ theme }) => ({
    color: theme.palette.text.primary,
    textDecoration: 'none',
    '&::after': {
        content: '""',
        position: 'absolute',
        inset: 0,
        borderRadius: TILE_RADIUS,
    },
    '&:hover': {
        color: theme.palette.other.primaryText,
    },
    '&:focus-visible': {
        outline: 'none',
    },
    '&:focus-visible::after': {
        outline: `2px solid ${theme.palette.other.primaryText}`,
        outlineOffset: '2px',
    },
}));

export const TileDescription = styled('p')(({ theme }) => ({
    ...typeScale(theme.typography.body2),
    margin: 0,
    color: theme.palette.text.secondary,
    display: '-webkit-box',
    WebkitLineClamp: 1,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    overflowWrap: 'anywhere',
}));

// A fixed-height tile fits a one-line title and two one-line previews.
export const TilePreviewList = styled('ul')({
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.125rem',
    minHeight: 0,
    overflow: 'hidden',
});

export const TilePreviewItem = styled('li', {
    shouldForwardProp: (prop) => prop !== 'lines',
})<{ lines?: number }>(({ theme, lines = 1 }) => ({
    ...typeScale(theme.typography.body2),
    color: theme.palette.text.secondary,
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    overflowWrap: 'anywhere',
}));

export const TilePreviewTerm = styled('span')(({ theme }) => ({
    color: theme.palette.text.primary,
    fontWeight: 600,
}));

export const TileMeta = styled('p')(({ theme }) => ({
    ...typeScale(theme.typography.caption),
    margin: 0,
    marginTop: 'auto',
    color: theme.palette.text.secondary,
}));

export const TileFooter = styled('div')({
    marginTop: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
    flexWrap: 'wrap',
    '& > p': {
        marginTop: 0,
    },
});

export const CardByline = styled('p')(({ theme }) => ({
    ...typeScale(theme.typography.caption),
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
    minWidth: 0,
    color: theme.palette.text.secondary,
    overflowWrap: 'anywhere',
}));

// Same columns as MasonryFeed, so the first page doesn't jump sideways when
// the skeletons are replaced.
export const CommunitySkeletonList = styled('ul')({
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gridTemplateColumns: MASONRY_GRID_COLUMNS,
    gap: MASONRY_COLUMN_GAP,
    alignItems: 'start',
});

const CHIP_FADE = '2rem';

// One row that scrolls sideways on phones and wraps from `sm` up. The fade
// sits only on a side with more chips (SubjectChips sets the data
// attributes), and scroll-padding keeps a tabbed-to chip clear of it.
export const SubjectChipGroup = styled('div')(({ theme }) => ({
    // Makes this the chips' offsetParent, so their offsetLeft is in its
    // scroll coordinates.
    position: 'relative',
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'nowrap',
    overflowX: 'auto',
    // Room for the focus ring, which the scroll box would clip otherwise.
    padding: '0.25rem',
    margin: '-0.25rem -0.25rem 1rem',
    scrollPaddingInline: CHIP_FADE,
    scrollbarWidth: 'thin',
    // Only on xs: a stale data-fade after a widen can't fade wrapped chips.
    [theme.breakpoints.down('sm')]: {
        '&[data-fade-end="true"]': {
            maskImage: `linear-gradient(to right, #000 calc(100% - ${CHIP_FADE}), transparent)`,
        },
        '&[data-fade-start="true"]': {
            maskImage: `linear-gradient(to left, #000 calc(100% - ${CHIP_FADE}), transparent)`,
        },
        '&[data-fade-start="true"][data-fade-end="true"]': {
            maskImage: `linear-gradient(to right, transparent, #000 ${CHIP_FADE}, #000 calc(100% - ${CHIP_FADE}), transparent)`,
        },
    },
    [theme.breakpoints.up('sm')]: {
        flexWrap: 'wrap',
        overflowX: 'visible',
    },
}));

// Pressed is a fill in primaryText with paper text: the pair themes.test.ts
// holds to 4.5:1 in both themes.
export const SubjectChip = styled('button')(({ theme }) => ({
    ...typeScale(theme.typography.body2),
    fontWeight: 600,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    minHeight: '2.25rem',
    padding: '0 0.875rem',
    borderRadius: '999px',
    border: `1px solid ${theme.palette.divider}`,
    background: 'transparent',
    color: theme.palette.text.primary,
    cursor: 'pointer',
    transition: 'background 0.2s, border-color 0.2s, color 0.2s',
    '&:hover': {
        borderColor: theme.palette.other.primaryText,
    },
    '&[aria-pressed="true"]': {
        background: theme.palette.other.primaryText,
        borderColor: theme.palette.other.primaryText,
        color: theme.palette.background.paper,
    },
    '&:focus-visible': {
        outline: `2px solid ${theme.palette.other.primaryText}`,
        outlineOffset: '2px',
    },
    '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
    },
}));
