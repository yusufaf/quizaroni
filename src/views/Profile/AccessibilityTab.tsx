import { Accessibility } from '@mui/icons-material';
import {
    CircularProgress,
    Slider,
    Typography,
    Box,
} from '@mui/material';
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { SimpleFlexContainer } from 'shared/styles/AppStyles';
import { User } from 'shared/types';
import { useUpdateUserMetadata } from 'state/api/usersAPI';
import { useTheme } from 'shared/theme/useTheme';
import {
    ActionColumn,
    ActionHeader,
    AccountViewContainer,
} from './ProfileStyles';

const LOADING_IDS = {
    FONT_SIZE: 'fontSizeScale',
};

// Slider marks for labeled stops
const SLIDER_MARKS = [
    { value: 0.875, label: 'Small' },
    { value: 1, label: 'Medium' },
    { value: 1.125, label: 'Large' },
    { value: 1.25, label: 'XL' },
];

type Props = {
    userData: User;
};

const AccessibilityTab = ({ userData }: Props) => {
    const { setFontSizeScale, fontSizeScale: currentScale } = useTheme();
    const { metadata: { fontSizeScale = 1 } } = userData;

    const [loadingID, setLoadingID] = useState<string>('');
    const [localScale, setLocalScale] = useState<number>(fontSizeScale);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Sync fontSizeScale from user metadata when available
    useEffect(() => {
        if (fontSizeScale !== currentScale) {
            setFontSizeScale(fontSizeScale);
        }
        setLocalScale(fontSizeScale);
    }, [fontSizeScale, currentScale, setFontSizeScale]);

    const fontSizeLoading = useMemo(() => {
        return loadingID === LOADING_IDS.FONT_SIZE;
    }, [loadingID]);

    const { mutate: updateUserMetadata } = useUpdateUserMetadata();

    // Debounced theme update - only update theme after user stops dragging for 100ms
    const debouncedThemeUpdate = useCallback((scale: number) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            setFontSizeScale(scale);
        }, 100);
    }, [setFontSizeScale]);

    const handleSliderChange = (_event: Event, newValue: number | number[]) => {
        const scale = Array.isArray(newValue) ? newValue[0] : newValue;
        if (scale !== undefined) {
            setLocalScale(scale);
            // Debounce theme updates to reduce jitter
            debouncedThemeUpdate(scale);
        }
    };

    const handleSliderChangeCommitted = (_event: Event | React.SyntheticEvent, newValue: number | number[]) => {
        const scale = Array.isArray(newValue) ? newValue[0] : newValue;

        if (scale === undefined) return;

        // Clear any pending debounce and apply immediately
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        setFontSizeScale(scale);

        setLoadingID(LOADING_IDS.FONT_SIZE);

        // Persist to backend
        updateUserMetadata(
            {
                updates: {
                    fontSizeScale: scale,
                },
            },
            {
                onSuccess: () => {
                    console.log('Font size scale updated successfully');
                    setLoadingID('');
                },
                onError: (error) => {
                    console.error('Failed to update font size scale:', error);
                    // Revert on error
                    setFontSizeScale(fontSizeScale);
                    setLocalScale(fontSizeScale);
                    setLoadingID('');
                },
            }
        );
    };

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    return (
        <AccountViewContainer>
            <ActionColumn>
                <ActionHeader>
                    <Accessibility />
                    <Typography variant="h6">Font Size</Typography>
                </ActionHeader>
                <Typography variant="body2" color="text.secondary">
                    Adjust text size across the entire application for better
                    readability
                </Typography>
                <Box sx={{ width: '100%', maxWidth: '25rem', mt: 2 }}>
                    <SimpleFlexContainer style={{ gap: '1rem', marginBottom: '0.5rem' }}>
                        <Typography variant="body2" color="text.primary">
                            Current scale: <strong>{localScale.toFixed(3)}x</strong>
                        </Typography>
                        {fontSizeLoading && <CircularProgress size={20} />}
                    </SimpleFlexContainer>
                    <Slider
                        value={localScale}
                        onChange={handleSliderChange}
                        onChangeCommitted={handleSliderChangeCommitted}
                        min={0.75}
                        max={1.5}
                        step={0.025}
                        marks={SLIDER_MARKS}
                        disabled={fontSizeLoading}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(value) => `${value.toFixed(2)}x`}
                        sx={{
                            '& .MuiSlider-markLabel': {
                                fontSize: '0.75rem',
                            },
                        }}
                    />
                </Box>
            </ActionColumn>
        </AccountViewContainer>
    );
};

export default AccessibilityTab;
