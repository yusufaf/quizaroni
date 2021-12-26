import React, { useState, useEffect } from "react"
import { ThemeProvider } from "./theme/ThemeProvider";
import { Provider } from "react-redux";
import { Routes, Route } from "react-router-dom";
import store from "./store";

import { useTheme } from "./theme/useTheme";
// Component imports
import NavBar from "./NavBar/NavBar";
import Login from "./Login/Login";
import Signup from "./Signup/Signup";
import CreateSet from "./CreateSet/CreateSet";
import Profile from "./Profile/Profile";
import ForgotPassword from "./ForgotPassword/ForgotPassword";
import { firebaseApp } from "./firebase/firebase";

import * as appStyles from "./App.module.css";
const App = () => {
  // Wrap component tree with redux store and the theme context

  const [userAuthState, setUserAuthState] = useState(null);


  return (
    <Provider store={store}>
      <ThemeProvider>
        <div className="App">
          <NavBar userAuthState={userAuthState} setUserAuthState={setUserAuthState} />
        </div>
        {/* Controls all routes present in the application, not necessarily visible */}
        <Routes>
          <Route
            path="/login"
            element={
              <Login userAuthState={userAuthState} setUserAuthState={setUserAuthState} />
            }
          />
          <Route
            path='/signup'
            element={
              <Signup />
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
              <Profile />
            }
          />
      </Routes>

    </ThemeProvider>
    </Provider >

  );
}

export default App;
