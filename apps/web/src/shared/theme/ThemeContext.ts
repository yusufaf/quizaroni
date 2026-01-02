import { createContext } from 'react';
import { Theme } from '@mui/material/styles';
import { type ThemeName } from 'shared/types';

declare module '@mui/material/styles' {
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
    fontSizeScale: number;
    setTheme: (name: ThemeName) => void;
    setFontSizeScale: (scale: number) => void;
    toggleDarkMode: () => void;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);
