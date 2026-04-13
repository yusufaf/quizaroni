import { useState, useCallback, useEffect } from 'react';
import { useGlobalStore } from 'state/stores/global';
import { useGetUser, useUpdateUserMetadata } from 'state/api/usersAPI';
import { DEFAULT_USER_RESPONSE } from 'shared/constants';
import { ErrorInfo } from 'shared/components/MetadataDialogs';

export const useNamedColorsDialog = () => {
    const { namedColorsDialogProps, setNamedColorsDialogProps } =
        useGlobalStore();

    const { data: userData = DEFAULT_USER_RESPONSE } = useGetUser({
        enabled: namedColorsDialogProps.open,
    });
    const { mutate: updateMetadata, isPending } = useUpdateUserMetadata();

    const [color, setColor] = useState<string>(
        namedColorsDialogProps.color ?? '#000000'
    );
    const [name, setName] = useState('');
    const [errorInfo, setErrorInfo] = useState<ErrorInfo>(null);
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [deleteIndices, setDeleteIndices] = useState<number[]>([]);

    const namedColors = userData.user?.metadata?.namedColors ?? [];
    const userUUID = userData.user?.userUUID ?? '';

    // Reset form when dialog opens
    useEffect(() => {
        if (namedColorsDialogProps.open) {
            setName('');
            setErrorInfo(null);
            setEditIndex(null);
            setDeleteIndices([]);
            if (namedColorsDialogProps.color) {
                setColor(namedColorsDialogProps.color);
            }
        }
    }, [namedColorsDialogProps.open, namedColorsDialogProps.color]);

    const validateName = useCallback(
        (value: string, excludeIndex?: number): ErrorInfo => {
            if (!value.trim()) {
                return { helperText: 'Name cannot be empty' };
            }
            const isDuplicate = namedColors.some(
                (nc, i) => nc.name === value && i !== excludeIndex
            );
            if (isDuplicate) {
                return { helperText: 'Color with that name already exists' };
            }
            return null;
        },
        [namedColors]
    );

    const handleNameChange = useCallback(
        (value: string) => {
            setName(value);
            setErrorInfo(validateName(value));
        },
        [validateName]
    );

    const handleColorChange = useCallback((e: any) => {
        const { hex } = e;
        setColor(hex);
    }, []);

    const handleCreate = useCallback(() => {
        if (!userUUID || !name.trim() || errorInfo) {
            return;
        }
        const newColorObject = {
            color,
            name: name.trim(),
        };
        const newNamedColors = [...namedColors, newColorObject];
        updateMetadata(
            {
                updates: {
                    namedColors: newNamedColors,
                },
            },
            {
                onSuccess: () => {
                    setName('');
                    setColor('#000000');
                    setErrorInfo(null);
                },
            }
        );
    }, [userUUID, name, color, errorInfo, namedColors, updateMetadata]);

    const handleEdit = useCallback(
        (index: number, newName: string) => {
            if (!userUUID) {
                return;
            }
            const selectedColor = namedColors[index];
            if (!selectedColor) {
                return;
            }
            // Don't make network call if nothing changed
            if (
                newName === selectedColor.name &&
                color === selectedColor.color
            ) {
                setEditIndex(null);
                return;
            }

            const newNamedColors = [...namedColors];
            newNamedColors[index] = {
                name: newName.trim(),
                color: color, // Use the current color from picker
            };
            updateMetadata(
                {
                    updates: {
                        namedColors: newNamedColors,
                    },
                },
                {
                    onSuccess: () => {
                        setEditIndex(null);
                    },
                }
            );
        },
        [userUUID, namedColors, color, updateMetadata]
    );

    const handleDelete = useCallback(() => {
        if (!userUUID || deleteIndices.length === 0) {
            return;
        }
        // Fix: Filter OUT the deleted indices (bug in original code)
        const newNamedColors = namedColors.filter(
            (_, index) => !deleteIndices.includes(index)
        );
        updateMetadata(
            {
                updates: {
                    namedColors: newNamedColors,
                },
            },
            {
                onSuccess: () => {
                    setDeleteIndices([]);
                },
            }
        );
    }, [userUUID, namedColors, deleteIndices, updateMetadata]);

    const handleDeleteToggle = useCallback((index: number) => {
        setDeleteIndices((prev) =>
            prev.includes(index)
                ? prev.filter((i) => i !== index)
                : [...prev, index]
        );
        setEditIndex(null);
    }, []);

    const handleEditStart = useCallback(
        (index: number) => {
            setEditIndex(index);
            setDeleteIndices([]);
            // Set color picker to the color being edited
            const colorToEdit = namedColors[index];
            if (colorToEdit) {
                setColor(colorToEdit.color);
            }
        },
        [namedColors]
    );

    const handleEditCancel = useCallback(() => {
        setEditIndex(null);
    }, []);

    const onClose = useCallback(() => {
        setNamedColorsDialogProps({
            open: false,
        });
    }, [setNamedColorsDialogProps]);

    return {
        open: namedColorsDialogProps.open,
        onClose,
        color,
        setColor: handleColorChange,
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
    };
};
