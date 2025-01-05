import { Dialog } from '@mui/material';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import { Studyset } from 'shared/types';

type Props = {
    open: boolean;
    onClose: () => void;
    studyset: Studyset | undefined;
};

const PrintDialog = (props: Props) => {
    const { open, onClose, studyset } = props;

    return (
        <Dialog open={open} onClose={onClose} fullScreen>
            <StandardDialogTitle title="Print" onClose={onClose} />
        </Dialog>
    );
};

export default PrintDialog;
