import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const COLORS = {
  fern:         '#1F4D3D',
  ember:        '#E85A34',
  sage:         '#F5F7F0',
  card:         '#FFFFFF',
  charcoal:     '#1C2620',
  charcoalSoft: '#5C6B62',
  wheat:        '#F0B429',
  line:         '#E1E7DC',
};

const CATEGORIES = ['All', 'Bakery', 'Café', 'Restaurant', 'Produce', 'Meals'];

// Mock listings — will be replaced with real data from GET /listings Lambda
const MOCK_LISTINGS = [
  {
    id: '1',
    itemName: 'Sourdough Loaf',
    vendorName: 'Bread & Butter Bakery',
    price: 3.50,
    originalPrice: 9.00,
    pickupStart: '5:00 PM',
    pickupEnd: '7:00 PM',
    emoji: '🍞',
    accentColor: '#F0B429',
    tag: 'Bakery',
    quantity: 4,
    distance: '0.3 mi',
  },
  {
    id: '2',
    itemName: 'Pastry Box — 6 items',
    vendorName: 'Morning Glory Café',
    price: 5.00,
    originalPrice: 14.00,
    pickupStart: '4:30 PM',
    pickupEnd: '6:00 PM',
    emoji: '🥐',
    accentColor: '#E85A34',
    tag: 'Café',
    quantity: 2,
    distance: '0.7 mi',
  },
  {
    id: '3',
    itemName: 'Mixed Veg Bundle',
    vendorName: 'Green Earth Market',
    price: 4.00,
    originalPrice: 12.00,
    pickupStart: '3:00 PM',
    pickupEnd: '6:30 PM',
    emoji: '🥦',
    accentColor: '#1F4D3D',
    tag: 'Produce',
    quantity: 8,
    distance: '1.1 mi',
  },
  {
    id: '4',
    itemName: 'Pasta & Sauce Kit',
    vendorName: "Nonna's Kitchen",
    price: 6.00,
    originalPrice: 16.00,
    pickupStart: '6:00 PM',
    pickupEnd: '8:00 PM',
    emoji: '🍝',
    accentColor: '#C0392B',
    tag: 'Meals',
    quantity: 3,
    distance: '0.9 mi',
  },
];

