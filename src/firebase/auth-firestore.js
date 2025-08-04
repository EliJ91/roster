import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from './config';

// Generate a unique Master ID (MID) with uniqueness guarantee
const generateMID = async () => {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    // Create more robust ID with timestamp, random, and counter
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 10);
    const counter = attempts.toString(36);
    const mid = `MID_${timestamp}_${randomStr}_${counter}`.toUpperCase();
    
    // Check if this MID already exists in database
    const q = query(collection(db, 'Users'), where('MID', '==', mid));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // MID is unique, return it
      return mid;
    }
    
    attempts++;
    // Small delay before retry to ensure timestamp changes
    await new Promise(resolve => setTimeout(resolve, 1));
  }
  
  // Fallback: if somehow we can't generate unique MID, use timestamp + UUID-like
  const fallbackId = `MID_${Date.now()}_${Math.random().toString(36).substring(2)}_${Math.random().toString(36).substring(2)}`.toUpperCase();
  console.warn('Used fallback MID generation:', fallbackId);
  return fallbackId;
};

// Check if username already exists
const checkUsernameExists = async (username) => {
  const q = query(collection(db, 'Users'), where('username', '==', username));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};

// Create a new user account (saves to Firebase)
export const createUserAccount = async (username, password) => {
  try {
    // Check if username already exists
    const usernameExists = await checkUsernameExists(username);
    if (usernameExists) {
      return { success: false, error: 'Username already exists' };
    }
    
    // Generate unique MID
    const mid = await generateMID();
    
    // Store user info in Firestore Users collection
    const docRef = await addDoc(collection(db, 'Users'), {
      MID: mid,
      username: username,
      password: password,
      role: 99,
      createdAt: new Date(),
      lastLogin: new Date()
    });
    
    console.log('User created in Firebase with MID:', mid);
    return { success: true, mid, docId: docRef.id };
    
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
  }
};

// Sign in existing user
export const signInUser = async (username, password) => {
  try {
    // Find user by username in Firestore
    const q = query(collection(db, 'Users'), where('username', '==', username));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: 'Username not found' };
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    
    // Check password
    if (userData.password !== password) {
      return { success: false, error: 'Incorrect password' };
    }
    
    // Update last login
    // Note: In a real app, you'd update this in Firestore
    userData.lastLogin = new Date();
    
    console.log('User signed in with MID:', userData.MID);
    return { success: true, userData };
    
  } catch (error) {
    console.error('Error signing in:', error);
    return { success: false, error: error.message };
  }
};

// Sign out user
export const signOutUser = async () => {
  try {
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error);
    return { success: false, error: error.message };
  }
};
