import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider } from '../state/Session';
export default function RootLayout() {
  return <SafeAreaProvider><SessionProvider><Stack screenOptions={{ headerShown: false }} /></SessionProvider></SafeAreaProvider>;
}
