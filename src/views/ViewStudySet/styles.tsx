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
}>(({ viewMode = 'list' }) => ({
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: viewMode === 'grid' ? '1.5rem' : '2rem',
    padding: '0rem 22rem 2rem 22rem',
    position: 'relative',
}));

export const ViewFlashsetPaper = styled(Paper)({});

export const ViewStudysetContainer = styled('div')({
    gridRow: '1',
    minHeight: '20rem',
    padding: '1rem 1.25rem',
    borderRadius: '0.75rem',
});

export const ViewStudysetHeader = styled('div')({
    display: 'grid',
    gridTemplateColumns: '28rem auto',
    height: '100%',
    gap: '1rem',
});

export const StudysetInfo = styled('div')(({ theme }) => ({
    height: '100%',
    paddingRight: '1.25rem',
    overflowY: 'auto',
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    position: 'relative',
    '&::after': {
        content: '""',
        position: 'absolute',
        right: 0,
        top: '10%',
        height: '80%',
        width: '0.125rem',
        background: `linear-gradient(
            to bottom,
            transparent 0%,
            ${theme.palette.divider} 20%,
            ${theme.palette.divider} 80%,
            transparent 100%
        )`,
        borderRadius: '0.125rem',
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

export const StudyModesSection = styled('section')({
    paddingLeft: '1.25rem',
});

export const StudyModeGrid = styled('div')({
    height: '100%',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(2, auto)',
    gap: '0.5rem',
});

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
});

export const CategoryTab = styled(Tab)({
    textTransform: 'none',
});

export const CategoryTabs = styled(Tabs)({
    maxWidth: '25rem',
});

export const CardFiltersContainer = styled(SpacedFlexContainer)({
    display: 'flex',
    alignItems: 'center',
    // justifyContent: "flex-end",
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

export const ViewCardContainer = styled('div')({
    display: 'flex',
    gap: '3rem',
    marginTop: '0.5rem',
});

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

export const UpdateCardsButton = styled(Button)({
    alignSelf: 'center',
    width: '25%',
    textTransform: 'none',
    fontSize: '1rem',
});

// Download Dialog
export const DownloadDialogContent = styled(DialogContent)({
    display: 'flex',
    flexDirection: 'column',
});

// Grid View Styles
export const ViewCardsGridContainer = styled('div')({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))',
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
