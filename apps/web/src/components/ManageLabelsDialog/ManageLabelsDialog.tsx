import { useState, SyntheticEvent, ChangeEvent, useEffect } from 'react';
import {
    Button,
    Checkbox,
    DialogActions,
    FormControlLabel,
    Tab,
    Tabs,
} from '@mui/material/';
import { TABS, ACTIONS } from './constants';
import {
    LabelActionWarning,
    StyledDialog,
    StyledDialogContent,
} from './styles';
import { LoadingButton } from '@mui/lab';
import LabelsList from './LabelsList';
import { capitalizeFirstLetter } from 'utilities/functions';
import { Studyset } from 'lib/types';
import {
    useCreateLabelMutation,
    useDeleteLabelMutation,
    useEditLabelMutation,
    useChangeLabelMutation,
    useGetAllStudysetsQuery,
    useGetStudysetQuery,
} from 'state/api/studysetsAPI';
import useCustomMutation from 'lib/hooks/useCustomMutation';
import { StyledDialogTitle } from 'common/AppStyles';
import CloseDialogButton from 'components/CloseDialogButton/CloseDialogButton';
import CreateTabView from './CreateTabView';
import ManageTabView from './ManageTabView';
import AssignTabView from './AssignTabView';
import { setLabelsDialogProps } from 'state/slices/globalSlice';
import { useDispatch } from 'react-redux';
import { useGetUserQuery } from 'state/api/usersAPI';
import { DEFAULT_USER_RESPONSE } from 'utilities/constants';
import { LabelsDialogProps } from 'lib/types';

type ErrorInfo = {
    helperText: string;
};

