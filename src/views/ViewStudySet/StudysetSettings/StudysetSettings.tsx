import { Studyset } from "lib/types";
import { StyledDialog, StyledDialogContent } from "./styles";
import { FlexDialogTitle as StyledDialogTitle } from "common/AppStyles";
import CloseDialogButton from "components/CloseDialogButton/CloseDialogButton";
import FormatTerminologies from "./FormatTerminologies";
import LabelTerminologies from "./LabelTerminologies";

type Props = {
    open: boolean;
    onClose: () => void;
    studyset: Studyset | undefined;
};

const StudysetSettings = (props: Props) => {
    const { open, onClose, studyset } = props;

    return (
        <StyledDialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <StyledDialogTitle>
                Studyset Settings
                <CloseDialogButton onClose={onClose} />
            </StyledDialogTitle>
            <StyledDialogContent>
                <FormatTerminologies studyset={studyset} />
                <LabelTerminologies studyset={studyset} />
            </StyledDialogContent>
        </StyledDialog>
    );
};

export default StudysetSettings;
