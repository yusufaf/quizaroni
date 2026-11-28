import { createContext } from 'react';
import { Theme } from '@mui/material/styles';
import type {
    FlatPrefs,
    StoredTheme,
    ThemePrefs,
    ThemePrefsPatch,
} from './prefs';
import type { ThemeId } from './themeIds';
import type { PaletteOther, ThemeMode } from './tokens';

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
    /** The effective mode, for ToastContainer. */
    theme: ThemeMode;
    isDarkMode: boolean;
    muiTheme: Theme;
    fontSizeScale: number;
    setFontSizeScale: (scale: number) => void;
    toggleDarkMode: () => void;
    prefs: ThemePrefs;
    modeOverride: ThemeMode | null;
    activeThemeId: ThemeId;
    setThemePrefs: (patch: ThemePrefsPatch) => void;
    // Used by ThemeSync only.
    editSeq: number;
    getStored: () => StoredTheme;
    applyServerPrefs: (server: FlatPrefs, userId: string) => void;
    markSynced: (sent: FlatPrefs) => void;
    revertSent: (sent: FlatPrefs) => void;
    resetSync: () => void;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);
