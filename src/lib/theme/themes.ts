import type {} from '@mui/x-data-grid/themeAugmentation';
import { createTheme } from "@mui/material";

export const light = createTheme({
    palette: {
        mode: "light",
        primary: {
            main: "#ffa000",
            light: "#ffd149",
            dark: "#c67100",
        },
        other: {
            gold: "#FFDF00",
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                text: {
                    fontWeight: 600
                },
                contained: {
                    fontWeight: 600
                },
                outlined: {
                    fontWeight: 600
                }
            }
        }
    }
    // body: "#F5F5F5"
});

export const dark = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: "#ffa000",
            light: "#ffd149",
            dark: "#c67100",
        },
        other: {
            gold: "#FFDF00",
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                text: {
                    fontWeight: 600
                },
                contained: {
                    fontWeight: 600
                },
                outlined: {
                    fontWeight: 600
                }
            }
        }
    }
    // body: "#121212"
});

export const themes = {
    light,
    dark,
};
