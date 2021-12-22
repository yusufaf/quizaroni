import { createContext } from "react";

// Dark mode color #1f1b24
export const themes = {
    light: {
      name: "light",
      foreground: "#000000",
      background: "#ffffff",
      body: ""
    },
    dark: {
      name: "dark",
      foreground: "#ffffff",
      background: "#1f1b24",
      body: ""
    },
  };

export const ThemeContext = createContext();