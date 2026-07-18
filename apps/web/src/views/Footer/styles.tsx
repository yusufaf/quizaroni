import { IconButton, Paper, type IconButtonProps } from '@mui/material';
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

// These render as external links. `styled()` erases IconButton's polymorphic
// `component` overload, so the anchor form is pinned with a thin wrapper that
// carries the right prop types (href/target/rel) through to the styled version.
const AnchorIconButton = (props: Omit<IconButtonProps<'a'>, 'component'>) => (
    <IconButton component="a" {...props} />
);

export const SocialIconButton = styled(AnchorIconButton)(({ theme }) => ({
    color: theme.palette.text.primary,
    '&:hover': {
        opacity: 0.6,
        transition: '0.1s ease',
    },
}));
