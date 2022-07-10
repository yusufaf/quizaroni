
import { Modal, TextField, Typography } from '@mui/material/';
import { useTheme } from "../../theme/useTheme";
import { styled } from '@mui/system';

const ImportSetModal = props => {
    const { open, handleClose } = props
    const { isDarkMode, theme } = useTheme();

    // TODO: Use a MUI component instead?
    const ImportSetContainer = styled("div")({
        position : "absolute",
        top      : "50%",
        left     : "50%",
        transform: "translate(-50%, -50%)",
        height: "30rem",
        width: "50rem",
        padding: "1.5rem",
    })

    return (
        <Modal
            open={open}
            onClose={handleClose}
        >
            <ImportSetContainer>
                <Typography
                    variant="h5"
                >
                    Import cards
                </Typography>

                {/* Option to enter the cards like Quizlet has */}
                <textarea
                    placeholder="Enter a description for your new study set"
                    // onChange={e => setEnteredDescription(e.target.value)}
                />
                {/* TODO: Radio buttons */}
            </ImportSetContainer>
        </Modal>
    )
}

export default ImportSetModal;

