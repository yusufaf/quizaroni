import React, { useState } from "react"
import { Provider } from 'react-redux'
import { ThemeContext, themes } from "./theme/ThemeContext";
import store from "./store";
import NavBar from "./NavBar/NavBar";
import './App.css';
const App = () => {

  // Does the useState() even need a default value
  const [theme, setTheme] = useState(themes.dark);

  const toggleTheme = () => {
    setTheme(theme === themes.dark ? themes.light : themes.dark);
  }

  // Wrap compoonent tree with redux store and the theme context
  return (
    <Provider store={store}>
      <ThemeContext.Provider value>
        <div className="App">
          <NavBar />
        </div>
      </ThemeContext.Provider>
    </Provider>
  );
}

export default App;
