import React, { useState } from "react";
import { ThemeContext, themes } from "./ThemeContext";

// Abstract into a custom provider component  
export const ThemeProvider = ({children}) => {

    const [isDarkMode, setIsDarkMode] = useState(false);
    const [theme, setTheme] = useState(themes.light);

    const toggleDarkMode = () => {
        // Pass in a function that has access to previous state
        setIsDarkMode(prevDarkMode => !prevDarkMode);
        setTheme(prevTheme => prevTheme.name === "dark" ? themes.light : themes.dark);
    }

    return (
        <ThemeContext.Provider value = { {isDarkMode, toggleDarkMode, theme} }>
            {children}
        </ThemeContext.Provider>
    )
}