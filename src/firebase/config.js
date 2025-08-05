import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { validateConfig } from '../config/constants';

// Validate environment variables on startup
validateConfig();

let firebaseConfig = null;
let app = null;
export let db = null;
export let auth = null;

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
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  }
  return app;
};

export const getDb = () => db;
export const getAuthInstance = () => auth;
