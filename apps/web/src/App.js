import React, { useState, useEffect, useRef } from "react"
import { ThemeContext, themes } from "./theme/ThemeContext";
import NavBar from "./NavBar/NavBar";
import './App.css';
const App = () => {

  // Does the useState() even need a default value
  const [theme, setTheme] = useState(themes.dark);

  const toggleTheme = () => {
    setTheme(theme === themes.dark ? themes.light : themes.dark);
  }

  return (
    // Wrap our entire component tree with the context Provider
    <ThemeContext.Provider value>
      <div className="App">
        <NavBar />
      </div>
    </ThemeContext.Provider>
  );
}

export default App;
