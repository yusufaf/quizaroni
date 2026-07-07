import {
    Button,
    Card,
    Chip,
    DialogContent,
    FormControl,
    Paper,
    Tab,
    Tabs,
    Typography,
} from '@mui/material';
import { styled } from '@mui/system';
import {
    BasePage,
    BoldTypography,
    SimpleFlexContainer,
    SpacedFlexContainer,
} from 'styles/AppStyles';

export const ViewStudysetPage = styled(BasePage, {
    shouldForwardProp: (prop) => prop !== 'viewMode',
})<{
    viewMode?: 'list' | 'grid';
}>(({ viewMode = 'list', theme }) => ({
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: viewMode === 'grid' ? '1.5rem' : '2rem',
    // Fluid horizontal padding: comfortable on wide screens, tight on small
    // ones. Overridden by the notes-drawer padding in ViewStudySet.tsx.
    padding: '0 1rem 2rem 1rem',
    [theme.breakpoints.up('sm')]: {
        padding: '0 2rem 2rem 2rem',
    },
    [theme.breakpoints.up('lg')]: {
        padding: '0 clamp(2rem, 8vw, 8rem) 2rem clamp(2rem, 8vw, 8rem)',
    },
    position: 'relative',
}));

export const ViewFlashsetPaper = styled(Paper)({});

export const ViewStudysetContainer = styled('div')({
    gridRow: '1',
    minHeight: '20rem',
    padding: '1rem 1.25rem',
    borderRadius: '0.75rem',
});

export const ViewStudysetHeader = styled('div')(({ theme }) => ({
    display: 'grid',
    // Stack the info and study-modes sections on narrow screens; place them
    // side by side once there is room so neither gets squeezed.
    gridTemplateColumns: '1fr',
    height: '100%',
    gap: '1.5rem',
    [theme.breakpoints.up('md')]: {
        gridTemplateColumns: 'minmax(18rem, 26rem) 1fr',
        gap: '1rem',
    },
}));

export const StudysetInfo = styled('div')(({ theme }) => ({
    height: '100%',
    overflowY: 'auto',
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    position: 'relative',
    // Divider sits below the info section when stacked, and to its right
    // once the layout goes side by side.
    paddingBottom: '1.25rem',
    '&::after': {
        content: '""',
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: '100%',
        height: '0.125rem',
        background: `linear-gradient(
            to right,
            transparent 0%,
            ${theme.palette.divider} 20%,
            ${theme.palette.divider} 80%,
            transparent 100%
        )`,
        borderRadius: '0.125rem',
    },
    [theme.breakpoints.up('md')]: {
        paddingRight: '1.25rem',
        paddingBottom: 0,
        '&::after': {
            left: 'auto',
            right: 0,
            top: '10%',
            bottom: 'auto',
            height: '80%',
            width: '0.125rem',
            background: `linear-gradient(
                to bottom,
                transparent 0%,
                ${theme.palette.divider} 20%,
                ${theme.palette.divider} 80%,
                transparent 100%
            )`,
        },
    },
}));

export const StudysetDescription = styled(Typography)(({ theme }) => ({
    flex: 1,
    margin: '1rem 0',
    maxHeight: '10rem',
    overflowY: 'auto',
    overflowX: 'hidden',
    '&::-webkit-scrollbar': {
        width: '0.5rem',
    },
    '&::-webkit-scrollbar-thumb': {
        background: theme.palette.grey[500],
        borderRadius: '0.25rem',
    },
}));

export const StudyModesSection = styled('section')(({ theme }) => ({
    paddingLeft: 0,
    [theme.breakpoints.up('md')]: {
        paddingLeft: '1.25rem',
    },
}));

export const StudyModeGrid = styled('div')(({ theme }) => ({
    height: '100%',
    display: 'grid',
    // Two columns on phones, three from `sm` up. `minmax(0, 1fr)` lets tiles
    // shrink so labels wrap instead of clipping against the tile edge.
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gridAutoRows: '1fr',
    gap: '0.75rem',
    [theme.breakpoints.up('sm')]: {
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    },
}));

export const StudyModePaper = styled(Paper)(({ theme }) => ({
    fontSize: '1rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0.75rem',
    userSelect: 'none',
    cursor: 'pointer',
    minHeight: '6rem',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow:
        theme.palette.mode === 'dark'
            ? 'none'
            : '0 0.125rem 0.5rem rgba(0, 0, 0, 0.06)',
    border:
        theme.palette.mode === 'light'
            ? '1px solid rgba(0, 0, 0, 0.08)'
            : 'none',
    '&:hover': {
        background: theme.palette.action.hover,
        transform: 'translateY(-0.25rem)',
        boxShadow:
            theme.palette.mode === 'dark'
                ? 'none'
                : '0 0.375rem 1rem rgba(255, 160, 0, 0.12), 0 0.125rem 0.5rem rgba(0, 0, 0, 0.06)',
    },
}));

export const StudyModeTitle = styled(BoldTypography)({
    fontSize: '0.875rem',
    width: '100%',
    textAlign: 'center',
    lineHeight: 1.2,
    // Let long labels wrap and break instead of clipping against the tile edge.
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
    hyphens: 'auto',
});

