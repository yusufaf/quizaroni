import { Box, Dialog, DialogContent } from '@mui/material';
import { ItemListHeader } from 'shared/components/MetadataDialogs';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import { useNamedColorsDialog } from './useNamedColorsDialog';
import { NamedColorsCreateTab } from './NamedColorsCreateTab';
import { NamedColorsManageTab } from './NamedColorsManageTab';
import { ColorPickerPanel } from './ColorPickerPanel';
import { downloadObjectAsJSON } from 'shared/utilities/general';

const NamedColorsDialog = () => {
    const {
        open,
        onClose,
        color,
        setColor,
        name,
        handleNameChange,
        errorInfo,
        namedColors,
        editIndex,
        deleteIndices,
        validateName,
        handleCreate,
        handleEdit,
        handleDelete,
        handleDeleteToggle,
        handleEditStart,
        handleEditCancel,
        isPending,
    } = useNamedColorsDialog();

    const downloadNamedColorsList = () => {
        downloadObjectAsJSON(namedColors, 'Quizaroni_NamedColors.json');
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <StandardDialogTitle title="Manage Named Colors" onClose={onClose} />
            <DialogContent sx={{ p: '1.5rem' }}>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '1.25rem',
                        '@media (max-width: 900px)': {
                            gridTemplateColumns: '1fr',
                        },
                    }}
                >
                    {/* Left: Create form */}
                    <Box>
                        <NamedColorsCreateTab
                            name={name}
                            onNameChange={handleNameChange}
                            errorInfo={errorInfo}
                            onSubmit={handleCreate}
                            isLoading={isPending}
                            color={color}
                        />
                    </Box>

                    {/* Middle: Color Picker */}
                    <Box>
                        <ColorPickerPanel color={color} onChange={setColor} />
                    </Box>

                    {/* Right: Colors List */}
                    <Box>
                        <ItemListHeader
                            title="Named Colors"
                            onDownload={downloadNamedColorsList}
                            itemCount={namedColors.length}
                        />
                        <NamedColorsManageTab
                            namedColors={namedColors}
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
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default NamedColorsDialog;
