import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import type { UserRole } from '@/types/database';

export default function SignUpScreen() {
  const { signUpShopper, signUpBusiness } = useAuth();
  const [role, setRole] = useState<UserRole>('shopper');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const result =
        role === 'shopper'
          ? await signUpShopper({ email: email.trim(), password, fullName: fullName.trim() })
          : await signUpBusiness({
              email: email.trim(),
              password,
              businessName: businessName.trim(),
              address: address.trim(),
              phone: phone.trim() || undefined,
            });

      if (result.needsEmailConfirmation) {
        setNotice('Check your email to confirm your account, then sign in.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: 'padding' })}>
        <SafeAreaView style={styles.flex}>
          <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
            <ThemedView style={styles.container}>
              <ThemedText type="title" style={styles.title}>
                Create account
              </ThemedText>

              <ThemedView type="backgroundElement" style={styles.segmented}>
                <SegmentButton label="I'm shopping" active={role === 'shopper'} onPress={() => setRole('shopper')} />
                <SegmentButton
                  label="I run a business"
                  active={role === 'business'}
                  onPress={() => setRole('business')}
                />
              </ThemedView>

              <ThemedView style={styles.form}>
                {role === 'shopper' ? (
                  <FormField label="Full name" value={fullName} onChangeText={setFullName} />
                ) : (
                  <>
                    <FormField label="Business name" value={businessName} onChangeText={setBusinessName} />
                    <FormField label="Pickup address" value={address} onChangeText={setAddress} />
                    <FormField
                      label="Phone (optional)"
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={setPhone}
                    />
                  </>
                )}
                <FormField
                  label="Email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                />
                <FormField
                  label="Password"
                  secureTextEntry
                  autoComplete="password-new"
                  value={password}
                  onChangeText={setPassword}
                />
                {error && (
                  <ThemedText type="small" style={styles.error}>
                    {error}
                  </ThemedText>
                )}
                {notice && (
                  <ThemedText type="small" style={styles.notice}>
                    {notice}
                  </ThemedText>
                )}
                <AppButton label="Create account" onPress={handleSubmit} loading={loading} />
              </ThemedView>

              <Link href="/(auth)/sign-in" style={styles.link}>
                <ThemedText type="linkPrimary">Already have an account? Sign in</ThemedText>
              </Link>
            </ThemedView>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function SegmentButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.segmentButton}>
      <ThemedView type={active ? 'backgroundSelected' : undefined} style={styles.segmentButtonInner}>
        <ThemedText type="smallBold" themeColor={active ? 'text' : 'textSecondary'}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth / 1.6,
    gap: Spacing.four,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    padding: Spacing.half,
  },
  segmentButton: {
    flex: 1,
  },
  segmentButtonInner: {
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  form: {
    gap: Spacing.three,
  },
  error: {
    color: '#E5484D',
  },
  notice: {
    color: '#1FA971',
  },
  link: {
    alignSelf: 'center',
  },
});
