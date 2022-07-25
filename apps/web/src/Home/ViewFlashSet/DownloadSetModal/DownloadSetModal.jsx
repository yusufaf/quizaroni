import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    MenuItem,
    Select,
    Switch,
    TextField,
    Tooltip,
    Typography
} from '@mui/material/';
import { DOWNLOAD_FILE_TYPES } from 'src/utilities/constants';

const DownloadSetModal = props => {
    const {
        open,
        handleClose,
        downloadFileType,
        setDownloadFileType,
    } = props

    const fileDownloadTypes = Object.values(DOWNLOAD_FILE_TYPES).map(value => {
        return (
            <MenuItem value={value}>
                {value}
            </MenuItem>
        )
    });

    return (
        <Dialog open={open} onClose={handleClose}>
            <DialogTitle>Download flash set</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Choose what format you'd like to download the flash set as:
                </DialogContentText>
                <FormControl>
                    <Select
                        onChange={(e) => setDownloadFileType(e.target.value)}
                        value={downloadFileType}
                        defaultValue=""
                    >
                        {fileDownloadTypes}
                    </Select>
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button onClick={() => handleDownloadSet()}>
                    Download
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default DownloadSetModal;