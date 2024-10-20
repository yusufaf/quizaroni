import { Button, Dialog, DialogContentText, Typography } from '@mui/material/';
import * as C from 'utilities/constants';
import { StyledDialogTitle, StyledDialogActions } from 'common/AppStyles';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import { Dispatch, SetStateAction } from 'react';
import { DeleteDialogContent } from './ProfileStyles';

type Props = {
    open: boolean;
    handleClose: () => void;
};

const DownloadDataDialog = ({ open, handleClose }: Props) => {
    const handleDeleteAccount = () => {
        // TODO
    };

    return (
        <Dialog open={open} onClose={handleClose}>
            <StandardDialogTitle title="Download Title" onClose={handleClose} />
            <DeleteDialogContent>
                <DialogContentText></DialogContentText>
            </DeleteDialogContent>
            <StyledDialogActions>
                <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleDeleteAccount()}
                >
                    Delete Account
                </Button>
            </StyledDialogActions>
        </Dialog>
    );
};

export default DownloadDataDialog;
