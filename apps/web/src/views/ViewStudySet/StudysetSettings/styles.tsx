import { Dialog, DialogContent, TextField } from '@mui/material';
import styled from "@emotion/styled";

export const StyledDialog = styled(Dialog)({
    "& .MuiDialog-paper": {
        height: "32rem",
    },
});

export const StyledTextField = styled(TextField)({
    height: "2rem",
    width: "10rem",
})

export const StyledDialogContent = styled(DialogContent)({
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "2rem",
});

export const CustomInputsContainer = styled("div")({
    display: "flex", 
    gap: "2rem",
});