import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  Image,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useTheme } from "../design/Theme";
export const price = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(value),
  );
export const pickup = (item) =>
  `${new Date(item.pickupStart).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${new Date(item.pickupStart).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}–${new Date(item.pickupEnd).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
export function Button({
  title,
  onPress,
  secondary = false,
  busy = false,
  disabled = false,
  icon,
  style,
  testID,
}) {
  const { colors: c } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy, busy }}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: secondary ? c.tint : c.green,
          opacity: disabled || busy ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? c.green : c.onGreen} />
      ) : icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={secondary ? c.green : c.onGreen}
        />
      ) : null}
      <Text
        style={{
          color: secondary ? c.green : c.onGreen,
          fontSize: 15,
          fontWeight: "700",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Page({
  title,
  subtitle,
  children,
  back = false,
  scroll = true,
  refreshControl,
}) {
  const { colors: c, dark } = useTheme();
  const contents = (
    <>
      {title || back ? (
        <View
          style={[
            s.pageHead,
            !scroll && { paddingHorizontal: 22, paddingBottom: 12 },
          ]}
        >
          {back ? (
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/")
              }
              style={[s.circle, { backgroundColor: c.tint }]}
            >
              <Ionicons name="arrow-back" size={22} color={c.ink} />
            </Pressable>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text
              accessibilityRole="header"
              style={[s.pageTitle, { color: c.ink }]}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text style={[s.body, { color: c.muted, marginTop: 6 }]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
      {children}
    </>
  );
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      <StatusBar style={dark ? "light" : "dark"} />
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
          contentContainerStyle={{ padding: 22, paddingBottom: 40, gap: 18 }}
        >
          {contents}
        </ScrollView>
      ) : (
        contents
      )}
    </SafeAreaView>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  multiline = false,
  ...props
}) {
  const { colors: c } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: c.ink, fontWeight: "600", fontSize: 14 }}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholderTextColor={c.muted}
        style={[
          s.input,
          { color: c.ink, backgroundColor: c.surface, borderColor: c.line },
          multiline && { minHeight: 110, textAlignVertical: "top" },
        ]}
        {...props}
      />
    </View>
  );
}
export function Notice({ children, error = false }) {
  const { colors: c } = useTheme();
  return (
    <Text
      accessibilityRole={error ? "alert" : undefined}
      style={[
        s.notice,
        { color: error ? c.danger : c.muted, backgroundColor: c.tint },
      ]}
    >
      {children}
    </Text>
  );
}
export function ListingCard({ item, saved, onSave, wide = false }) {
  const { colors: c } = useTheme();
  const { width } = useWindowDimensions();
  const [failedPhotoUrl, setFailedPhotoUrl] = useState(null);
  const w = wide ? undefined : Math.min(270, Math.max(208, width * 0.65));
  const discount =
    item.originalPrice > item.price
      ? Math.round((1 - item.price / item.originalPrice) * 100)
      : 0;
  return (
    <View style={{ width: w, gap: 10 }}>
      <View style={{ position: "relative" }}>
        <Pressable
          testID={`listing-${item.id}`}
          accessibilityRole="button"
          accessibilityLabel={`View ${item.itemName} from ${item.vendorName}`}
          onPress={() =>
            router.push({ pathname: "/listing/[id]", params: { id: item.id } })
          }
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <View
            style={[s.photo, { backgroundColor: c.tint, aspectRatio: 1.13 }]}
          >
            {item.photoUrl && failedPhotoUrl !== item.photoUrl ? (
              <Image
                key={item.photoUrl}
                accessibilityLabel={item.itemName}
                source={{ uri: item.photoUrl }}
                onError={() => setFailedPhotoUrl(item.photoUrl)}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="image-outline" size={32} color={c.muted} />
                <Text style={{ color: c.muted }}>Photo unavailable</Text>
              </View>
            )}
          </View>
        </Pressable>
        {discount > 0 ? (
          <View style={[s.badge, { backgroundColor: c.surface }]}>
            <Text style={{ color: c.ink, fontSize: 12, fontWeight: "700" }}>
              {discount}% less
            </Text>
          </View>
        ) : null}
        {onSave ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${saved ? "Unsave" : "Save"} ${item.vendorName}`}
            accessibilityState={{ selected: saved }}
            onPress={() => onSave(item.id)}
            style={[s.save, { backgroundColor: c.surface }]}
          >
            <Ionicons
              name={saved ? "heart" : "heart-outline"}
              size={22}
              color={saved ? c.accent : c.ink}
            />
          </Pressable>
        ) : null}
      </View>
      <Pressable
        onPress={() =>
          router.push({ pathname: "/listing/[id]", params: { id: item.id } })
        }
        accessibilityRole="button"
      >
        <Text
          numberOfLines={2}
          style={{
            color: c.ink,
            fontSize: 16,
            fontWeight: "700",
            lineHeight: 21,
          }}
        >
          {item.itemName}
        </Text>
        <Text
          numberOfLines={1}
          style={{ color: c.muted, fontSize: 13, marginTop: 3 }}
        >
          {item.vendorName}
        </Text>
        <Text
          style={{
            color: c.ink,
            fontSize: 15,
            fontWeight: "700",
            marginTop: 7,
          }}
        >
          {price(item.price)}{" "}
          <Text
            style={{
              color: c.muted,
              fontWeight: "400",
              textDecorationLine: "line-through",
            }}
          >
            {item.originalPrice > item.price ? price(item.originalPrice) : ""}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: "400", color: c.muted }}>
            {" "}
            / item
          </Text>
        </Text>
        <Text
          numberOfLines={2}
          style={{ color: c.muted, fontSize: 12, lineHeight: 18, marginTop: 5 }}
        >
          {pickup(item)}
        </Text>
        <Text
          style={{
            color: c.accent,
            fontSize: 12,
            fontWeight: "600",
            marginTop: 3,
          }}
        >
          {item.quantity} available
        </Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: 15,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  pageHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 8,
  },
  pageTitle: { fontSize: 30, fontWeight: "700", letterSpacing: -1 },
  body: { fontSize: 14, lineHeight: 21 },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 13,
    padding: 14,
    fontSize: 16,
  },
  notice: { padding: 15, borderRadius: 14, fontSize: 14, lineHeight: 21 },
  photo: { borderRadius: 22, overflow: "hidden" },
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  save: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
