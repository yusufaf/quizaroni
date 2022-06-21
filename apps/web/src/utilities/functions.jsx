import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material/';

export const updateBrowserTitle = title => {
    document.title = `Quizaroni | ${title}`
    return () => {
        document.title = `Quizaroni`;
    }
};

export const generateBinaryDialog = ({open, onClose, styling, retrieveTextStyling, extraFuns, mainText, subText }) => {
    <Dialog
        open={open}
        onClose={onClose}
        sx={styling}
    >
        <DialogTitle id="alert-dialog-title"
            sx={retrieveTextStyling(theme.foreground, "1.75rem")}
        >
            {mainText}
        </DialogTitle>
        <DialogContent>
            <DialogContentText id="alert-dialog-description"
                sx={retrieveTextStyling(theme.foreground, "1.5rem")}
            >
                {subText}
            </DialogContentText>
        </DialogContent>
        <DialogActions>
            <Button onClick={onClose}
                sx={{
                    color: "orange"
                }}
            >
                Cancel</Button>
            <Button
                onClick={() => {
                    onClose();
                    // Call each of the functions
                    extraFuns.forEach(fun => {
                        fun();
                    })
                }}
                autoFocus
                sx={{
                    color: "orange"
                }}
            >
                Yes
            </Button>
        </DialogActions>
    </Dialog>
}
