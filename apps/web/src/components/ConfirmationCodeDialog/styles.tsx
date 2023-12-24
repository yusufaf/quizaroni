import {
    Dialog, DialogContent, Typography,
} from "@mui/material/";
import styled from "@emotion/styled";


export const StyledDialog = styled(Dialog)({
    "& .MuiDialog-paper": {
        height: "20rem",
    },
});

export const StyledDialogContent = styled(DialogContent)({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
})

export const ConfirmDescription = styled(Typography)({
    alignSelf: "flex-start",
    whiteSpace: "pre-line",
})

