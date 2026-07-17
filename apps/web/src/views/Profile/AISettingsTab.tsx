import {
    Alert,
    Box,
    Button,
    CircularProgress,
    IconButton,
    InputAdornment,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    Delete,
    CheckCircle,
    Error as ErrorIcon,
    OpenInNew,
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AIProvider, AI_PROVIDERS } from 'shared/ai/providers';
import {
    saveApiKey,
    getApiKey,
    deleteApiKey,
    hasApiKey,
} from 'shared/ai/aiKeyStorage';
import { testAPIKey, fetchModels } from 'shared/ai/aiService';
import { useGetUser, useUpdateUserMetadata } from 'state/api/usersAPI';
import { User } from 'shared/types';
import {
    ActionColumn,
    ActionHeader,
    SimpleSelect,
    AccountViewContainer,
} from './ProfileStyles';

type Props = {
    userData: User;
};

const AISettingsTab = ({ userData }: Props) => {
    const { t } = useTranslation('ai');
    const { mutate: updateMetadata } = useUpdateUserMetadata();

    const [provider, setProvider] = useState<AIProvider | ''>(
        userData.metadata.aiProvider || ''
    );
    const [model, setModel] = useState<string>(userData.metadata.aiModel || '');
    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [hasKey, setHasKey] = useState(false);

    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<'success' | 'error' | null>(
        null
    );
    const [fetchedModels, setFetchedModels] = useState<
        { id: string; name: string }[] | null
    >(null);
    const [isFetchingModels, setIsFetchingModels] = useState(false);

    useEffect(() => {
        if (provider && userData.userUUID) {
            const has = hasApiKey(provider as AIProvider);
            setHasKey(has);

            if (has) {
                const loadModels = async () => {
                    setIsFetchingModels(true);
                    const key = await getApiKey(
                        provider as AIProvider,
                        userData.userUUID
                    );
                    if (key) {
                        const models = await fetchModels(
                            provider as AIProvider,
                            key
                        );
                        if (models && models.length > 0) {
                            setFetchedModels(models);
                        } else {
                            setFetchedModels(null);
                        }
                    }
                    setIsFetchingModels(false);
                };
                loadModels();
            } else {
                setFetchedModels(null);
            }
        } else {
            setHasKey(false);
            setFetchedModels(null);
        }
    }, [provider, userData.userUUID]);

    const handleProviderChange = (newProvider: AIProvider) => {
        setProvider(newProvider);
        const defaultModel =
            AI_PROVIDERS[newProvider].models.find((m) => m.recommended)?.id ||
            AI_PROVIDERS[newProvider].models[0].id;
        setModel(defaultModel);

        updateMetadata({
            updates: {
                aiProvider: newProvider,
                aiModel: defaultModel,
            },
        });

        setApiKey('');
        setTestResult(null);
    };

    const handleModelChange = (newModel: string) => {
        setModel(newModel);
        updateMetadata({
            updates: { aiModel: newModel },
        });
    };

    const handleSaveKey = async () => {
        if (!provider || !apiKey || !userData.userUUID) return;

        await saveApiKey(provider as AIProvider, apiKey, userData.userUUID);
        setHasKey(true);
        setApiKey('');
        setTestResult(null);
    };

    const handleDeleteKey = async () => {
        if (!provider) return;
        await deleteApiKey(provider as AIProvider);
        setHasKey(false);
        setApiKey('');
        setTestResult(null);
    };

    const handleTestConnection = async () => {
        if (!provider || !model || !userData.userUUID) return;

        setIsTesting(true);
        setTestResult(null);

        const key = await getApiKey(provider as AIProvider, userData.userUUID);
        if (!key) {
            setIsTesting(false);
            setTestResult('error');
            return;
        }

        const success = await testAPIKey(provider as AIProvider, model, key);
        setTestResult(success ? 'success' : 'error');
        setIsTesting(false);
    };

    const currentProviderConfig = provider
        ? AI_PROVIDERS[provider as AIProvider]
        : null;

    return (
        <AccountViewContainer>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                    {t('aiSettings.title')}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    {t('aiSettings.description')}
                </Typography>
            </Box>

            <ActionColumn>
                <ActionHeader>
                    <Typography variant="h6">
                        {t('aiSettings.provider')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('aiSettings.providerDescription')}
                    </Typography>
                </ActionHeader>
                <SimpleSelect
                    value={provider}
                    onChange={(e: any) => handleProviderChange(e.target.value)}
                    displayEmpty
                >
                    <MenuItem value="" disabled>
                        Select Provider
                    </MenuItem>
                    {Object.values(AI_PROVIDERS).map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                            {p.icon} {p.name}
                        </MenuItem>
                    ))}
                </SimpleSelect>
            </ActionColumn>

            {currentProviderConfig && (
                <>
                    <ActionColumn>
                        <ActionHeader>
                            <Typography variant="h6">
                                {t('aiSettings.model')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {t('aiSettings.modelDescription')}
                            </Typography>
                        </ActionHeader>
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 2,
                                alignItems: 'center',
                            }}
                        >
                            <SimpleSelect
                                value={model}
                                onChange={(e: any) =>
                                    handleModelChange(e.target.value)
                                }
                                sx={{ flex: 1 }}
                            >
                                {(
                                    fetchedModels ||
                                    currentProviderConfig.models
                                ).map((m) => (
                                    <MenuItem key={m.id} value={m.id}>
                                        {m.name}{' '}
                                        {!fetchedModels &&
                                        (m as any).recommended
                                            ? `(${t('aiSettings.recommended')})`
                                            : ''}
                                    </MenuItem>
                                ))}
                            </SimpleSelect>
                            {isFetchingModels && <CircularProgress size={24} />}
                        </Box>
                    </ActionColumn>

                    <ActionColumn>
                        <ActionHeader>
                            <Typography variant="h6">
                                {t('aiSettings.apiKey')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {t('aiSettings.apiKeyDescription')}
                            </Typography>
                        </ActionHeader>

                        <Box
                            sx={{
                                display: 'flex',
                                gap: 2,
                                alignItems: 'flex-start',
                            }}
                        >
                            <Box sx={{ flex: 1 }}>
                                {hasKey ? (
                                    <Alert
                                        severity="success"
                                        icon={<CheckCircle />}
                                        action={
                                            <IconButton
                                                color="inherit"
                                                size="small"
                                                onClick={handleDeleteKey}
                                            >
                                                <Delete />
                                            </IconButton>
                                        }
                                        sx={{ mb: 2 }}
                                    >
                                        {t('aiSettings.apiKeyMasked')}
                                    </Alert>
                                ) : (
                                    <TextField
                                        fullWidth
                                        type={showApiKey ? 'text' : 'password'}
                                        value={apiKey}
                                        onChange={(e) =>
                                            setApiKey(e.target.value)
                                        }
                                        placeholder={
                                            currentProviderConfig.keyPlaceholder
                                        }
                                        size="small"
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        onClick={() =>
                                                            setShowApiKey(
                                                                !showApiKey
                                                            )
                                                        }
                                                        edge="end"
                                                    >
                                                        {showApiKey ? (
                                                            <VisibilityOff />
                                                        ) : (
                                                            <Visibility />
                                                        )}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{ mb: 2 }}
                                    />
                                )}

                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    {!hasKey && (
                                        <Button
                                            variant="contained"
                                            onClick={handleSaveKey}
                                            disabled={!apiKey.trim()}
                                        >
                                            {t('aiSettings.saveKey')}
                                        </Button>
                                    )}
                                    {hasKey && (
                                        <Button
                                            variant="outlined"
                                            onClick={handleTestConnection}
                                            disabled={isTesting}
                                            startIcon={
                                                isTesting ? (
                                                    <CircularProgress
                                                        size={16}
                                                    />
                                                ) : null
                                            }
                                        >
                                            {t('aiSettings.testConnection')}
                                        </Button>
                                    )}
                                    <Button
                                        variant="text"
                                        endIcon={<OpenInNew />}
                                        href={currentProviderConfig.docsUrl}
                                        target="_blank"
                                    >
                                        {t('aiSettings.getApiKey')}
                                    </Button>
                                </Box>

                                {testResult && (
                                    <Alert
                                        severity={
                                            testResult === 'success'
                                                ? 'success'
                                                : 'error'
                                        }
                                        sx={{ mt: 2 }}
                                    >
                                        {testResult === 'success'
                                            ? t('aiSettings.testSuccess')
                                            : t('aiSettings.testError')}
                                    </Alert>
                                )}
                            </Box>
                        </Box>
                    </ActionColumn>

                    <Alert severity="info" sx={{ mt: 2 }}>
                        {t('aiSettings.securityNote')}
                    </Alert>
                </>
            )}
        </AccountViewContainer>
    );
};

export default AISettingsTab;
