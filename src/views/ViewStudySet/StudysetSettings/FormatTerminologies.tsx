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
import { FORMAT_TERMINOLOGIES } from "utilities/constants";
import { useUpdateStudysetMetadataMutation } from "state/api/studysetsAPI";
import { CustomInputsContainer, StyledTextField } from "./styles";

type Props = {
    studyset: Studyset | undefined;
};

const FormatTerminologies = (props: Props) => {
    const { studyset } = props;

    const [customTerminology1, setCustomTerminology1] = useState<string>("");
    const [customTerminology2, setCustomTerminology2] = useState<string>("");

    const isCustomTerminology =
        studyset?.metadata?.terminology === FORMAT_TERMINOLOGIES.CUSTOM;

    useEffect(() => {
        if (isCustomTerminology) {
            const [term1, term2] =
                studyset?.metadata?.customTerminology?.split("/") ?? [];
            setCustomTerminology1(term1);
            setCustomTerminology2(term2);
        }
    }, [studyset]);

    const [updateStudysetMetadata, { isLoading: isUpdatingTerminology }] =
        useUpdateStudysetMetadataMutation();

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
                            ? FORMAT_TERMINOLOGIES.CUSTOM
                            : studyset?.metadata?.terminology) ??
                        FORMAT_TERMINOLOGIES.TERM_DEFINITION
                    }
                >
                    {Object.values(FORMAT_TERMINOLOGIES).map((value) => (
                        <FormControlLabel
                            key={value}
                            value={value}
                            control={<Radio />}
                            label={
                                <>
                                    {value}
                                    {value ===
                                        FORMAT_TERMINOLOGIES.CUSTOM && (
                                        <CustomInputsContainer>
                                            <StyledTextField
                                                label="Terminology 1"
                                                onChange={(e) =>
                                                    setCustomTerminology1(
                                                        e.target.value
                                                    )
                                                }
                                                value={customTerminology1}
                                            />
                                            <StyledTextField
                                                label="Terminology 2"
                                                onChange={(e) =>
                                                    setCustomTerminology2(
                                                        e.target.value
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
                    ))}
                </RadioGroup>
            </FormControl>
        </div>
    );
};

export default FormatTerminologies;
