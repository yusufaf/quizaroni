import { useState } from 'react';
import {
    Button,
    Checkbox,
    Dialog,
    DialogContentText,
    FormControlLabel,
} from '@mui/material/';
import { StyledDialogActions } from 'common/AppStyles';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import { DeleteDialogContent } from './ProfileStyles';

type Props = {
    open: boolean;
    handleClose: () => void;
};

const DownloadDataDialog = ({ open, handleClose }: Props) => {
    const [includeStudysets, setIncludeStudysets] = useState(false);

    const handleDownloadData = () => {};

    const handleCheckboxChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setIncludeStudysets(event.target.checked);
    };

    return (
        <Dialog open={open} onClose={handleClose}>
            <StandardDialogTitle title="Download Data" onClose={handleClose} />
            <DeleteDialogContent>
                <DialogContentText>
                    You can download a copy of your data by clicking the
                    "Download Data" button below. This will generate a file
                    containing your personal information, saved settings, and
                    other relevant data.
                    <br />
                    <br />
                    Please note that depending on the amount of data stored, the
                    download process may take a few moments to complete. Once
                    the download begins, you can save the file to your device
                    for future reference or personal use.
                </DialogContentText>

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={includeStudysets}
                            onChange={handleCheckboxChange}
                        />
                    }
                    label="Include studysets in the download"
                />
            </DeleteDialogContent>
            <StyledDialogActions>
                <Button
                    variant="contained"
                    onClick={() => handleDownloadData()}
                >
                    Download Data
                </Button>
            </StyledDialogActions>
        </Dialog>
    );
};

export default DownloadDataDialog;
