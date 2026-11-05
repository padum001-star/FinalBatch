import React from 'react';
import { ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import OnboardingScreen from '../../screens/OnboardingScreen';
import { useSession } from '../state/Session';
export default function Index() {
  const { user, ready } = useSession();
  if (!ready) return <ActivityIndicator />;
  return user ? <Redirect href="/(tabs)" /> : <OnboardingScreen />;
}
