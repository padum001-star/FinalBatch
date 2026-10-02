import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { StatusPill } from '@/components/status-pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime, formatPrice } from '@/lib/format';
import { fetchOrdersForBusiness, updateReservationStatus } from '@/lib/api/reservations';
import type { ReservationWithBuyer, ReservationWithListing } from '@/types/database';

type Order = ReservationWithListing & ReservationWithBuyer;

export default function OrdersScreen() {
  const theme = useTheme();
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        if (!profile) {
          setOrders([]);
          return;
        }
        const data = await fetchOrdersForBusiness(profile.id);
        setOrders(data);
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

  async function handleUpdate(order: Order, status: 'ready' | 'completed' | 'cancelled') {
    setUpdatingId(order.id);
    try {
      await updateReservationStatus(order.id, status);
      await load();
    } catch (e) {
      Alert.alert('Could not update order', e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Orders
        </ThemedText>
      </ThemedView>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        ListEmptyComponent={
          !loading ? (
            <ThemedView style={styles.empty}>
              <ThemedText themeColor="textSecondary">No reservations yet.</ThemedText>
            </ThemedView>
          ) : null
        }
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText type="smallBold" style={styles.flexShrink} numberOfLines={1}>
                {item.listing?.title ?? 'Listing'}
              </ThemedText>
              <StatusPill status={item.status} />
            </View>

            <ThemedText type="small" themeColor="textSecondary">
              {item.buyer?.full_name ?? 'Shopper'} {item.buyer?.phone ? `· ${item.buyer.phone}` : ''}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Qty {item.quantity} · {formatPrice(item.total_price)} · Reserved {formatDateTime(item.created_at)}
            </ThemedText>

            {item.status === 'pending' && (
              <View style={styles.actionRow}>
                <AppButton
                  label="Mark ready"
                  onPress={() => handleUpdate(item, 'ready')}
                  loading={updatingId === item.id}
                  style={styles.actionButton}
                />
                <AppButton
                  label="Cancel"
                  variant="danger"
                  onPress={() => handleUpdate(item, 'cancelled')}
                  loading={updatingId === item.id}
                  style={styles.actionButton}
                />
              </View>
            )}
            {item.status === 'ready' && (
              <View style={styles.actionRow}>
                <AppButton
                  label="Mark picked up"
                  onPress={() => handleUpdate(item, 'completed')}
                  loading={updatingId === item.id}
                  style={styles.actionButton}
                />
                <AppButton
                  label="Cancel"
                  variant="danger"
                  onPress={() => handleUpdate(item, 'cancelled')}
                  loading={updatingId === item.id}
                  style={styles.actionButton}
                />
              </View>
            )}
          </ThemedView>
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
  actionRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  actionButton: { flex: 1 },
  empty: { padding: Spacing.five, alignItems: 'center' },
});
