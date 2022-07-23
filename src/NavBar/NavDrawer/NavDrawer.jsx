import React, { useState } from "react";
import {
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemText,
} from '@mui/material/';
import { Menu } from "@mui/icons-material";
import { NavLink } from "react-router-dom";
import { styled } from '@mui/system';
import { StyledNavLink } from "../NavStyles";

const NavDrawer = props => {
    const [openDrawer, setOpenDrawer] = useState(false);

    const handleCloseDrawer = () => {
        setOpenDrawer(false)
    }

    const handleToggleDrawer = () => {
        setOpenDrawer(!openDrawer)
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
                <Menu />
            </IconButton>
        </>
    );
}
export default NavDrawer;