type Props = {
    labelsDialogProps: LabelsDialogProps;
};
const ManageLabelsDialog = ({ labelsDialogProps }: Props) => {
    /* ==== Redux ==== */
    const dispatch = useDispatch();

    const { studysetUUID = '' } = labelsDialogProps || {};

    /* ==== RTK Query ==== */
    const {
        data: { user: { labels = [], userUUID = '' } } = DEFAULT_USER_RESPONSE,
    } = useGetUserQuery();
    const { data: studysetsResponse, isLoading: isGetAllStudysetsLoading } =
        useGetAllStudysetsQuery({});
    const studysets = studysetsResponse?.studysets ?? [];

    const {
        data: studysetResponse,
        isLoading: isStudySetLoading,
        isSuccess: isStudySetSuccess,
        isError: isStudySetError,
    } = useGetStudysetQuery(
        { studysetUUID: labelsDialogProps.studysetUUID ?? '' },
        {
            skip: !labelsDialogProps.studysetUUID,
        }
    );
    const selectedStudyset = studysetResponse?.studyset ?? ({} as Studyset);

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

    const {
        mutate: deleteLabel,
        isLoading: isDeletingLabel,
        isSuccess: isDeleteSuccess,
        isError: isDeleteError,
    } = useCustomMutation({
        mutation: useDeleteLabelMutation,
        successMessage: 'Successfully deleted label',
        errorMessage: 'Error deleting label',
        onSuccess: () => {
            setDeleteIndices([]);
        },
    });

    const {
        mutate: editLabel,
        isLoading: isEditingLabel,
        isSuccess: isEditSuccess,
        isError: isEditError,
    } = useCustomMutation({
        mutation: useEditLabelMutation,
        successMessage: 'Successfully edited label',
        errorMessage: 'Error editing label',
        onSuccess: () => {
            setEditIndex(null);
            setEditLabelName('');
        },
    });

    const {
        mutate: changeLabel,
        isLoading: isChangingLabel,
        isSuccess: isChangeSuccess,
        isError: isChangeError,
    } = useCustomMutation({
        mutation: useChangeLabelMutation,
        successMessage: 'Successfully updated label',
        errorMessage: 'Error updated label',
    });

    const [selectedTab, setSelectedTab] = useState<string>(TABS.CREATE);
    const [labelName, setLabelName] = useState<string>('');
    const [errorInfo, setErrorInfo] = useState(null);
    /* Edit & Delete State */
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [editLabelName, setEditLabelName] = useState<string>('');
    const [editErrorInfo, setEditErrorInfo] = useState<ErrorInfo | null>(null);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [deleteIndices, setDeleteIndices] = useState<number[]>([]);
    const [showDeleteConfirmation, setShowDeleteConfirmation] =
        useState<boolean>(false);
    const [shouldUpdateLabel, setShouldUpdateLabel] = useState<boolean>(true);
    const [selectedStudysetUUIDs, setSelectedStudysetUUIDs] = useState<
        string[]
    >([]);
    const [assignLabel, setAssignLabel] = useState<string>('');

    const isCreateTab = selectedTab === TABS.CREATE;
    const isManageTab = selectedTab === TABS.MANAGE;
    const isAssignTab = selectedTab === TABS.ASSIGN;

    const isEditActionSelected = selectedAction === ACTIONS.EDIT;

    // TODO: Look into initial value for selectedStudysetUUIDs useState()
    useEffect(() => {
        if (labelsDialogProps.selectedStudysetUUIDs) {
            setSelectedStudysetUUIDs([
                ...labelsDialogProps.selectedStudysetUUIDs,
            ]);
        }
        if (labelsDialogProps.tab) {
            setSelectedTab(labelsDialogProps.tab);
        }
    }, [labelsDialogProps]);

    /* ==== Dialog Logic ==== */
    const closeLabelsDialog = () => {
        dispatch(
            setLabelsDialogProps({
                open: false,
            })
        );
    };

    const onTabChange = (_e: SyntheticEvent, newTab: string) => {
        setSelectedTab(newTab);
        if (newTab === TABS.CREATE) {
            setShowDeleteConfirmation(false);
            setSelectedAction(null);
        }
        if (newTab === TABS.ASSIGN) {
        }
    };

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

    const onEditLabelChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newLabelName = e.target.value;

        const allOtherLabels = [...labels].filter(
            (_, index) => index != editIndex
        );
        const isDuplicate = allOtherLabels.includes(newLabelName);
        setEditLabelName(newLabelName);
        if (isDuplicate) {
            setEditErrorInfo({
                helperText: 'Label already exists',
            });
        } else if (!newLabelName) {
            setEditErrorInfo({
                helperText: "Label name can't be empty",
            });
        } else {
            setEditErrorInfo(null);
        }
    };

    const handleEditClick = (index: number) => {
        setDeleteIndices([]);
        setShowDeleteConfirmation(false);
        setSelectedAction(ACTIONS.EDIT);
        setEditIndex(index);
        setEditLabelName(labels[index]);
    };

    const handleDeleteClick = (index: number) => {
        setEditIndex(null);
        setEditLabelName('');
        setEditErrorInfo(null);

        setSelectedAction(ACTIONS.DELETE);
        if (deleteIndices.includes(index)) {
            setDeleteIndices(deleteIndices.filter((value) => value !== index));
        } else {
            setDeleteIndices(deleteIndices.concat(index));
        }
    };

    const handleDeleteConfirmation = () => {
        const labelsToDelete = deleteIndices.map((index) => labels[index]);
        deleteLabel({
            userUUID,
            labelsToDelete,
        });
    };

    const handleEditOrDelete = () => {
        console.log('Entered editOrDelete');
        // TODO:
        switch (selectedAction) {
            case ACTIONS.EDIT:
                if (!editIndex) {
                    return;
                }
                // TODO: Move this logic into the validation function
                const selectedLabelName = labels[editIndex];
                if (editLabelName === selectedLabelName) {
                    return;
                }
                editLabel({
                    index: editIndex,
                    oldLabel: selectedLabelName,
                    newLabel: editLabelName,
                });
                break;
            case ACTIONS.DELETE:
                setShowDeleteConfirmation(true);
                break;
        }
    };

    const handleCreate = async () => {
        if (!isCreateTab) {
            return;
        }
        createLabel({
            label: labelName,
            studysetUUID,
            updateStudysetLabel: shouldUpdateLabel,
        });
    };

    const handleChangeCurrentLabel = (newLabel: string) => {
        if (!studysetUUID || newLabel === selectedStudyset?.label) {
            return;
        }

        changeLabel({
            studysetUUID,
            newLabel,
        });
    };

    const handleAssignLabelToStudysets = () => {
        for (const localStudysetUUID of selectedStudysetUUIDs) {
            changeLabel({
                studysetUUID: localStudysetUUID,
                newLabel: assignLabel,
            });
        }
    };

    const renderDialogButtons = () => {
        switch (selectedTab) {
            case TABS.CREATE:
                return (
                    <>
                        <Button
                            variant="contained"
                            onClick={() => handleChangeCurrentLabel('')}
                        >
                            Remove Current Label
                        </Button>
                        <LoadingButton
                            variant="contained"
                            onClick={handleCreate}
                            disabled={!labelName || Boolean(errorInfo)}
                            // loading={}
                            sx={{ fontWeight: 600 }}
                        >
                            Create
                        </LoadingButton>
                    </>
                );
            case TABS.MANAGE:
                const disabled =
                    (selectedAction === ACTIONS.EDIT &&
                        Boolean(editErrorInfo)) ||
                    (selectedAction === ACTIONS.DELETE &&
                        !deleteIndices.length);
                const isEdit = selectedAction === ACTIONS.EDIT;
                let buttonText =
                    selectedAction === ACTIONS.EDIT
                        ? 'Save Edit'
                        : `Delete (${deleteIndices.length})`;

                let buttonOnClick = handleEditOrDelete;
                if (showDeleteConfirmation) {
                    buttonText = `Confirm ${buttonText}`;
                    buttonOnClick = handleDeleteConfirmation;
                }

                if (!selectedAction) {
                    return <></>;
                }

                return (
                    <Button
                        variant="contained"
                        onClick={() => buttonOnClick()}
                        disabled={disabled}
                    >
                        {buttonText}
                    </Button>
                );
            case TABS.ASSIGN:
                return (
                    <Button
                        variant="contained"
                        onClick={() => handleAssignLabelToStudysets()}
                        disabled={
                            !selectedStudysetUUIDs ||
                            selectedStudysetUUIDs.length === 0
                        }
                    >
                        Assign
                    </Button>
                );
        }
    };

    return (
        <StyledDialog
            open={labelsDialogProps.open}
            onClose={closeLabelsDialog}
            fullWidth
            maxWidth="lg"
        >
            <StyledDialogTitle>
                {capitalizeFirstLetter(selectedTab.toLowerCase())} Labels
                <CloseDialogButton onClose={closeLabelsDialog} />
            </StyledDialogTitle>
            <StyledDialogContent>
                <div>
                    <Tabs value={selectedTab} onChange={onTabChange}>
                        {[...Object.values(TABS)].map((tab, index) => (
                            <Tab key={index} label={tab} value={tab} />
                        ))}
                    </Tabs>
                    {isCreateTab && (
                        <CreateTabView
                            labelName={labelName}
                            errorInfo={errorInfo}
                            onCreateLabelChange={onCreateLabelChange}
                        />
                    )}
                    {isManageTab && (
                        <ManageTabView
                            editErrorInfo={editErrorInfo}
                            editIndex={editIndex}
                            editLabelName={editLabelName}
                            onEditLabelChange={onEditLabelChange}
                        />
                    )}
                    {isAssignTab && (
                        <AssignTabView
                            studysets={studysets}
                            selectedStudysetUUIDs={selectedStudysetUUIDs}
                            setSelectedStudysetUUIDs={setSelectedStudysetUUIDs}
                        />
                    )}
                </div>
                <LabelsList
                    labels={labels}
                    selectedTab={selectedTab}
                    handleEditClick={handleEditClick}
                    handleDeleteClick={handleDeleteClick}
                    editIndex={editIndex}
                    deleteIndices={deleteIndices}
                    currentLabel={selectedStudyset?.label}
                    handleChangeCurrentLabel={handleChangeCurrentLabel}
                    assignLabel={assignLabel}
                    setAssignLabel={setAssignLabel}
                />
            </StyledDialogContent>
            <DialogActions>
                {isCreateTab && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={shouldUpdateLabel}
                                onChange={() =>
                                    setShouldUpdateLabel(!shouldUpdateLabel)
                                }
                            />
                        }
                        label="Apply new label to current study set"
                    />
                )}
                {isManageTab && isEditActionSelected && (
                    <LabelActionWarning variant="body2" color="error">
                        Editing this label will change the labels for all of
                        your study sets. Proceed with caution.
                    </LabelActionWarning>
                )}
                {isAssignTab && assignLabel && selectedStudysetUUIDs.length && (
                    <LabelActionWarning variant="body2" color="error">
                        This action cannot be undone.
                    </LabelActionWarning>
                )}
                {showDeleteConfirmation && (
                    <LabelActionWarning variant="body2" color="error">
                        Are you sure you want to delete these labels? This will
                        remove the label from all of your study sets.
                        {'\n'}
                        This action cannot be undone.
                    </LabelActionWarning>
                )}
                {renderDialogButtons()}
            </DialogActions>
        </StyledDialog>
    );
};

export default ManageLabelsDialog;