function ListingCard({ item, index }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      damping: 20,
      stiffness: 140,
      delay: index * 70,
      useNativeDriver: true,
    }).start();
  }, []);

  const scale = useRef(new Animated.Value(1)).current;
  function pressIn()  { Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start(); }
  function pressOut() { Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start(); }

  const discount = Math.round((1 - item.price / item.originalPrice) * 100);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
          { scale },
        ],
      }}
    >
      <TouchableOpacity activeOpacity={1} onPressIn={pressIn} onPressOut={pressOut}>
        <View style={styles.card}>
          {/* Left accent strip */}
          <View style={[styles.cardAccent, { backgroundColor: item.accentColor }]} />

          {/* Emoji */}
          <View style={styles.cardEmoji}>
            <Text style={styles.cardEmojiText}>{item.emoji}</Text>
          </View>

          {/* Content */}
          <View style={styles.cardContent}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardName} numberOfLines={1}>{item.itemName}</Text>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{discount}%</Text>
              </View>
            </View>
            <Text style={styles.cardVendor} numberOfLines={1}>{item.vendorName}</Text>

            <View style={styles.cardBottomRow}>
              {/* Price */}
              <View style={styles.priceRow}>
                <Text style={styles.price}>${item.price.toFixed(2)}</Text>
                <Text style={styles.originalPrice}>${item.originalPrice.toFixed(2)}</Text>
              </View>

              {/* Pickup window */}
              <View style={styles.pickupBadge}>
                <Text style={styles.pickupText}>
                  {item.pickupStart}–{item.pickupEnd}
                </Text>
              </View>
            </View>

            <View style={styles.cardMeta}>
              <Text style={styles.metaText}>📦 {item.quantity} left</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>📍 {item.distance}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered =
    activeCategory === 'All'
      ? MOCK_LISTINGS
      : MOCK_LISTINGS.filter((l) => l.tag === activeCategory);

  // Header animation
  const headerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(headerAnim, {
      toValue: 1,
      damping: 22,
      stiffness: 160,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerAnim,
              transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
            },
          ]}
        >
          <View>
            <Text style={styles.greeting}>Good morning 👋</Text>
            <View style={styles.locationRow}>
              <Text style={styles.locationPin}>📍</Text>
              <Text style={styles.locationText}>Toronto, ON</Text>
            </View>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>P</Text>
          </View>
        </Animated.View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for food near you..."
            placeholderTextColor={COLORS.charcoalSoft}
          />
        </View>

        {/* Category filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categories}
        >
          {CATEGORIES.map((cat) => {
            const active = cat === activeCategory;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.catPill, active && styles.catPillActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.catText, active && styles.catTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Section heading */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available near you</Text>
          <Text style={styles.sectionCount}>{filtered.length} listings</Text>
        </View>

        {/* Listing cards */}
        <View style={styles.listingsContainer}>
          {filtered.map((item, i) => (
            <ListingCard key={item.id} item={item} index={i} />
          ))}
          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyText}>No listings in this category right now.</Text>
            </View>
          )}
        </View>

        {/* Sustainability banner */}
        <View style={styles.banner}>
          <View style={styles.bannerDot} />
          <Text style={styles.bannerText}>
            Vendors near you saved <Text style={styles.bannerBold}>340 lbs</Text> of food this week
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: COLORS.sage },
  scroll:   { paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 16,
  },
  greeting:    { fontSize: 22, fontWeight: '800', color: COLORS.charcoal, letterSpacing: -0.4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  locationPin: { fontSize: 12, marginRight: 3 },
  locationText:{ fontSize: 13, color: COLORS.charcoalSoft, fontWeight: '600' },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.fern, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: COLORS.sage, fontWeight: '800', fontSize: 16 },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 22,
    marginBottom: 18,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    gap: 8,
  },
  searchIcon:  { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.charcoal },

  // Categories
  categories: { paddingHorizontal: 22, paddingBottom: 20, gap: 8 },
  catPill: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1.5, borderColor: COLORS.line,
  },
  catPillActive: { backgroundColor: COLORS.fern, borderColor: COLORS.fern },
  catText:       { fontSize: 13, fontWeight: '700', color: COLORS.charcoalSoft },
  catTextActive: { color: COLORS.sage },

  // Section header
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 22, marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.charcoal, letterSpacing: -0.3 },
  sectionCount: { fontSize: 13, color: COLORS.charcoalSoft, fontWeight: '600' },

  // Listing cards
  listingsContainer: { paddingHorizontal: 22, gap: 12 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.line,
    shadowColor: COLORS.charcoal,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardAccent:      { width: 4 },
  cardEmoji: {
    width: 56, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  cardEmojiText:   { fontSize: 24 },
  cardContent:     { flex: 1, padding: 13 },
  cardTopRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  cardName:        { flex: 1, fontSize: 15, fontWeight: '800', color: COLORS.charcoal, letterSpacing: -0.2 },
  discountBadge: {
    backgroundColor: 'rgba(31,77,61,0.1)',
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 6, marginLeft: 6,
  },
  discountText:    { fontSize: 11, fontWeight: '800', color: COLORS.fern },
  cardVendor:      { fontSize: 12, color: COLORS.charcoalSoft, fontWeight: '500', marginBottom: 10 },
  cardBottomRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceRow:        { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  price:           { fontSize: 17, fontWeight: '800', color: COLORS.charcoal },
  originalPrice:   { fontSize: 13, color: COLORS.charcoalSoft, textDecorationLine: 'line-through' },
  pickupBadge: {
    backgroundColor: 'rgba(240,180,41,0.15)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  pickupText:  { fontSize: 11, fontWeight: '700', color: '#8A5E0C' },
  cardMeta:    { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  metaText:    { fontSize: 11, color: COLORS.charcoalSoft, fontWeight: '600' },
  metaDot:     { fontSize: 11, color: COLORS.charcoalSoft },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText:  { fontSize: 14, color: COLORS.charcoalSoft, fontWeight: '600' },

  // Banner
  banner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 22, marginTop: 24,
    backgroundColor: 'rgba(240,180,41,0.15)',
    paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 12,
  },
  bannerDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.wheat, marginRight: 10 },
  bannerText: { fontSize: 13, color: '#7A520A', lineHeight: 18 },
  bannerBold: { fontWeight: '800' },
});
