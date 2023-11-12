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
} from "@mui/material/";
import styled from "@emotion/styled";
import { FlexColumn, SimpleFlexContainer } from "common/AppStyles";

export const StyledDialog = styled(Dialog)({
    "& .MuiDialog-paper": {
        height: "32rem",
    },
});

export const StyledDialogContent = styled(DialogContent)({
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "1rem",
});

export const StyledDialogActions = styled(DialogActions)({
    margin: "0 1rem 1rem 0"
})

export const ColorNameField = styled(TextField)({
    marginTop: "1.25rem",
});


export const SwatchPaper = styled(Paper)({
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    marginTop: "4.25rem",
    width: "7rem",
    padding: "0.5rem 0.5rem 0 0.5rem",
    borderRadius: "0.25rem",
})

export const Swatch = styled("div")(({ theme }) => ({
    alignSelf: "center",
    height: "2rem",
    width: "5rem",
    borderRadius: "0.25rem",
    cursor: "pointer",
    border: `0.125rem solid ${theme.palette.divider}`,
}));

export const NamedColorPickerContainer = styled("div")({
    position: "absolute",
})

export const ManageTabContainer = styled(FlexColumn)({
    gap: "1rem",
})

export const ManageTabButton = styled(Button)({
    width: "16rem",
});


export const ColorsListContainer = styled("div")(({ theme }) => ({
    maxHeight: "20rem",
    overflowY: "auto",
    "&::-webkit-scrollbar": {
        width: "0.5rem",
    },
    // "&::-webkit-scrollbar-track": {
    // },
    "&::-webkit-scrollbar-thumb": {
        background: theme.palette.grey[500],
    },
}));

export const ColorsListPaper = styled(Paper)({});

export const StyledColorsList = styled(List)({});

export const ColorButtonsContainer = styled(SimpleFlexContainer)({
    gap: "0.5rem",
});