import { Studyset } from "lib/types";
import { StyledDialog, StyledDialogContent } from "./styles";
import { FlexDialogTitle as StyledDialogTitle } from "common/AppStyles";
import CloseDialogButton from "components/CloseDialogButton/CloseDialogButton";
import FormatTerminologies from "./FormatTerminologies";
import LabelTerminologies from "./LabelTerminologies";
import { ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { NOTES_DRAWER_POSITIONS } from "utilities/constants";
import { useUpdateStudysetMetadataMutation } from "state/api/studysets";

type Props = {
    open: boolean;
    onClose: () => void;
    studyset: Studyset | undefined;
};

const StudysetSettings = (props: Props) => {
    const { open, onClose, studyset } = props;

    const [updateStudysetMetadata, { isLoading: isUpdatingTerminology }] =
        useUpdateStudysetMetadataMutation();

    const handleAlignmentChange = (
        _event: React.MouseEvent<HTMLElement>,
        newAlignment: string | null,
      ) => {
        updateStudysetMetadata({
            property: "notesDrawerPosition",
            newValue: newAlignment,
            uuid: studyset?.uuid ?? "",
        });
    };

    return (
        <StyledDialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <StyledDialogTitle>
                Studyset Settings
                <CloseDialogButton onClose={onClose} />
            </StyledDialogTitle>
            <StyledDialogContent>
                <FormatTerminologies studyset={studyset} />
                <LabelTerminologies studyset={studyset} />
                <div>
                    <Typography
                        variant="subtitle1"
                    >
                        Notes Drawer Alignment
                    </Typography>
                    <ToggleButtonGroup
                        value={studyset?.metadata?.notesDrawerPosition ?? NOTES_DRAWER_POSITIONS.LEFT}
                        exclusive
                        aria-label="notes drawer alignment"
                        onChange={handleAlignmentChange}
                    >
                        <ToggleButton value="left" aria-label="left anchored">
                            Left
                        </ToggleButton>
                        <ToggleButton value="right" aria-label="right anchored">
                            Right
                        </ToggleButton>
                    </ToggleButtonGroup>
                </div>
            </StyledDialogContent>
        </StyledDialog>
    );
};

export default StudysetSettings;
