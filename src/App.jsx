import { useState, useEffect } from "react"
import { Routes, Route } from "react-router-dom";
import Footer from "./Footer/Footer";
import useMediaQuery from '@mui/material/useMediaQuery';
import { LIGHT, DARK } from "./utilities/constants.js"
import store from "./store";

/* Component imports */
import NavBar from "./NavBar/NavBar";
import Home from "./Home/Home";
import Login from "./Login/Login";
import Signup from "./Signup/Signup";
import CreateSet from "./CreateSet/CreateSet";
import Profile from "./Profile/Profile";
import ForgotPassword from "./ForgotPassword/ForgotPassword";

import * as appStyles from "./App.module.css";
import { useTheme } from "./theme/useTheme.js";
import { handleDesktopZoom } from "./utilities/handleDesktopZoom";

const App = () => {
  /* TODO: Bring the auth state into a Redux slice / reducer */
  const [userAuthState, setUserAuthState] = useState(null);

  const { setTheme } = useTheme();

  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

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
        setUserAuthState(userInfo);
      }
    }

    handleDesktopZoom();
  }, []);

  return (
    <>
      <NavBar userAuthState={userAuthState} setUserAuthState={setUserAuthState} />
      <Footer />
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
          path="/view"
        />

      </Routes>
    </>
  );
}

export default App;