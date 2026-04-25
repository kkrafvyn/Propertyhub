# PropertyHub Mobile App

A React Native mobile application for the PropertyHub real estate marketplace platform. Built with Expo and modern React Native technologies.

## 🚀 Features

- **Property Browsing**: Search and filter properties with advanced criteria
- **Real-time Chat**: End-to-end encrypted messaging with voice messages and file sharing
- **Location Services**: GPS-based property discovery and mapping
- **Push Notifications**: Real-time updates for messages, bookings, and property alerts
- **Offline Support**: Cached data for browsing properties without internet
- **Cross-platform**: Works on both iOS and Android devices
- **Modern UI**: Material Design 3 with React Native Paper
- **Biometric Auth**: Secure login with fingerprint/face recognition
- **Voice Messages**: Record and send voice messages in chat
- **Image Gallery**: Property image carousels with zoom and sharing
- **Live Location**: Share location in real-time during property visits

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android Emulator
- Physical device for testing (recommended)

## 🛠️ Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```
   EXPO_PUBLIC_API_URL=https://api.propertyhub.app
   EXPO_PUBLIC_WEBSOCKET_URL=wss://api.propertyhub.app
   EXPO_PUBLIC_PROJECT_ID=your-expo-project-id
   EXPO_PUBLIC_ENCRYPTION_KEY=your-encryption-key
   ```

4. **Start the development server:**
   ```bash
   npm start
   # or
   expo start
   ```

## 📱 Running the App

### Development
- **iOS Simulator**: Press `i` in the Expo CLI or scan QR code with Expo Go
- **Android Emulator**: Press `a` in the Expo CLI or scan QR code with Expo Go
- **Physical Device**: Install Expo Go app and scan the QR code

### Demo Accounts
For testing, use these demo accounts:

**Regular User:**
- Email: `demo@propertyhub.com`
- Password: `demo`

**Property Host:**
- Email: `host@propertyhub.com`
- Password: `host`

## 🏗️ Project Structure

```
mobile/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main tab navigation
│   ├── _layout.tsx        # Root layout
│   └── index.tsx          # Entry point
├── src/
│   ├── components/        # Reusable UI components
│   ├── providers/         # React Context providers
│   ├── services/          # API and data services
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript type definitions
│   └── theme/             # Theme and styling
├── assets/                # Static assets (images, fonts)
├── app.json              # Expo configuration
├── package.json          # Dependencies and scripts
└── README.md             # This file
```

## 🎨 Key Technologies

- **Expo SDK 53**: Development platform and tools
- **React Native 0.76**: Cross-platform mobile framework
- **TypeScript**: Type-safe development
- **React Native Paper**: Material Design components
- **Expo Router**: File-based navigation
- **Socket.io Client**: Real-time communication
- **React Query**: Data fetching and caching
- **Zustand**: Lightweight state management
- **AsyncStorage**: Local data persistence
- **Expo SecureStore**: Secure credential storage
- **React Hook Form**: Form handling and validation

## 🔧 Key Components

### Authentication
- Secure JWT token management
- Biometric authentication support
- Automatic token refresh
- Offline login state persistence

### Real-time Chat
- WebSocket-based messaging
- End-to-end encryption
- Voice message recording
- File sharing and image uploads
- Typing indicators and read receipts
- Online/offline presence

### Property Management
- Advanced search and filtering
- Location-based discovery
- Image galleries with zoom
- Favorite properties
- Property comparison
- Share functionality

### Notifications
- Push notifications via Expo
- In-app notification center
- Real-time chat notifications
- Property update alerts

## 🚀 Building for Production

### Development Build
```bash
expo build:android
expo build:ios
```

### EAS Build (Recommended)
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure build
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

### App Store Distribution
```bash
# Submit to Google Play Store
eas submit --platform android

# Submit to Apple App Store
eas submit --platform ios
```

## 🔐 Security Features

- **JWT Authentication**: Secure API access
- **Biometric Login**: Fingerprint/Face ID support
- **Encrypted Storage**: Sensitive data protection
- **E2E Encryption**: Encrypted chat messages
- **Certificate Pinning**: API security (production)
- **Input Validation**: XSS and injection protection

## 📊 Performance Optimization

- **Image Caching**: Optimized image loading
- **Lazy Loading**: Components and screens
- **Bundle Splitting**: Code splitting for faster loads
- **Memory Management**: Efficient resource usage
- **Network Caching**: Reduced API calls
- **Background Tasks**: Sync data when app is backgrounded

## 🧪 Testing

```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Run tests (if implemented)
npm test
```

## 🚧 Development Scripts

```bash
# Start development server
npm start

# Start with tunnel (for testing on external devices)
npm run tunnel

# Clear cache
npm run clear

# iOS development
npm run ios

# Android development
npm run android

# Web development (limited support)
npm run web
```

## 📋 Environment Configuration

Create `.env` file with these variables:

```env
# API Configuration
EXPO_PUBLIC_API_URL=https://api.propertyhub.app
EXPO_PUBLIC_WEBSOCKET_URL=wss://api.propertyhub.app

# App Configuration
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id
EXPO_PUBLIC_ENCRYPTION_KEY=your-encryption-key

# Feature Flags
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true

# External Services
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY=your-paystack-key
```

## 🤝 Backend Integration

The mobile app integrates with:

1. **PropertyHub Web App**: Shared user accounts and data
2. **WebSocket Server**: Real-time chat and notifications
3. **REST API**: Property data and user management
4. **File Storage**: Image and document uploads
5. **Push Notifications**: Server-side notification delivery

## 📱 Device Capabilities

### Required Permissions
- **Camera**: Property photos and profile pictures
- **Microphone**: Voice messages
- **Location**: Property discovery and navigation
- **Notifications**: Push alerts and updates
- **Storage**: Cache and offline data

### Optional Features
- **Contacts**: Property sharing
- **Calendar**: Booking reminders
- **Biometrics**: Secure authentication

## 🐛 Troubleshooting

### Common Issues

**Metro bundler issues:**
```bash
npx expo start --clear
```

**iOS build issues:**
```bash
cd ios && pod install
```

**Android build issues:**
```bash
cd android && ./gradlew clean
```

**Network issues:**
- Check firewall settings
- Use tunnel mode: `expo start --tunnel`
- Verify environment variables

### Debug Tools
- **Flipper**: React Native debugging
- **Expo Dev Tools**: Browser-based debugging
- **React Native Debugger**: Standalone debugging app
- **Console Logs**: Check Expo CLI output

## 📞 Support

- **Documentation**: [Expo Docs](https://docs.expo.dev)
- **Community**: [Expo Forums](https://forums.expo.dev)
- **Issues**: GitHub Issues (if applicable)
- **Chat**: Discord/Slack channels (if available)

## 📄 License

This project is proprietary. All rights reserved.

---

Built with ❤️ using React Native and Expo