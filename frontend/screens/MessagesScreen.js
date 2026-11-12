import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useSession } from "../src/state/Session";
import { api } from "../src/state/api";
import { useActiveRefresh } from "../src/state/useActiveRefresh";
import { useTheme } from "../src/design/Theme";
import { Page, Button, Notice } from "../src/components/MarketUI";
export default function MessagesScreen() {
  const { user } = useSession();
  return <Inbox key={user?.id || "guest"} />;
}
function Inbox() {
  const { token, user } = useSession(),
    { colors: c } = useTheme();
  const [items, setItems] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setItems(await api("/conversations", { token }));
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);
  useActiveRefresh(load);
  return (
    <Page
      title="Messages"
      subtitle="A quick question. An easier pickup."
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={load}
          tintColor={c.green}
        />
      }
    >
      {error ? (
        <>
          <Notice error>{error}</Notice>
          <Button title="Try again" secondary onPress={load} />
        </>
      ) : null}
      {loading && !items.length ? <ActivityIndicator color={c.green} /> : null}
      {!loading && !error && !items.length ? (
        <>
          <Notice>
            No conversations yet. Open a listing and tap Message vendor, or
            start a chat from your pickups.
          </Notice>
          <Button
            title="Explore food"
            secondary
            onPress={() => router.navigate("/")}
          />
        </>
      ) : null}
      {items.map((item) => (
        <Pressable
          key={item.conversation_id}
          accessibilityRole="button"
          accessibilityLabel={`Message ${item.customer_id === user?.id ? item.business_name : item.customer_name} about ${item.item_name}`}
          onPress={() =>
            router.push({
              pathname: "/conversation/[id]",
              params: { id: item.conversation_id },
            })
          }
          style={({ pressed }) => ({
            padding: 18,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: c.line,
            backgroundColor: c.surface,
            gap: 8,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: c.tint,
              }}
            >
              <Ionicons name="chatbubble-outline" size={20} color={c.green} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text
                numberOfLines={1}
                style={{ fontWeight: "700", fontSize: 18, color: c.ink }}
              >
                {item.customer_id === user?.id
                  ? item.business_name
                  : item.customer_name}
              </Text>
              <Text numberOfLines={1} style={{ color: c.muted }}>
                {item.item_name}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.muted} />
          </View>
          <Text numberOfLines={2} style={{ color: c.muted, lineHeight: 21 }}>
            {item.last_message || "Start the conversation."}
          </Text>
          <Text style={{ fontSize: 12, color: c.muted }}>
            {new Date(item.last_message_at || item.created_at).toLocaleString()}
          </Text>
        </Pressable>
      ))}
    </Page>
  );
}
