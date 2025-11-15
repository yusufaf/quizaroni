import { useState } from 'react';
import {
    Button,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemText,
} from '@mui/material/';
import { Create, Menu } from '@mui/icons-material';
import { StyledNavLink } from './NavStyles';
import DarkModeToggleButton from './DarkModeToggleButton';
import { useNavigate } from 'react-router-dom';
import { useCreateStudyset } from 'state/api/studysetsAPI';
import { useGlobalStore } from 'state/stores/global';
import { LOADING_ACTIONS } from 'shared/constants';

const NavDrawer = (props) => {
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
                //anchor="bottom"
                open={openDrawer}
                onClose={handleCloseDrawer}
            >
                <List>
                    <ListItem onClick={handleCloseDrawer}>
                        <ListItemText>
                            <StyledNavLink to="/">Home</StyledNavLink>
                        </ListItemText>
                    </ListItem>
                    <ListItem onClick={handleCloseDrawer}>
                        <ListItemText>
                            <StyledNavLink to="/explore">Explore</StyledNavLink>
                        </ListItemText>
                    </ListItem>
                    <Button
                        variant="contained"
                        onClick={handleCreateStudyset}
                        size="large"
                        startIcon={<Create />}
                    >
                        Create Study Set
                    </Button>
                    <DarkModeToggleButton />
                </List>
            </Drawer>
            <IconButton onClick={handleToggleDrawer}>
                <Menu />
            </IconButton>
        </>
    );
};
export default NavDrawer;
