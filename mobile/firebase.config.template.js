/*
// Firebase config template
// Rename this file to firebase.config.js and add your Firebase credentials
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

export default firebaseConfig;
*/

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCD0XhDr1djCOQsSOa1irzpGNlNJlUcl2k",
  authDomain: "vcare-app-82fed.firebaseapp.com",
  projectId: "vcare-app-82fed",
  storageBucket: "vcare-app-82fed.firebasestorage.app",
  messagingSenderId: "895491765469",
  appId: "1:895491765469:web:828c8d8fe087de71725734",
  measurementId: "G-44W6TJXF15"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);