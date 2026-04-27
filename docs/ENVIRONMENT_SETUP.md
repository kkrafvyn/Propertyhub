# Environment Setup Guide

> Server-only secrets such as Paystack, Flutterwave, webhook, and private VAPID keys should not be added to `.env.local`. Use [SERVER_SECRETS_SETUP.md](./SERVER_SECRETS_SETUP.md) for the secure deployment flow.

## Quick Fix for `process is not defined` Error

The error you encountered is caused by trying to access `process.env` in the browser environment. Here's how to fix it:

### 1. Create Environment File

Create a `.env` file in your project root:

```bash
# Copy the example file
cp env.example .env
```

Or create it manually with these variables:

```bash
# .env
VITE_WEBSOCKET_URL=ws://localhost:8080
VITE_API_URL=http://localhost:8080
VITE_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa40HI80NM9f83ErYx3AE1lOt2JQ7YMhCIvr1QeUjbhGSUF1Px5ZSfaU3U4s0M
```

### 2. Environment Variable Naming

**Important**: Use `VITE_` prefix for all environment variables in Vite:

- ✅ `VITE_WEBSOCKET_URL` - Works in Vite
- ❌ `REACT_APP_WEBSOCKET_URL` - Won't work in Vite
- ❌ `WEBSOCKET_URL` - Won't be exposed to client

### 3. Accessing Environment Variables

The app now uses a centralized environment configuration:

```typescript
import { envConfig } from './utils/envConfig';

// Use these instead of process.env
const websocketUrl = envConfig.WEBSOCKET_URL;
const apiUrl = envConfig.API_URL;
const vapidKey = envConfig.VAPID_PUBLIC_KEY;
```

### 4. Development vs Production

**Development (localhost):**
```bash
VITE_WEBSOCKET_URL=ws://localhost:8080
VITE_API_URL=http://localhost:8080
```

**Production (your domain):**
```bash
VITE_WEBSOCKET_URL=wss://api.yourdomain.com
VITE_API_URL=https://api.yourdomain.com
```

### 5. Verify Environment Variables

After creating your `.env` file, you should see an environment debugger in the bottom-left corner (development only) that shows:

- ✅ Environment: development
- ✅ WebSocket: ws://localhost:8080  
- ✅ API: http://localhost:8080
- ✅ VAPID Key: Set

### 6. Common Issues and Solutions

**Issue: Variables not loading**
- Solution: Restart your development server (`npm run dev`)
- Ensure variables start with `VITE_`
- Check `.env` file is in project root

**Issue: WebSocket connection fails**
- Solution: Make sure WebSocket server is running
- Check WebSocket URL format (ws:// for local, wss:// for production)

**Issue: Variables work locally but not in production**
- Solution: Set environment variables in your deployment platform
- Netlify: Site settings → Environment variables
- Vercel: Project settings → Environment Variables

### 7. File Structure Check

Make sure these files exist:

```
/
├── .env                    # Your environment variables
├── env.example            # Example environment file
├── env.d.ts              # TypeScript environment definitions
├── utils/envConfig.ts    # Environment configuration utility
└── vite.config.ts        # Vite configuration
```

### 8. Backend Server Setup

Don't forget to start your WebSocket server:

```bash
# Navigate to backend directory
cd backend/websocket-server

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start server
npm run dev
```

### 9. Troubleshooting Commands

```bash
# Check if .env file exists
ls -la .env

# View environment variables (be careful with sensitive data)
cat .env

# Restart development server
npm run dev

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

### 10. Push Notifications Setup (Optional)

To enable push notifications, you'll need to generate VAPID keys:

```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys

# Add the public key to your .env file
VITE_VAPID_PUBLIC_KEY=your-generated-public-key
```

## Summary

The main changes made to fix the `process is not defined` error:

1. ✅ Created environment configuration utility (`utils/envConfig.ts`)
2. ✅ Updated App.tsx to use the new configuration
3. ✅ Fixed PushNotificationManager to handle environment variables properly
4. ✅ Removed problematic `process.env` definition from Vite config
5. ✅ Added TypeScript environment definitions
6. ✅ Created example environment file

After following these steps, your app should work without the `process is not defined` error.
