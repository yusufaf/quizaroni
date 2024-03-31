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
    // body: "#121212"
});

export const themes = {
    light,
    dark,
};
