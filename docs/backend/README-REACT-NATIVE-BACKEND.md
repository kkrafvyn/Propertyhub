# PropertyHub React Native Backend Integration

## Overview

PropertyHub now includes comprehensive React Native backend support, enabling seamless integration between web and mobile applications. This backend system provides unified APIs, real-time synchronization, offline support, and mobile-specific features like biometric authentication, push notifications, and location services.

## 🚀 Features

### Core Backend Services
- **API Service Layer** - Unified REST API client with caching and offline support
- **WebSocket Manager** - Real-time communication with auto-reconnection
- **Data Sync Service** - Bidirectional sync with conflict resolution
- **Mobile Storage** - Secure storage for tokens and sensitive data
- **Analytics Tracking** - Event tracking and user behavior analytics

### Mobile-Specific Features
- **Biometric Authentication** - TouchID, FaceID, and fingerprint support
- **Push Notifications** - Local and remote notification handling
- **Location Services** - GPS and geolocation with background support
- **Offline Support** - Queue-based sync when connection is restored
- **Device Information** - Platform detection and device characteristics

### Advanced Capabilities
- **Conflict Resolution** - Smart handling of data conflicts during sync
- **Background Sync** - Automatic data synchronization when app is backgrounded
- **Network Monitoring** - Automatic handling of online/offline states
- **Security Features** - Token management and secure data storage

## 📁 File Structure

```
backend/react-native/
├── config.ts                    # Configuration and constants
├── apiService.ts                # Main API service layer
├── mobileBackendUtils.ts        # Mobile utility functions
├── webSocketManager.ts          # WebSocket connection management
├── mobileDataSyncService.ts     # Data synchronization service
└── index.ts                     # Main export file

components/mobile/
├── ReactNativeBackendProvider.tsx    # React context provider
└── ReactNativeMobileDemo.tsx          # Demo component
```

## 🛠 Installation & Setup

### 1. Install Dependencies

The React Native backend dependencies are already included in `package.json`:

```bash
npm install
```

Key dependencies:
- `@react-native-async-storage/async-storage` - Async storage
- `@react-native-community/netinfo` - Network information
- `@react-native-firebase/messaging` - Push notifications
- `react-native-biometrics` - Biometric authentication
- `react-native-keychain` - Secure storage
- `react-native-device-info` - Device information
- `react-native-geolocation-service` - Location services

### 2. Configuration

Update the configuration in `backend/react-native/config.ts`:

```typescript
const PROD_CONFIG: ReactNativeConfig = {
  apiUrl: 'https://your-api-url.com/api',
  wsUrl: 'wss://your-api-url.com/ws',
  authTimeout: 900000,
  cacheTimeout: 1800000,
  offlineSync: true,
  pushNotifications: true,
  biometricAuth: true,
  deepLinking: true,
};
```

### 3. Environment Variables

Create a `.env` file with your configuration:

```env
REACT_APP_API_URL=https://your-api-url.com/api
REACT_APP_WS_URL=wss://your-api-url.com/ws
REACT_APP_FIREBASE_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

## 🔧 Usage

### Basic Integration

Wrap your app with the `ReactNativeBackendProvider`:

```tsx
import { ReactNativeBackendProvider } from './components/mobile/ReactNativeBackendProvider';

function App() {
  return (
    <ReactNativeBackendProvider
      autoInitialize={true}
      initOptions={{
        enablePushNotifications: true,
        enableBiometric: true,
        enableLocation: true,
        enableAnalytics: true,
        autoSync: true,
      }}
    >
      <YourAppComponents />
    </ReactNativeBackendProvider>
  );
}
```

### Using Backend Services

```tsx
import { useReactNativeBackend } from './components/mobile/ReactNativeBackendProvider';

function MyComponent() {
  const { login, getCurrentLocation, trackEvent } = useReactNativeBackend();

  const handleLogin = async () => {
    const result = await login('user@example.com', 'password');
    if (result.success) {
      await trackEvent('user_login', { method: 'credentials' });
    }
  };

  const handleLocationRequest = async () => {
    const location = await getCurrentLocation();
    if (location.success) {
      console.log('Location:', location.location);
    }
  };

  return (
    <div>
      <button onClick={handleLogin}>Login</button>
      <button onClick={handleLocationRequest}>Get Location</button>
    </div>
  );
}
```

### Authentication Hooks

```tsx
import { useReactNativeAuth } from './components/mobile/ReactNativeBackendProvider';

