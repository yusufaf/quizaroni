import {
    Box,
    Button,
    DialogActions,
    DialogContent,
    IconButton,
} from "@mui/material/";
import { FlexDialogTitle as StyledDialogTitle } from "common/AppStyles";
import CloseDialogButton from "components/CloseDialogButton/CloseDialogButton";
import { StyledDialog } from "./styles";

type Props = {
    onClose: () => void;
    open: boolean;
};

const NotificationsDialog = (props: Props) => {
    const { open, onClose } = props;

    return (
        <StyledDialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <StyledDialogTitle>
                Share
                <CloseDialogButton onClose={onClose} />
            </StyledDialogTitle>

            <DialogContent>
            </DialogContent>
        </StyledDialog>
    );
};

export default NotificationsDialog;
