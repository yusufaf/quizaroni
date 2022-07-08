import { useState } from "react";
import { ThemeContext, themes } from "./ThemeContext";
import { ThemeProvider } from '@mui/material/styles';
import { LIGHT, DARK } from "../utilities/constants";

export const CustomThemeProvider = (props) => {
    const { children } = props;

    const [isDarkMode, setIsDarkMode] = useState(false);

    // Read current theme from localStorage or maybe from an api
    const currentTheme = localStorage.getItem("appTheme") || LIGHT;
    const [themeName, setThemeName] = useState(currentTheme);

    // const [theme, setTheme] = useState(themes.light);
    const theme = themes[themeName];

    // Wrap setThemeName to store new theme names in localStorage
    const setAppThemeName = (name) => {
        localStorage.setItem('appTheme', name)
        setThemeName(name);
        setIsDarkMode(name === DARK);
    }

    const toggleDarkMode = () => {
        setIsDarkMode(prevDarkMode => !prevDarkMode);
        setThemeName(prevTheme => prevTheme === DARK ? LIGHT : DARK);
    }

    const contextValue = {
        currentTheme: themeName,
        isDarkMode,
        theme,
        setTheme: setAppThemeName,
        toggleDarkMode
    }

    return (
        <ThemeContext.Provider value={contextValue}>
            <ThemeProvider theme={theme}>
                {children}
            </ThemeProvider>
        </ThemeContext.Provider>
    )
}