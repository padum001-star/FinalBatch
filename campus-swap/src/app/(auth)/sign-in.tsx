import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
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
                Campus Swap
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                Grab surplus and near-expiry finds from local businesses at a discount.
              </ThemedText>

              <ThemedView style={styles.form}>
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
                  autoComplete="password"
                  value={password}
                  onChangeText={setPassword}
                />
                {error && (
                  <ThemedText type="small" style={styles.error}>
                    {error}
                  </ThemedText>
                )}
                <AppButton label="Sign in" onPress={handleSubmit} loading={loading} />
              </ThemedView>

              <Link href="/(auth)/sign-up" style={styles.link}>
                <ThemedText type="linkPrimary">Don&apos;t have an account? Sign up</ThemedText>
              </Link>
            </ThemedView>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
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
    fontSize: 36,
    lineHeight: 40,
  },
  subtitle: {
    marginTop: -Spacing.two,
  },
  form: {
    gap: Spacing.three,
  },
  error: {
    color: '#E5484D',
  },
  link: {
    alignSelf: 'center',
  },
});
