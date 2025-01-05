import { ChangeEvent, useMemo } from 'react';
import { LabelActionWarning, LabelField } from './styles';
import { FlexColumn, SpacedFlexContainer } from 'styles/AppStyles';
import { ACTIONS, ErrorInfo, LabelsDialogAction } from './constants';
import { Button, TextField } from '@mui/material';

type Props = {
    deleteIndices: number[];
    editErrorInfo: ErrorInfo;
    editLabelName: string;
    editIndex: number | null;
    handleDeleteConfirmation: () => void;
    handleEditOrDelete: () => void;
    onEditLabelChange: (e: ChangeEvent<HTMLInputElement>) => void;
    selectedAction: LabelsDialogAction | null;
    showDeleteConfirmation: boolean;
};

const ManageTabView = ({
    deleteIndices,
    editErrorInfo,
    editLabelName,
    editIndex,
    handleEditOrDelete,
    handleDeleteConfirmation,
    showDeleteConfirmation,
    onEditLabelChange,
    selectedAction,
}: Props) => {
    const disabled = useMemo(
        () =>
            selectedAction === ACTIONS.EDIT
                ? Boolean(editErrorInfo)
                : !deleteIndices.length,
        [deleteIndices, editErrorInfo, selectedAction]
    );

    let buttonText = useMemo(() => {
        if (selectedAction === ACTIONS.EDIT) {
            return 'Save Edit';
        }

        return `Delete (${deleteIndices.length})`;
    }, [deleteIndices.length, selectedAction]);

    const warningMessage = useMemo(() => {
        if (selectedAction === ACTIONS.EDIT) {
            return 'Editing this label will change the labels for all of your study sets.';
        }
        if (selectedAction === ACTIONS.DELETE && showDeleteConfirmation) {
            return 'This will remove the labels from all of your study sets.';
        }
    }, [selectedAction, showDeleteConfirmation]);

    let buttonOnClick = handleEditOrDelete;
    useMemo(() => {
        if (showDeleteConfirmation) {
            buttonText = `Confirm ${buttonText}`;
            buttonOnClick = handleDeleteConfirmation;
        }
    }, [
        buttonText,
        buttonOnClick,
        handleDeleteConfirmation,
        showDeleteConfirmation,
    ]);

    return (
        <FlexColumn>
            <TextField
                margin="dense"
                label="Edit Label Name"
                type="text"
                variant="standard"
                error={Boolean(editErrorInfo)}
                helperText={editErrorInfo?.helperText ?? ''}
                fullWidth
                value={editLabelName}
                disabled={editIndex === null}
                onChange={onEditLabelChange}
            />

            <SpacedFlexContainer>
                {selectedAction && (
                    <LabelActionWarning variant="body2" color="error">
                        {warningMessage}
                    </LabelActionWarning>
                )}
                {selectedAction && (
                    <Button
                        variant="contained"
                        onClick={() => buttonOnClick()}
                        disabled={disabled}
                    >
                        {buttonText}
                    </Button>
                )}
            </SpacedFlexContainer>
        </FlexColumn>
    );
};

export default ManageTabView;
