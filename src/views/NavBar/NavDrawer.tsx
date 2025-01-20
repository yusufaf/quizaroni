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
import { useCreateStudysetMutation } from 'state/api/studysetsAPI';
import { setLoadingAdd, setLoadingRemove } from 'state/slices/globalSlice';
import { useAppDispatch } from 'state/reduxHooks';

const NavDrawer = (props) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const [openDrawer, setOpenDrawer] = useState(false);

    const [createStudyset] = useCreateStudysetMutation();

    const handleCloseDrawer = () => {
        setOpenDrawer(false);
    };

    const handleToggleDrawer = () => {
        setOpenDrawer(!openDrawer);
    };

    // TODO: Switch to RTK query after
    const handleCreateStudyset = async () => {
        dispatch(setLoadingAdd('CREATE_STUDYSET'));
        createStudyset({})
            .unwrap()
            .then((response) => {
                const { studyset } = response;
                navigate(`/edit/${studyset.studysetUUID}`);
                dispatch(setLoadingRemove('CREATE_STUDYSET'));
            });
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
