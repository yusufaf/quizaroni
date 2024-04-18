import React, { useState } from "react";
import {
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemText,
} from "@mui/material/";
import { Create, Menu } from "@mui/icons-material";
import { StyledNavLink } from "./NavStyles";
import { BoldButton } from "common/AppStyles";
import DarkModeToggleButton from "./DarkModeToggleButton";

const NavDrawer = (props) => {
    const [openDrawer, setOpenDrawer] = useState(false);

    const handleCloseDrawer = () => {
        setOpenDrawer(false);
    };

    const handleToggleDrawer = () => {
        setOpenDrawer(!openDrawer);
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
                    <BoldButton
                        variant="contained"
                        onClick={() => {}}
                        size="large"
                        startIcon={<Create />}
                    >
                        Create Study Set
                    </BoldButton>
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
