import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  setDoc
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
export const createUserAccount = async (username, password, role = 99, allianceEntityMID = null) => {
  try {
    // Check if username already exists
    const usernameExists = await checkUsernameExists(username);
    if (usernameExists) {
      return { success: false, error: 'Username already exists' };
    }
    
    // For new signups (role 99), generate new MID. For sub-users, use the alliance entity MID
    const mid = allianceEntityMID || await generateMID();
    
    // Store user info in Firestore Users collection
    const docRef = await addDoc(collection(db, 'Users'), {
      MID: mid,
      username: username,
      password: password,
      role: role,
      createdAt: new Date(),
      lastLogin: new Date()
    });
    
    console.log('User created in Firebase with MID:', mid, 'role:', role);
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

// Get all users from the database
export const getAllUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'Users'));
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return { success: true, users };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { success: false, error: error.message };
  }
};

// Update user role
export const updateUserRole = async (userId, newRole) => {
  try {
    const userRef = doc(db, 'Users', userId);
    await updateDoc(userRef, {
      role: newRole
    });
    console.log('User role updated successfully');
    return { success: true };
  } catch (error) {
    console.error('Error updating user role:', error);
    return { success: false, error: error.message };
  }
};

// Delete user
export const deleteUser = async (userId) => {
  try {
    await deleteDoc(doc(db, 'Users', userId));
    console.log('User deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: error.message };
  }
};

// Change user password
export const changeUserPassword = async (username, currentPassword, newPassword) => {
  try {
    console.log('Attempting to change password for username:', username);
    
    // Find user by username in Firestore
    const q = query(collection(db, 'Users'), where('username', '==', username));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('User not found');
      return { success: false, error: 'User not found' };
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    console.log('User data retrieved, checking password...');
    
    // Verify current password - ensure both are strings
    const storedPassword = String(userData.password || '');
    const providedPassword = String(currentPassword || '');
    
    if (storedPassword !== providedPassword) {
      console.log('Password verification failed');
      return { success: false, error: 'Current password is incorrect' };
    }
    
    // Update password using the document ID
    const userRef = doc(db, 'Users', userDoc.id);
    await updateDoc(userRef, {
      password: String(newPassword),
      lastPasswordChange: new Date()
    });
    
    console.log('Password changed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, error: error.message };
  }
};

// Generate a unique share ID for roster sharing
const generateShareId = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `share_${timestamp}_${randomStr}`;
};

// Share roster - create a copy in history collection
export const shareRoster = async (roster, userMID, username) => {
  try {
    const shareId = generateShareId();
    
    // Fetch members list for this MID
    let membersList = [];
    try {
      const membersQuery = query(collection(db, 'members'), where('MID', '==', userMID));
      const membersSnapshot = await getDocs(membersQuery);
      membersList = membersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          username: data.username || data.playerName || 'Unknown',
          playerId: data.playerId || '',
          role: data.role || 90,
          // Add any other member fields you want to include
        };
      });
      console.log('Fetched members for sharing:', membersList.length);
    } catch (membersError) {
      console.error('Error fetching members for sharing:', membersError);
      // Continue with empty members list if fetch fails
    }
    
    // Create a copy of the roster with additional sharing metadata
    const sharedRoster = {
      ...roster,
      shareId: shareId,
      originalRosterId: roster.id,
      sharedAt: new Date(),
      sharedBy: userMID,
      sharedByUsername: username,
      createdAt: new Date(), // New creation date for the shared copy
      author: username, // Author is the user that created the link
      MID: userMID, // Ensure it stays within alliance entity
      members: membersList // Include the members list
    };
    
    // Remove the original document ID to create a new document
    delete sharedRoster.id;
    
    // Store in history collection
    await setDoc(doc(db, 'history', shareId), sharedRoster);
    
    console.log('Roster shared with ID:', shareId, 'with', membersList.length, 'members');
    return { success: true, shareId, shareUrl: `${window.location.origin}/shared/${shareId}` };
  } catch (error) {
    console.error('Error sharing roster:', error);
    return { success: false, error: error.message };
  }
};

// Get shared roster by share ID
export const getSharedRoster = async (shareId) => {
  try {
    const rosterRef = doc(db, 'history', shareId);
    const rosterSnap = await getDoc(rosterRef);
    
    if (!rosterSnap.exists()) {
      return { success: false, error: 'Shared roster not found' };
    }
    
    const rosterData = rosterSnap.data();
    return { success: true, roster: { id: rosterSnap.id, ...rosterData } };
  } catch (error) {
    console.error('Error getting shared roster:', error);
    return { success: false, error: error.message };
  }
};

// Update shared roster with new entry
export const updateSharedRoster = async (shareId, updatedRoster) => {
  try {
    const rosterRef = doc(db, 'history', shareId);
    await updateDoc(rosterRef, {
      entries: updatedRoster.entries,
      lastModified: new Date()
    });
    
    console.log('Shared roster updated successfully');
    return { success: true };
  } catch (error) {
    console.error('Error updating shared roster:', error);
    return { success: false, error: error.message };
  }
};
