import React, { useState } from "react";
import {
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemText,
} from '@mui/material/';
// NavLink or Link
import { Link } from "react-router-dom";

const useStyles = makeStyles(() => ({
    link: {
        textDecoration: "none",
        color: "blue",
        fontSize: "20px",
    },
    icon: {
        color: "white"
    }
}));

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
                open={openDrawer}
                onClose={handleCloseDrawer}
            >
                <List>
                    <ListItem onClick={handleCloseDrawer}>
                        <ListItemText>
                            <Link to="/">Home</Link>
                        </ListItemText>
                    </ListItem>
                    <ListItem onClick={handleCloseDrawer}>
                        <ListItemText>
                            <Link to="/about">About</Link>
                        </ListItemText>
                    </ListItem>
                    <ListItem onClick={handleCloseDrawer}>
                        <ListItemText>
                            <Link to="/contact">Contact</Link>
                        </ListItemText>
                    </ListItem>
                    <ListItem onClick={handleCloseDrawer}>
                        <ListItemText>
                            <Link to="/about">Faq</Link>
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