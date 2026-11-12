# Expo SDK 58 upgrade

The FinalBatch frontend now uses Expo 58.0.23 (SDK 58), React 19.3.0, React Native 0.88.1, and Expo Router 58.0.30. Native Expo modules, types, Reanimated/Worklets, screens, safe-area context, and lint configuration are aligned through Expo's compatibility checker. SDK 58 receives patch updates; its SDK identifier is 58.0.0 even when the installed `expo` package has a newer patch number.

Three unused direct `@react-navigation/*` dependencies were removed. The app already uses Expo Router, and SDK 58 supplies its navigation implementation. Web output is explicitly `single` to preserve the existing SPA behavior and avoid adding a web rendering server.

After pulling the changes:

```sh
cd frontend
npm ci
npx expo start --go --clear --port 8082
```

Stop the previous Expo terminal first, update Expo Go on the phone, and scan the newly printed FinalBatch QR code. A custom development app must be rebuilt after this native SDK change. Your existing frontend API URL remains in the ignored `.env`.

Verification: dependency compatibility check, Expo Doctor (20/20), lint and typecheck pass. Web and iOS JavaScript exports pass (iOS used `--no-bytecode`; this is not a signed release-build/device test). All nine browser marketplace checks also pass under SDK 58, including vendor photo publishing, reservations, response-loss recovery, cancellation, vendor collection, favourites, dark mode and phone-width layouts. The existing backend is unchanged by this SDK upgrade.

References: https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/ and https://docs.expo.dev/router/migrate/sdk-57-to-58/.
