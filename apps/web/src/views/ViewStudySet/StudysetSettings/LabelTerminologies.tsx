import {
    FormControl,
    FormControlLabel,
    FormLabel,
    Radio,
    RadioGroup,
    Typography,
    Chip,
} from '@mui/material';
import { Studyset } from 'shared/types';
import { ChangeEvent, useState, useEffect, useCallback, useRef } from 'react';
import { CustomInputsContainer, CustomInputRow, StyledTextField } from './styles';
import { LABEL_TERMINOLOGIES } from 'shared/constants';
import { useUpdateStudyset } from 'state/api/studysetsAPI';
import { Check } from '@mui/icons-material';

type Props = {
    studyset: Studyset | undefined;
};

const LabelTerminologies = ({ studyset }: Props) => {
    const { mutate: updateStudySet } = useUpdateStudyset();
    const [customTerminology, setCustomTerminology] = useState<string>('');
    const [isSaved, setIsSaved] = useState<boolean>(true);
    const saveTimeoutRef = useRef<NodeJS.Timeout>();

    const isCustomTerminology =
        studyset?.metadata?.labelTerminology === LABEL_TERMINOLOGIES.CUSTOM;

    useEffect(() => {
        if (isCustomTerminology) {
            setCustomTerminology(studyset?.metadata?.customLabelTerminology || '');
        }
    }, [studyset, isCustomTerminology]);

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

    const saveCustomTerminology = useCallback(
        (value: string) => {
            const { studysetUUID = '' } = studyset ?? {};

            updateStudySet({
                studysetUUID,
                updates: {
                    customLabelTerminology: value,
                },
                isMetadataUpdate: true,
            });
            setIsSaved(true);

            // Hide saved indicator after 2 seconds
            setTimeout(() => {
                setIsSaved(false);
            }, 2000);
        },
        [studyset, updateStudySet]
    );

    const debouncedSave = useCallback(
        (value: string) => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            setIsSaved(false);
            saveTimeoutRef.current = setTimeout(() => {
                if (value) {
                    saveCustomTerminology(value);
                }
            }, 1000);
        },
        [saveCustomTerminology]
    );

    const onCustomTerminologyChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setCustomTerminology(newValue);
        debouncedSave(newValue);
    };

    return (
        <div>
            <FormControl>
                <FormLabel id="label-terminology-radio-group-label" sx={{ fontWeight: 'bold', fontSize: '1.125rem' }}>
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
                        <div key={value}>
                            <FormControlLabel
                                value={value}
                                control={<Radio />}
                                label={value}
                            />
                            {value === LABEL_TERMINOLOGIES.CUSTOM &&
                                isCustomTerminology && (
                                    <CustomInputsContainer>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ marginBottom: '0.25rem' }}
                                        >
                                            Define your custom label terminology:
                                        </Typography>
                                        <CustomInputRow>
                                            <StyledTextField
                                                placeholder="e.g., Card, Item, Entry"
                                                label="Custom terminology"
                                                size="small"
                                                onChange={onCustomTerminologyChange}
                                                value={customTerminology}
                                            />
                                        </CustomInputRow>
                                        {customTerminology && isSaved && (
                                            <Chip
                                                icon={<Check />}
                                                label="Saved"
                                                color="success"
                                                size="small"
                                                sx={{ width: 'fit-content' }}
                                            />
                                        )}
                                    </CustomInputsContainer>
                                )}
                        </div>
                    ))}
                </RadioGroup>
            </FormControl>
        </div>
    );
};

export default LabelTerminologies;
