import { Fab, Zoom } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { MultiSelectDeleteFABProps } from './types';

export const MultiSelectDeleteFAB = ({ count, onClick, visible }: MultiSelectDeleteFABProps) => {
    return (
        <Zoom in={visible && count > 0}>
            <Fab
                color="error"
                variant="extended"
                onClick={onClick}
                sx={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                }}
            >
                <DeleteIcon sx={{ mr: '0.5rem' }} />
                Delete ({count})
            </Fab>
        </Zoom>
    );
};
