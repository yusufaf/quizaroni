import {
    BasePage,
    BoldTypography,
    SimpleFlexContainer,
} from 'styles/AppStyles';
import styled from '@emotion/styled';
import { Box, Card, Chip, Paper, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

export const HomePage = styled(BasePage)(({ theme }) => ({
    marginTop: '0',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    // Modest, fluid padding — the centered, max-width paper handles wide
    // screens, so we no longer reserve a huge fixed gutter.
    padding: '1rem',
    [theme.breakpoints.up('sm')]: {
        padding: '1.5rem',
    },
    [theme.breakpoints.up('md')]: {
        padding: '2rem',
    },
    background: `linear-gradient(to bottom, ${theme.palette.background.default}, ${theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5'})`,
}));

export const HomePaper = styled(Paper)(({ theme }) => ({
    width: '100%',
    maxWidth: '70rem',
    minWidth: 0,
    boxShadow:
        theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.4)'
            : '0 8px 32px rgba(0, 0, 0, 0.08)',
}));

export const HomeContainer = styled(Box)(({ theme }) => ({
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    padding: '0.75rem',
    borderRadius: '0.75rem',
    [theme.breakpoints.up('sm')]: {
        padding: '1.25rem',
    },
}));

export const HomeSetsHeading = styled(BoldTypography)({
    letterSpacing: '0.5px',
    fontWeight: 700,
});

export const HomeSetsContainer = styled('div')({
    display: 'flex',
    flexDirection: 'column',
    // minWidth: 0 lets the DataGrid scroll its columns internally instead of
    // forcing the whole page wider than the viewport.
    minWidth: 0,
    width: '100%',
    height: '40rem',
    marginTop: '1rem',
});

/* MUI DataGrid View */
export const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
    '& .MuiDataGrid-virtualScroller::-webkit-scrollbar': {
        height: '0.5rem',
        width: '0.5rem',
    },
    '& .MuiDataGrid-virtualScroller::-webkit-scrollbar-thumb': {
        backgroundColor: '#888',
        // background: theme.palette.grey[200],
        borderRadius: '0.5rem',
    },
    '& .MuiDataGrid-virtualScroller::-webkit-scrollbar-thumb:hover': {
        background: '#555',
        // background: theme.palette.grey[300],
    },
    '& .favorited-cell': {
        justifyContent: 'center',
    },
}));

export const HomeSetGrid = styled('div')({
    display: 'grid',
    // Fluid columns that reflow from 1 up to 3+ across as space allows;
    // min() keeps a single card from overflowing on very narrow screens.
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(18rem, 100%), 1fr))',
    gridAutoRows: '18rem',
    gap: '1.5rem',
    justifyContent: 'center',
});

/* Grid View - Card Styling */
export const HomeSetCard = styled(Card)(({ theme }) => ({
    height: '18rem',
    width: '100%',
    maxWidth: '24rem',
    padding: '1.25rem',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    border: `1px solid transparent`,
    boxShadow:
        theme.palette.mode === 'dark'
            ? '0 2px 8px rgba(0, 0, 0, 0.3)'
            : '0 2px 8px rgba(0, 0, 0, 0.06)',
    '&&': {
        borderRadius: '0.75rem',
    },
    '&:hover': {
        background: theme.palette.action.hover,
        boxShadow:
            theme.palette.mode === 'dark'
                ? '0 8px 24px rgba(0, 0, 0, 0.5)'
                : '0 8px 24px rgba(0, 0, 0, 0.12)',
        transform: 'translateY(-4px)',
        borderColor: theme.palette.primary.main,
    },
}));

export const CardContent = styled('div')({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
});

export const CardTitle = styled(Typography)({
    fontWeight: 700,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
});

export const CardDescription = styled(Typography)(({ theme }) => ({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: theme.palette.text.secondary,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    minHeight: '2.5rem',
    marginBottom: 'auto',
}));

export const CardInfo = styled('div')({
    marginTop: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
});

export const TermsLabel = styled(Typography)(({ theme }) => ({
    fontWeight: 600,
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
}));

export const SpacedContainer = styled(SimpleFlexContainer)({
    justifyContent: 'space-between',
});

export const CardBottom = styled(SpacedContainer)({
    flexWrap: 'wrap',
    gap: '0.5rem',
});

export const LabelChip = styled(Chip)({});

export const CenteredTypography = styled(Typography)({
    display: 'flex',
    gridColumn: '2',
    alignItems: 'center',
    justifyContent: 'center',
});

/* Actions Menu Styling */
// export const

/* HTML View */
export const HomeHTMLTableWrapper = styled('div')(({ theme }) => ({
    overflowY: 'auto',
    '&::-webkit-scrollbar': {
        width: '0.5rem',
    },
    '&::-webkit-scrollbar-thumb': {
        background: theme.palette.grey[500],
        borderRadius: '0.25rem',
    },
}));

export const HomeHTMLTable = styled('table')({
    width: '100%',
});

export const HTMLTableThead = styled('thead')({
    textAlign: 'left',
});
