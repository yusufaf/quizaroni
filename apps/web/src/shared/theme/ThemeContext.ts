import { createContext } from 'react';
import { Theme } from '@mui/material/styles';
import { type ThemeName } from 'shared/types';
import type { PaletteOther } from './tokens';

declare module '@mui/material/styles' {
    interface Theme {
        palette: Palette;
    }

    interface Palette {
        other: PaletteOther;
    }

    interface PaletteOptions {
        other?: PaletteOther;
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
