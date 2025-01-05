import { FlexColumn, SpacedFlexContainer } from 'styles/AppStyles';
import { ChangeEvent, useState } from 'react';
import { Checkbox, FormControlLabel, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import useCustomMutation from 'hooks/useCustomMutation';
import { useCreateLabelMutation } from 'state/api/studysetsAPI';
import { type ErrorInfo } from './constants';

type Props = {
    labels: string[];
    studysetUUID: string;
};
const CreateTabView = ({ labels, studysetUUID }: Props) => {
    const [labelName, setLabelName] = useState<string>('');
    const [errorInfo, setErrorInfo] = useState<ErrorInfo>(null);
    const [shouldUpdateLabel, setShouldUpdateLabel] = useState<boolean>(false);

    const {
        mutate: createLabel,
        isLoading: isCreatingLabel,
        isSuccess: isCreateSuccess,
        isError: isCreateError,
    } = useCustomMutation({
        mutation: useCreateLabelMutation,
        successMessage: 'Successfully created label',
        errorMessage: 'Error creating label',
        onSuccess: () => {
            setLabelName('');
        },
    });

    const onCreateLabelChange = (e: ChangeEvent<HTMLInputElement>) => {
        const label = e.target.value;
        const isDuplicate = labels.includes(label);
        setLabelName(label);
        if (isDuplicate) {
            setErrorInfo({
                helperText: 'Label already exists',
            });
        } else {
            setErrorInfo(null);
        }
    };

    const handleCreate = async () => {
        createLabel({
            label: labelName,
            studysetUUID,
            updateStudysetLabel: shouldUpdateLabel,
        });
    };

    return (
        <FlexColumn>
            <TextField
                margin="dense"
                label="Label Name"
                type="text"
                error={Boolean(errorInfo)}
                helperText={errorInfo?.helperText ?? ''}
                fullWidth
                value={labelName}
                onChange={onCreateLabelChange}
            />
            <SpacedFlexContainer>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={shouldUpdateLabel}
                            onChange={() =>
                                setShouldUpdateLabel(!shouldUpdateLabel)
                            }
                        />
                    }
                    label="Apply to current study set"
                />
                <LoadingButton
                    variant="contained"
                    onClick={handleCreate}
                    disabled={!labelName || Boolean(errorInfo)}
                    loading={isCreatingLabel}
                    sx={{ fontWeight: 600 }}
                >
                    Create
                </LoadingButton>
            </SpacedFlexContainer>
        </FlexColumn>
    );
};

export default CreateTabView;
