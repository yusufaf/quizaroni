import {
    Button,
    FormControl,
    FormControlLabel,
    FormLabel,
    Radio,
    RadioGroup,
} from '@mui/material';
import { Studyset } from 'shared/types';
import { ChangeEvent, useState, MouseEvent, useEffect } from 'react';
import { CustomInputsContainer, StyledTextField } from './styles';
import { LABEL_TERMINOLOGIES } from 'shared/constants';
import { useUpdateStudysetMutation } from 'state/api/studysetsAPI';

type Props = {
    studyset: Studyset | undefined;
};

const LabelTerminologies = ({ studyset }: Props) => {
    const [updateStudySet] = useUpdateStudysetMutation();
    const [customTerminology, setCustomTerminology] = useState<string>('');

    const isCustomTerminology =
        studyset?.metadata?.labelTerminology === LABEL_TERMINOLOGIES.CUSTOM;

    const onTerminologyChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { studysetUUID = '' } = studyset ?? {};
        const newValue = e.target.value;

        updateStudySet({
            studysetUUID,
            updates: {
                labelTerminology: newValue,
            },
            isMetadataUpdate: true,
        });
    };

    const handleSaveCustomTerminology = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();

        const { studysetUUID = '' } = studyset ?? {};
        const newValue = customTerminology;

        updateStudySet({
            studysetUUID,
            updates: {
                customLabelTerminology: newValue,
            },
            isMetadataUpdate: true,
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
