import { createContext } from "react";
import { createTheme } from "@mui/material/styles";

export const light = createTheme({
    palette: {
        mode: "light",
        primary: {
            main: "#ffa000",
            light: "#ffd149",
            dark: "#c67100",
        }
        // background: {
        //     paper: "#F5F5F5",
        // },
        // text: {
        //     primary: "#121212",
        // },
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
        // background: {
        //     paper: "#1c1c1c",
        // },
        // text: {
        //     primary: "#F5F5F5",
        // },
    },
    // body: "#121212"
});

export const themes = {
    light,
    dark
}

// export const themes = {
//     light: {
//       name: "light",
//       foreground: "#121212",
//       background: "#ffffff",
//       body: "#F5F5F5"
//     },
//     dark: {
//       name: "dark",
//       foreground: "#F5F5F5",
//       background: "#1c1c1c",
//       body: "#121212"
//     },
// };

export const ThemeContext = createContext();