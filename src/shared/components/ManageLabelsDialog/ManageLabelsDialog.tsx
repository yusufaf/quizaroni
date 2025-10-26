import { useState, SyntheticEvent, ChangeEvent, useEffect } from 'react';
import { Tab, Tabs } from '@mui/material/';
import {
    TABS,
    ACTIONS,
    LabelsDialogTab,
    ErrorInfo,
    LabelsDialogAction,
} from './constants';
import {
    MainLabelDialogContent,
    StyledDialog,
    StyledDialogContent,
} from './styles';
import LabelsList from './LabelsList';
import { capitalizeFirstLetter } from 'shared/utilities/general';
import { Studyset, LabelsDialogProps } from 'shared/types';
import {
    useDeleteLabelMutation,
    useEditLabelMutation,
    useChangeLabelMutation,
    useGetAllStudysetsQuery,
    useGetStudysetQuery,
} from 'state/api/studysetsAPI';
import useCustomMutation from 'hooks/useCustomMutation';
import CreateTabView from './CreateTabView';
import ManageTabView from './ManageTabView';
import AssignTabView from './AssignTabView';
import { useGetUserQuery } from 'state/api/usersAPI';
import { DEFAULT_USER_RESPONSE } from 'shared/constants';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import { useGlobalStore } from 'state/stores/global';

const ManageLabelsDialog = () => {
    const { labelsDialogProps, setLabelsDialogProps } = useGlobalStore();
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
        mutate: deleteLabel,
        isLoading: isDeletingLabel,
        isSuccess: isDeleteSuccess,
        isError: isDeleteError,
    } = useCustomMutation({
        mutation: useDeleteLabelMutation,
        successMessage: 'Successfully deleted label',
        errorMessage: 'Error deleting label',
        onSuccess: () => {
            clearDeleteState();
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
            clearEditState();
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

    const [selectedTab, setSelectedTab] = useState<LabelsDialogTab>(
        TABS.CREATE
    );
    /* Edit & Delete State */
    const [selectedAction, setSelectedAction] =
        useState<LabelsDialogAction | null>(null);
    const [editLabelName, setEditLabelName] = useState<string>('');
    const [editErrorInfo, setEditErrorInfo] = useState<ErrorInfo>(null);
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [deleteIndices, setDeleteIndices] = useState<number[]>([]);
    const [showDeleteConfirmation, setShowDeleteConfirmation] =
        useState<boolean>(false);
    const [selectedStudysetUUIDs, setSelectedStudysetUUIDs] = useState<
        string[]
    >([]);
    const [assignLabel, setAssignLabel] = useState<string>('');

    const isCreateTab = selectedTab === TABS.CREATE;
    const isManageTab = selectedTab === TABS.MANAGE;
    const isAssignTab = selectedTab === TABS.ASSIGN;

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
        setLabelsDialogProps({
            open: false,
        });
    };

    const onTabChange = (_e: SyntheticEvent, newTab: LabelsDialogTab) => {
        if (newTab === selectedTab) {
            return;
        }

        if (selectedTab === TABS.MANAGE) {
            clearEditState();
            clearDeleteState();
        }

        setSelectedTab(newTab);
    };

    const clearEditState = (actionToSet: LabelsDialogAction | null = null) => {
        setEditIndex(null);
        setEditLabelName('');
        setEditErrorInfo(null);
        setSelectedAction(actionToSet);
    };

    const clearDeleteState = (
        actionToSet: LabelsDialogAction | null = null
    ) => {
        setDeleteIndices([]);
        setShowDeleteConfirmation(false);
        setSelectedAction(actionToSet);
    };

    const handleEditClick = (index: number) => {
        clearDeleteState(ACTIONS.EDIT);
        setEditIndex(index);
        setEditLabelName(labels[index]);
    };

    const handleDeleteClick = (index: number) => {
        clearEditState(ACTIONS.DELETE);
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

    const handleChangeCurrentLabel = (newLabel: string) => {
        if (!studysetUUID || newLabel === selectedStudyset?.label) {
            return;
        }

        changeLabel({
            studysetUUID,
            newLabel,
        });
    };

    return (
        <StyledDialog
            open={labelsDialogProps.open}
            onClose={closeLabelsDialog}
            fullWidth
            maxWidth="lg"
        >
            <StandardDialogTitle
                title={`${capitalizeFirstLetter(selectedTab.toLowerCase())} Labels`}
                onClose={closeLabelsDialog}
            />
            <StyledDialogContent>
                <MainLabelDialogContent>
                    <Tabs value={selectedTab} onChange={onTabChange}>
                        {[...Object.values(TABS)].map((tab, index) => (
                            <Tab key={index} label={tab} value={tab} />
                        ))}
                    </Tabs>
                    {isCreateTab && (
                        <CreateTabView
                            labels={labels}
                            studysetUUID={studysetUUID}
                        />
                    )}
                    {isManageTab && (
                        <ManageTabView
                            deleteIndices={deleteIndices}
                            editErrorInfo={editErrorInfo}
                            editLabelName={editLabelName}
                            editIndex={editIndex}
                            handleEditOrDelete={handleEditOrDelete}
                            handleDeleteConfirmation={handleDeleteConfirmation}
                            onEditLabelChange={onEditLabelChange}
                            showDeleteConfirmation={showDeleteConfirmation}
                            selectedAction={selectedAction}
                        />
                    )}
                    {isAssignTab && (
                        <AssignTabView
                            assignLabel={assignLabel}
                            studysets={studysets}
                            selectedStudysetUUIDs={selectedStudysetUUIDs}
                            setSelectedStudysetUUIDs={setSelectedStudysetUUIDs}
                        />
                    )}
                </MainLabelDialogContent>
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
        </StyledDialog>
    );
};

export default ManageLabelsDialog;
