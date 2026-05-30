import { useMemo, useState, type ReactNode } from 'react';
import { ThemeContext, ThemeContextType } from './ThemeContext';
import { createLightTheme, createDarkTheme } from './themes';
import { ThemeProvider } from '@mui/material/styles';
import { LIGHT, DARK } from 'shared/constants';
import { ThemeName } from 'shared/types';
import { amplifyThemeOverrides } from './amplifyThemeOverrides';
import { ThemeProvider as AmplifyThemeProvider } from '@aws-amplify/ui-react';

type Props = {
    children: ReactNode;
};

export const CustomThemeProvider = ({ children }: Props) => {
    const initialThemeName = (localStorage.getItem('appTheme') ??
        LIGHT) as ThemeName;
    const initialFontScale = Number(
        localStorage.getItem('fontSizeScale') ?? '1'
    );

    const [theme, setTheme] = useState<ThemeName>(initialThemeName);
    const [fontSizeScale, setFontSizeScaleState] =
        useState<number>(initialFontScale);
    const [isDarkMode, setIsDarkMode] = useState<boolean>(theme === DARK);

    // Recreate theme when theme name OR font scale changes
    const muiTheme = useMemo(() => {
        const themeFactory =
            theme === DARK ? createDarkTheme : createLightTheme;
        return themeFactory(fontSizeScale);
    }, [theme, fontSizeScale]);

    const setAppTheme = (name: ThemeName) => {
        localStorage.setItem('appTheme', name);
        setTheme(name);
        setIsDarkMode(name === DARK);
    };

    const setFontSizeScale = (scale: number) => {
        localStorage.setItem('fontSizeScale', String(scale));
        setFontSizeScaleState(scale);
    };

    const toggleDarkMode = () => {
        const oppositeThemeName = isDarkMode ? LIGHT : DARK;
        setAppTheme(oppositeThemeName);
    };

    const contextValue: ThemeContextType = {
        theme,
        isDarkMode,
        muiTheme,
        fontSizeScale,
        setTheme: setAppTheme,
        setFontSizeScale,
        toggleDarkMode,
    };

    const amplifyTheme = useMemo(
        () => amplifyThemeOverrides(muiTheme),
        [muiTheme]
    );

    return (
        <ThemeContext.Provider value={contextValue}>
            <ThemeProvider theme={muiTheme}>
                <AmplifyThemeProvider theme={amplifyTheme}>
                    {children}
                </AmplifyThemeProvider>
            </ThemeProvider>
        </ThemeContext.Provider>
    );
};
