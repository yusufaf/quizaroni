import { useState } from 'react';
import {
    Box,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
} from '@mui/material/';
import { Add, Menu } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { CreateStudySetButton, StyledNavLink } from './NavStyles';
import DarkModeToggleButton from './DarkModeToggleButton';
import { useNavigate } from 'react-router-dom';
import { useCreateStudyset } from 'state/api/studysetsAPI';
import { useGlobalStore } from 'state/stores/global';
import { LOADING_ACTIONS } from 'shared/constants';

const NavDrawer = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const { setLoadingAdd, setLoadingRemove } = useGlobalStore();

    const [openDrawer, setOpenDrawer] = useState(false);

    const { mutateAsync: createStudyset } = useCreateStudyset();

    const handleCloseDrawer = () => {
        setOpenDrawer(false);
    };

    const handleToggleDrawer = () => {
        setOpenDrawer(!openDrawer);
    };

    const handleCreateStudyset = async () => {
        handleCloseDrawer();
        setLoadingAdd(LOADING_ACTIONS.CREATE_STUDYSET);
        try {
            const response = await createStudyset();
            const { studyset } = response;
            navigate(`/edit/${studyset.studysetUUID}`);
            setLoadingRemove(LOADING_ACTIONS.CREATE_STUDYSET);
        } catch (error) {
            console.error('Error creating studyset:', error);
            setLoadingRemove(LOADING_ACTIONS.CREATE_STUDYSET);
        }
    };

    return (
        <>
            <Drawer
                open={openDrawer}
                onClose={handleCloseDrawer}
                PaperProps={{
                    sx: { minWidth: '16rem', p: 1 }
                }}
            >
                <List>
                    <ListItem disablePadding>
                        <ListItemButton
                            onClick={handleCloseDrawer}
                            sx={{ borderRadius: '0.5rem' }}
                        >
                            <StyledNavLink to="/">{t('nav.home')}</StyledNavLink>
                        </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                        <ListItemButton
                            onClick={handleCloseDrawer}
                            sx={{ borderRadius: '0.5rem' }}
                        >
                            <StyledNavLink to="/explore">{t('nav.explore')}</StyledNavLink>
                        </ListItemButton>
                    </ListItem>
                    <ListItem sx={{ mt: 1 }}>
                        <CreateStudySetButton
                            variant="contained"
                            onClick={handleCreateStudyset}
                            fullWidth
                            startIcon={<Add />}
                        >
                            {t('nav.createStudySet')}
                        </CreateStudySetButton>
                    </ListItem>
                    <ListItem>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <DarkModeToggleButton />
                        </Box>
                    </ListItem>
                </List>
            </Drawer>
            <IconButton
                onClick={handleToggleDrawer}
                sx={{ ml: 'auto' }}
            >
                <Menu />
            </IconButton>
        </>
    );
};
export default NavDrawer;
