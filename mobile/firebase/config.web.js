// Firebase JS SDK (modular) init — suitable for Expo managed workflow (Web)
import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, setLogLevel } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
	apiKey: "AIzaSyCD0XhDr1djCOQsSOa1irzpGNlNJlUcl2k",
	authDomain: "vcare-app-82fed.firebaseapp.com",
	projectId: "vcare-app-82fed",
	storageBucket: "vcare-app-82fed.firebasestorage.app",
	messagingSenderId: "895491765469",
	appId: "1:895491765469:web:828c8d8fe087de71725734",
	measurementId: "G-44W6TJXF15",
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings for better compatibility
initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
}, 'vcaredb');

// Enable Firestore SDK debug logging in the browser console
setLogLevel('debug');

// Get Firestore instance
const db = getFirestore(app, 'vcaredb');

// Get Realtime Database instance
const realtimeDB = getDatabase(app);

// Initialize Auth for Web environment
const authentication = getAuth(app);

// Initialize Storage
const storage = getStorage(app);

export { db, realtimeDB, authentication, storage };
