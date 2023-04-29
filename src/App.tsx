import useMediaQuery from "@mui/material/useMediaQuery";
import { useEffect, useState } from "react";
import GlobalToast from "components/GlobalToast/GlobalToast";
import FeedbackDialog from "components/FeedbackDialog";
import Footer from "views/Footer/Footer";
import NavBar from "views/NavBar/NavBar";
import { useTheme } from "./theme/useTheme";
import { DARK, LIGHT } from "utilities/constants";
import { handleDesktopZoom } from "utilities/handleDesktopZoom";
import AppRoutes from "./AppRoutes";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// @ts-ignore
import { Amplify } from "aws-amplify";
import awsconfig from "./aws-exports";
Amplify.configure(awsconfig);

const App = () => {
    const { setTheme, theme } = useTheme();
    const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

    useEffect(() => {
        prefersDarkMode ? setTheme(DARK) : setTheme(LIGHT);
    }, [prefersDarkMode]);

    return (
        <>
            <NavBar />
            <AppRoutes />
            <Footer />
            <FeedbackDialog />
            <GlobalToast />
            <ToastContainer 
                theme={theme}
            />
        </>
    );
};

export default App;
