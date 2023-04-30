import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
    Tooltip,
    Typography
} from '@mui/material/';
import { styled } from "@mui/system";
import { useTheme } from "theme/useTheme";

const CreateLabelDialog = props => {
    const {
        createNewLabel,
        showCreateLabelDialog,
        setCreateLabelName,
        setShowCreateLabelDialog,
    } = props;

    return (
        <Dialog open={showCreateLabelDialog} onClose={() => setShowCreateLabelDialog(false)}>
            <DialogTitle>Create new label</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Please enter the name of the label you want to create.
                </DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    id="name"
                    label="Label Name"
                    type="email"
                    fullWidth
                    variant="standard"
                    // sx={{
                    //     color: 
                    // }}
                    onChange={e => setCreateLabelName(e.target.value)}
                />
            </DialogContent>
            <DialogActions>
                {/* Todo: Figure out good color for a cancel button */}
                <Button onClick={() => setShowCreateLabelDialog(false)}
                    sx={{ color: "gray" }}
                >
                    Cancel
                </Button>
                <Button onClick={() => createNewLabel()}
                    sx={{ color: "orange" }}

                >Create
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default CreateLabelDialog;