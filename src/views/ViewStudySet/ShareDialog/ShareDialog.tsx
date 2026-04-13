import {
    Box,
    Button,
    DialogActions,
    DialogContent,
    IconButton,
} from '@mui/material/';
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
                title={t('dialogs.share.title')}
                onClose={onClose}
            />
            <DialogContent></DialogContent>
        </StyledDialog>
    );
};

export default NotificationsDialog;
