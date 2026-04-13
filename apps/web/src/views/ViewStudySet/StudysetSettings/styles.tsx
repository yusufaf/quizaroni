import { Dialog, DialogContent, TextField } from '@mui/material';
import styled from '@emotion/styled';

export const StyledDialog = styled(Dialog)({
    '& .MuiDialog-paper': {
        height: '32rem',
    },
});

export const StyledTextField = styled(TextField)({
    flex: 1,
    maxWidth: '15rem',
    '& .MuiInputBase-root': {
        height: '2.5rem',
    },
});

export const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2rem',
    '&::-webkit-scrollbar': {
        width: '0.5rem',
    },
    '&::-webkit-scrollbar-thumb': {
        borderRadius: '0.25rem',
        background: theme.palette.grey[500],
    },
}));

export const CustomInputsContainer = styled('div')({
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginTop: '0.5rem',
    marginLeft: '2rem',
    padding: '1rem',
    borderLeft: '0.1875rem solid',
    borderColor: 'rgba(255, 165, 0, 0.3)',
    backgroundColor: 'rgba(255, 165, 0, 0.05)',
    borderRadius: '0.25rem',
});

export const CustomInputRow = styled('div')({
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
});
