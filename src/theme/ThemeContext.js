import { createContext } from "react";

// Dark mode color #1f1b24
export const themes = {
    light: {
      foreground: "#000000",
      background: "#eeeeee",
    },
    dark: {
      foreground: "#ffffff",
      background: "#222222",
    },
  };

export const ThemeContext = createContext({
    theme: themes.dark, // default theme
    toggleTheme: () => {},
  });