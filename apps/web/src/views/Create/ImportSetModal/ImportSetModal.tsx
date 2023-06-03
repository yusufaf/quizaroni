
import { Button, Dialog, DialogActions, TextField, Typography } from '@mui/material/';
import { useTheme } from "theme/useTheme";
import { styled } from '@mui/system';
import { BoldTypography } from 'common/AppStyles';

const ImportSetModal = props => {
    const { open, onClose } = props
    const { isDarkMode, theme } = useTheme();

    // TODO: Use a MUI component instead?
    const ImportSetContainer = styled("div")({
        height: "30rem",
        width: "50rem",
        padding: "1.5rem",
    })

    return (
        <Dialog
            open={open}
            onClose={onClose}
        >
            <ImportSetContainer>
                <BoldTypography
                    variant="h5"
                >
                    Import Cards
                </BoldTypography>
                <TextField
                    fullWidth
                    variant="outlined"
                    multiline={true}
                    minRows={4}
                />
                {/* Option to enter the cards like Quizlet has */}
                {/* TODO: Radio buttons */}

                <DialogActions>
                    <Button 
                        variant="contained"
                    >
                        Submit
                    </Button>
                </DialogActions>
            </ImportSetContainer>
        </Dialog>
    )
}

export default ImportSetModal;

