import {
    Button,
    FormControl,
    FormControlLabel,
    FormLabel,
    Radio,
    RadioGroup,
} from "@mui/material";
import { Studyset } from "lib/types";
import { ChangeEvent, useState, MouseEvent, useEffect } from "react";
import { CustomInputsContainer, StyledTextField } from "./styles";
import { useUpdateStudysetMetadataMutation } from "state/api/studysets";
import { LABEL_TERMINOLOGIES } from "utilities/constants";

type Props = {
    studyset: Studyset | undefined;
};

const LabelTerminologies = (props: Props) => {
    const { studyset } = props;

    const [customTerminology, setCustomTerminology] = useState<string>("");

    const isCustomTerminology =
        studyset?.metadata?.labelTerminology === LABEL_TERMINOLOGIES.CUSTOM;

    const [updateStudysetMetadata, { isLoading: isUpdatingTerminology }] =
        useUpdateStudysetMetadataMutation();

    const onTerminologyChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { uuid = "" } = studyset ?? {};
        const newValue = e.target.value;

        updateStudysetMetadata({
            property: "labelTerminology",
            newValue,
            uuid,
        });
    };

    const handleSaveCustomTerminology = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();

        const { uuid = "" } = studyset ?? {};
        const newValue = customTerminology;
        updateStudysetMetadata({
            property: "customLabelTerminology",
            newValue,
            uuid,
        });
    };

    return (
        <div>
            <FormControl>
                <FormLabel id="label-terminology-radio-group-label">
                    Label Terminology
                </FormLabel>
                <RadioGroup
                    aria-labelledby="label-terminology-radio-group-label"
                    name="terminology-radio-group"
                    onChange={onTerminologyChange}
                    value={
                        (isCustomTerminology
                            ? LABEL_TERMINOLOGIES.CUSTOM
                            : studyset?.metadata?.labelTerminology) ??
                        LABEL_TERMINOLOGIES.CARD
                    }
                >
                    {Object.values(LABEL_TERMINOLOGIES).map((value) => (
                        <FormControlLabel
                            key={value}
                            value={value}
                            control={<Radio />}
                            label={
                                <>
                                    {value}
                                    {value === LABEL_TERMINOLOGIES.CUSTOM && (
                                        <CustomInputsContainer>
                                            <StyledTextField
                                                label="Terminology"
                                                onChange={(e) =>
                                                    setCustomTerminology(
                                                        e.target.value
                                                    )
                                                }
                                                value={customTerminology}
                                            />
                                            <Button
                                                variant="contained"
                                                disabled={!customTerminology}
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
                    ))}
                </RadioGroup>
            </FormControl>
        </div>
    );
};

export default LabelTerminologies;
