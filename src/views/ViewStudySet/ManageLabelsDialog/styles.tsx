import {
    Dialog,
    DialogTitle,
    DialogActions,
    TextField,
    DialogContent,
    Button,
    List,
    ListItem,
    Icon,
    Paper,
    IconButton,
    FormControl,
    MenuItem,
    Typography,
    ListItemButton,
} from "@mui/material/";
import styled from "@emotion/styled";
import { SimpleFlexContainer } from "common/AppStyles";

export const StyledDialog = styled(Dialog)({
    "& .MuiDialog-paper": {
        // width: "60rem",
        height: "32rem",
    },
});

export const StyledDialogTitle = styled(DialogTitle)({
    display: "flex",
});

export const CloseButton = styled(IconButton)({
    marginLeft: "auto",
});

export const StyledDialogContent = styled(DialogContent)({
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
});

export const DeleteLabelWarning = styled(Typography)({
    position: "absolute",
    bottom: "10%",
    whiteSpace: "pre-line",
    textAlign: "right",
});

export const LabelsListContainer = styled("div")(({ theme }) => ({
    maxHeight: "20rem",
    overflowY: "auto",
    "&::-webkit-scrollbar": {
        width: "0.5rem",
    },
    "&::-webkit-scrollbar-thumb": {
        background: theme.palette.grey[500],
    },
}));

export const LabelsListPaper = styled(Paper)({});

export const StyledLabelsList = styled(List)({});

interface StyledListButtonProps {
    isChangeTab: boolean;
}

export const StyledListButton = styled(ListItemButton)<StyledListButtonProps>(
    ({ isChangeTab }) => ({
        "&:hover": {
            background: isChangeTab ? undefined : "transparent",
            cursor: isChangeTab ? undefined : "default",
        },
    })
);

export const LabelButtons = styled(SimpleFlexContainer)({
    gap: "0.5rem",
});

export const LabelField = styled(TextField)({
    marginTop: "1.25rem",
});

export const LabelInputsContainer = styled(SimpleFlexContainer)({
    flexDirection: "column",
    alignItems: "flex-start",
    marginTop: "1rem",
    gap: "1rem",
});

export const LabelFormControl = styled(FormControl)({
    width: "20rem",
});

export const StyledMenuItem = styled(MenuItem)({
    width: "20rem",
});
