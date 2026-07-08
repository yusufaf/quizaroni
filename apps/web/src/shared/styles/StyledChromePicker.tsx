import { styled } from '@mui/system';
import { ChromePicker } from 'react-color';

/**
 * Isolated in its own module (rather than AppStyles) so that react-color — only
 * needed by the two color-picker surfaces — does not get bundled into the
 * widely-imported AppStyles chunk.
 */
export const StyledChromePicker = styled(ChromePicker)(({ theme }) => ({
    '&.chrome-picker': {
        background: `${theme.palette.background.paper} !important`,
    },
}));
