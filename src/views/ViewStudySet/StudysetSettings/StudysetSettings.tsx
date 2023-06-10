import {
    Button,
    DialogContent,
    FormControl,
    FormControlLabel,
    FormLabel,
    Radio,
    RadioGroup,
} from "@mui/material";
import { Studyset } from "lib/types";
import { ChangeEvent, useState, MouseEvent, useEffect } from "react";
import { STUDYSET_TERMINOLOGIES } from "utilities/constants";
import { useUpdateStudysetMetadataMutation } from "state/api/studysets";
import useCustomMutation from "lib/hooks/useCustomMutation";
import { CustomInputsContainer, StyledDialog, StyledTextField } from "./styles";
import { FlexDialogTitle as StyledDialogTitle } from "common/AppStyles";
import CloseDialogButton from "components/CloseDialogButton/CloseDialogButton";


type Props = {
    open: boolean;
    onClose: () => void;
    studyset: Studyset | undefined;
};

const StudysetSettings = (props: Props) => {
    const { open, onClose, studyset } = props;

    const [customTerminology1, setCustomTerminology1] = useState<string>("");
    const [customTerminology2, setCustomTerminology2] = useState<string>("");

    const isCustomTerminology = studyset?.metadata?.terminology === STUDYSET_TERMINOLOGIES.CUSTOM;

    useEffect(() => {
        if (isCustomTerminology) {
            const [term1, term2] = studyset?.metadata?.customTerminology?.split("/") ?? [];
            setCustomTerminology1(term1);
            setCustomTerminology2(term2);
        }
    }, [studyset])

    const [updateStudysetMetadata, { isLoading: isUpdatingTerminology }] = useUpdateStudysetMetadataMutation();

    const onTerminologyChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { uuid = "" } = studyset ?? {};
        const newValue = e.target.value;

        updateStudysetMetadata({
            property: "terminology",
            newValue,
            uuid,
        });
    };

    const handleSaveCustomTerminology = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();

        const { uuid = "" } = studyset ?? {};
        const newValue = `${customTerminology1}/${customTerminology2}`;
        updateStudysetMetadata({
            property: "customTerminology",
            newValue,
            uuid,
        });
    };

    return (
        <StyledDialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <StyledDialogTitle>
                Studyset Settings
                <CloseDialogButton onClose={onClose} />
            </StyledDialogTitle>
            <DialogContent>
                <div>
                    <FormControl>
                        <FormLabel id="terminology-radio-group-label">
                            Terminology
                        </FormLabel>
                        <RadioGroup
                            aria-labelledby="terminology-radio-group-label"
                            name="terminology-radio-group"
                            onChange={onTerminologyChange}
                            value={
                                (isCustomTerminology
                                    ? STUDYSET_TERMINOLOGIES.CUSTOM
                                    : studyset?.metadata?.terminology) ??
                                STUDYSET_TERMINOLOGIES.TERM_DEFINITION
                            }
                        >
                            {Object.values(STUDYSET_TERMINOLOGIES).map(
                                (value) => (
                                    <FormControlLabel
                                        key={value}
                                        value={value}
                                        control={<Radio />}
                                        label={
                                            <>
                                                {value}
                                                {value ===
                                                    STUDYSET_TERMINOLOGIES.CUSTOM && (
                                                    <CustomInputsContainer>
                                                        <StyledTextField
                                                            label="Terminology 1"
                                                            onChange={(e) =>
                                                                setCustomTerminology1(
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            value={customTerminology1}
                                                        />
                                                        <StyledTextField
                                                            label="Terminology 2"
                                                            onChange={(e) =>
                                                                setCustomTerminology2(
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            value={customTerminology2}
                                                        />
                                                        <Button
                                                            variant="contained"
                                                            disabled={
                                                                !customTerminology1 ||
                                                                !customTerminology2
                                                            }
                                                            onClick={
                                                                handleSaveCustomTerminology
                                                            }
                                                        >
                                                            Save
                                                        </Button>
                                                    </CustomInputsContainer>
                                                )}
                                            </>
                                        }
                                    />
                                )
                            )}
                        </RadioGroup>
                    </FormControl>
                </div>
            </DialogContent>
        </StyledDialog>
    );
};

export default StudysetSettings;
