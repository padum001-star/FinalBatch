import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSession } from "../src/state/Session";
import { useAvailableListings } from "../src/state/useAvailableListings";
import { useTheme } from "../src/design/Theme";
import { Page, ListingCard, Notice, Button } from "../src/components/MarketUI";
const categories = [
  ["All", "grid-outline"],
  ["Bakery", "cafe-outline"],
  ["Café", "cafe-outline"],
  ["Restaurant", "restaurant-outline"],
  ["Produce", "leaf-outline"],
  ["Meals", "fast-food-outline"],
];
function Section({ title, subtitle, items, favourites, onSave }) {
  const { colors: c } = useTheme();
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return null;
  return (
    <View style={{ gap: 15, marginBottom: 18 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 22,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            accessibilityRole="header"
            style={{
              fontSize: 23,
              fontWeight: "700",
              letterSpacing: -0.7,
              color: c.ink,
            }}
          >
            {title}
          </Text>
          <Text style={{ fontSize: 13, color: c.muted, marginTop: 4 }}>
            {subtitle}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={`${expanded ? "Collapse" : "See all"} ${title}`}
          accessibilityRole="button"
          onPress={() => setExpanded((v) => !v)}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: c.tint,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={expanded ? "chevron-up" : "arrow-forward"}
            color={c.ink}
            size={21}
          />
        </Pressable>
      </View>
      <ScrollView
        horizontal={!expanded}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 22, gap: 18 }}
      >
        {items.map((item) => (
          <ListingCard
            key={item.id}
            item={item}
            wide={expanded}
            saved={favourites.has(item.id)}
            onSave={onSave}
          />
        ))}
      </ScrollView>
    </View>
  );
}
export default function HomeScreen() {
  const {
    user,
    listings,
    favourites,
    toggleFavourite,
    loadError,
    loadingListings,
    retry,
  } = useSession();
  const { colors: c } = useTheme();
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("All");
  const { items: availableListings, now } = useAvailableListings(listings);
  const items = availableListings.filter(
    (l) =>
      (category === "All" || l.tag === category) &&
      `${l.itemName} ${l.vendorName} ${l.address}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const ready = items.filter((l) => +new Date(l.pickupStart) <= now);
  const closing = [...items].sort(
    (a, b) => new Date(a.pickupEnd) - new Date(b.pickupEnd),
  );
  return (
    <Page title="" scroll={false}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={loadingListings}
            onRefresh={retry}
            tintColor={c.green}
          />
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24, gap: 20 }}
      >
        <View style={{ paddingHorizontal: 22, paddingTop: 12, gap: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text
                style={{
                  color: c.green,
                  fontSize: 25,
                  fontWeight: "800",
                  letterSpacing: -1,
                }}
              >
                finalbatch<Text style={{ color: c.accent }}>.</Text>
              </Text>
              <Text style={{ color: c.muted, fontSize: 13, marginTop: 4 }}>
                Good food. Another chance.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              onPress={() => router.push("/profile")}
              style={{
                height: 44,
                width: 44,
                borderRadius: 22,
                backgroundColor: c.tint,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: c.green, fontWeight: "700" }}>
                {user?.name?.[0]?.toUpperCase()}
              </Text>
            </Pressable>
          </View>
          <View
            style={{
              minHeight: 58,
              borderRadius: 30,
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.line,
              flexDirection: "row",
              gap: 12,
              alignItems: "center",
              paddingHorizontal: 20,
              boxShadow: "0 5px 18px rgba(20,45,29,0.06)",
            }}
          >
            <Ionicons name="search-outline" size={22} color={c.ink} />
            <TextInput
              accessibilityLabel="Search listings"
              placeholder="Find your next good bite"
              value={query}
              onChangeText={setQuery}
              placeholderTextColor={c.muted}
              style={{
                flex: 1,
                color: c.ink,
                fontSize: 15,
                paddingVertical: 18,
              }}
            />
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 22, gap: 10 }}
        >
          {categories.map(([name, icon]) => (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityState={{ selected: category === name }}
              onPress={() => setCategory(name)}
              style={{
                minHeight: 46,
                paddingHorizontal: 16,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: category === name ? c.green : c.line,
                backgroundColor: category === name ? c.green : c.surface,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons
                name={icon}
                size={17}
                color={category === name ? c.onGreen : c.ink}
              />
              <Text
                style={{
                  color: category === name ? c.onGreen : c.ink,
                  fontWeight: "600",
                }}
              >
                {name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {loadError ? (
          <View style={{ paddingHorizontal: 22, gap: 10 }}>
            <Notice error>{loadError}</Notice>
            <Button title="Try again" secondary onPress={retry} />
          </View>
        ) : null}
        {loadingListings && !availableListings.length ? (
          <ActivityIndicator color={c.green} />
        ) : !items.length && !loadError ? (
          <View style={{ padding: 22, gap: 15 }}>
            <Text style={{ fontSize: 25, fontWeight: "700", color: c.ink }}>
              {availableListings.length
                ? "Nothing matches just yet."
                : "The next good batch starts here."}
            </Text>
            <Text style={{ color: c.muted, lineHeight: 22 }}>
              {availableListings.length
                ? "Try another category or search."
                : "There are no available listings yet. Vendors can publish real photos, quantities, and pickup times."}
            </Text>
            <Button
              title="List surplus food"
              icon="add-outline"
              onPress={() => router.push("/vendor")}
            />
          </View>
        ) : (
          <>
            <Section
              title="Ready for pickup"
              subtitle="Available to collect now"
              items={ready}
              favourites={favourites}
              onSave={toggleFavourite}
            />
            <Section
              title="Before they’re gone"
              subtitle="The soonest pickup windows"
              items={closing}
              favourites={favourites}
              onSave={toggleFavourite}
            />
            <Section
              title="Freshly listed"
              subtitle="The latest batches from local vendors"
              items={items}
              favourites={favourites}
              onSave={toggleFavourite}
            />
          </>
        )}
        <View
          style={{
            marginHorizontal: 22,
            padding: 20,
            borderRadius: 20,
            backgroundColor: c.tint,
            flexDirection: "row",
            gap: 13,
          }}
        >
          <Ionicons name="leaf-outline" size={25} color={c.green} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700", color: c.ink, fontSize: 16 }}>
              A little less waste. A lot more good.
            </Text>
            <Text style={{ color: c.muted, lineHeight: 20, marginTop: 5 }}>
              Reserve a batch, meet your vendor, and collect during its pickup
              window.
            </Text>
          </View>
        </View>
      </ScrollView>
    </Page>
  );
}
