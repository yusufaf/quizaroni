import React, { useState } from "react";
import {
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemText,
} from '@mui/material/';
import { NavLink } from "react-router-dom";
import { styled } from '@mui/system';

const NavDrawer = props => {
    const [openDrawer, setOpenDrawer] = useState(false);

    const handleCloseDrawer = () => {
        setOpenDrawer(false)
    }

    const handleToggleDrawer = () => {
        setOpenDrawer(!openDrawer)
    }

    const StyledNavLink = styled(NavLink)({
        borderRadius: "0.15rem",
        fontSize: "1.25rem",
        textDecoration: "none",
        cursor: "pointer",
        "&:hover": {
            opacity: "0.6",
            transition: "0.1s ease",
        }
    })

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
                            <StyledNavLink to="/create">Create</StyledNavLink>
                        </ListItemText>
                    </ListItem>
                    <ListItem onClick={handleCloseDrawer}>
                        <ListItemText>
                            <StyledNavLink to="/explore">Explore</StyledNavLink>
                        </ListItemText>
                    </ListItem>
                </List>
            </Drawer>
            <IconButton onClick={handleToggleDrawer}>
                <MenuIcon />
            </IconButton>
        </>
    );
}
export default NavDrawer;