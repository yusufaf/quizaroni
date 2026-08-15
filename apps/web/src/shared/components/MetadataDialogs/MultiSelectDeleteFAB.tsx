import { Fab, Zoom } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { MultiSelectDeleteFABProps } from './types';

export const MultiSelectDeleteFAB = ({
    count,
    onClick,
    visible,
}: MultiSelectDeleteFABProps) => {
    return (
        <Zoom in={visible && count > 0}>
            <Fab
                color="error"
                variant="extended"
                onClick={onClick}
                sx={{
                    position: 'fixed',
                    bottom: 'calc(var(--bottom-nav-offset) + 2rem)',
                    right: 'max(2rem, env(safe-area-inset-right, 0px))',
                    zIndex: (theme) => theme.zIndex.fab,
                }}
            >
                <DeleteIcon sx={{ mr: '0.5rem' }} />
                Delete ({count})
            </Fab>
        </Zoom>
    );
};
