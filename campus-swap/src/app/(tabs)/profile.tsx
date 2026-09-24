import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { DEMO_MODE } from '@/lib/demo/demo-mode';

export default function ProfileScreen() {
  const theme = useTheme();
  const { session, profile, updateProfile, signOut, switchDemoRole } = useAuth();
  const isBusiness = profile?.role === 'business';

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [businessName, setBusinessName] = useState(profile?.business_name ?? '');
  const [address, setAddress] = useState(profile?.address ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);

  // These fields seed from `profile`, which arrives (and, in demo mode, changes
  // when you switch roles) after this screen has already mounted. Re-seed when
  // the identity changes -- adjusting state during render is React's supported
  // pattern here and avoids a cascading-render effect.
  const [seededProfileId, setSeededProfileId] = useState(profile?.id);
  if (profile && profile.id !== seededProfileId) {
    setSeededProfileId(profile.id);
    setFullName(profile.full_name ?? '');
    setBusinessName(profile.business_name ?? '');
    setAddress(profile.address ?? '');
    setPhone(profile.phone ?? '');
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateProfile(
        isBusiness
          ? { business_name: businessName.trim(), address: address.trim(), phone: phone.trim() || null }
          : { full_name: fullName.trim() },
      );
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (e) {
      Alert.alert('Could not sign out', e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView style={styles.container}>
          <ThemedText type="title" style={styles.title}>
            Profile
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="small" themeColor="textSecondary">
              Signed in as
            </ThemedText>
            <ThemedText type="smallBold">{session?.user.email}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {isBusiness ? 'Business account' : 'Shopper account'}
            </ThemedText>
          </ThemedView>

          {DEMO_MODE && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">Demo mode</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                No backend attached. Edits live in memory and reset when you reload the app.
              </ThemedText>
              <AppButton
                label={isBusiness ? 'Switch to shopper view' : 'Switch to business view'}
                variant="secondary"
                onPress={() => switchDemoRole(isBusiness ? 'shopper' : 'business')}
              />
            </ThemedView>
          )}

          <ThemedView style={styles.form}>
            {isBusiness ? (
              <>
                <FormField label="Business name" value={businessName} onChangeText={setBusinessName} />
                <FormField label="Pickup address" value={address} onChangeText={setAddress} />
                <FormField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              </>
            ) : (
              <FormField label="Full name" value={fullName} onChangeText={setFullName} />
            )}
            <AppButton label="Save changes" onPress={handleSave} loading={saving} />
          </ThemedView>

          <AppButton label="Sign out" variant="secondary" onPress={handleSignOut} />
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth / 1.6,
    gap: Spacing.four,
  },
  title: { fontSize: 28, lineHeight: 32 },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.half },
  form: { gap: Spacing.three },
});
