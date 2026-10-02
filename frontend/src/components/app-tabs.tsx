import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { useAuth } from '@/context/auth-context';
import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { profile } = useAuth();
  const isBusiness = profile?.role === 'business';

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Browse</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="storefront" md="storefront" />
      </NativeTabs.Trigger>

      {isBusiness ? (
        <NativeTabs.Trigger name="my-listings">
          <NativeTabs.Trigger.Label>My listings</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="list.bullet.rectangle" md="list_alt" />
        </NativeTabs.Trigger>
      ) : (
        <NativeTabs.Trigger name="my-listings" hidden />
      )}

      {isBusiness ? (
        <NativeTabs.Trigger name="orders">
          <NativeTabs.Trigger.Label>Orders</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="bag" md="shopping_bag" />
        </NativeTabs.Trigger>
      ) : (
        <NativeTabs.Trigger name="orders" hidden />
      )}

      {!isBusiness ? (
        <NativeTabs.Trigger name="reservations">
          <NativeTabs.Trigger.Label>Reservations</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="bag" md="receipt_long" />
        </NativeTabs.Trigger>
      ) : (
        <NativeTabs.Trigger name="reservations" hidden />
      )}

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.circle" md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
