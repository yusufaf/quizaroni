import {
    Box,
    Button,
    DialogActions,
    DialogContent,
    IconButton,
} from '@mui/material/';
import { StyledDialog } from './styles';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';

type Props = {
    onClose: () => void;
    open: boolean;
};

const NotificationsDialog = (props: Props) => {
    const { open, onClose } = props;

    return (
        <StyledDialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <StandardDialogTitle title="Share" onClose={onClose} />
            <DialogContent></DialogContent>
        </StyledDialog>
    );
};

export default NotificationsDialog;
