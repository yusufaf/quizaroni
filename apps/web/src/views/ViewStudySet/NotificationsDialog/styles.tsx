import styled from '@emotion/styled';
import { Box, Dialog, Paper, ToggleButton, ToggleButtonGroup } from '@mui/material';

export const StyledDialog = styled(Dialog)({
    '& .MuiDialog-paper': {
        height: '40rem',
        maxHeight: '90vh',
    },
});

export const NotificationSection = styled(Box)({
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    padding: '1rem 0',
});

export const NotificationRow = styled(Box)({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    backgroundColor: 'var(--surface-color, rgba(0, 0, 0, 0.02))',
    '&:hover': {
        backgroundColor: 'var(--surface-hover, rgba(0, 0, 0, 0.04))',
    },
});

export const ModeCard = styled(Paper, {
    shouldForwardProp: (prop) => prop !== 'selected',
})<{ selected?: boolean }>(({ theme, selected }) => ({
    padding: '1rem',
    cursor: 'pointer',
    border: selected ? '2px solid' : '1px solid',
    borderColor: selected ? theme.palette.primary.main : theme.palette.divider,
    backgroundColor: selected
        ? theme.palette.mode === 'dark'
            ? 'rgba(144, 202, 249, 0.08)'
            : 'rgba(25, 118, 210, 0.08)'
        : 'transparent',
    transition: 'all 0.2s ease',
    '&:hover': {
        borderColor: theme.palette.primary.main,
        backgroundColor:
            theme.palette.mode === 'dark'
                ? 'rgba(144, 202, 249, 0.12)'
                : 'rgba(25, 118, 210, 0.12)',
    },
}));

export const ModeCardGrid = styled(Box)({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
});

export const TimeInputContainer = styled(Box)({
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
});

export const DayToggleGroup = styled(ToggleButtonGroup)({
    flexWrap: 'wrap',
    gap: '0.25rem',
    '& .MuiToggleButton-root': {
        padding: '0.25rem 0.5rem',
        minWidth: '2.5rem',
        fontSize: '0.75rem',
    },
});

export const SnoozeContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem',
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor:
        theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.02)'
            : 'rgba(0, 0, 0, 0.02)',
}));

export const StudysetPrefsContainer = styled(Box)({
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    maxHeight: '20rem',
    overflowY: 'auto',
});

export const StudysetPrefCard = styled(Paper)(({ theme }) => ({
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    border: `1px solid ${theme.palette.divider}`,
}));
