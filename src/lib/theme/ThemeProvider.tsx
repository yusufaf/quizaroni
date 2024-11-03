import { useMemo, useState, type ReactNode } from 'react';
import { ThemeContext, ThemeContextType } from './ThemeContext';
import { themes } from './themes';
import { Theme, ThemeProvider } from '@mui/material/styles';
import { LIGHT, DARK } from 'utilities/constants';
import { ThemeName } from 'lib/types';
import { amplifyThemeOverrides } from './amplifyThemeOverrides';
import { ThemeProvider as AmplifyThemeProvider } from '@aws-amplify/ui-react';

type Props = {
    children: ReactNode;
};
export const CustomThemeProvider = ({ children }: Props) => {
    // TODO: Read current theme from localStorage or maybe from an api
    const initialThemeName = (localStorage.getItem('appTheme') ??
        LIGHT) as ThemeName;
    const [theme, setTheme] = useState<ThemeName>(initialThemeName);
    const [muiTheme, setMuiTheme] = useState<Theme>(themes[theme]);
    const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

    /**
     * Wrapper function for updating the theme
     */
    const setAppTheme = (name: ThemeName) => {
        localStorage.setItem('appTheme', name);
        setTheme(name);
        setIsDarkMode(name === DARK);
        setMuiTheme(themes[name]);
    };

    const toggleDarkMode = () => {
        const oppositeThemeName = isDarkMode ? LIGHT : DARK;
        setAppTheme(oppositeThemeName);
    };

    const contextValue: ThemeContextType = {
        theme,
        isDarkMode,
        muiTheme,
        setTheme: setAppTheme,
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
