import { Drawer } from '@mui/material/';
import styled from '@emotion/styled';

export const StyledDrawer = styled(Drawer)({
    '& .MuiDrawer-paper': {
        position: 'fixed',
        top: '5.5rem', // Align with the main content
        height: 'calc(100vh - 5.5rem)', // Adjust height to start from top position
        width: '22rem',
        overflowY: 'auto',
        border: 'none',
        background: 'transparent',
        '& > div': {
            background: 'inherit',
        }
    },
});
