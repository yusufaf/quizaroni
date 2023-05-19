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
import { SimpleFlexContainer } from "src/AppStyles";

export const StyledDialog = styled(Dialog)({
    "& .MuiDialog-paper": {
        // width: "60rem",
        height: "32rem",
    },
});

export const StyledDialogContent = styled(DialogContent)({
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
});

export const CategoriesListContainer = styled("div")(({ theme }) => ({
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

export const CategoryButtons = styled(SimpleFlexContainer)({
    gap: "0.5rem",
});

export const CategoryField = styled(TextField)({
    marginTop: "1.25rem",
});

export const CategoryInputsContainer = styled(SimpleFlexContainer)({
    flexDirection: "column",
    alignItems: "flex-start",
    marginTop: "1rem",
    gap: "1rem",
});

export const CategoryFormControl = styled(FormControl)({
    width: "20rem",
});

export const StyledMenuItem = styled(MenuItem)({
    width: "20rem",
});
