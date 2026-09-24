import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { ListingCard } from '@/components/listing-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { archiveListing, fetchMyListings, reactivateListing } from '@/lib/api/listings';
import type { Listing } from '@/types/database';

export default function MyListingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { profile } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!profile) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await fetchMyListings(profile.id);
        setListings(data);
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

  async function handleToggleStatus(listing: Listing) {
    try {
      if (listing.status === 'archived') {
        await reactivateListing(listing.id);
      } else {
        await archiveListing(listing.id);
      }
      await load();
    } catch (e) {
      Alert.alert('Could not update listing', e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          My listings
        </ThemedText>
        <AppButton label="New listing" onPress={() => router.push('/listing/new')} />
      </ThemedView>

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        ListEmptyComponent={
          !loading ? (
            <ThemedView style={styles.empty}>
              <ThemedText themeColor="textSecondary">
                No listings yet — post your first surplus item.
              </ThemedText>
            </ThemedView>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <ListingCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} showStatus />
            <Pressable onPress={() => handleToggleStatus(item)} style={styles.toggleLink}>
              <ThemedText type="link" themeColor="textSecondary">
                {item.status === 'archived' ? 'Reactivate' : 'Archive'}
              </ThemedText>
            </Pressable>
          </View>
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
    gap: Spacing.three,
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
  cardWrapper: { width: '100%', gap: Spacing.one },
  toggleLink: { alignSelf: 'flex-end' },
  empty: { padding: Spacing.five, alignItems: 'center' },
});
