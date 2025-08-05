// Application configuration constants
// These values are pulled from environment variables with fallback defaults

export const CONFIG = {
  // Role thresholds
  ADMIN_ROLE_THRESHOLD: parseInt(process.env.REACT_APP_ADMIN_ROLE_THRESHOLD) || 97,
  MODERATOR_ROLE_THRESHOLD: parseInt(process.env.REACT_APP_MODERATOR_ROLE_THRESHOLD) || 97,
  USER_ROLE_THRESHOLD: parseInt(process.env.REACT_APP_USER_ROLE_THRESHOLD) || 90,
  
  // Time configurations (in milliseconds)
  SIGNUP_COOLDOWN: parseInt(process.env.REACT_APP_SIGNUP_COOLDOWN_MS) || 180000, // 3 minutes
  USERNAME_COOKIE_EXPIRY: parseInt(process.env.REACT_APP_USERNAME_COOKIE_EXPIRY) || 3600000, // 1 hour
  SESSION_TIMEOUT: parseInt(process.env.REACT_APP_SESSION_TIMEOUT) || 3600000, // 1 hour
  ROSTER_AUTO_LOCK_HOURS: 24,
  
  // Application settings
  APP_NAME: process.env.REACT_APP_APP_NAME || 'Roster Management System',
  ENVIRONMENT: process.env.REACT_APP_ENV || 'development',
  
  // Debug settings
  DEBUG_MODE: process.env.REACT_APP_DEBUG_MODE === 'true',
  CONSOLE_LOGGING: process.env.REACT_APP_CONSOLE_LOGGING === 'true',
  
  // Helper functions
  isProduction: () => CONFIG.ENVIRONMENT === 'production',
  isDevelopment: () => CONFIG.ENVIRONMENT === 'development',
  isAdmin: (userRole) => userRole >= CONFIG.ADMIN_ROLE_THRESHOLD,
  isModerator: (userRole) => userRole >= CONFIG.MODERATOR_ROLE_THRESHOLD,
  isUser: (userRole) => userRole >= CONFIG.USER_ROLE_THRESHOLD,
};

// Validate required environment variables
export const validateConfig = () => {
  const requiredEnvVars = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_STORAGE_BUCKET',
    'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
    'REACT_APP_FIREBASE_APP_ID'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    if (CONFIG.isProduction()) {
      throw new Error(`Production deployment missing required environment variables: ${missingVars.join(', ')}`);
    }
  }
  
  if (CONFIG.CONSOLE_LOGGING) {
    console.log('Configuration loaded:', {
      environment: CONFIG.ENVIRONMENT,
      adminThreshold: CONFIG.ADMIN_ROLE_THRESHOLD,
      moderatorThreshold: CONFIG.MODERATOR_ROLE_THRESHOLD,
      signupCooldown: CONFIG.SIGNUP_COOLDOWN,
      debugMode: CONFIG.DEBUG_MODE
    });
  }
};

export default CONFIG;
