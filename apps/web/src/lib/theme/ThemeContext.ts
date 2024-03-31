import { createContext } from "react";
import { Theme } from "@mui/material/styles";
import { type ThemeName } from "lib/types";

declare module "@mui/material/styles" {
    interface Theme {
        palette: Palette;
    }

    interface Palette {
        other: any;
    }

    interface PaletteOptions {
        other: any;
    }
}

export interface ThemeContextType {
    theme: ThemeName;
    isDarkMode: boolean;
    muiTheme: Theme;
    setTheme: (name: ThemeName) => void;
    toggleDarkMode: () => void;
}


export const ThemeContext = createContext<ThemeContextType | null>(null);
