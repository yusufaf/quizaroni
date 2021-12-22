import React, { useState, useEffect } from "react"
import { ThemeProvider } from "./theme/ThemeProvider";
import { Provider } from "react-redux";
import { Routes, Route } from "react-router-dom";
import store from "./store";
// Component imports
import NavBar from "./NavBar/NavBar";
import Login from "./Login/Login";
import Signup from "./Signup/Signup";
import CreateSet from "./CreateSet/CreateSet";
import { firebaseApp } from "./firebase/firebase";

import './App.css';
const App = () => {
  // Wrap component tree with redux store and the theme context

  return (
    <Provider store={store}>
      <ThemeProvider>
        <div className="App">
          <NavBar />
        </div>
        {/* Controls all routes present in the application, not necessarily visible */}
        <Routes>
          <Route
            path="/login"
            element={
              <Login />
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
              <CreateSet />
            }
          />
        </Routes>
      </ThemeProvider>
    </Provider>

  );
}

export default App;
