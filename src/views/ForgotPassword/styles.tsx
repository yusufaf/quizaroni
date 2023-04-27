import { Box, Button, Paper, TextField, Typography } from "@mui/material";
import styled from "@emotion/styled";

export const ForgotPasswordPage = styled(Box)({
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginTop: "4rem",
});

export const ForgotPasswordContainer = styled(Box)({
    display: "flex",
    flexDirection: "column",
    borderRadius: "0.25rem",
    padding: "1.25rem",
    textAlign: "center",
    fontSize: "1rem",
    position: "relative",
});

export const ForgotPasswordTitle = styled(Typography)({
    fontWeight: "bold",
    alignSelf: "flex-start",
    marginBottom: "0.5rem",
});

export const ForgotPasswordDesc = styled(Typography)({
    alignSelf: "flex-start",
    whiteSpace: "pre-line",
});

export const ForgotPassField = styled(TextField)({
    marginTop: "1rem",
});

export const ForgotPassBtn = styled(Button)({
    fontWeight: "600",
    marginTop: "1rem",
});
