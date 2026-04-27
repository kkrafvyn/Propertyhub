# Mobile Release Setup

These items still need real credentials outside the repo before Android and iOS releases can ship.

## Android

- Place Firebase config at `android/app/google-services.json`
- Use a supported JDK such as 17 or 21
- Create a signing key in `android/app/` or reference it from CI secrets
- Run `npm run mobile:sync`
- Open the native project with `npx cap open android`

## iOS

- Place Firebase config at `ios/App/App/GoogleService-Info.plist`
- Open the project on macOS with Xcode using `npx cap open ios`
- Configure signing, team ID, bundle ID, and push entitlements in Xcode

## Environment

- Set `VITE_API_URL` to the deployed backend origin
- Set `VITE_WEBSOCKET_URL` to the deployed websocket endpoint
- Set `VITE_PAYSTACK_PUBLIC_KEY` and any other public client keys
- Keep secret gateway and push credentials in backend or CI environment storage, not in the client bundle

## Final Verification

- `npm run build`
- `npm run test:ci`
- `npm run mobile:sync`
- real-device test for sign-in, camera upload, location, notifications, and payment callback
