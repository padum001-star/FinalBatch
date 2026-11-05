import React from 'react';
import { ActivityIndicator } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSession } from '../../state/Session';
const icons = { index: 'search-outline', favourites: 'heart-outline', messages: 'chatbubble-outline', profile: 'person-circle-outline' };
export default function TabsLayout() {
  const { user, ready } = useSession();
  if (!ready) return <ActivityIndicator />;
  if (!user) return <Redirect href="/auth" />;
  return <Tabs screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: '#1F4D3D', tabBarInactiveTintColor: '#69746C', tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#E1E7DC' }, tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} color={color} size={size} /> })}>
    <Tabs.Screen name="index" options={{ title: 'Explore' }} />
    <Tabs.Screen name="favourites" options={{ title: 'Favourites' }} />
    <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
  </Tabs>;
}
