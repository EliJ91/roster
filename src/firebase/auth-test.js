// Simple test authentication (no Firebase)
let users = []; // In-memory storage for testing

// Generate simple MID
const generateMID = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `MID_${timestamp}_${random}`.toUpperCase();
};

// Create user account (test version)
export const createUserAccount = async (username, password) => {
  // Check if username exists
  if (users.find(u => u.username === username)) {
    return { success: false, error: 'Username already exists' };
  }
  
  // Create user
  const mid = generateMID();
  const user = {
    MID: mid,
    username: username,
    password: password,
    role: 99,
    createdAt: new Date(),
    lastLogin: new Date()
  };
  
  users.push(user);
  console.log('Test user created:', user);
  return { success: true, mid };
};

// Sign in user (test version)
export const signInUser = async (username, password) => {
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    user.lastLogin = new Date();
    console.log('Test user signed in:', user);
    return { success: true, userData: user };
  } else {
    return { success: false, error: 'Invalid username or password' };
  }
};

// Sign out (test version)
export const signOutUser = async () => {
  return { success: true };
};
