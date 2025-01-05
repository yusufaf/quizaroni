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
import { FORMAT_TERMINOLOGIES } from 'shared/constants';
import { CustomInputsContainer, StyledTextField } from './styles';
import { useUpdateStudysetMutation } from 'state/api/studysetsAPI';

type Props = {
    studyset: Studyset | undefined;
};
const FormatTerminologies = ({ studyset }: Props) => {
    const [updateStudySet] = useUpdateStudysetMutation();

    const [customTerminology1, setCustomTerminology1] = useState<string>('');
    const [customTerminology2, setCustomTerminology2] = useState<string>('');
    const [customTerminologyErrors, setCustomTerminologyErrors] = useState<
        Map<number, string>
    >(
        new Map([
            [1, ''],
            [2, ''],
        ])
    );

    const isCustomTerminology =
        studyset?.metadata?.terminology === FORMAT_TERMINOLOGIES.CUSTOM;

    useEffect(() => {
        if (isCustomTerminology) {
            const [term1, term2] =
                studyset?.metadata?.customTerminology?.split('/') ?? [];
            setCustomTerminology1(term1);
            setCustomTerminology2(term2);
        }
    }, [studyset]);

    const onTerminologyChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { studysetUUID = '' } = studyset ?? {};
        const newValue = e.target.value;

        updateStudySet({
            studysetUUID,
            updates: {
                terminology: newValue,
            },
            isMetadataUpdate: true,
        });
    };

    const handleSaveCustomTerminology = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();

        const { studysetUUID = '' } = studyset ?? {};
        const newValue = `${customTerminology1}/${customTerminology2}`;

        updateStudySet({
            studysetUUID,
            updates: {
                customTerminology: newValue,
            },
            isMetadataUpdate: true,
        });
    };

    const onCustomTerminologyChange = (
        e: ChangeEvent<HTMLInputElement>,
        inputNumber: 1 | 2
    ) => {
        const setStateCallback =
            inputNumber === 1 ? setCustomTerminology1 : setCustomTerminology2;

        const newValue = e.target.value;
        const localErrorsMap = new Map(customTerminologyErrors);
        if (newValue.includes('/')) {
            localErrorsMap.set(inputNumber, '/ is a disallowed character.');
            setCustomTerminologyErrors(localErrorsMap);
        } else {
            localErrorsMap.set(inputNumber, '');
            setCustomTerminologyErrors(localErrorsMap);
            setStateCallback(newValue);
        }
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
                                    {value === FORMAT_TERMINOLOGIES.CUSTOM && (
                                        <CustomInputsContainer>
                                            <StyledTextField
                                                label="Terminology 1"
                                                onChange={(e) =>
                                                    onCustomTerminologyChange(
                                                        e as ChangeEvent<HTMLInputElement>,
                                                        1
                                                    )
                                                }
                                                value={customTerminology1}
                                                error={Boolean(
                                                    customTerminologyErrors.get(
                                                        1
                                                    )
                                                )}
                                                helperText={customTerminologyErrors.get(
                                                    1
                                                )}
                                            />
                                            <StyledTextField
                                                label="Terminology 2"
                                                onChange={(e) =>
                                                    onCustomTerminologyChange(
                                                        e as ChangeEvent<HTMLInputElement>,
                                                        2
                                                    )
                                                }
                                                value={customTerminology2}
                                                error={Boolean(
                                                    customTerminologyErrors.get(
                                                        2
                                                    )
                                                )}
                                                helperText={customTerminologyErrors.get(
                                                    2
                                                )}
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
