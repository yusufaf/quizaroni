import { Box, Button, Paper, TextField, Typography } from "@mui/material";
import styled from "@emotion/styled"

export const ConfirmEmailPage = styled(Box)({
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginTop: "4rem",
})

export const ConfirmEmailContainer = styled(Box)({
    display: "flex",
    flexDirection: "column",
    borderRadius: "0.25rem",
    padding: "1.25rem",
    textAlign: "center",
    fontSize: "1rem",
    position: "relative"
})

export const ConfirmEmailTitle = styled(Typography)({
    fontWeight: "bold",
    alignSelf: "flex-start",
    marginBottom: "0.5rem",
})

export const ConfirmEmailDesc = styled(Typography)({
    alignSelf: "flex-start",
    whiteSpace: "pre-line",
})

export const ConfirmationField = styled(TextField)({
    marginTop: "1rem",
})

export const ConfirmBtn = styled(Button)({
    fontWeight: "600",
    marginTop: "1rem"
})