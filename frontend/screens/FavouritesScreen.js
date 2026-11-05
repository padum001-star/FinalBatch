import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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

// ─── Full-width vertical card ─────────────────────────────────────────────────
function FavCard({ item, onToggleFavourite }) {
  const discount = Math.round((1 - item.price / item.originalPrice) * 100);

  return (
    <View style={styles.card}>
      {/* Emoji area */}
      <View style={[styles.cardImageArea, { backgroundColor: item.accentColor + '22' }]}>
        <Text style={styles.cardEmoji}>{item.emoji}</Text>

        {/* Discount badge */}
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>-{discount}%</Text>
        </View>

        {/* Heart – always filled red since these are favourites */}
        <TouchableOpacity
          style={styles.heartBtn}
          onPress={() => onToggleFavourite(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.heartIconActive}>♥</Text>
        </TouchableOpacity>
      </View>

      {/* Details */}
      <View style={styles.cardDetails}>
        <View style={styles.detailsTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName} numberOfLines={1}>{item.itemName}</Text>
            <Text style={styles.cardVendor} numberOfLines={1}>{item.vendorName}</Text>
          </View>
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>{item.tag}</Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>${item.price.toFixed(2)}</Text>
          <Text style={styles.originalPrice}>${item.originalPrice.toFixed(2)}</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.pickupBadge}>
            <Text style={styles.pickupText}>⏱ {item.pickupStart}–{item.pickupEnd}</Text>
          </View>
          <View style={styles.rightMeta}>
            <Text style={styles.metaText}>📍 {item.distance}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>📦 {item.quantity} left</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── FavouritesScreen ─────────────────────────────────────────────────────────
export default function FavouritesScreen({
  favourites = new Set(),
  allListings = [],
  onToggleFavourite = () => {},
}) {
  const favListings = allListings.filter((l) => favourites.has(l.id));

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favourites</Text>
        {favListings.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{favListings.length}</Text>
          </View>
        )}
      </View>

      {favListings.length === 0 ? (
        /* Empty state */
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🤍</Text>
          <Text style={styles.emptyTitle}>No favourites yet</Text>
          <Text style={styles.emptySubtitle}>Tap ♡ on a listing to save it here</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {favListings.map((item) => (
            <FavCard
              key={item.id}
              item={item}
              onToggleFavourite={onToggleFavourite}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CARD_RADIUS = 18;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.sage },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100, gap: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: COLORS.charcoal, letterSpacing: -0.5 },
  countBadge: {
    backgroundColor: COLORS.fern,
    borderRadius: 12,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  countText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },

  // Empty
  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80,
  },
  emptyEmoji: { fontSize: 72, marginBottom: 16 },
  emptyTitle: {
    fontSize: 20, fontWeight: '800', color: COLORS.charcoal,
    letterSpacing: -0.3, marginBottom: 8,
  },
  emptySubtitle: { fontSize: 14, color: COLORS.charcoalSoft, fontWeight: '500', textAlign: 'center' },

  // Card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.line,
    shadowColor: COLORS.charcoal,
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardImageArea: {
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardEmoji: { fontSize: 52 },

  discountBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: COLORS.fern,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },

  heartBtn: {
    position: 'absolute', top: 10, right: 12,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center', justifyContent: 'center',
  },
  heartIconActive: { fontSize: 18, color: COLORS.ember },

  // Card details
  cardDetails: { padding: 14, gap: 8 },
  detailsTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardName: { fontSize: 16, fontWeight: '800', color: COLORS.charcoal, letterSpacing: -0.2 },
  cardVendor: { fontSize: 12, color: COLORS.charcoalSoft, fontWeight: '500', marginTop: 2 },

  tagBadge: {
    backgroundColor: 'rgba(31,77,61,0.1)',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
    alignSelf: 'flex-start',
  },
  tagText: { fontSize: 11, fontWeight: '700', color: COLORS.fern },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  price: { fontSize: 19, fontWeight: '800', color: COLORS.charcoal },
  originalPrice: { fontSize: 13, color: COLORS.charcoalSoft, textDecorationLine: 'line-through' },

  metaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6,
  },
  pickupBadge: {
    backgroundColor: 'rgba(240,180,41,0.15)',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  pickupText: { fontSize: 11, fontWeight: '700', color: '#8A5E0C' },
  rightMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: COLORS.charcoalSoft, fontWeight: '600' },
  metaDot: { fontSize: 11, color: COLORS.charcoalSoft },
});
