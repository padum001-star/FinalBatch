import { useSession } from '../src/state/Session';
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
  ActivityIndicator,
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

// ─── Horizontal Listing Card (Airbnb-style) ───────────────────────────────────
function HCard({ item, isFavourited, onToggleFavourite }) {
  const scale = useRef(new Animated.Value(1)).current;
  const discount = Math.round((1 - item.price / item.originalPrice) * 100);

  function pressIn() {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, damping: 20 }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 20 }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={styles.hCard}
      >
        {/* Top: emoji area */}
        <View style={[styles.hCardTop, { backgroundColor: item.accentColor + '26' }]}>
          <Text style={styles.hCardEmoji}>{item.emoji}</Text>

          {/* Discount badge – top left */}
          <View style={styles.hDiscountBadge}>
            <Text style={styles.hDiscountText}>-{discount}%</Text>
          </View>

          {/* Heart button – top right */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${isFavourited ? 'Remove' : 'Save'} ${item.vendorName} ${isFavourited ? 'from' : 'to'} favourites`}
            accessibilityState={{ selected: isFavourited }}
            style={styles.heartBtn}
            onPress={() => onToggleFavourite(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.heartIcon, isFavourited && styles.heartIconActive]}>
              {isFavourited ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom: details */}
        <View style={styles.hCardBottom}>
          <Text style={styles.hCardName} numberOfLines={1}>{item.itemName}</Text>
          <Text style={styles.hCardVendor} numberOfLines={1}>{item.vendorName}</Text>

          <View style={styles.hPriceRow}>
            <Text style={styles.hPrice}>${item.price.toFixed(2)}</Text>
            <Text style={styles.hOriginalPrice}>${item.originalPrice.toFixed(2)}</Text>
          </View>

          <View style={styles.hMetaRow}>
            <View style={styles.hPickupBadge}>
              <Text style={styles.hPickupText}>⏱ {item.pickupStart}–{item.pickupEnd}</Text>
            </View>
          </View>

          <View style={styles.hDistanceRow}>
            <Text style={styles.hDistanceText}>📍 {item.distance}</Text>
            <Text style={styles.hQtyText}>📦 {item.quantity} left</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Section with horizontal scroll ──────────────────────────────────────────
function Section({ title, items, favourites, onToggleFavourite }) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={() => setExpanded(!expanded)}>
          <Text style={styles.seeAll}>{expanded ? 'Show less' : 'See all →'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal={!expanded}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hScroll}
      >
        {items.map((item) => (
          <HCard
            key={item.id}
            item={item}
            isFavourited={favourites.has(item.id)}
            onToggleFavourite={onToggleFavourite}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user, favourites, toggleFavourite: onToggleFavourite, listings, loadError, loadingListings, retry } = useSession();
  const [search, setSearch] = useState('');
  const CLOSEST = [...listings].sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
  const POPULAR = listings.filter(item => item.id.startsWith('p'));
  const NEWEST = listings.filter(item => item.id.startsWith('n'));
  const [activeCategory, setActiveCategory] = useState('All');

  function filterSection(arr) {
    return arr.filter(l => (activeCategory === 'All' || l.tag === activeCategory) && `${l.itemName} ${l.vendorName}`.toLowerCase().includes(search.trim().toLowerCase()));
  }

  const closestFiltered  = filterSection(CLOSEST);
  const popularFiltered  = filterSection(POPULAR);
  const newestFiltered   = filterSection(NEWEST);
  const noResults =
    closestFiltered.length === 0 &&
    popularFiltered.length === 0 &&
    newestFiltered.length === 0;

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

        {/* ── Header ── */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerAnim,
              transform: [
                { translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) },
              ],
            },
          ]}
        >
          <View>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'there'} 👋</Text>
            <View style={styles.locationRow}>
              <Text style={styles.locationPin}>📍</Text>
              <Text style={styles.locationText}>Plattsburgh, NY</Text>
            </View>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || '?'}</Text>
          </View>
        </Animated.View>

        {/* ── Search bar ── */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholder="Search for food near you..."
            placeholderTextColor={COLORS.charcoalSoft}
          />
        </View>

        {/* ── Category filters ── */}
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

        <Text style={{ paddingHorizontal: 22, color: COLORS.charcoalSoft, marginBottom: 16 }}>Demo listings · distances and popularity are sample data</Text>
        {loadError ? <TouchableOpacity onPress={retry}><Text accessibilityRole="alert" style={{ padding: 22, color: COLORS.ember }}>{loadError} Tap to retry.</Text></TouchableOpacity> : null}
        {favourites.size > 0 && <Section title="Your favourite places" items={filterSection(listings.filter(item => favourites.has(item.id)))} favourites={favourites} onToggleFavourite={onToggleFavourite} />}
        {/* ── Sections ── */}
        {loadingListings ? <ActivityIndicator color={COLORS.fern} /> : noResults ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyText}>No listings in this category right now.</Text>
          </View>
        ) : (
          <>
            <Section
              title="Closest to you"
              items={closestFiltered}
              favourites={favourites}
              onToggleFavourite={onToggleFavourite}
            />
            <Section
              title="Popular in your area"
              items={popularFiltered}
              favourites={favourites}
              onToggleFavourite={onToggleFavourite}
            />
            <Section
              title="Newest listings"
              items={newestFiltered}
              favourites={favourites}
              onToggleFavourite={onToggleFavourite}
            />
          </>
        )}

        {/* ── Sustainability banner ── */}
        <View style={styles.banner}>
          <View style={styles.bannerDot} />
          <Text style={styles.bannerText}>
            Vendors near you saved <Text style={styles.bannerBold}>340 lbs</Text> of food this week 🌱
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.sage },
  scroll: { paddingBottom: 100 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 16,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: COLORS.charcoal, letterSpacing: -0.4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  locationPin: { fontSize: 12, marginRight: 3 },
  locationText: { fontSize: 13, color: COLORS.charcoalSoft, fontWeight: '600' },
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
  searchIcon: { fontSize: 15 },
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
  catText: { fontSize: 13, fontWeight: '700', color: COLORS.charcoalSoft },
  catTextActive: { color: COLORS.sage },

  // Section
  section: { marginBottom: 8 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 22, marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.charcoal, letterSpacing: -0.3 },
  seeAll: { fontSize: 13, fontWeight: '700', color: COLORS.fern },

  // Horizontal scroll
  hScroll: { paddingHorizontal: 22, gap: 14, paddingBottom: 8 },

  // Horizontal card
  hCard: {
    width: 200,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.line,
    shadowColor: COLORS.charcoal,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  hCardTop: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  hCardEmoji: { fontSize: 44 },

  // Discount badge
  hDiscountBadge: {
    position: 'absolute',
    top: 10, left: 10,
    backgroundColor: COLORS.fern,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 8,
  },
  hDiscountText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },

  // Heart
  heartBtn: {
    position: 'absolute',
    top: 8, right: 10,
    width: 30, height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartIcon: { fontSize: 17, color: COLORS.charcoalSoft },
  heartIconActive: { color: COLORS.ember },

  // Card bottom
  hCardBottom: { padding: 12, gap: 5 },
  hCardName: { fontSize: 14, fontWeight: '800', color: COLORS.charcoal, letterSpacing: -0.2 },
  hCardVendor: { fontSize: 11, color: COLORS.charcoalSoft, fontWeight: '500' },
  hPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 2 },
  hPrice: { fontSize: 16, fontWeight: '800', color: COLORS.charcoal },
  hOriginalPrice: { fontSize: 12, color: COLORS.charcoalSoft, textDecorationLine: 'line-through' },
  hMetaRow: { marginTop: 2 },
  hPickupBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(240,180,41,0.15)',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7,
  },
  hPickupText: { fontSize: 10, fontWeight: '700', color: '#8A5E0C' },
  hDistanceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4,
  },
  hDistanceText: { fontSize: 10, color: COLORS.charcoalSoft, fontWeight: '600' },
  hQtyText: { fontSize: 10, color: COLORS.charcoalSoft, fontWeight: '600' },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: COLORS.charcoalSoft, fontWeight: '600' },

  // Banner
  banner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 22, marginTop: 20,
    backgroundColor: 'rgba(240,180,41,0.15)',
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 14,
  },
  bannerDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.wheat, marginRight: 10 },
  bannerText: { flex: 1, fontSize: 13, color: '#7A520A', lineHeight: 19 },
  bannerBold: { fontWeight: '800' },
});

// Export all listings so other screens can consume them
