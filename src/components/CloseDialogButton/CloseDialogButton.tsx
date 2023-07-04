import { Close as CloseIcon } from "@mui/icons-material/";
import { RightAlignedCloseButton as CloseButton } from "common/AppStyles";

type Props = {
    onClose: () => void;
};

const CloseDialogButton = (props: Props) => {
    const { onClose } = props;

    return (
        <CloseButton 
            aria-label="close" 
            title="Close"
            onClick={onClose} 
        >
            <CloseIcon />
        </CloseButton>
    );
};

export default CloseDialogButton;
