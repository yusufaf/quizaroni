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
import { FORMAT_TERMINOLOGIES } from 'shared/constants';
import { CustomInputsContainer, CustomInputRow, StyledTextField } from './styles';
import { useUpdateStudyset } from 'state/api/studysetsAPI';
import { Check } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

type Props = {
    studyset: Studyset | undefined;
};
const FormatTerminologies = ({ studyset }: Props) => {
    const { t } = useTranslation();
    const { mutate: updateStudySet } = useUpdateStudyset();

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
    const [isSaved, setIsSaved] = useState<boolean>(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout>();

    const isCustomTerminology =
        studyset?.metadata?.terminology === FORMAT_TERMINOLOGIES.CUSTOM;

    useEffect(() => {
        if (isCustomTerminology) {
            const [term1, term2] =
                studyset?.metadata?.customTerminology?.split('/') ?? [];
            setCustomTerminology1(term1 || '');
            setCustomTerminology2(term2 || '');
        }
    }, [studyset, isCustomTerminology]);

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

    const saveCustomTerminology = useCallback(
        (term1: string, term2: string) => {
            const { studysetUUID = '' } = studyset ?? {};
            const newValue = `${term1}/${term2}`;

            updateStudySet({
                studysetUUID,
                updates: {
                    customTerminology: newValue,
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
        (term1: string, term2: string) => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            setIsSaved(false);
            saveTimeoutRef.current = setTimeout(() => {
                if (term1 && term2) {
                    saveCustomTerminology(term1, term2);
                }
            }, 1000);
        },
        [saveCustomTerminology]
    );

    const onCustomTerminologyChange = (
        e: ChangeEvent<HTMLInputElement>,
        inputNumber: 1 | 2
    ) => {
        const newValue = e.target.value;
        const localErrorsMap = new Map(customTerminologyErrors);

        if (newValue.includes('/')) {
            localErrorsMap.set(inputNumber, '/ is not allowed');
            setCustomTerminologyErrors(localErrorsMap);
            return;
        }

        localErrorsMap.set(inputNumber, '');
        setCustomTerminologyErrors(localErrorsMap);

        const updatedTerm1 = inputNumber === 1 ? newValue : customTerminology1;
        const updatedTerm2 = inputNumber === 2 ? newValue : customTerminology2;

        if (inputNumber === 1) {
            setCustomTerminology1(newValue);
        } else {
            setCustomTerminology2(newValue);
        }

        debouncedSave(updatedTerm1, updatedTerm2);
    };

    return (
        <div>
            <FormControl>
                <FormLabel id="terminology-radio-group-label" sx={{ fontWeight: 'bold', fontSize: '1.125rem' }}>
                    {t('studysetSettings.terminology')}
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
                        <div key={value}>
                            <FormControlLabel
                                value={value}
                                control={<Radio />}
                                label={t(`terminology.format.${value === 'Term/Definition' ? 'termDefinition' : value === 'Question/Answer' ? 'questionAnswer' : value === 'Prompt/Response' ? 'promptResponse' : value === 'Word/Meaning' ? 'wordMeaning' : value === 'Fact/Explanation' ? 'factExplanation' : 'custom'}`)}
                            />
                            {value === FORMAT_TERMINOLOGIES.CUSTOM &&
                                isCustomTerminology && (
                                    <CustomInputsContainer>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ marginBottom: '0.25rem' }}
                                        >
                                            {t('studysetSettings.defineCustomTerminology')}
                                        </Typography>
                                        <CustomInputRow>
                                            <StyledTextField
                                                placeholder="e.g., Front"
                                                label={t('studysetSettings.firstTerm')}
                                                size="small"
                                                onChange={(e) =>
                                                    onCustomTerminologyChange(
                                                        e as ChangeEvent<HTMLInputElement>,
                                                        1
                                                    )
                                                }
                                                value={customTerminology1}
                                                error={Boolean(
                                                    customTerminologyErrors.get(1)
                                                )}
                                                helperText={customTerminologyErrors.get(
                                                    1
                                                )}
                                            />
                                            <Typography
                                                variant="body1"
                                                color="text.secondary"
                                            >
                                                /
                                            </Typography>
                                            <StyledTextField
                                                placeholder="e.g., Back"
                                                label={t('studysetSettings.secondTerm')}
                                                size="small"
                                                onChange={(e) =>
                                                    onCustomTerminologyChange(
                                                        e as ChangeEvent<HTMLInputElement>,
                                                        2
                                                    )
                                                }
                                                value={customTerminology2}
                                                error={Boolean(
                                                    customTerminologyErrors.get(2)
                                                )}
                                                helperText={customTerminologyErrors.get(
                                                    2
                                                )}
                                            />
                                        </CustomInputRow>
                                        {customTerminology1 &&
                                            customTerminology2 &&
                                            isSaved && (
                                                <Chip
                                                    icon={<Check />}
                                                    label={t('studysetSettings.saved')}
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

export default FormatTerminologies;
