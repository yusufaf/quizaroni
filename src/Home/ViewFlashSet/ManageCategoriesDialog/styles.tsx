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