import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { StatusPill } from '@/components/status-pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { categoryLabel } from '@/constants/categories';
import { AccentColors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { discountPercent, formatDateTime, formatPrice, formatTimeLeft, isExpired } from '@/lib/format';
import { createReservation } from '@/lib/api/reservations';
import { fetchListingById } from '@/lib/api/listings';
import type { ListingWithBusiness } from '@/types/database';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [listing, setListing] = useState<ListingWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [reserving, setReserving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchListingById(id);
      setListing(data);
      setQuantity(1);
    } catch {
      setListing(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading || !listing) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText themeColor="textSecondary">{loading ? 'Loading…' : 'Listing not found'}</ThemedText>
      </ThemedView>
    );
  }

  const expired = isExpired(listing.expires_at);
  const soldOut = listing.status === 'sold_out' || listing.quantity_available <= 0;
  const canReserve = profile?.role === 'shopper' && listing.status === 'active' && !expired && !soldOut;
  const percentOff = discountPercent(listing.original_price, listing.discounted_price);

  async function handleReserve() {
    if (!listing) return;
    setReserving(true);
    try {
      await createReservation(listing.id, quantity);
      Alert.alert('Reserved!', 'Show up during pickup hours and pay in person.', [
        { text: 'View my reservations', onPress: () => router.replace('/(tabs)/reservations') },
      ]);
      await load();
    } catch (e) {
      Alert.alert('Could not reserve', e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setReserving(false);
    }
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      {listing.image_urls[0] ? (
        <Image source={{ uri: listing.image_urls[0] }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <ThemedText themeColor="textSecondary">No photo</ThemedText>
        </View>
      )}

      <ThemedView style={styles.body}>
        <View style={styles.titleRow}>
          <ThemedText type="subtitle" style={styles.flexShrink}>
            {listing.title}
          </ThemedText>
          <StatusPill status={listing.status} />
        </View>

        {listing.business?.business_name && (
          <ThemedText themeColor="textSecondary">{listing.business.business_name}</ThemedText>
        )}
        {listing.business?.address && (
          <ThemedText type="small" themeColor="textSecondary">
            📍 {listing.business.address}
          </ThemedText>
        )}

        <View style={styles.priceRow}>
          <ThemedText type="title" style={{ color: AccentColors.success, fontSize: 32, lineHeight: 36 }}>
            {formatPrice(listing.discounted_price)}
          </ThemedText>
          {listing.original_price > listing.discounted_price && (
            <ThemedText themeColor="textSecondary" style={styles.strikethrough}>
              {formatPrice(listing.original_price)}
            </ThemedText>
          )}
          {percentOff > 0 && (
            <ThemedText type="smallBold" style={{ color: AccentColors.success }}>
              {percentOff}% off
            </ThemedText>
          )}
        </View>

        <View style={styles.metaGrid}>
          <MetaItem label="Category" value={categoryLabel(listing.category)} />
          <MetaItem
            label="Best by"
            value={formatDateTime(listing.expires_at)}
            valueColor={expired ? AccentColors.danger : AccentColors.warning}
          />
          <MetaItem label="Time left" value={formatTimeLeft(listing.expires_at)} />
          <MetaItem label="Available" value={`${listing.quantity_available} of ${listing.quantity_total}`} />
        </View>

        {listing.description && (
          <ThemedView style={styles.section}>
            <ThemedText type="smallBold">Description</ThemedText>
            <ThemedText>{listing.description}</ThemedText>
          </ThemedView>
        )}

        {listing.pickup_notes && (
          <ThemedView style={styles.section}>
            <ThemedText type="smallBold">Pickup details</ThemedText>
            <ThemedText>{listing.pickup_notes}</ThemedText>
          </ThemedView>
        )}

        {canReserve && (
          <ThemedView type="backgroundElement" style={styles.reserveBox}>
            <ThemedText type="smallBold">Quantity</ThemedText>
            <View style={styles.stepper}>
              <StepperButton label="−" onPress={() => setQuantity((q) => Math.max(1, q - 1))} />
              <ThemedText type="subtitle">{quantity}</ThemedText>
              <StepperButton
                label="+"
                onPress={() => setQuantity((q) => Math.min(listing.quantity_available, q + 1))}
              />
            </View>
            <ThemedText themeColor="textSecondary" type="small">
              Total: {formatPrice(listing.discounted_price * quantity)}
            </ThemedText>
            <AppButton label="Reserve for pickup" onPress={handleReserve} loading={reserving} />
          </ThemedView>
        )}

        {!canReserve && profile?.role === 'shopper' && (
          <ThemedText themeColor="textSecondary" style={styles.unavailable}>
            {expired ? 'This listing has expired.' : soldOut ? 'Sold out.' : 'This listing is not available.'}
          </ThemedText>
        )}
      </ThemedView>
    </ScrollView>
  );
}

function MetaItem({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.metaItem}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </ThemedText>
    </View>
  );
}

function StepperButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.stepperButton, pressed && { opacity: 0.7 }]}>
      <ThemedText type="title" style={styles.stepperLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: Spacing.six },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', aspectRatio: 16 / 10 },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: Spacing.four, gap: Spacing.three },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.two },
  flexShrink: { flexShrink: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  strikethrough: { textDecorationLine: 'line-through' },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four },
  metaItem: { gap: 2, minWidth: 120 },
  section: { gap: Spacing.one },
  reserveBox: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four, alignSelf: 'center' },
  stepperButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepperLabel: { fontSize: 28, lineHeight: 32 },
  unavailable: { textAlign: 'center' },
});
