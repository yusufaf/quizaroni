import { Box } from '@mui/material';
import { Edit as EditIcon, Label as LabelIcon } from '@mui/icons-material';
import {
    MetadataDialogShell,
    ItemListHeader,
    TabConfig,
    CascadePreviewDialog,
} from 'shared/components/MetadataDialogs';
import { useLabelsDialog } from './useLabelsDialog';
import { LabelsCreateTab } from './LabelsCreateTab';
import { LabelsManageTab } from './LabelsManageTab';
import { LabelsAssignTab } from './LabelsAssignTab';
import { downloadObjectAsJSON } from 'shared/utilities/general';

const tabs: TabConfig[] = [
    { value: 'MANAGE', label: 'Manage', icon: <EditIcon /> },
    { value: 'ASSIGN', label: 'Assign', icon: <LabelIcon /> },
];

const ManageLabelsDialog = () => {
    const {
        open,
        onClose,
        selectedTab,
        setSelectedTab,
        labels,
        studysets,
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
        isPending,
        showCascadePreview,
        cascadeAction,
        affectedItems,
        handleCloseCascadePreview,
        handleConfirmCascade,
    } = useLabelsDialog();

    const downloadLabelsList = () => {
        downloadObjectAsJSON(labels, 'Quizaroni_Labels.json');
    };

    return (
        <>
            <MetadataDialogShell
                open={open}
                onClose={onClose}
                title="Manage Labels"
                tabs={tabs}
                selectedTab={selectedTab}
                onTabChange={setSelectedTab}
                maxWidth="lg"
            >
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns:
                            selectedTab === 'MANAGE' ? '1fr 1fr' : '1fr',
                        gap: '1.25rem',
                        '@media (max-width: 900px)': {
                            gridTemplateColumns: '1fr',
                        },
                    }}
                >
                    {/* MANAGE tab: 2 columns (form + list) */}
                    {selectedTab === 'MANAGE' && (
                        <>
                            {/* Left: Create form */}
                            <Box>
                                <LabelsCreateTab
                                    labels={labels}
                                    studysetUUID={studysetUUID}
                                    onSubmit={handleCreate}
                                    isLoading={isCreatingLabel}
                                />
                            </Box>

                            {/* Right: Labels List */}
                            <Box>
                                <ItemListHeader
                                    title="Labels"
                                    onDownload={downloadLabelsList}
                                    itemCount={labels.length}
                                />
                                <LabelsManageTab
                                    labels={labels}
                                    editIndex={editIndex}
                                    deleteIndices={deleteIndices}
                                    onEdit={handleEditStart}
                                    onDelete={handleDeleteToggle}
                                    onSave={handleEdit}
                                    onCancel={handleEditCancel}
                                    validateFn={validateName}
                                    onDeleteSelected={handleDelete}
                                    isLoading={isPending}
                                />
                            </Box>
                        </>
                    )}

                    {/* ASSIGN tab: 1 column (full width form) */}
                    {selectedTab === 'ASSIGN' && (
                        <Box>
                            <LabelsAssignTab
                                labels={labels}
                                studysets={studysets}
                                selectedStudysetUUIDs={selectedStudysetUUIDs}
                                assignLabels={assignLabels}
                                onStudysetsChange={setSelectedStudysetUUIDs}
                                onLabelsChange={setAssignLabels}
                                onAssign={handleAssignLabel}
                                isLoading={isPending}
                            />
                        </Box>
                    )}
                </Box>
            </MetadataDialogShell>

            <CascadePreviewDialog
                open={showCascadePreview}
                onClose={handleCloseCascadePreview}
                actionType={cascadeAction === 'edit' ? 'edit' : 'delete'}
                itemType="label"
                affectedItems={affectedItems}
                onConfirm={handleConfirmCascade}
                isLoading={isPending}
            />
        </>
    );
};

export default ManageLabelsDialog;
