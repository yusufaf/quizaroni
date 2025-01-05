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
} from '@mui/material/';
import styled from '@emotion/styled';
import { FlexColumn, SimpleFlexContainer } from 'styles/AppStyles';

export const StyledDialog = styled(Dialog)({
    '& .MuiDialog-paper': {
        // width: "60rem",
        height: '32rem',
    },
});

export const StyledDialogTitle = styled(DialogTitle)({
    display: 'flex',
});

export const CloseButton = styled(IconButton)({
    marginLeft: 'auto',
});

export const StyledDialogContent = styled(DialogContent)({
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
});

export const CategoriesListColumn = styled(FlexColumn)({
    gap: '0.5rem',
    marginTop: '4rem',
});

export const DownloadListButton = styled(Button)({
    display: 'flex',
    marginLeft: 'auto',
});

export const CategoriesListContainer = styled('div')(({ theme }) => ({
    maxHeight: '20rem',
    overflowY: 'auto',
    '&::-webkit-scrollbar': {
        width: '0.5rem',
    },
    '&::-webkit-scrollbar-thumb': {
        background: theme.palette.grey[500],
        borderRadius: '0.25rem',
    },
}));

export const CategoriesListPaper = styled(Paper)({});

export const StyledCategoriesList = styled(List)({});

export const CategoryButtons = styled(SimpleFlexContainer)({
    gap: '0.5rem',
});

export const CategoryField = styled(TextField)({
    marginTop: '1.25rem',
});

export const CategoryInputsContainer = styled(SimpleFlexContainer)({
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: '1rem',
    gap: '1rem',
});

export const CategoryFormControl = styled(FormControl)({
    width: '20rem',
});

export const StyledMenuItem = styled(MenuItem)({
    width: '20rem',
});

export const ManageTabContainer = styled(FlexColumn)({
    gap: '1rem',
});

export const ManageTabButton = styled(Button)({
    width: '16rem',
});

export const StyledDialogActions = styled(DialogActions)({
    margin: '0 1rem 1rem 0',
});
