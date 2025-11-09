import {
    Button,
    Chip,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    Typography,
} from '@mui/material';
import { Studyset } from 'shared/types';
import { LabelActionWarning, SelectChipsContainer } from './styles';
import { Dispatch, SetStateAction, useMemo } from 'react';
import useCustomMutation from 'hooks/useCustomMutation';
import { useChangeLabel } from 'state/api/studysetsAPI';
import { FlexColumn, SpacedFlexContainer } from 'styles/AppStyles';

type Props = {
    assignLabel: string;
    studysets: Studyset[];
    selectedStudysetUUIDs: string[];
    setSelectedStudysetUUIDs: Dispatch<SetStateAction<string[]>>;
};

const AssignTabView = ({
    assignLabel,
    studysets,
    selectedStudysetUUIDs = [],
    setSelectedStudysetUUIDs,
}: Props) => {
    const {
        mutate: changeLabel,
        isLoading: isChangingLabel,
        isSuccess: isChangeSuccess,
        isError: isChangeError,
    } = useCustomMutation({
        mutation: useChangeLabel,
        successMessage: 'Successfully updated label',
        errorMessage: 'Error updated label',
    });

    const assignDisabled = useMemo(() => {
        return !selectedStudysetUUIDs || selectedStudysetUUIDs.length === 0;
    }, [selectedStudysetUUIDs]);

    const handleChange = (event: SelectChangeEvent<string[]>) => {
        const {
            target: { value },
        } = event;
        setSelectedStudysetUUIDs(value as string[]);
    };

    const handleAssignLabelToStudysets = () => {
        for (const localStudysetUUID of selectedStudysetUUIDs) {
            changeLabel({
                studysetUUID: localStudysetUUID,
                newLabel: assignLabel,
            });
        }
    };

    return (
        <FlexColumn style={{ gap: '0.5rem' }}>
            <FormControl fullWidth>
                <InputLabel id="studysets-select-label">
                    Studysets to Assign Label To
                </InputLabel>
                <Select
                    labelId="studysets-select-label"
                    label="Studysets to Assign Label To"
                    multiple
                    onChange={handleChange}
                    value={selectedStudysetUUIDs}
                    renderValue={(selectedUUIDs) => (
                        <SelectChipsContainer>
                            {selectedUUIDs.map((uuid) => (
                                <Chip
                                    key={uuid}
                                    label={
                                        studysets.find(
                                            (value) =>
                                                value.studysetUUID === uuid
                                        )?.title ?? ''
                                    }
                                />
                            ))}
                        </SelectChipsContainer>
                    )}
                >
                    {studysets.map((studyset, index) => {
                        const text = studyset.title;
                        return (
                            <MenuItem
                                key={studyset.studysetUUID}
                                value={studyset.studysetUUID}
                                title={text}
                            >
                                <Typography
                                    variant="inherit"
                                    noWrap
                                    title={text}
                                >
                                    {text}
                                </Typography>
                            </MenuItem>
                        );
                    })}
                </Select>
            </FormControl>
            <SpacedFlexContainer>
                <LabelActionWarning variant="body2" color="error">
                    This action cannot be undone.
                </LabelActionWarning>
                <Button
                    variant="contained"
                    onClick={() => handleAssignLabelToStudysets()}
                    disabled={assignDisabled}
                >
                    Assign
                </Button>
            </SpacedFlexContainer>
        </FlexColumn>
    );
};

export default AssignTabView;
