import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { CustomThemeProvider } from "./theme/ThemeProvider";
import { CssBaseline } from "@mui/material";
import AuthProvider from "./AuthProvider/AuthProvider";

import "./index.css";
import App from "./App";
import { store } from "./state/store";

const rootElement = document.getElementById("root");

ReactDOM.render(
    <Provider store={store}>
        <BrowserRouter>
            <CustomThemeProvider>
                <CssBaseline />
                <AuthProvider>
                    <App />
                </AuthProvider>
            </CustomThemeProvider>
        </BrowserRouter>
    </Provider>,
    rootElement
);
