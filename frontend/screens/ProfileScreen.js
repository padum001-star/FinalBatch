import React from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useSession } from "../src/state/Session";
import { useTheme } from "../src/design/Theme";
import { Page, Button } from "../src/components/MarketUI";
export default function ProfileScreen() {
  const { user, signOut } = useSession();
  const { colors: c, mode, setMode } = useTheme();
  return (
    <Page title="Your corner" subtitle="A little good starts with you.">
      <View
        style={{
          padding: 24,
          borderRadius: 22,
          backgroundColor: c.surface,
          gap: 9,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "700", color: c.ink }}>
          {user?.name}
        </Text>
        <Text style={{ color: c.muted }}>{user?.email}</Text>
        <Text style={{ color: c.green }}>
          {user?.role === "admin"
            ? "Administrator"
            : user?.role === "vendor"
              ? "Vendor account"
              : "Customer account"}
        </Text>
      </View>
      <Button
        title={
          user?.role === "admin"
            ? "Manage listings"
            : user?.role === "vendor"
              ? "Manage your batches"
              : "Become a vendor"
        }
        icon="storefront-outline"
        onPress={() =>
          router.push(user?.role === "admin" ? "/admin" : "/vendor")
        }
      />
      <Text style={{ fontSize: 19, fontWeight: "700", color: c.ink }}>
        Appearance
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {["light", "dark", "system"].map((value) => (
          <Button
            key={value}
            style={{ flex: 1, paddingHorizontal: 8 }}
            secondary={mode !== value}
            title={value[0].toUpperCase() + value.slice(1)}
            onPress={() => setMode(value)}
          />
        ))}
      </View>
      <Button title="Sign out" secondary onPress={signOut} />
    </Page>
  );
}
