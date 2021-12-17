import React from 'react';
import ReactDOM, { render }  from 'react-dom';
import { BrowserRouter } from "react-router-dom";
import './index.css';
import App from './App';
import firebase from "./firebase/firebase"

render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
  document.getElementById('root')
);