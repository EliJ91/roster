# 🚀 Netlify Deployment Guide

## Prerequisites
- Node.js 18+
- Firebase project setup
- Netlify account

## Environment Variables Setup

### 1. Copy Environment Template
```bash
cp .env.example .env
```

### 2. Configure Firebase Variables
Get these values from your Firebase Console:

- **REACT_APP_FIREBASE_API_KEY**: Project Settings > General > Web API Key
- **REACT_APP_FIREBASE_AUTH_DOMAIN**: Project Settings > General > {project-id}.firebaseapp.com
- **REACT_APP_FIREBASE_PROJECT_ID**: Project Settings > General > Project ID
- **REACT_APP_FIREBASE_STORAGE_BUCKET**: Project Settings > General > {project-id}.firebasestorage.app
- **REACT_APP_FIREBASE_MESSAGING_SENDER_ID**: Project Settings > Cloud Messaging > Sender ID
- **REACT_APP_FIREBASE_APP_ID**: Project Settings > General > App ID
- **REACT_APP_FIREBASE_MEASUREMENT_ID**: Google Analytics > Data Streams

### 3. Production Configuration
For production deployment, set:
```env
REACT_APP_ENV=production
REACT_APP_DEBUG_MODE=false
REACT_APP_CONSOLE_LOGGING=false
```

## Netlify Deployment

### Method 1: Netlify CLI (Recommended)
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Build and deploy
npm run build
netlify deploy --prod --dir=build
```

### Method 2: Git Integration
1. Push code to GitHub
2. Connect repository in Netlify dashboard
3. Configure environment variables in Netlify site settings
4. Deploy automatically on push

### Environment Variables in Netlify
In your Netlify site dashboard:
1. Go to **Site Settings** > **Environment Variables**
2. Add all variables from your `.env` file
3. Make sure to set `REACT_APP_ENV=production`

## Required Environment Variables for Netlify

```
REACT_APP_FIREBASE_API_KEY=your_actual_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_actual_domain
REACT_APP_FIREBASE_PROJECT_ID=your_actual_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_actual_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_actual_sender_id
REACT_APP_FIREBASE_APP_ID=your_actual_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_actual_measurement_id
REACT_APP_ENV=production
REACT_APP_DEBUG_MODE=false
REACT_APP_CONSOLE_LOGGING=false
```

## Security Features
- Firebase credentials secured via environment variables
- CSP headers configured
- Security headers enabled
- Source maps disabled in production
- Developer tools excluded from build

## Build Optimization
- Static asset caching (1 year)
- HTML no-cache policy
- React Router SPA redirects
- Preflight checks skipped for faster builds

## Verification Steps
1. Check Firebase connection works
2. Verify user authentication
3. Test roster functionality
4. Confirm admin features are secure
5. Validate responsive design

## Troubleshooting
- **Build fails**: Check environment variables are set
- **Firebase errors**: Verify all Firebase credentials
- **Routing issues**: Ensure netlify.toml redirects are configured
- **Admin features not working**: Check role threshold environment variables

## Security Notes
- Never commit `.env` files to git
- Rotate Firebase keys if compromised
- Monitor Firebase usage and set quotas
- Review Netlify access logs regularly
