import { Studyset } from "lib/types";
import { StyledDialog, StyledDialogContent } from "./styles";
import {
    FlexColumn,
    StyledDialogTitle,
} from "common/AppStyles";
import CloseDialogButton from "components/CloseDialogButton/CloseDialogButton";
import FormatTerminologies from "./FormatTerminologies";
import LabelTerminologies from "./LabelTerminologies";
import { ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import {
    NOTES_DRAWER_INITIAL_APPEARANCE,
    NOTES_DRAWER_POSITIONS,
} from "utilities/constants";
import { useUpdateStudysetMutation } from "state/api/studysetsAPI";

type Props = {
    open: boolean;
    onClose: () => void;
    studyset: Studyset | undefined;
};
const StudysetSettings = ({ open, onClose, studyset }: Props) => {
    const [updateStudySet] = useUpdateStudysetMutation();
    
    const handleAlignmentChange = (
        _event: React.MouseEvent<HTMLElement>,
        newAlignment: string | null
    ) => {
        updateStudySet({
            studysetUUID: studyset?.studysetUUID ?? '',
            updates: {
                notesDrawerPosition: newAlignment
            },
            isMetadataUpdate: true,
        });
    };

    const handleInitialAppearanceChange = (
        _event: React.MouseEvent<HTMLElement>,
        newInitialAppearance: boolean | null
    ) => {
        updateStudySet({
            studysetUUID: studyset?.studysetUUID ?? '',
            updates: {
                notesDrawerInitial: newInitialAppearance
            },
            isMetadataUpdate: true,
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
                <FlexColumn style={{ gap: "1rem" }}>
                    <div>
                        <Typography variant="subtitle1">
                            Notes Drawer Alignment
                        </Typography>
                        <ToggleButtonGroup
                            value={
                                studyset?.metadata?.notesDrawerPosition ??
                                NOTES_DRAWER_POSITIONS.LEFT
                            }
                            exclusive
                            aria-label="notes drawer alignment"
                            onChange={handleAlignmentChange}
                        >
                            <ToggleButton
                                value="left"
                                aria-label="left anchored"
                            >
                                Left
                            </ToggleButton>
                            <ToggleButton
                                value="right"
                                aria-label="right anchored"
                            >
                                Right
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </div>
                    <div>
                        <Typography variant="subtitle1">
                            Notes Drawer Initial Appearance
                        </Typography>
                        <ToggleButtonGroup
                            value={
                                studyset?.metadata?.notesDrawerInitial ?? NOTES_DRAWER_INITIAL_APPEARANCE.OPEN
                            }
                            exclusive
                            aria-label="notes drawer initial appearance"
                            onChange={handleInitialAppearanceChange}
                        >
                            <ToggleButton
                                value={NOTES_DRAWER_INITIAL_APPEARANCE.CLOSED}
                                aria-label="initially closed"
                            >
                                Closed
                            </ToggleButton>
                            <ToggleButton
                                value={NOTES_DRAWER_INITIAL_APPEARANCE.OPEN}
                                aria-label="initially open"
                            >
                                Open
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </div>
                </FlexColumn>
            </StyledDialogContent>
        </StyledDialog>
    );
};

export default StudysetSettings;
