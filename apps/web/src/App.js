import React, { useState } from "react"
import { Provider } from 'react-redux'
import { ThemeContext, themes } from "./theme/ThemeContext";
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

  // Does the useState() even need a default value
  const [theme, setTheme] = useState(themes.dark);

  const toggleTheme = () => {
    setTheme(theme === themes.dark ? themes.light : themes.dark);
  }

  // Wrap compoonent tree with redux store and the theme context
  return (
    <>
      <Provider store={store}>
        <ThemeContext.Provider value>
          <div className="App">
            <NavBar />
          </div>
        </ThemeContext.Provider>
      </Provider>
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
    </>
  );
}

export default App;
