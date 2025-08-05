// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { validateConfig } from '../config/constants';

// Validate environment variables on startup
validateConfig();

// Firebase configuration using environment variables
const firebaseConfig = {
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

let firebaseConfig = null;
let app = null;

export const initFirebase = async () => {
  if (!firebaseConfig) {
    const res = await fetch('/.netlify/functions/getSecureConfig');
    const config = await res.json();
    firebaseConfig = {
      apiKey: config.firebaseApiKey,
      authDomain: config.firebaseAuthDomain,
      projectId: config.firebaseProjectId,
      storageBucket: config.firebaseStorageBucket,
      messagingSenderId: config.firebaseMessagingSenderId,
      appId: config.firebaseAppId,
      measurementId: config.firebaseMeasurementId,
    };
    app = firebase.initializeApp(firebaseConfig);
  }
  return app;
};

export const getDb = () => app ? app.firestore() : null;
export const getAuth = () => app ? app.auth() : null;
