import { styled } from "@mui/system";
import { Button, Grid } from "@mui/material";
import { AccountCircle, DarkMode, LightMode, KeyboardArrowDown } from "@mui/icons-material"
import { NavLink } from "react-router-dom";

// TODO: Change logo styling 
export const AppLogo = styled("img")({
    position: "absolute",
    height: "13rem",
    width: "13rem",
    left: "-1rem",
    marginTop: "1.25rem",
})

export const LoginButtonsContainer = styled("div")({
    display: "flex",
    gap: "1rem"
})

export const StyledNavLink = styled(NavLink)(({ theme }) => ({
    borderRadius: "0.15rem",
    fontSize: "1.5rem",
    textDecoration: "none",
    cursor: "pointer",
    "&:hover": {
        opacity: "0.6",
        transition: "0.1s ease",
    },
    color: theme.palette.text.primary,
}));

export const StyledDarkModeIcon = styled(DarkMode)({
    color: "#121212",
    fontSize: "2rem",
})

export const StyledLightModeIcon = styled(LightMode)({
    color: "yellow",
    fontSize: "2rem",
})

export const ProfileIconContainer = styled("div")({
    display: "flex",
    cursor: "pointer"
})

export const NavItemsContainer = styled("div")({
    display: "flex",
    alignItems: "center",
    height: "5vh",
    width: "100%",
    marginLeft: "5rem",
    padding: "0.5rem 0",
    transition: "0.2s ease",
    userSelect: "none",
})

export const NavLinksContainer = styled("div")({
    display: "flex",
    gap: "2rem",
})

export const RightActionsContainer = styled("div")({
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "0.5rem",
    marginLeft: "auto"
})

export const AuthenticationButton = styled(Button)({
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    fontSize: "1.25rem",
    textTransform: "none"
})

export const AccountIconsContainer = styled("div")({
    display: "flex",
    cursor: "pointer"
})