import * as firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import { validateConfig } from '../config/constants';

// Validate environment variables on startup
validateConfig();

let firebaseConfig = null;
let app = null;
export let db = null;

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
    db = app.firestore();
  }
  return app;
};

export const getDb = () => (app ? app.firestore() : null);
export const getAuth = () => (app ? app.auth() : null);
