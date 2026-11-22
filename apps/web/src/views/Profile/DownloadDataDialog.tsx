import { useState } from 'react';
import {
    Button,
    Checkbox,
    Dialog,
    DialogContentText,
    FormControlLabel,
} from '@mui/material/';
import { StyledDialogActions } from 'styles/AppStyles';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import { DeleteDialogContent } from './ProfileStyles';
import { useDownloadUserData } from 'state/api/usersAPI';
import { isSelfHost } from 'shared/auth/backend';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

type Props = {
    open: boolean;
    handleClose: () => void;
};

const DownloadDataDialog = ({ open, handleClose }: Props) => {
    const { t } = useTranslation('profile');
    const [includeStudysets, setIncludeStudysets] = useState(false);

    const { mutateAsync, isPending } = useDownloadUserData();
    const selfHost = isSelfHost();

    // Only the self-host server builds an export; the AWS button stays inert.
    const handleDownloadData = async () => {
        if (!selfHost) return;
        try {
            await mutateAsync({ includeStudysets });
            handleClose();
        } catch {
            toast.error(t('downloadDataDialog.downloadFailed'));
        }
    };

    const handleCheckboxChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setIncludeStudysets(event.target.checked);
    };

    return (
        <Dialog open={open} onClose={handleClose}>
            <StandardDialogTitle
                title={t('downloadDataDialog.title')}
                onClose={handleClose}
            />
            <DeleteDialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    {t('downloadDataDialog.intro')}
                </DialogContentText>
                <DialogContentText>
                    {t('downloadDataDialog.note')}
                </DialogContentText>

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={includeStudysets}
                            onChange={handleCheckboxChange}
                        />
                    }
                    label={t('downloadDataDialog.includeStudysets')}
                />
            </DeleteDialogContent>
            <StyledDialogActions>
                <Button
                    variant="contained"
                    onClick={handleDownloadData}
                    disabled={isPending}
                >
                    {t('downloadDataDialog.confirmButton')}
                </Button>
            </StyledDialogActions>
        </Dialog>
    );
};

export default DownloadDataDialog;
