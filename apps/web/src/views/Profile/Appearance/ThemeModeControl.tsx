import type { ReactNode } from 'react';
import { DarkMode, LightMode, SettingsBrightness } from '@mui/icons-material';
import { ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SimpleFlexContainer } from 'shared/styles/AppStyles';
import { THEME_MODE_PREFS, type ThemeModePref } from 'shared/theme/themeIds';
import { useTheme } from 'shared/theme/useTheme';
import { ActionColumn, ActionHeader } from '../ProfileStyles';

const ICONS: Record<ThemeModePref, ReactNode> = {
    system: <SettingsBrightness />,
    light: <LightMode />,
    dark: <DarkMode />,
};

const LABELS = {
    system: 'profile.themeModeSystem',
    light: 'profile.themeModeLight',
    dark: 'profile.themeModeDark',
} as const;

const ThemeModeControl = () => {
    const { t } = useTranslation();
    const { prefs, setThemePrefs } = useTheme();

    return (
        <ActionColumn>
            <ActionHeader>
                <DarkMode />
                <Typography variant="h6">{t('profile.themeMode')}</Typography>
            </ActionHeader>
            <SimpleFlexContainer style={{ gap: '1rem' }}>
                <ToggleButtonGroup
                    aria-label={t('profile.themeMode')}
                    exclusive
                    value={prefs.themeMode}
                    // Re-selecting gives null; passing the mode again still
                    // clears the header override.
                    onChange={(_e, v: ThemeModePref | null) =>
                        setThemePrefs({ themeMode: v ?? prefs.themeMode })
                    }
                >
                    {THEME_MODE_PREFS.map((mode) => (
                        <ToggleButton key={mode} value={mode} sx={{ gap: 1 }}>
                            {ICONS[mode]}
                            {t(LABELS[mode])}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </SimpleFlexContainer>
        </ActionColumn>
    );
};

export default ThemeModeControl;
