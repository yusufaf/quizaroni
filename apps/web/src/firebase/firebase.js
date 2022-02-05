// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC2VtoBLdYqJuy1e8e_OlrfgMOdfxRDZzg",
  authDomain: "quizaroni.firebaseapp.com",
  projectId: "quizaroni",
  storageBucket: "quizaroni.appspot.com",
  messagingSenderId: "528976338055",
  appId: "1:528976338055:web:97c8c8f2e318d8ab932c22",
};
//   measurementId: "${config.measurementId}"

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);
// const analytics = getAnalytics(firebase);

export const database = getFirestore();