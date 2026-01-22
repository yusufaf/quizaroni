import {
    Box,
    Button,
    DialogActions,
    DialogContent,
    IconButton,
} from '@mui/material/';
import { Email } from '@mui/icons-material';
import { StyledDialog } from './styles';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import { useTranslation } from 'react-i18next';

type Props = {
    onClose: () => void;
    open: boolean;
};

const NotificationsDialog = (props: Props) => {
    const { open, onClose } = props;
    const { t } = useTranslation();

    return (
        <StyledDialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <StandardDialogTitle
                title={t('dialogs.notifications.title')}
                onClose={onClose}
            />

            <DialogContent>
                <IconButton
                // onClick={() => testEmail().then(data => {
                //     console.log("Data received from POSTing data")
                // })}
                >
                    <Email />
                </IconButton>
            </DialogContent>
        </StyledDialog>
    );
};

export default NotificationsDialog;
