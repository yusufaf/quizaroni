import useMediaQuery from '@mui/material/useMediaQuery';
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Route, Routes } from "react-router-dom";
import { setUserAuthState as setReduxUserAuthState } from "src/slices/globalSlice";
import GlobalToast from './components/GlobalToast/GlobalToast';
import CreateSet from "./CreateSet/CreateSet";
import FeedbackDialog from './FeedbackDialog';
import Footer from "./Footer/Footer";
import ForgotPassword from "./ForgotPassword/ForgotPassword";
import Home from "./Home/Home";
import Login from "./Login/Login";
import NavBar from "./NavBar/NavBar";
import Profile from "./Profile/Profile";
import Signup from "./Signup/Signup";
import { useTheme } from "./theme/useTheme";
import { DARK, LIGHT } from "./utilities/constants";
import { handleDesktopZoom } from "./utilities/handleDesktopZoom";

const App = () => {
  const { setTheme } = useTheme();
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  
  const dispatch = useDispatch();
  const reduxUserAuthState = useSelector( (state) => state.userAuthState);

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
      <Routes>
        <Route
          path="/"
          element={
            <Home userAuthState={userAuthState} />
          }
        />
        <Route
          path="/login"
          element={
            <Login userAuthState={userAuthState} setUserAuthState={setUserAuthState} />
          }
        />
        <Route
          path='/signup'
          element={
            <Signup userAuthState={userAuthState} setUserAuthState={setUserAuthState} />
          }
        />
        <Route
          path="/create"
          element={
            <CreateSet userAuthState={userAuthState} />
          }
        />
        <Route
          path="/forgot"
          element={
            <ForgotPassword />
          }
        />
        <Route
          path="/profile"
          element={
            <Profile userAuthState={userAuthState} setUserAuthState={setUserAuthState} />
          }
        />
        <Route
          path="/explore"
          element={
            <></>
          }
        />
        {/* TODO: Route for view / editing flashsets */}
        <Route
          path="/view/:id"
        />

        {/* <Route path="*" element={<NotFound />} /> */}
      </Routes>
      <Footer />
      <FeedbackDialog />
      <GlobalToast />
    </>
  );
}

export default App;