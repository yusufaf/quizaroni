import { styled } from "@mui/system";
import { Box, Button, Paper, TextField, Typography } from "@mui/material";
import { Link } from "react-router-dom";

export const LoginPageContainer = styled(Box)({
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginTop: "4rem",
})


export const LoginContainer = styled(Box)({
    display: "flex",
    flexDirection: "column",
    borderRadius: "0.25rem",
    padding: "1.25rem",
    textAlign: "center",
    fontSize: "1rem",
    position: "relative"
})

export const LoginTitle = styled(Typography)({
    fontWeight: "bold",
    alignSelf: "flex-start"
})

// TODO: Create a disabled styling in the theme perhaps?
export const LoginButton = styled(Button)({
    fontSize: "1rem",
    margin: "1rem 0",
    // "&.Mui-disabled": {
    //     backgroundColor: theme.palette.primary.main,
    //     cursor: "not-allowed"
    // },
})

export const LoginField = styled(TextField)({
    marginTop: "1rem",
})


export const ForgotPasswordLink = styled(Link)(({ theme }) => ({
    color: theme.palette.primary.main,
    textDecoration: "none",
    display: "flex",
    alignSelf: "flex-end",
    marginTop: "0.5rem"
}));

export const StyledLink = styled(Link)(({ theme }) => ({
    color: theme.palette.primary.main,
    textDecoration: "none"
}));
