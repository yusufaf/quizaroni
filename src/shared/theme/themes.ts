import type {} from '@mui/x-data-grid/themeAugmentation';
import { createTheme } from '@mui/material';

const primaryColor = '#ffa000';
const primaryHoverColor = '#c67100';
const primaryLightColor = '#ffd149';

export const light = createTheme({
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
    components: {
        MuiButton: {
            styleOverrides: {
                text: {
                    color: primaryColor, // Original text color
                    transition: 'all 0.3s ease', // Smooth transition
                    '&:hover': {
                        color: primaryHoverColor, // Darker text color for contrast
                        backgroundColor: 'rgba(255, 160, 0, 0.2)', // Slightly darker background on hover
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
                    // color: primaryColor,
                    // borderColor: primaryColor,
                    // '&:hover': {
                    //     color: primaryHoverColor,
                    //     backgroundColor: 'rgba(255, 160, 0, 0.1)',
                    // },
                    fontWeight: 600,
                },
            },
        },
    },
});

// Dark theme follows the same pattern
export const dark = createTheme({
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
    components: {
        MuiButton: {
            styleOverrides: {
                text: {
                    color: primaryColor, // Original text color
                    transition: 'all 0.3s ease', // Smooth transition
                    '&:hover': {
                        color: '#ffffff', // Brighten text color for contrast
                        backgroundColor: 'rgba(255, 160, 0, 0.2)', // Add a light background on hover
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
                    // color: primaryColor,
                    // borderColor: primaryColor,
                    // '&:hover': {
                    // color: primaryHoverColor,
                    // backgroundColor: 'rgba(255, 160, 0, 0.1)',
                    // },
                    fontWeight: 600,
                },
            },
        },
    },
});

export const themes = {
    light,
    dark,
};
