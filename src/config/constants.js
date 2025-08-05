// Application configuration constants
// These values are pulled from environment variables with fallback defaults

export let CONFIG = {
  ADMIN_ROLE_THRESHOLD: 97,
  MODERATOR_ROLE_THRESHOLD: 97,
  USER_ROLE_THRESHOLD: 90,
  SIGNUP_COOLDOWN: 180000,
  USERNAME_COOKIE_EXPIRY: 3600000,
  SESSION_TIMEOUT: 3600000,
  ROSTER_AUTO_LOCK_HOURS: 24,
  APP_NAME: 'Roster Management System',
  ENVIRONMENT: 'production',
  DEBUG_MODE: false,
  CONSOLE_LOGGING: false,
  isProduction: () => CONFIG.ENVIRONMENT === 'production',
  isDevelopment: () => CONFIG.ENVIRONMENT === 'development',
  isAdmin: (userRole) => userRole >= CONFIG.ADMIN_ROLE_THRESHOLD,
  isModerator: (userRole) => userRole >= CONFIG.MODERATOR_ROLE_THRESHOLD,
  isUser: (userRole) => userRole >= CONFIG.USER_ROLE_THRESHOLD,
};

export const fetchSecureConfig = async () => {
  const res = await fetch('/.netlify/functions/getSecureConfig');
  const config = await res.json();
  CONFIG = {
    ...CONFIG,
    ADMIN_ROLE_THRESHOLD: parseInt(config.adminRoleThreshold),
    MODERATOR_ROLE_THRESHOLD: parseInt(config.moderatorRoleThreshold),
    USER_ROLE_THRESHOLD: parseInt(config.userRoleThreshold),
    SIGNUP_COOLDOWN: parseInt(config.signupCooldownMs),
    USERNAME_COOKIE_EXPIRY: parseInt(config.usernameCookieExpiry),
    SESSION_TIMEOUT: parseInt(config.sessionTimeout),
    APP_NAME: config.appName,
    ENVIRONMENT: config.env,
  };
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
