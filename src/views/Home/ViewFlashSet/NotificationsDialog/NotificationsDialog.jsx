import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    IconButton,
    MenuItem,
    Modal,
    Paper,
    Select,
    Switch,
    TextField,
    Tooltip,
    Typography
} from '@mui/material/';
import { Email } from '@mui/icons-material';
import { styled } from "@mui/system";

const StyledNotificationContainer = styled(Box)(({ theme }) => ({
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    display: 'flex',
    flexDirection: "column",
    padding: "1.5rem",
    height: "25rem",
    width: "50rem",
    background: theme.palette.background.paper
}));

const NotificationsDialog = props => {
    const {
        open,
        handleClose,
    } = props

    return (
        <Modal
            open={open}
            onClose={handleClose}
        >
                <StyledNotificationContainer>
                    <Typography
                        variant="h5"
                    >
                        Manage Notifications
                    </Typography>
                    <div>
                        <IconButton
                        // onClick={() => testEmail().then(data => {
                        //     console.log("Data received from POSTing data")
                        // })}
                        >
                            <Email />
                        </IconButton>
                    </div>
                </StyledNotificationContainer>
        </Modal>
    )
}

export default NotificationsDialog;