import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
} from '@mui/material';
import { StyledDialogActions, StyledDialogTitle } from 'common/AppStyles';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import CloseDialogButton from 'components/StandardDialogTitle/StandardDialogTitle';

type Props = {
    open: boolean;
    onClose: () => void;
    handleImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

const ProfilePictureDialog = ({ open, onClose, handleImageChange }: Props) => {
    return (
        <Dialog open={open} onClose={onClose} fullWidth>
            <StandardDialogTitle title="Profile Picture" onClose={onClose} />
            <DialogContent>
                <DialogContentText>
                    Select a new profile picture
                </DialogContentText>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    id="profilePicture"
                    hidden
                />
            </DialogContent>
            <StyledDialogActions>
                <Button onClick={onClose} color="primary">
                    Cancel
                </Button>
            </StyledDialogActions>
        </Dialog>
    );
};

export default ProfilePictureDialog;
