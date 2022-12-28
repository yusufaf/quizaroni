import { Close as CloseIcon } from "@mui/icons-material";
import { Alert, IconButton, Snackbar } from "@mui/material";
import React from 'react';
import { useDispatch, useSelector } from "react-redux";
import { selectAlert, setAlert } from "src/slices/globalSlice";

const GlobalToast = props => {
    const dispatch = useDispatch();
    const globalToast = useSelector(selectAlert);
    const {
        open,
        message,
        duration = 3000,
        type
    } = globalToast

    // useEffect(() => {
    //     if (!globalToast && open) {
    //         // setOpen(false);
    //         return;
    //     }

    // }, [globalToast])

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        dispatch(setAlert(
            {
                open: false,
                type: "",
            }
        ))
    };

    const action = (
        <React.Fragment>
            <IconButton
                size="small"
                onClick={handleClose}
            >
                <CloseIcon fontSize="small" />
            </IconButton>
        </React.Fragment>
    );

    return (
        <div>
            <Snackbar
                open={open}
                autoHideDuration={duration}
                onClose={handleClose}
                action={action}
            >
                <Alert
                    onClose={handleClose}
                    severity={type}
                >
                    {message}
                </Alert>
            </Snackbar>
        </div>
    );
}

export default GlobalToast;