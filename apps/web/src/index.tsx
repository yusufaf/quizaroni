import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { CustomThemeProvider } from "./lib/theme/ThemeProvider";
import { CssBaseline } from "@mui/material";
import AuthProvider from "./components/AuthProvider/AuthProvider";

import "./index.css";
import App from "./App";
import { store } from "./state/store";

// @ts-ignore
import { Amplify } from "aws-amplify";
import awsconfig from "./aws-exports";
Amplify.configure(awsconfig);

const domElement = document.getElementById("root") as Element;
const root = createRoot(domElement);
root.render(
    <Provider store={store}>
        <BrowserRouter>
            <CustomThemeProvider>
                <CssBaseline />
                <AuthProvider>
                    <App />
                </AuthProvider>
            </CustomThemeProvider>
        </BrowserRouter>
    </Provider>
);
