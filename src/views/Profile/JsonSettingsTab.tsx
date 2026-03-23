import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Alert,
    Box,
    Chip,
    Typography,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
    Save as SaveIcon,
    Restore as RestoreIcon,
} from '@mui/icons-material';
import { styled } from '@mui/system';
import { useTranslation } from 'react-i18next';
import { User } from 'shared/types';
import { useUpdateUserMetadata } from 'state/api/usersAPI';
import { UserMetadataSchema } from 'shared/schemas';
import { AccountViewContainer } from './ProfileStyles';
import { toast } from 'react-toastify';

const EditorContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    height: '100%',
}));

const EditorHeader = styled(Box)({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
});

const StyledTextarea = styled('textarea')<{ hasError: boolean }>(({ theme, hasError }) => ({
    width: '100%',
    minHeight: '30rem',
    padding: '1rem',
    fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", "Consolas", monospace',
    fontSize: '0.875rem',
    lineHeight: '1.5',
    tabSize: 4,
    backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
    color: theme.palette.mode === 'dark' ? '#d4d4d4' : '#1e1e1e',
    border: `1px solid ${hasError ? theme.palette.error.main : theme.palette.divider}`,
    borderRadius: '0.5rem',
    outline: 'none',
    resize: 'vertical',
    transition: 'border-color 0.2s ease',
    '&:focus': {
        borderColor: hasError ? theme.palette.error.main : theme.palette.primary.main,
        boxShadow: `0 0 0 2px ${hasError ? theme.palette.error.main + '33' : theme.palette.primary.main + '33'}`,
    },
    '&::selection': {
        backgroundColor: theme.palette.primary.main + '44',
    },
}));

const ErrorList = styled(Box)(({ theme }) => ({
    maxHeight: '8rem',
    overflowY: 'auto',
    padding: '0.75rem',
    backgroundColor: theme.palette.mode === 'dark' ? '#2d1515' : '#fef2f2',
    border: `1px solid ${theme.palette.error.main}`,
    borderRadius: '0.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
}));

const ButtonRow = styled(Box)({
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end',
});

// Fields that shouldn't be edited via JSON (managed by other UI flows)
const EXCLUDED_FIELDS = ['avatar', 'namedColors', 'notifications'] as const;

const formatMetadataForEditor = (metadata: User['metadata']): string => {
    const filtered = Object.fromEntries(
        Object.entries(metadata).filter(
            ([key]) => !EXCLUDED_FIELDS.includes(key as (typeof EXCLUDED_FIELDS)[number])
        )
    );
    return JSON.stringify(filtered, null, 4);
};

type ValidationError = {
    path: string;
    message: string;
};

const validateJson = (jsonString: string): { data: Record<string, any> | null; errors: ValidationError[] } => {
    let parsed: any;
    try {
        parsed = JSON.parse(jsonString);
    } catch (e) {
        return {
            data: null,
            errors: [{ path: '', message: (e as Error).message }],
        };
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return {
            data: null,
            errors: [{ path: '', message: 'Root value must be an object' }],
        };
    }

    // Validate only the editable fields against the schema
    const partialSchema = UserMetadataSchema.partial();
    const result = partialSchema.safeParse(parsed);

    if (result.success) {
        return { data: parsed, errors: [] };
    }

    const errors: ValidationError[] = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
    }));

    return { data: null, errors };
};

type Props = {
    userData: User;
};

const JsonSettingsTab = ({ userData }: Props) => {
    const { t } = useTranslation();
    const { mutateAsync: updateUserMetadata } = useUpdateUserMetadata();

    const originalJson = useMemo(
        () => formatMetadataForEditor(userData.metadata),
        [userData.metadata]
    );

    const [editorValue, setEditorValue] = useState(originalJson);
    const [errors, setErrors] = useState<ValidationError[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Sync when external data changes (e.g. after save invalidates cache)
    useEffect(() => {
        setEditorValue(formatMetadataForEditor(userData.metadata));
        setErrors([]);
    }, [userData.metadata]);

    const isDirty = editorValue !== originalJson;

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setEditorValue(value);

        // Live validation
        const { errors: newErrors } = validateJson(value);
        setErrors(newErrors);
    }, []);

    const handleReset = useCallback(() => {
        setEditorValue(originalJson);
        setErrors([]);
    }, [originalJson]);

    const handleSave = useCallback(async () => {
        const { data, errors: validationErrors } = validateJson(editorValue);
        if (validationErrors.length > 0 || !data) {
            setErrors(validationErrors);
            return;
        }

        setIsSaving(true);
        try {
            await updateUserMetadata({ updates: data });
            toast.success(t('profile.jsonSettingsSaved'));
        } catch {
            toast.error(t('profile.jsonSettingsSaveFailed'));
        } finally {
            setIsSaving(false);
        }
    }, [editorValue, updateUserMetadata, t]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Ctrl/Cmd+S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (isDirty && errors.length === 0) {
                handleSave();
            }
        }

        // Tab key inserts spaces instead of changing focus
        if (e.key === 'Tab') {
            e.preventDefault();
            const target = e.target as HTMLTextAreaElement;
            const start = target.selectionStart;
            const end = target.selectionEnd;
            const newValue =
                editorValue.substring(0, start) +
                '    ' +
                editorValue.substring(end);
            setEditorValue(newValue);
            // Restore cursor position after React re-render
            requestAnimationFrame(() => {
                target.selectionStart = target.selectionEnd = start + 4;
            });
        }
    }, [isDirty, errors, handleSave, editorValue]);

    return (
        <AccountViewContainer>
            <EditorContainer>
                <EditorHeader>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Typography variant="h6">
                            {t('profile.jsonSettingsTitle')}
                        </Typography>
                        {isDirty && (
                            <Chip
                                label={t('profile.unsavedChanges')}
                                color="warning"
                                size="small"
                                variant="outlined"
                            />
                        )}
                    </Box>
                    <ButtonRow>
                        <LoadingButton
                            variant="outlined"
                            startIcon={<RestoreIcon />}
                            onClick={handleReset}
                            disabled={!isDirty}
                            size="small"
                        >
                            {t('profile.resetChanges')}
                        </LoadingButton>
                        <LoadingButton
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleSave}
                            loading={isSaving}
                            disabled={!isDirty || errors.length > 0}
                            size="small"
                        >
                            {t('profile.saveSettings')}
                        </LoadingButton>
                    </ButtonRow>
                </EditorHeader>

                <Typography variant="body2" color="text.secondary">
                    {t('profile.jsonSettingsDescription')}
                </Typography>

                {errors.length > 0 && (
                    <ErrorList>
                        {errors.map((error, i) => (
                            <Typography key={i} variant="caption" color="error" sx={{ fontFamily: 'monospace' }}>
                                {error.path ? `${error.path}: ` : ''}{error.message}
                            </Typography>
                        ))}
                    </ErrorList>
                )}

                <StyledTextarea
                    value={editorValue}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    hasError={errors.length > 0}
                    spellCheck={false}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                />

                <Alert severity="info" variant="outlined">
                    {t('profile.jsonSettingsExcludedNote')}
                </Alert>
            </EditorContainer>
        </AccountViewContainer>
    );
};

export default JsonSettingsTab;
