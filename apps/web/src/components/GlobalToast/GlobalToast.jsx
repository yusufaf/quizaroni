import React, { useEffect, useState } from 'react';
import { IconButton, Snackbar } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { selectAlert, setAlert } from "src/slices/globalSlice";

const GlobalToast = props => {
    const globalToast = useSelector(selectAlert);
    const {
        open
    } = globalToast

    useEffect(() => {
        if (!globalToast && open) {
            // setOpen(false);
            return;
        }

    }, [globalToast])


    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }

        // setOpen(false);
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
                autoHideDuration={4000}
                onClose={handleClose}
                message="Note archived"
                action={action}
            />
        </div>
    );

}

export default GlobalToast;