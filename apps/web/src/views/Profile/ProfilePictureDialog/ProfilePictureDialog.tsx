import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@mui/material";

type Props = {
  open: boolean;
  handleClose: () => void;
  handleImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ProfilePictureDialog = (props: Props) => {
  const { open, handleClose, handleImageChange } = props;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth

    >
      <DialogTitle>Profile Picture</DialogTitle>
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
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Cancel
        </Button>

        </DialogActions>

    </Dialog>


  )
}

export default ProfilePictureDialog;