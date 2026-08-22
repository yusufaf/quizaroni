import { useState } from 'react';
import {
    Box,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
} from '@mui/material/';
import type { SxProps, Theme } from '@mui/material/styles';
import {
    AccountCircle,
    Close,
    Feedback,
    Logout as LogoutIcon,
    Menu,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate } from 'react-router-dom';
import { useLogto } from '@logto/react';
import { AuthenticationButton, LoginButtonsContainer } from './NavStyles';
import DarkModeToggleButton from './DarkModeToggleButton';
import { useGlobalStore } from 'state/stores/global';
import { useLogout } from 'hooks/useLogout';
import { ROUTES } from 'shared/constants';

const activeNavLinkSx: SxProps<Theme> = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    borderRadius: '0.5rem',
    color: 'text.secondary',
    '&.active': {
        color: 'primary.main',
        backgroundColor: (theme) =>
            theme.palette.mode === 'dark'
                ? 'rgba(255, 152, 0, 0.12)'
                : 'rgba(255, 152, 0, 0.08)',
    },
};

/**
 * Mobile-only secondary menu. Primary destinations (Home, Explore, Create,
 * Profile/Login) live in MobileBottomNav; this drawer covers what the bottom
 * bar has no room for: feedback, dark mode, and the full auth block
 * (login/signup/logout), which previously had no mobile entry point at all.
 */
const NavDrawer = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isAuthenticated: authenticated } = useLogto();
    const setFeedbackDialogOpen = useGlobalStore(
        (state) => state.setFeedbackDialogOpen
    );
    const handleLogout = useLogout();

    const [openDrawer, setOpenDrawer] = useState(false);

    const handleCloseDrawer = () => {
        setOpenDrawer(false);
    };

    const handleToggleDrawer = () => {
        setOpenDrawer(!openDrawer);
    };

    const handleOpenFeedback = () => {
        handleCloseDrawer();
        setFeedbackDialogOpen(true);
    };

    const handleLogoutClick = () => {
        handleCloseDrawer();
        void handleLogout();
    };

    return (
        <>
            <Drawer
                open={openDrawer}
                onClose={handleCloseDrawer}
                PaperProps={{
                    'aria-label': t('nav.menu'),
                    sx: {
                        minWidth: '16rem',
                        p: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        paddingBottom: 'var(--safe-area-bottom)',
                    },
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 1,
                        py: 0.5,
                    }}
                >
                    <Typography sx={{ fontWeight: 700 }}>Quizaroni</Typography>
                    <IconButton
                        onClick={handleCloseDrawer}
                        aria-label={t('buttons.close')}
                    >
                        <Close />
                    </IconButton>
                </Box>
                <List sx={{ flex: 1 }}>
                    {authenticated && (
                        <ListItem disablePadding>
                            <ListItemButton
                                component={NavLink}
                                to="/profile"
                                onClick={handleCloseDrawer}
                                sx={activeNavLinkSx}
                            >
                                <ListItemIcon sx={{ minWidth: '2rem' }}>
                                    <AccountCircle />
                                </ListItemIcon>
                                <ListItemText primary={t('nav.profile')} />
                            </ListItemButton>
                        </ListItem>
                    )}
                    <ListItem disablePadding>
                        <ListItemButton
                            onClick={handleOpenFeedback}
                            sx={{ borderRadius: '0.5rem' }}
                        >
                            <ListItemIcon sx={{ minWidth: '2rem' }}>
                                <Feedback />
                            </ListItemIcon>
                            <ListItemText primary={t('nav.feedback')} />
                        </ListItemButton>
                    </ListItem>
                    <ListItem
                        secondaryAction={<DarkModeToggleButton />}
                        sx={{ borderRadius: '0.5rem' }}
                    >
                        <ListItemText primary={t('nav.darkMode')} />
                    </ListItem>
                    <Divider sx={{ my: 1 }} />
                    {authenticated ? (
                        <ListItem disablePadding>
                            <ListItemButton
                                onClick={handleLogoutClick}
                                sx={{ borderRadius: '0.5rem' }}
                            >
                                <ListItemIcon sx={{ minWidth: '2rem' }}>
                                    <LogoutIcon />
                                </ListItemIcon>
                                <ListItemText primary={t('nav.logout')} />
                            </ListItemButton>
                        </ListItem>
                    ) : (
                        <ListItem>
                            <LoginButtonsContainer
                                sx={{ flexDirection: 'column', width: '100%' }}
                            >
                                <AuthenticationButton
                                    onClick={() => {
                                        handleCloseDrawer();
                                        void navigate(ROUTES.LOGIN);
                                    }}
                                    variant="outlined"
                                    fullWidth
                                >
                                    {t('nav.login')}
                                </AuthenticationButton>
                                <AuthenticationButton
                                    onClick={() => {
                                        handleCloseDrawer();
                                        void navigate(ROUTES.SIGNUP);
                                    }}
                                    variant="contained"
                                    fullWidth
                                >
                                    {t('nav.signup')}
                                </AuthenticationButton>
                            </LoginButtonsContainer>
                        </ListItem>
                    )}
                </List>
            </Drawer>
            <IconButton
                onClick={handleToggleDrawer}
                sx={{ ml: 'auto' }}
                aria-label={t('nav.openMenu')}
                aria-expanded={openDrawer}
                aria-haspopup="dialog"
            >
                <Menu />
            </IconButton>
        </>
    );
};
export default NavDrawer;
