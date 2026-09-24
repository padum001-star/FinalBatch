import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { StatusPill } from '@/components/status-pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime, formatPrice } from '@/lib/format';
import { fetchMyReservations, updateReservationStatus } from '@/lib/api/reservations';
import type { ReservationWithListing } from '@/types/database';

export default function ReservationsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { profile } = useAuth();
  const [reservations, setReservations] = useState<ReservationWithListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        if (!profile) {
          setReservations([]);
          return;
        }
        const data = await fetchMyReservations(profile.id);
        setReservations(data);
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [profile],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleCancel(reservation: ReservationWithListing) {
    setCancellingId(reservation.id);
    try {
      await updateReservationStatus(reservation.id, 'cancelled');
      await load();
    } catch (e) {
      Alert.alert('Could not cancel', e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Reservations
        </ThemedText>
      </ThemedView>

      <FlatList
        data={reservations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        ListEmptyComponent={
          !loading ? (
            <ThemedView style={styles.empty}>
              <ThemedText themeColor="textSecondary">
                No reservations yet — browse the marketplace to grab a deal.
              </ThemedText>
            </ThemedView>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => item.listing && router.push(`/listing/${item.listing.id}`)}>
            <ThemedView type="backgroundElement" style={styles.card}>
              <View style={styles.cardHeader}>
                <ThemedText type="smallBold" style={styles.flexShrink} numberOfLines={1}>
                  {item.listing?.title ?? 'Listing no longer available'}
                </ThemedText>
                <StatusPill status={item.status} />
              </View>

              <ThemedText type="small" themeColor="textSecondary">
                Qty {item.quantity} · {formatPrice(item.total_price)} · Reserved {formatDateTime(item.created_at)}
              </ThemedText>

              {item.listing?.pickup_notes && (
                <ThemedText type="small" themeColor="textSecondary">
                  {item.listing.pickup_notes}
                </ThemedText>
              )}

              {(item.status === 'pending' || item.status === 'ready') && (
                <View style={styles.actionRow}>
                  <AppButton
                    label="Cancel reservation"
                    variant="danger"
                    onPress={() => handleCancel(item)}
                    loading={cancellingId === item.id}
                  />
                </View>
              )}
            </ThemedView>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  title: { fontSize: 28, lineHeight: 32 },
  listContent: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  flexShrink: { flexShrink: 1 },
  actionRow: { marginTop: Spacing.two },
  empty: { padding: Spacing.five, alignItems: 'center' },
});
