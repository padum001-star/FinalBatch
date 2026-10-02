import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListingCard } from '@/components/listing-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CATEGORIES } from '@/constants/categories';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchActiveListings, type BrowseFilters } from '@/lib/api/listings';
import type { ListingWithBusiness } from '@/types/database';

type SortOption = BrowseFilters['sort'];

const SORT_OPTIONS: { id: NonNullable<SortOption>; label: string }[] = [
  { id: 'expiring_soon', label: 'Expiring soon' },
  { id: 'newest', label: 'Newest' },
  { id: 'price_low', label: 'Lowest price' },
];

export default function BrowseScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [listings, setListings] = useState<ListingWithBusiness[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<NonNullable<SortOption>>('expiring_soon');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await fetchActiveListings({ search: search || null, category, sort });
        setListings(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load listings');
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [search, category, sort],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Browse
        </ThemedText>
        <TextInput
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => load()}
          placeholder="Search listings"
          placeholderTextColor={theme.textSecondary}
          style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: null, label: 'All' }, ...CATEGORIES]}
          keyExtractor={(item) => item.id ?? 'all'}
          contentContainerStyle={styles.chipRow}
          renderItem={({ item }) => (
            <Chip label={item.label} active={category === item.id} onPress={() => setCategory(item.id)} />
          )}
        />

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SORT_OPTIONS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chipRow}
          renderItem={({ item }) => (
            <Chip label={item.label} active={sort === item.id} onPress={() => setSort(item.id)} />
          )}
        />
      </ThemedView>

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        numColumns={1}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        ListEmptyComponent={
          !loading ? (
            <ThemedView style={styles.empty}>
              <ThemedText themeColor="textSecondary">
                {error ?? 'No listings match right now — check back soon.'}
              </ThemedText>
            </ThemedView>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <ListingCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={active ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.chip}>
        <ThemedText type="small" themeColor={active ? 'text' : 'textSecondary'}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
  },
  search: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  chipRow: {
    gap: Spacing.two,
    paddingVertical: Spacing.half,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.8,
  },
  listContent: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  cardWrapper: {
    width: '100%',
  },
  empty: {
    padding: Spacing.five,
    alignItems: 'center',
  },
});
