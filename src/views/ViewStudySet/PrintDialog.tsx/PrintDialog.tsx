import { Dialog } from '@mui/material'
import { StyledDialogTitle } from "common/AppStyles";
import CloseDialogButton from "components/CloseDialogButton/CloseDialogButton";
import { Studyset } from "lib/types";

type Props = {
    open: boolean;
    onClose: () => void;
    studyset: Studyset | undefined;
};

const PrintDialog = (props: Props) => {
    const { open, onClose, studyset } = props;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen
        >
            <StyledDialogTitle>
                Print
                <CloseDialogButton onClose={onClose} />
            </StyledDialogTitle>

        </Dialog>
  )
}

export default PrintDialog;