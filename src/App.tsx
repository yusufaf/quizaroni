import useMediaQuery from '@mui/material/useMediaQuery';
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setUserAuthState as setReduxUserAuthState } from "src/slices/globalSlice";
import GlobalToast from './components/GlobalToast/GlobalToast';
import FeedbackDialog from './FeedbackDialog';
import Footer from "./Footer/Footer";
import NavBar from "./NavBar/NavBar";
import { useTheme } from "./theme/useTheme";
import { DARK, LIGHT } from "./utilities/constants";
import { handleDesktopZoom } from "./utilities/handleDesktopZoom";
import AppRoutes from './AppRoutes';
// @ts-ignore
import { Amplify } from 'aws-amplify';
import awsconfig from './aws-exports';
Amplify.configure(awsconfig);

const App = () => {
  const { setTheme } = useTheme();
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  
  const dispatch = useDispatch();
  // const reduxUserAuthState = useSelector( (state) => state.userAuthState);

  const [userAuthState, setUserAuthState] = useState(null);

  useEffect(() => {
    prefersDarkMode
      ? setTheme(DARK)
      : setTheme(LIGHT);
  }, [prefersDarkMode])

  useEffect(() => {
    /* If the user info is in localStorage, keep them logged in */
    if (localStorage.getItem("userInfo") !== null) {
      const userInfo = JSON.parse(localStorage.getItem("userInfo"));
      const tokenExpiration = userInfo.stsTokenManager.expirationTime;

      /* If the user's token hasn't expired */
      if (Date.now() < tokenExpiration) {
        dispatch(setReduxUserAuthState(userInfo));
        setUserAuthState(userInfo);
      }
    }
    // handleDesktopZoom();
  }, []);

  return (
    <>
      <NavBar userAuthState={userAuthState} setUserAuthState={setUserAuthState} />
      <AppRoutes 
        userAuthState={userAuthState} 
        setUserAuthState={setUserAuthState}
      />
      <Footer />
      <FeedbackDialog />
      <GlobalToast />
    </>
  );
}

export default App;