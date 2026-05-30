import { styled } from '@mui/system';
import { Button, IconButton } from '@mui/material';
import {
    AccountCircle,
    DarkMode,
    LightMode,
    KeyboardArrowDown,
} from '@mui/icons-material';
import { NavLink } from 'react-router-dom';

// TODO: Change logo styling
export const AppLogo = styled('img')({
    position: 'absolute',
    height: '13rem',
    width: '13rem',
    left: '-1rem',
    marginTop: '1.25rem',
});

export const LoginButtonsContainer = styled('div')({
    display: 'flex',
    gap: '0.75rem',
});

export const StyledNavLink = styled(NavLink)(({ theme }) => ({
    fontSize: '1rem',
    fontWeight: 500,
    textDecoration: 'none',
    cursor: 'pointer',
    padding: '0.5rem 1rem',
    borderRadius: '2rem',
    transition: 'all 0.2s ease',
    color: theme.palette.text.secondary,
    '&:hover': {
        color: theme.palette.text.primary,
        backgroundColor: theme.palette.action.hover,
    },
    '&.active': {
        color: theme.palette.primary.main,
        backgroundColor:
            theme.palette.mode === 'dark'
                ? 'rgba(255, 152, 0, 0.12)'
                : 'rgba(255, 152, 0, 0.08)',
    },
}));

export const StyledDarkModeIcon = styled(DarkMode)(({ theme }) => ({
    color: theme.palette.text.secondary,
    fontSize: '1.5rem',
    transition: 'color 0.2s ease',
}));

export const StyledLightModeIcon = styled(LightMode)(({ theme }) => ({
    color: '#FFB74D',
    fontSize: '1.5rem',
    transition: 'color 0.2s ease',
}));

export const ProfileIconContainer = styled('div')(({ theme }) => ({
    display: 'flex',
    cursor: 'pointer',
    padding: '0.25rem',
    borderRadius: '50%',
    transition: 'all 0.2s ease',
    '&:hover': {
        backgroundColor: theme.palette.action.hover,
    },
}));

export const NavItemsContainer = styled('div')({
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    marginLeft: '3rem',
    padding: '0.5rem 0',
    transition: '0.2s ease',
    userSelect: 'none',
});

export const NavLinksContainer = styled('div')({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '0.5rem',
});

export const NavRightActions = styled('div')({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '0.25rem',
    marginLeft: 'auto',
});

export const AuthenticationButton = styled(Button)(({ theme }) => ({
    textTransform: 'none',
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.9375rem',
    borderRadius: '2rem',
    padding: '0.375rem 1rem',
}));

export const CreateStudySetButton = styled(Button)(({ theme }) => ({
    textTransform: 'none',
    fontSize: '0.9375rem',
    fontWeight: 600,
    borderRadius: '2rem',
    padding: '0.5rem 1.25rem',
    boxShadow:
        theme.palette.mode === 'dark'
            ? '0 0 1rem rgba(255, 152, 0, 0.2)'
            : '0 0.125rem 0.5rem rgba(255, 152, 0, 0.3)',
    transition: 'all 0.2s ease',
    '&:hover': {
        boxShadow:
            theme.palette.mode === 'dark'
                ? '0 0 1.25rem rgba(255, 152, 0, 0.35)'
                : '0 0.25rem 0.75rem rgba(255, 152, 0, 0.4)',
        transform: 'translateY(-0.0625rem)',
    },
}));

export const LogoutIconButton = styled(IconButton)(({ theme }) => ({
    color: theme.palette.text.secondary,
    transition: 'all 0.2s ease',
    '&:hover': {
        color: theme.palette.text.primary,
        backgroundColor: theme.palette.action.hover,
    },
}));

export const StyledAccountIcon = styled(AccountCircle)(({ theme }) => ({
    fontSize: '2rem',
    color: theme.palette.text.secondary,
    transition: 'color 0.2s ease',
    '&:hover': {
        color: theme.palette.text.primary,
    },
}));

export const StyledArrowIcon = styled(KeyboardArrowDown)({
    fontSize: '2rem',
});

export const AccountIconsContainer = styled('div')({
    display: 'flex',
    cursor: 'pointer',
});
