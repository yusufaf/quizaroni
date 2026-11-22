import {
    Dialog,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    Box,
    Typography,
    CircularProgress,
    Alert,
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { useState, useRef } from 'react';
import { StyledDialogActions } from 'styles/AppStyles';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import { User, AvatarMetadata } from 'shared/types';
import {
    useUpdateUserMetadata,
    useUploadProfilePicture,
} from 'state/api/usersAPI';
import {
    getAvatarPresets,
    generateDiceBearUrl,
    prepareImageForUpload,
    type AvatarPreset,
} from 'utilities/avatarUtils';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

type Props = {
    open: boolean;
    onClose: () => void;
    userData: User;
};

const ProfilePictureDialog = ({ open, onClose, userData }: Props) => {
    const { t } = useTranslation(['profile', 'common']);
    const [selectedAvatar, setSelectedAvatar] = useState<AvatarMetadata | null>(
        null
    );
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const updateMetadataMutation = useUpdateUserMetadata();
    const uploadPictureMutation = useUploadProfilePicture();

    const presets = getAvatarPresets(userData.userUUID);

    const handlePresetSelect = (preset: AvatarPreset) => {
        const avatarUrl = generateDiceBearUrl(preset.style, preset.seed);
        setSelectedAvatar({
            type: 'dicebear',
            value: avatarUrl,
        });
        setError(null);
    };

    const handleFileSelect = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setError(t('profilePictureDialog.invalidType'));
            return;
        }

        // Validate file size (before compression)
        if (file.size > 10 * 1024 * 1024) {
            setError(t('profilePictureDialog.fileTooLarge'));
            return;
        }

        setUploading(true);
        setError(null);

        try {
            // Compress and prepare image
            const { base64, contentType, fileName } =
                await prepareImageForUpload(file);

            // Upload to S3
            const result = await uploadPictureMutation.mutateAsync({
                imageData: base64,
                fileName,
                contentType,
            });

            // Set selected avatar to uploaded URL
            setSelectedAvatar({
                type: 'upload',
                value: result.url,
            });

            toast.success(t('profilePictureDialog.uploadSuccess'));
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err?.message || t('profilePictureDialog.uploadFailed'));
            toast.error(t('profilePictureDialog.uploadFailed'));
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedAvatar) {
            setError(t('profilePictureDialog.selectAvatar'));
            return;
        }

        try {
            await updateMetadataMutation.mutateAsync({
                updates: { avatar: selectedAvatar },
            });
            toast.success(t('profilePictureDialog.updated'));
            onClose();
        } catch (err: any) {
            console.error('Save error:', err);
            setError(err?.message || t('profilePictureDialog.saveFailed'));
            toast.error(t('profilePictureDialog.saveFailed'));
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <StandardDialogTitle
                title={t('profilePictureDialog.title')}
                onClose={onClose}
            />
            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Typography variant="h6" gutterBottom>
                    {t('profilePictureDialog.presetAvatars')}
                </Typography>
                <Box
                    sx={{
                        maxHeight: '25rem',
                        overflowY: 'auto',
                        mb: 3,
                        pr: 1,
                        '&::-webkit-scrollbar': {
                            width: '0.5rem',
                        },
                        '&::-webkit-scrollbar-track': {
                            background: 'rgba(0,0,0,0.1)',
                            borderRadius: '0.25rem',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: '0.25rem',
                            '&:hover': {
                                background: 'rgba(0,0,0,0.4)',
                            },
                        },
                    }}
                >
                    <Grid container spacing={2}>
                        {presets.map((preset) => {
                            const avatarUrl = generateDiceBearUrl(
                                preset.style,
                                preset.seed
                            );
                            const isSelected =
                                selectedAvatar?.type === 'dicebear' &&
                                selectedAvatar?.value === avatarUrl;

                            return (
                                <Grid
                                    item
                                    xs={4}
                                    sm={3}
                                    md={2.4}
                                    key={preset.id}
                                >
                                    <Box
                                        onClick={() =>
                                            handlePresetSelect(preset)
                                        }
                                        sx={{
                                            cursor: 'pointer',
                                            border: isSelected
                                                ? '3px solid'
                                                : '2px solid transparent',
                                            borderColor: isSelected
                                                ? 'primary.main'
                                                : 'transparent',
                                            borderRadius: '50%',
                                            overflow: 'hidden',
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                transform: 'scale(1.05)',
                                            },
                                        }}
                                    >
                                        <img
                                            src={avatarUrl}
                                            alt={preset.label}
                                            style={{
                                                width: '100%',
                                                height: 'auto',
                                                display: 'block',
                                            }}
                                        />
                                    </Box>
                                </Grid>
                            );
                        })}
                    </Grid>
                </Box>

                <Typography variant="h6" gutterBottom>
                    {t('profilePictureDialog.uploadCustomImage')}
                </Typography>
                <Box
                    sx={{
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                    }}
                >
                    <Button
                        variant="outlined"
                        startIcon={
                            uploading ? (
                                <CircularProgress size={20} />
                            ) : (
                                <UploadIcon />
                            )
                        }
                        onClick={handleUploadClick}
                        disabled={uploading}
                    >
                        {uploading
                            ? t('profilePictureDialog.uploading')
                            : t('profilePictureDialog.chooseFile')}
                    </Button>
                    {selectedAvatar?.type === 'upload' && (
                        <Box
                            sx={{
                                width: '5rem',
                                height: '5rem',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                border: '2px solid',
                                borderColor: 'primary.main',
                            }}
                        >
                            <img
                                src={selectedAvatar.value}
                                alt={t('profilePictureDialog.selectedAlt')}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                }}
                            />
                        </Box>
                    )}
                </Box>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: 'block' }}
                >
                    {t('profilePictureDialog.uploadHint')}
                </Typography>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />
            </DialogContent>
            <StyledDialogActions>
                <Button onClick={onClose} color="secondary">
                    {t('common:buttons.cancel')}
                </Button>
                <Button
                    onClick={handleSave}
                    color="primary"
                    variant="contained"
                    disabled={
                        !selectedAvatar || updateMetadataMutation.isPending
                    }
                >
                    {updateMetadataMutation.isPending
                        ? t('profilePictureDialog.saving')
                        : t('common:buttons.save')}
                </Button>
            </StyledDialogActions>
        </Dialog>
    );
};

export default ProfilePictureDialog;
