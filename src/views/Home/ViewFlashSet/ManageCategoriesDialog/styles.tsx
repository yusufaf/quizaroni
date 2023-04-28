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
        width: "32rem",
    },
});

export const CategoriesList = styled(List)({
    marginTop: "1rem",
});

export const CategoryButtons = styled(SimpleFlexContainer)({
    gap: "0.5rem",
});

export const CategoryField = styled(TextField)({
    marginTop: "1.25rem",
})

export const AssignCategoryContainer = styled(SimpleFlexContainer)({
    flexDirection: "column",
    alignItems: "flex-start",
    marginTop: "2rem",
    gap: "1rem",
});

export const AssignCategoryFormControl = styled(FormControl)({
    width: "20rem",
})

export const StyledMenuItem = styled(MenuItem)({
    width: "20rem",
})