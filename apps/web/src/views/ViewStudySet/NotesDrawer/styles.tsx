import { Drawer, Box, Typography } from '@mui/material/';
import styled from '@emotion/styled';

export const StyledDrawer = styled(Drawer)<{ anchor?: 'left' | 'right' }>(({ theme, anchor }) => ({
    '& .MuiDrawer-paper': {
        position: 'fixed',
        top: '5rem',
        height: 'calc(100vh - 5rem)',
        width: '24rem',
        ...(anchor === 'left' ? { left: '1.5rem' } : { right: '1.5rem' }),
        overflowY: 'auto',
        border: 'none',
        background: 'transparent',
        '& > div': {
            background: 'inherit',
        },
        // Custom scrollbar
        '&::-webkit-scrollbar': {
            width: '0.5rem',
        },
        '&::-webkit-scrollbar-track': {
            background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
            background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
            borderRadius: '0.25rem',
            '&:hover': {
                background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
            },
        },
    },
}));

export const CardPreviewText = styled(Typography)({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: '100%',
});

export const EmptyStateBox = styled(Box)({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    textAlign: 'center',
});
