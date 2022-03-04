import { useState, useEffect } from "react"
import { ThemeProvider } from "./theme/ThemeProvider";
import { Provider } from "react-redux";
import { Routes, Route } from "react-router-dom";
import store from "./store";

/* Component imports */
import NavBar from "./NavBar/NavBar";
import Home from "./Home/Home";
import Login from "./Login/Login";
import Signup from "./Signup/Signup";
import CreateSet from "./CreateSet/CreateSet";
import Profile from "./Profile/Profile";
import ForgotPassword from "./ForgotPassword/ForgotPassword";
import { firebaseApp } from "./firebase/firebase";

/* Styling */
import { useTheme } from "./theme/useTheme";
import * as appStyles from "./App.module.css";

import { handleDesktopZoom } from "./utilities/handleDesktopZoom";

function App() {
  // Wrap component tree with redux store and the theme context

  /* TODO: Bring the auth state into a Redux slice / reducer */
  const [userAuthState, setUserAuthState] = useState(null);

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
    <Provider store={store}>
      <ThemeProvider>
        <div className="App">
          <NavBar userAuthState={userAuthState} setUserAuthState={setUserAuthState} />
        </div>
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
          {/* TODO: Route for view / editing flashsets */}
          <Route
            path="/view"
          />

        </Routes>
      </ThemeProvider>
    </Provider >
  );
}

export default App;