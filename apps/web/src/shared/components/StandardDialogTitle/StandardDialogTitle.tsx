import { Close as CloseIcon } from '@mui/icons-material/';
import {
    RightAlignedCloseButton as CloseButton,
    StyledDialogTitle,
} from 'styles/AppStyles';

type Props = {
    onClose: () => void;
    title: string;
};

const CloseDialogButton = ({ onClose, title }: Props) => {
    return (
        <StyledDialogTitle>
            {title}
            <CloseButton aria-label="close" title="Close" onClick={onClose}>
                <CloseIcon />
            </CloseButton>
        </StyledDialogTitle>
    );
};

export default CloseDialogButton;
