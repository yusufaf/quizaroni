import {
    Button,
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
} from '@mui/material';
import { StyledDialogTitle, StyledDialogActions } from 'styles/AppStyles';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useState } from 'react';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import { useGlobalStore } from 'state/stores/global';

type Props = {};

const FeedbackDialog = (props: Props) => {
    const { t } = useTranslation();
    const { feedbackDialogOpen: open, setFeedbackDialogOpen } =
        useGlobalStore();

    const onClose = () => {
        setFeedbackDialogOpen(false);
    };

    const [feedbackText, setFeedbackText] = useState<string>('');

    const onSubmit = () => {};

    return (
        <div>
            <Dialog open={open} onClose={onClose}>
                <StandardDialogTitle
                    title={t('feedbackDialog.title')}
                    onClose={onClose}
                />
                <DialogContent>
                    <DialogContentText>
                        {t('feedbackDialog.body')}
                    </DialogContentText>
                    <TextField
                        label={t('feedbackDialog.label')}
                        fullWidth
                        variant="outlined"
                        multiline={true}
                        minRows={4}
                        sx={{
                            marginTop: '1rem',
                        }}
                    />
                </DialogContent>
                <StyledDialogActions>
                    <Button variant="text" onClick={onClose}>
                        {t('buttons.cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        disabled={!feedbackText}
                        onClick={onClose}
                    >
                        {t('buttons.submit')}
                    </Button>
                </StyledDialogActions>
            </Dialog>
        </div>
    );
};

export default FeedbackDialog;
