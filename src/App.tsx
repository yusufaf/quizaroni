import useMediaQuery from "@mui/material/useMediaQuery";
import { useEffect } from "react";
import FeedbackDialog from "components/FeedbackDialog/FeedbackDialog";
import Footer from "views/Footer/Footer";
import NavBar from "views/NavBar/NavBar";
import { useTheme } from "theme/useTheme";
import { DARK, LIGHT } from "utilities/constants";
import AppRoutes from "./AppRoutes";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import StudysetConfirmDialog from "components/StudysetConfirmDialog/StudysetConfirmDialog";

const App = () => {
    const { setTheme, theme } = useTheme();
    const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

    console.log("APP THEME = ", {theme})

    useEffect(() => {
        prefersDarkMode ? setTheme(DARK) : setTheme(LIGHT);
    }, [prefersDarkMode]);

    return (
        <>
            <NavBar />
            <AppRoutes />
            <Footer />
            <FeedbackDialog />
            <ToastContainer 
                theme={theme}
            />
            <StudysetConfirmDialog />
        </>
    );
};

export default App;
