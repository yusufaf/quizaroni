import React, { useState } from "react";
import {
    Button,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemText,
} from "@mui/material/";
import { Create, Menu } from "@mui/icons-material";
import { StyledNavLink } from "./NavStyles";
import DarkModeToggleButton from "./DarkModeToggleButton";
import { createStudyset } from "api/awsAPI";
import { useNavigate } from "react-router-dom";

const NavDrawer = (props) => {
    const [openDrawer, setOpenDrawer] = useState(false);

    const navigate = useNavigate();

    const handleCloseDrawer = () => {
        setOpenDrawer(false);
    };

    const handleToggleDrawer = () => {
        setOpenDrawer(!openDrawer);
    };

    // TODO: Switch to RTK query after
    const handleCreateStudyset = async () => {
        const { studyset } = await createStudyset();
        navigate(`/create/${studyset.studysetUUID}`)
    }

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
