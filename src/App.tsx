import useMediaQuery from "@mui/material/useMediaQuery";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import GlobalToast from "./components/GlobalToast/GlobalToast";
import FeedbackDialog from "./components/FeedbackDialog";
import Footer from "./Footer/Footer";
import NavBar from "./NavBar/NavBar";
import { useTheme } from "./theme/useTheme";
import { DARK, LIGHT } from "./utilities/constants";
import { handleDesktopZoom } from "./utilities/handleDesktopZoom";
import AppRoutes from "./AppRoutes";
// @ts-ignore
import { Amplify } from "aws-amplify";
import awsconfig from "./aws-exports";
Amplify.configure(awsconfig);
import { setAuthenticated, setCognitoUser, setUserData } from "src/slices/globalSlice";
import { Auth } from "@aws-amplify/auth";
import axios from "axios";

const App = () => {
    const { setTheme } = useTheme();
    const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

    const dispatch = useDispatch();

    useEffect(() => {
        prefersDarkMode ? setTheme(DARK) : setTheme(LIGHT);
    }, [prefersDarkMode]);

    const checkAuthState = async () => {
        try {
            const currentUser = await Auth.currentAuthenticatedUser();
            console.log("Testing current auth user = ", currentUser);
            // TODO: Review hwat you cand o with this
            // const session = await Auth.currentSession();
            // console.log("Response from current session = ", session);

            dispatch(setAuthenticated(true));
            dispatch(setCognitoUser(currentUser));
            const {username} = currentUser;
             /* Retrieve user data, passing username as a query parameter */
             const response = await axios.get("/api/users/get", {
                params: {
                    username
                },
            }
            );
            console.log({ response });
            const userData = response.data;
            dispatch(setUserData(userData));

        } catch (err) {
            console.log(err);
        }
    };

    useEffect(() => {
      console.log("Checking auth state 👀")
      checkAuthState()
    }, []);

    return (
        <>
            <NavBar />
            <AppRoutes />
            <Footer />
            <FeedbackDialog />
            <GlobalToast />
        </>
    );
};

export default App;
