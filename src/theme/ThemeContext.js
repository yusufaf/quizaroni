import { createContext } from "react";

export const themes = {
    light: {
      name: "light",
      foreground: "#121212",
      background: "#ffffff",
      body: "#F5F5F5"
    },
    dark: {
      name: "dark",
      foreground: "#F5F5F5",
      background: "#1c1c1c",
      body: "#121212"
    },
  };

export const ThemeContext = createContext();