function LoginComponent() {
  const { login, biometricLogin, logout } = useReactNativeAuth();

  const handleBiometricLogin = async () => {
    const result = await biometricLogin('user-id');
    if (result.success) {
      console.log('Biometric login successful');
    }
  };

  return (
    <div>
      <button onClick={() => login('email', 'password')}>
        Login with Credentials
      </button>
      <button onClick={handleBiometricLogin}>
        Login with Biometrics
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Location Services

```tsx
import { useReactNativeLocation } from './components/mobile/ReactNativeBackendProvider';

function LocationComponent() {
  const { location, loading, error, getLocation } = useReactNativeLocation();

  return (
    <div>
      <button onClick={getLocation} disabled={loading}>
        {loading ? 'Getting Location...' : 'Get Location'}
      </button>
      
      {location && (
        <div>
          <p>Latitude: {location.latitude}</p>
          <p>Longitude: {location.longitude}</p>
          <p>Accuracy: {location.accuracy}m</p>
        </div>
      )}
      
      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

### Data Synchronization

```tsx
import { useReactNativeSync } from './components/mobile/ReactNativeBackendProvider';

function SyncComponent() {
  const { syncProgress, conflicts, startSync, resolveConflict } = useReactNativeSync();

  const handleResolveConflict = async (conflictId: string) => {
    await resolveConflict(conflictId, 'local'); // or 'server' or 'merge'
  };

  return (
    <div>
      <button onClick={startSync}>Force Sync</button>
      
      {syncProgress && (
        <div>
          <p>Phase: {syncProgress.phase}</p>
          <p>Progress: {syncProgress.completed}/{syncProgress.total}</p>
        </div>
      )}
      
      {conflicts.map(conflict => (
        <div key={conflict.id}>
          <p>Conflict: {conflict.type} - {conflict.id}</p>
          <button onClick={() => handleResolveConflict(conflict.id)}>
            Resolve with Local Data
          </button>
        </div>
      ))}
    </div>
  );
}
```

## 📱 Platform-Specific Implementation

### React Native (Mobile)
```typescript
// For React Native, use actual platform libraries
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUniqueId } from 'react-native-device-info';
import Geolocation from 'react-native-geolocation-service';
```

### Web (Browser)
```typescript
// For web, use browser APIs
const storage = localStorage;
const uniqueId = generateBrowserId();
const geolocation = navigator.geolocation;
```

## 🔐 Security Features

### Secure Storage
```typescript
import { MobileStorage } from './backend/react-native';

// Store sensitive data securely
await MobileStorage.setSecureItem('auth_token', token);
const token = await MobileStorage.getSecureItem('auth_token');
```

### Biometric Authentication
```typescript
import { BiometricAuth } from './backend/react-native';

// Check availability
const available = await BiometricAuth.isAvailable();

// Authenticate
const result = await BiometricAuth.authenticate({
  promptMessage: 'Authenticate to access PropertyHub',
  fallbackLabel: 'Use password',
});
```

## 📊 Analytics & Tracking

```typescript
import { MobileAnalytics } from './backend/react-native';

// Track events
await MobileAnalytics.trackEvent('property_viewed', {
  property_id: 'prop-123',
  location: 'search_results',
});

// Track screen views
await MobileAnalytics.trackScreen('PropertyDetails', {
  property_type: 'apartment',
});
```

## 🔄 Data Sync & Offline Support

### Automatic Sync
```typescript
// Sync happens automatically when:
// - App comes online
// - User logs in
// - Periodic intervals (5 minutes)
```

### Manual Sync
```typescript
import { mobileDataSyncService } from './backend/react-native';

// Force full sync
await mobileDataSyncService.startSync({ 
  forceFullSync: true 
});

// Queue data for sync
await mobileDataSyncService.queueForSync(
  'property', 
  'update', 
  'prop-123', 
  propertyData
);
```

### Conflict Resolution
```typescript
// Automatic resolution strategies
const options = {
  conflictResolution: 'local' | 'server' | 'manual'
};

// Manual resolution
await mobileDataSyncService.resolveConflictManually(
  conflictId, 
  'merge', 
  mergedData
);
```

## 🔔 Push Notifications

### Setup
```typescript
import { PushNotificationManager } from './backend/react-native';

// Initialize
const result = await PushNotificationManager.initialize();
if (result.success) {
  console.log('Push token:', result.token);
}
```

### Send Notifications
```typescript
// Local notification
await PushNotificationManager.sendLocalNotification({
  title: 'New Property Alert',
  body: 'A property matching your criteria is available',
  data: { propertyId: 'prop-123' },
});

// Subscribe to notification types
const unsubscribe = PushNotificationManager.subscribe(
  'chat_message', 
  (payload) => {
    console.log('New chat message:', payload);
  }
);
```

## 🐛 Debug & Testing

### Debug Information
```typescript
import { ReactNativeBackendDebug } from './backend/react-native';

// Get debug info
const debugInfo = ReactNativeBackendDebug.getDebugInfo();
console.log('Backend status:', debugInfo);

// Test all services
const testResults = await ReactNativeBackendDebug.testServices();
console.log('Service test results:', testResults);
```

### Demo Component
Use the included demo component to test all features:

```tsx
import { ReactNativeMobileDemo } from './components/mobile/ReactNativeMobileDemo';

function App() {
  return (
    <div>
      <ReactNativeMobileDemo />
    </div>
  );
}
```

## 🚀 Deployment

### Mobile App (React Native)
1. Follow React Native deployment guides for iOS/Android
2. Configure platform-specific services (Firebase, etc.)
3. Set up deep linking and app store metadata

### Web App
1. Build with `npm run build`
2. Deploy to your hosting platform
3. Configure service worker for offline support

## 📚 API Reference

### Main Backend Manager
```typescript
import { reactNativeBackend } from './backend/react-native';

// Initialize
await reactNativeBackend.initialize(options);

// Check status
const isReady = reactNativeBackend.isInitialized();

// Get services
const api = reactNativeBackend.getApiService();
const webSocket = reactNativeBackend.getWebSocketManager();
const sync = reactNativeBackend.getSyncService();
```

### Configuration Options
```typescript
interface ReactNativeConfig {
  apiUrl: string;
  wsUrl: string;
  authTimeout: number;
  cacheTimeout: number;
  offlineSync: boolean;
  pushNotifications: boolean;
  biometricAuth: boolean;
  deepLinking: boolean;
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Update documentation
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the demo component for examples

---

**PropertyHub React Native Backend Integration v2.0.0**  
*Enabling seamless cross-platform real estate marketplace experiences*