import { Drawer } from '@mui/material/';
import styled from '@emotion/styled';

export const StyledDrawer = styled(Drawer)({
    '& .MuiDrawer-paper': {
        // marginTop: "4rem",
        // width: "22rem",
        position: 'absolute',
        top: '4rem', // This aligns the drawer beneath the header
        height: `calc(100% - 4rem - 3rem)`, // Full height minus header and footer
        width: '22rem',
        overflowY: 'auto', // Allow scrolling if needed
    },
});
