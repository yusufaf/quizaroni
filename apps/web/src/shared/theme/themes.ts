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
    overline: {
        fontSize: `${0.75 * scale}rem`,
        textTransform: 'uppercase' as const,
    },
});

export const createLightTheme = (fontScale: number = 1) =>
    createTheme({
        palette: {
            mode: 'light',
            primary: {
                main: primaryColor,
                light: primaryLightColor,
                dark: primaryHoverColor,
                contrastText: '#000000',
            },
            secondary: {
                main: '#455a64',
                light: '#718792',
                dark: '#1c313a',
            },
            background: {
                default: '#f5f5f7',
                paper: '#ffffff',
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
            divider: 'rgba(0, 0, 0, 0.12)',
            action: {
                active: 'rgba(0, 0, 0, 0.7)',
                hover: 'rgba(255, 160, 0, 0.08)',
                selected: 'rgba(255, 160, 0, 0.16)',
            },
        },
        typography: getBaseTypography(fontScale),
        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    body: {
                        backgroundColor: '#f5f5f7',
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                    },
                    elevation1: {
                        boxShadow:
                            '0 0.125rem 0.5rem rgba(0, 0, 0, 0.08), 0 0.0625rem 0.25rem rgba(0, 0, 0, 0.04)',
                    },
                    elevation2: {
                        boxShadow:
                            '0 0.25rem 0.75rem rgba(0, 0, 0, 0.1), 0 0.125rem 0.375rem rgba(0, 0, 0, 0.06)',
                    },
                    elevation3: {
                        boxShadow:
                            '0 0.375rem 1rem rgba(0, 0, 0, 0.12), 0 0.1875rem 0.5rem rgba(0, 0, 0, 0.08)',
                    },
                    elevation6: {
                        boxShadow:
                            '0 0.5rem 1.5rem rgba(0, 0, 0, 0.12), 0 0.25rem 0.75rem rgba(0, 0, 0, 0.08)',
                    },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        boxShadow:
                            '0 0.25rem 1rem rgba(0, 0, 0, 0.08), 0 0.125rem 0.5rem rgba(0, 0, 0, 0.04)',
                        border: '1px solid rgba(0, 0, 0, 0.06)',
                        '&:hover': {
                            boxShadow:
                                '0 0.5rem 1.5rem rgba(255, 160, 0, 0.15), 0 0.25rem 0.75rem rgba(0, 0, 0, 0.08)',
                        },
                    },
                },
            },
            MuiButton: {
                styleOverrides: {
                    text: {
                        color: primaryHoverColor,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 160, 0, 0.1)',
                        },
                        fontWeight: 600,
                    },
                    contained: {
                        color: '#000000',
                        backgroundColor: primaryColor,
                        boxShadow: '0 0.125rem 0.5rem rgba(255, 160, 0, 0.3)',
                        '&:hover': {
                            color: '#ffffff',
                            backgroundColor: primaryHoverColor,
                            boxShadow:
                                '0 0.25rem 0.75rem rgba(198, 113, 0, 0.4)',
                        },
                        fontWeight: 600,
                    },
                    outlined: {
                        fontWeight: 600,
                        borderColor: primaryHoverColor,
                        color: primaryHoverColor,
                        '&:hover': {
                            backgroundColor: 'rgba(255, 160, 0, 0.08)',
                        },
                    },
                },
            },
            MuiIconButton: {
                styleOverrides: {
                    root: {
                        color: 'rgba(0, 0, 0, 0.7)',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 160, 0, 0.08)',
                            color: primaryHoverColor,
                        },
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    outlined: {
                        borderColor: 'rgba(0, 0, 0, 0.23)',
                    },
                },
            },
            MuiTab: {
                styleOverrides: {
                    root: {
                        '&.Mui-selected': {
                            color: primaryHoverColor,
                        },
                    },
                },
            },
            MuiSelect: {
                styleOverrides: {
                    root: {
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(0, 0, 0, 0.23)',
                        },
                    },
                },
            },
            MuiDataGrid: {
                styleOverrides: {
                    toolbarContainer: {
                        '& .MuiButton-text': {
                            color: primaryHoverColor,
                        },
                    },
                },
            },
        },
    });

export const createDarkTheme = (fontScale: number = 1) =>
    createTheme({
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
                            backgroundColor: 'rgba(255, 160, 0, 0.15)',
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
                        color: primaryColor,
                        '&:hover': {
                            color: '#ffffff',
                        },
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
