import { useState, useCallback, useMemo, useEffect } from 'react';
import { useGlobalStore } from 'state/stores/global';
import { useGetUser } from 'state/api/usersAPI';
import {
    useDeleteLabel,
    useEditLabel,
    useBatchUpdateStudysetLabels,
    useGetAllStudysets,
    useGetStudyset,
    useCreateLabel,
} from 'state/api/studysetsAPI';
import { DEFAULT_USER_RESPONSE } from 'shared/constants';
import { ErrorInfo, AffectedItem } from 'shared/components/MetadataDialogs';
import useCustomMutation from 'hooks/useCustomMutation';
import { Studyset } from 'shared/types';

export const useLabelsDialog = () => {
    const { labelsDialogProps, setLabelsDialogProps } = useGlobalStore();
    const { studysetUUID = '' } = labelsDialogProps || {};

    const { data = DEFAULT_USER_RESPONSE } = useGetUser({
        enabled: labelsDialogProps.open,
    });
    const { labels = [], userUUID = '' } = data?.user ?? DEFAULT_USER_RESPONSE.user;

    const { data: studysetsResponse } = useGetAllStudysets({
        enabled: labelsDialogProps.open,
    });
    const studysets = studysetsResponse?.studysets ?? [];

    const { data: studysetResponse } = useGetStudyset(
        { studysetUUID: labelsDialogProps.studysetUUID ?? '' },
        { enabled: labelsDialogProps.open && Boolean(labelsDialogProps.studysetUUID) }
    );
    const selectedStudyset = studysetResponse?.studyset ?? ({} as Studyset);

    const [selectedTab, setSelectedTab] = useState('MANAGE');
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [deleteIndices, setDeleteIndices] = useState<number[]>([]);
    const [showCascadePreview, setShowCascadePreview] = useState(false);
    const [cascadeAction, setCascadeAction] = useState<'edit' | 'delete' | null>(null);
    const [selectedStudysetUUIDs, setSelectedStudysetUUIDs] = useState<string[]>([]);
    const [assignLabels, setAssignLabels] = useState<string[]>([]);

    const { mutate: createLabel, isPending: isCreatingLabel } = useCustomMutation({
        mutation: useCreateLabel,
        successMessage: 'Successfully created label',
        errorMessage: 'Error creating label',
        onSuccess: () => {
            // Reset will be handled in the tab component
        },
    });

    const { mutate: editLabel, isPending: isEditingLabel } = useCustomMutation({
        mutation: useEditLabel,
        successMessage: 'Successfully edited label',
        errorMessage: 'Error editing label',
        onSuccess: () => {
            setEditIndex(null);
            setShowCascadePreview(false);
        },
    });

    const { mutate: deleteLabel, isPending: isDeletingLabel } = useCustomMutation({
        mutation: useDeleteLabel,
        successMessage: 'Successfully deleted label(s)',
        errorMessage: 'Error deleting label(s)',
        onSuccess: () => {
            setDeleteIndices([]);
            setShowCascadePreview(false);
        },
    });

    const { mutate: batchUpdateLabels, isPending: isAssigningLabels } = useCustomMutation({
        mutation: useBatchUpdateStudysetLabels,
        successMessage: 'Successfully assigned labels',
        errorMessage: 'Error assigning labels',
    });

    useEffect(() => {
        if (labelsDialogProps.open) {
            if (labelsDialogProps.selectedStudysetUUIDs) {
                setSelectedStudysetUUIDs([...labelsDialogProps.selectedStudysetUUIDs]);
            } else if (labelsDialogProps.studysetUUID) {
                // Auto-select current studyset if opened from ViewStudySet
                setSelectedStudysetUUIDs([labelsDialogProps.studysetUUID]);
            }
            if (labelsDialogProps.tab) {
                setSelectedTab(labelsDialogProps.tab);
            }
        }
    }, [labelsDialogProps]);

    const validateName = useCallback(
        (value: string, excludeIndex?: number): ErrorInfo => {
            if (!value.trim()) {
                return { helperText: 'Name cannot be empty' };
            }
            const isDuplicate = labels.some(
                (label, i) => label === value && i !== excludeIndex
            );
            if (isDuplicate) {
                return { helperText: 'Label already exists' };
            }
            return null;
        },
        [labels]
    );

    const getAffectedStudysetsForLabel = useCallback(
        (labelName: string): AffectedItem[] => {
            return studysets
                .filter((ss) => ss.labels?.includes(labelName))
                .map((ss) => ({
                    name: ss.title,
                    detail: `Labels: ${ss.labels?.join(', ') || 'None'}`,
                }));
        },
        [studysets]
    );

    const getAffectedStudysetsForDelete = useCallback((): AffectedItem[] => {
        const labelsToDelete = deleteIndices.map((i) => labels[i]);
        return studysets
            .filter((ss) => ss.labels?.some((l: string) => labelsToDelete.includes(l)))
            .map((ss) => ({
                name: ss.title,
                detail: `Labels: ${ss.labels?.join(', ') || 'None'}`,
            }));
    }, [deleteIndices, labels, studysets]);

    const handleEdit = useCallback(
        (index: number, newName: string) => {
            const oldLabel = labels[index];
            if (!oldLabel || newName === oldLabel) {
                setEditIndex(null);
                return;
            }

            const affectedStudysets = getAffectedStudysetsForLabel(oldLabel);
            if (affectedStudysets.length > 0) {
                setCascadeAction('edit');
                setShowCascadePreview(true);
            } else {
                editLabel({
                    index,
                    oldLabel,
                    newLabel: newName.trim(),
                });
            }
        },
        [labels, getAffectedStudysetsForLabel, editLabel]
    );

    const confirmEdit = useCallback(() => {
        if (editIndex === null) return;
        const oldLabel = labels[editIndex];
        const newLabel = ''; // This will be passed from the form
        editLabel({
            index: editIndex,
            oldLabel,
            newLabel,
        });
    }, [editIndex, labels, editLabel]);

    const handleDelete = useCallback(() => {
        const affectedStudysets = getAffectedStudysetsForDelete();
        if (affectedStudysets.length > 0) {
            setCascadeAction('delete');
            setShowCascadePreview(true);
        } else {
            const labelsToDelete = deleteIndices.map((i) => labels[i]);
            deleteLabel({ labelsToDelete });
        }
    }, [deleteIndices, labels, getAffectedStudysetsForDelete, deleteLabel]);

    const confirmDelete = useCallback(() => {
        const labelsToDelete = deleteIndices.map((i) => labels[i]);
        deleteLabel({ labelsToDelete });
    }, [deleteIndices, labels, deleteLabel]);

    const handleDeleteToggle = useCallback((index: number) => {
        setDeleteIndices((prev) =>
            prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
        );
        setEditIndex(null);
    }, []);

    const handleEditStart = useCallback((index: number) => {
        setEditIndex(index);
        setDeleteIndices([]);
    }, []);

    const handleEditCancel = useCallback(() => {
        setEditIndex(null);
    }, []);

    const handleCloseCascadePreview = useCallback(() => {
        setShowCascadePreview(false);
        setCascadeAction(null);
    }, []);

    const handleConfirmCascade = useCallback(() => {
        if (cascadeAction === 'delete') {
            confirmDelete();
        }
        // Edit will be handled differently since we need the new name
    }, [cascadeAction, confirmDelete]);

    const handleAssignLabel = useCallback(() => {
        if (!assignLabels.length || selectedStudysetUUIDs.length === 0) {
            return;
        }
        if (assignLabels.length > 10) {
            console.warn('Consider using fewer than 10 labels for better organization');
        }
        batchUpdateLabels({
            studysetUpdates: selectedStudysetUUIDs.map((uuid) => [uuid, assignLabels]),
        });
    }, [assignLabels, selectedStudysetUUIDs, batchUpdateLabels]);

    const onClose = useCallback(() => {
        setLabelsDialogProps({
            open: false,
        });
        setEditIndex(null);
        setDeleteIndices([]);
        setShowCascadePreview(false);
        setSelectedTab('MANAGE');
    }, [setLabelsDialogProps]);

    const handleCreate = useCallback(
        (label: string, updateStudysetLabel: boolean) => {
            createLabel({
                label,
                studysetUUID: studysetUUID || undefined,
                updateStudysetLabel,
            });
        },
        [createLabel, studysetUUID]
    );

    const affectedItems = useMemo(() => {
        if (cascadeAction === 'edit' && editIndex !== null) {
            return getAffectedStudysetsForLabel(labels[editIndex]);
        } else if (cascadeAction === 'delete') {
            return getAffectedStudysetsForDelete();
        }
        return [];
    }, [cascadeAction, editIndex, labels, getAffectedStudysetsForLabel, getAffectedStudysetsForDelete]);

    return {
        open: labelsDialogProps.open,
        onClose,
        selectedTab,
        setSelectedTab,
        labels,
        studysets,
        selectedStudyset,
        userUUID,
        studysetUUID,
        editIndex,
        deleteIndices,
        selectedStudysetUUIDs,
        setSelectedStudysetUUIDs,
        assignLabels,
        setAssignLabels,
        validateName,
        handleCreate,
        handleEdit,
        handleDelete,
        handleDeleteToggle,
        handleEditStart,
        handleEditCancel,
        handleAssignLabel,
        isCreatingLabel,
        isEditingLabel,
        isDeletingLabel,
        isAssigningLabels,
        isPending: isCreatingLabel || isEditingLabel || isDeletingLabel || isAssigningLabels,
        showCascadePreview,
        cascadeAction,
        affectedItems,
        handleCloseCascadePreview,
        handleConfirmCascade,
    };
};
