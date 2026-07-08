import { styled } from '@mui/system';
import {
    DialogActions,
    DialogTitle,
    IconButton,
    Typography,
} from '@mui/material/';
import { Link } from 'react-router-dom';

export const AppWrapper = styled('div')({
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
});

export const MainContent = styled('div')({
    flex: 1,
});

export const FlexRow = styled('div')({
    display: 'flex',
});

export const SimpleFlexContainer = styled('div')({
    display: 'flex',
    alignItems: 'center',
});

export const BaselineFlexContainer = styled('div')({
    display: 'flex',
    alignItems: 'baseline',
});

export const SpacedFlexContainer = styled('div')({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
});

export const FlexColumn = styled('div')({
    display: 'flex',
    flexDirection: 'column',
});

export const BoldTypography = styled(Typography)({
    fontWeight: 'bold',
});

export const BasePage = styled('main')({
    marginTop: '2rem',
});

/* ==== Dialog ==== */
export const StyledDialogTitle = styled(DialogTitle)({
    display: 'flex',
    alignItems: 'center',
    fontWeight: 600,
});

export const StyledDialogActions = styled(DialogActions)({
    margin: '0 1rem 1rem 0',
    gap: '0.5rem',
});

export const RightAlignedCloseButton = styled(IconButton)({
    marginLeft: 'auto',
});

export const StyledLink = styled(Link)(({ theme }) => ({
    color: theme.palette.primary.main,
    textDecoration: 'none',
    transition: '0.2s ease',
    '&:hover': {
        color: theme.palette.primary.dark,
        textDecoration: 'underline',
    },
}));

export const GhostLink = styled(Link)(({ theme }) => ({
    color: theme.palette.text.primary,
    textDecoration: 'none',
    transition: '0.2s ease',
    '&:hover': {
        color: theme.palette.primary.main,
    },
}));

/* ==== File Upload Component ==== */
export const FileUploadContainer = styled(FlexColumn)(({ theme }) => ({
    height: '3rem',
    width: '5rem',
    boxSizing: 'border-box',
    padding: '1.75rem 1rem',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    border: `0.125rem dashed ${theme.palette.divider}`,
    borderRadius: '0.25rem',
    cursor: 'pointer',
}));

export const HiddenInput = styled('input')({
    display: 'none',
});

export const FileUploadTypeText = styled(BoldTypography)({
    fontSize: '0.75rem',
});
