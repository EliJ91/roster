// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDlH7Ofkx4KflgbOJVs5noRTzhQyKWwzmc",
  authDomain: "roster-website.firebaseapp.com",
  projectId: "roster-website",
  storageBucket: "roster-website.firebasestorage.app",
  messagingSenderId: "6357289855",
  appId: "1:6357289855:web:3f1358f8dadad536b9e84a",
  measurementId: "G-W02010499E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
