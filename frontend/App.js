import React from 'react';
import { ExpoRoot } from 'expo-router';

export default function App() {
  // A literal path keeps route discovery independent of the entry module's
  // EXPO_ROUTER_APP_ROOT transform. Keep this inside App for Fast Refresh.
  const context = require.context('./src/app');
  return <ExpoRoot context={context} />;
}
