import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AccentColors, Spacing } from '@/constants/theme';
import type { ListingStatus, ReservationStatus } from '@/types/database';

const CONFIG: Record<ListingStatus | ReservationStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: AccentColors.success },
  sold_out: { label: 'Sold out', color: AccentColors.warning },
  archived: { label: 'Archived', color: AccentColors.danger },
  pending: { label: 'Pending pickup', color: AccentColors.warning },
  ready: { label: 'Ready for pickup', color: AccentColors.primary },
  completed: { label: 'Completed', color: AccentColors.success },
  cancelled: { label: 'Cancelled', color: AccentColors.danger },
};

export function StatusPill({ status }: { status: ListingStatus | ReservationStatus }) {
  const config = CONFIG[status];

  return (
    <View style={[styles.pill, { backgroundColor: `${config.color}22` }]}>
      <ThemedText type="small" style={{ color: config.color, fontWeight: '700' }}>
        {config.label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.five,
  },
});