export const CategoryTab = styled(Tab)({
    textTransform: 'none',
});

export const CategoryTabs = styled(Tabs)({
    maxWidth: '25rem',
    minWidth: 0,
});

export const CardFiltersContainer = styled(SpacedFlexContainer)({
    display: 'flex',
    alignItems: 'center',
    // Wrap the filter groups onto a second row rather than overflowing when
    // there isn't enough horizontal space (e.g. drawer open / small screens).
    flexWrap: 'wrap',
    gap: '0.75rem 1rem',
});

export const SortCardsDropdown = styled(FormControl)({
    width: '14rem',
});

/* Actions Section */
export const ActionButtonsRow = styled(Paper)(({ theme }) => ({
    display: 'flex',
    gap: '0.5rem',
    borderRadius: '0.75rem',
    paddingLeft: '0.5rem',
    boxShadow:
        theme.palette.mode === 'dark'
            ? 'none'
            : '0 0.125rem 0.5rem rgba(0, 0, 0, 0.06)',
    border:
        theme.palette.mode === 'light'
            ? '1px solid rgba(0, 0, 0, 0.08)'
            : 'none',
}));

/* Cards */

export const ViewFlashsetCard = styled(Card)(({ theme }) => ({
    padding: '1rem 1.25rem 1.25rem 1.25rem',
    borderRadius: '0.75rem',
    transition: 'all 0.2s ease',
    boxShadow:
        theme.palette.mode === 'dark'
            ? '0 0.25rem 0.75rem rgba(255,160,0,0.15)'
            : '0 0.25rem 1rem rgba(0, 0, 0, 0.08), 0 0.125rem 0.5rem rgba(0, 0, 0, 0.04)',
    border:
        theme.palette.mode === 'light'
            ? '1px solid rgba(0, 0, 0, 0.06)'
            : 'none',
    '&:hover': {
        boxShadow:
            theme.palette.mode === 'dark'
                ? '0 0.375rem 1rem rgba(255,160,0,0.25)'
                : '0 0.5rem 1.5rem rgba(255, 160, 0, 0.12), 0 0.25rem 0.75rem rgba(0, 0, 0, 0.08)',
    },
}));

export const CategoryChips = styled(SimpleFlexContainer, {
    shouldForwardProp: (prop) => prop !== 'hasIndex',
})<{
    hasIndex?: boolean;
}>(({ hasIndex = true }) => ({
    marginLeft: hasIndex ? '1rem' : '0',
    gap: '0.5rem',
}));

export const CategoryChip = styled(Chip)({
    maxWidth: '10rem',
});

export const ViewFlashCardActions = styled('div')({
    marginLeft: 'auto',
});

export const ViewCardContainer = styled('div')(({ theme }) => ({
    display: 'flex',
    // Stack term/definition on small screens so neither column gets crushed.
    flexDirection: 'column',
    gap: '1.5rem',
    marginTop: '0.5rem',
    [theme.breakpoints.up('sm')]: {
        flexDirection: 'row',
        gap: '3rem',
    },
}));

export const ViewCardInfo = styled('div')({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    flex: '1',
    minWidth: '0',
    wordWrap: 'break-word',
});

export const ViewCardText = styled(Typography)({});

export const NoCardsMessage = styled(BoldTypography)({});

export const UpdateCardsButton = styled(Button)(({ theme }) => ({
    alignSelf: 'center',
    width: '100%',
    maxWidth: '20rem',
    minWidth: '12rem',
    textTransform: 'none',
    fontSize: '1rem',
    [theme.breakpoints.up('md')]: {
        width: '25%',
    },
}));

// Download Dialog
export const DownloadDialogContent = styled(DialogContent)({
    display: 'flex',
    flexDirection: 'column',
});

// Grid View Styles
export const ViewCardsGridContainer = styled('div')({
    display: 'grid',
    // min() keeps a single column from overflowing on very narrow screens.
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(18rem, 100%), 1fr))',
    gap: '1.5rem',
});

export const ViewGridCard = styled(Card)(({ theme }) => ({
    padding: '1rem',
    borderRadius: '0.75rem',
    transition: 'all 0.2s ease',
    boxShadow:
        theme.palette.mode === 'dark'
            ? '0 0.25rem 0.75rem rgba(255,160,0,0.15)'
            : '0 0.25rem 1rem rgba(0, 0, 0, 0.08), 0 0.125rem 0.5rem rgba(0, 0, 0, 0.04)',
    border:
        theme.palette.mode === 'light'
            ? '1px solid rgba(0, 0, 0, 0.06)'
            : 'none',
    '&:hover': {
        boxShadow:
            theme.palette.mode === 'dark'
                ? '0 0.375rem 1rem rgba(255,160,0,0.25)'
                : '0 0.5rem 1.5rem rgba(255, 160, 0, 0.12), 0 0.25rem 0.75rem rgba(0, 0, 0, 0.08)',
    },
}));

export const GridCardContent = styled('div')({
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
});

export const GridCardSection = styled('div')({
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
});
