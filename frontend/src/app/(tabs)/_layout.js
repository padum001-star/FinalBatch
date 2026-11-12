import React from "react";
import { ActivityIndicator } from "react-native";
import { Tabs, Redirect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../design/Theme";
import { useSession } from "../../state/Session";
const icons = {
  index: "search-outline",
  favourites: "heart-outline",
  messages: "chatbubble-outline",
  profile: "person-circle-outline",
  reservations: "bag-handle-outline",
};
export default function TabsLayout() {
  const { user, ready } = useSession();
  const { colors: c } = useTheme();
  if (!ready) return <ActivityIndicator />;
  if (!user) return <Redirect href="/auth" />;
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: c.green,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line },
        animation: "none",
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={icons[route.name]} color={color} size={size} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Explore" }} />
      <Tabs.Screen name="favourites" options={{ title: "Favourites" }} />
      <Tabs.Screen name="reservations" options={{ title: "Pickups" }} />
      <Tabs.Screen name="messages" options={{ title: "Messages" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
