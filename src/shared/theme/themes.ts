import type {} from '@mui/x-data-grid/themeAugmentation';
import { createTheme } from '@mui/material';

const primaryColor = '#ffa000';
const primaryHoverColor = '#c67100';
const primaryLightColor = '#ffd149';

// MUI Typography base configuration with scale multiplier
const getBaseTypography = (scale: number = 1) => ({
    fontSize: 14 * scale,
    h1: { fontSize: `${2.5 * scale}rem`, fontWeight: 600 },
    h2: { fontSize: `${2 * scale}rem`, fontWeight: 600 },
    h3: { fontSize: `${1.75 * scale}rem`, fontWeight: 600 },
    h4: { fontSize: `${1.5 * scale}rem`, fontWeight: 600 },
    h5: { fontSize: `${1.25 * scale}rem`, fontWeight: 600 },
    h6: { fontSize: `${1.125 * scale}rem`, fontWeight: 600 },
    body1: { fontSize: `${1 * scale}rem` },
    body2: { fontSize: `${0.875 * scale}rem` },
    subtitle1: { fontSize: `${1 * scale}rem`, fontWeight: 500 },
    subtitle2: { fontSize: `${0.875 * scale}rem`, fontWeight: 500 },
    button: { fontSize: `${0.875 * scale}rem`, fontWeight: 600 },
    caption: { fontSize: `${0.75 * scale}rem` },
    overline: { fontSize: `${0.75 * scale}rem`, textTransform: 'uppercase' as const },
});

export const createLightTheme = (fontScale: number = 1) => createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: primaryColor,
            light: primaryLightColor,
            dark: primaryHoverColor,
            contrastText: '#000000',
        },
        other: {
            gold: {
                main: '#FFDF00',
            },
        },
        text: {
            primary: 'rgba(0, 0, 0, 0.87)',
            secondary: 'rgba(0, 0, 0, 0.6)',
            disabled: 'rgba(0, 0, 0, 0.38)',
        },
    },
    typography: getBaseTypography(fontScale),
    components: {
        MuiButton: {
            styleOverrides: {
                text: {
                    color: primaryColor,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        color: primaryHoverColor,
                        backgroundColor: 'rgba(255, 160, 0, 0.2)',
                    },
                    fontWeight: 600,
                },
                contained: {
                    color: '#000000',
                    backgroundColor: primaryColor,
                    '&:hover': {
                        color: '#ffffff',
                        backgroundColor: primaryHoverColor,
                    },
                    fontWeight: 600,
                },
                outlined: {
                    fontWeight: 600,
                },
            },
        },
    },
});

export const createDarkTheme = (fontScale: number = 1) => createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: primaryColor,
            light: primaryLightColor,
            dark: primaryHoverColor,
            contrastText: '#000000',
        },
        other: {
            gold: {
                main: '#FFDF00',
            },
        },
        text: {
            primary: 'rgba(255, 255, 255, 0.87)',
            secondary: 'rgba(255, 255, 255, 0.6)',
            disabled: 'rgba(255, 255, 255, 0.5)',
        },
    },
    typography: getBaseTypography(fontScale),
    components: {
        MuiButton: {
            styleOverrides: {
                text: {
                    color: primaryColor,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        color: '#ffffff',
                        backgroundColor: 'rgba(255, 160, 0, 0.2)',
                    },
                    fontWeight: 600,
                },
                contained: {
                    color: '#000000',
                    backgroundColor: primaryColor,
                    '&:hover': {
                        color: '#ffffff',
                        backgroundColor: primaryHoverColor,
                    },
                    fontWeight: 600,
                },
                outlined: {
                    fontWeight: 600,
                },
            },
        },
    },
});

// Backward compatibility - default exports
export const light = createLightTheme();
export const dark = createDarkTheme();
export const themes = {
    light,
    dark,
};
