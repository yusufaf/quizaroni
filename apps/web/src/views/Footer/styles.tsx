import { IconButton, Paper } from '@mui/material';
import { styled } from '@mui/system';

export const StyledFooter = styled('footer')({
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    marginTop: 'auto',
});

export const FooterPaper = styled(Paper)({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '1rem 2rem',
});

export const FooterLeft = styled('div')({
    display: 'flex',
    alignItems: 'center',
});

export const FooterRight = styled('div')({
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
});

export const SocialIconButton = styled(IconButton)(({ theme }) => ({
    color: theme.palette.text.primary,
    '&:hover': {
        opacity: 0.6,
        transition: '0.1s ease',
    },
}));
