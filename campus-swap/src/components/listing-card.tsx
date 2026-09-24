import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { StatusPill } from '@/components/status-pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { categoryLabel } from '@/constants/categories';
import { AccentColors, Spacing } from '@/constants/theme';
import { discountPercent, formatPrice, formatTimeLeft, isExpired } from '@/lib/format';
import type { Listing, ListingWithBusiness } from '@/types/database';

export function ListingCard({
  listing,
  onPress,
  showStatus,
}: {
  listing: Listing | ListingWithBusiness;
  onPress: () => void;
  showStatus?: boolean;
}) {
  const business = 'business' in listing ? listing.business : null;
  const percentOff = discountPercent(listing.original_price, listing.discounted_price);
  const expired = isExpired(listing.expires_at);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.imageWrapper}>
          {listing.image_urls[0] ? (
            <Image source={{ uri: listing.image_urls[0] }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <ThemedText type="small" themeColor="textSecondary">
                No photo
              </ThemedText>
            </View>
          )}
          {percentOff > 0 && (
            <View style={styles.discountBadge}>
              <ThemedText type="smallBold" style={styles.discountText}>
                {percentOff}% off
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {listing.title}
          </ThemedText>
          {business?.business_name && (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {business.business_name}
            </ThemedText>
          )}

          <View style={styles.priceRow}>
            <ThemedText type="smallBold" style={{ color: AccentColors.success }}>
              {formatPrice(listing.discounted_price)}
            </ThemedText>
            {listing.original_price > listing.discounted_price && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.strikethrough}>
                {formatPrice(listing.original_price)}
              </ThemedText>
            )}
          </View>

          <View style={styles.metaRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {categoryLabel(listing.category)}
            </ThemedText>
            <ThemedText type="small" style={{ color: expired ? AccentColors.danger : AccentColors.warning }}>
              {formatTimeLeft(listing.expires_at)}
            </ThemedText>
          </View>

          {showStatus && (
            <View style={styles.statusRow}>
              <StatusPill status={listing.status} />
              <ThemedText type="small" themeColor="textSecondary">
                {listing.quantity_available}/{listing.quantity_total} left
              </ThemedText>
            </View>
          )}
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.8,
  },
  card: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 10,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    backgroundColor: AccentColors.success,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.five,
  },
  discountText: {
    color: '#ffffff',
  },
  body: {
    padding: Spacing.three,
    gap: Spacing.half,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
});
