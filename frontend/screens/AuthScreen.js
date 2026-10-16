import React, { useState, useRef, useEffect } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Animated, Easing, Platform, UIManager, LayoutAnimation,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLORS = {
  fern:         '#1F4D3D',
  ember:        '#E85A34',
  sage:         '#F5F7F0',
  card:         '#FFFFFF',
  charcoal:     '#1C2620',
  charcoalSoft: '#5C6B62',
  wheat:        '#F0B429',
  line:         '#E1E7DC',
  error:        '#D93025',
};

export default function AuthScreen({ route, navigation }) {
  // Read which tab to open from the onboarding screen
  const initialMode = route?.params?.initialMode ?? 'signup';

  const [mode, setMode]         = useState(initialMode);
  const pillX                   = useRef(new Animated.Value(initialMode === 'signup' ? 0 : 1)).current;
  const ctaScale                = useRef(new Animated.Value(1)).current;

  // Form state
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  // Error state
  const [errors, setErrors]     = useState({ name: '', email: '', password: '' });

  function switchMode(next) {
    if (next === mode) return;
    setName('');
    setEmail('');
    setPassword('');
    setErrors({ name: '', email: '', password: '' });
    LayoutAnimation.configureNext(
      LayoutAnimation.create(250, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
    );
    Animated.timing(pillX, {
      toValue: next === 'signup' ? 0 : 1,
      duration: 280,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
    setMode(next);
  }

  function pressIn()  { Animated.timing(ctaScale, { toValue: 0.97, duration: 100,  useNativeDriver: true }).start(); }
  function pressOut() { Animated.timing(ctaScale, { toValue: 1,    duration: 120,  useNativeDriver: true }).start(); }

  function validate() {
    const newErrors = { name: '', email: '', password: '' };
    let valid = true;

    if (mode === 'signup' && name.trim().length === 0) {
      newErrors.name = 'Please enter your name.';
      valid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email.trim().length === 0) {
      newErrors.email = 'Email is required.';
      valid = false;
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address (e.g. you@email.com).';
      valid = false;
    }

    if (password.length === 0) {
      newErrors.password = 'Password is required.';
      valid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  }

  function handleSubmit() {
    if (!validate()) return;
    // TODO: POST to /signup or /login Lambda, then navigate based on role (RBAC)
    // For now, navigate to the Home screen to demonstrate the flow
    navigation.replace('Home');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.card}>
        <Text style={styles.brand}>FinalBatch</Text>
        <Text style={styles.sub}>
          {mode === 'signup'
            ? 'Create an account to start claiming food nearby.'
            : 'Welcome back \u2014 log in to see what\u2019s available.'}
        </Text>

        <View style={styles.tabs}>
          <Animated.View
            style={[
              styles.tabBg,
              {
                transform: [
                  { translateX: pillX.interpolate({ inputRange: [0, 1], outputRange: [0, 160] }) },
                ],
              },
            ]}
          />
          <TouchableOpacity style={styles.tab} onPress={() => switchMode('signup')}>
            <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>Sign up</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab} onPress={() => switchMode('login')}>
            <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Log in</Text>
          </TouchableOpacity>
        </View>

        {mode === 'signup' && (
          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={[styles.input, errors.name ? styles.inputError : null]}
              placeholder="Your name"
              placeholderTextColor={COLORS.charcoalSoft}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors((e) => ({ ...e, name: '' }));
              }}
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : null]}
            placeholder="you@email.com"
            placeholderTextColor={COLORS.charcoalSoft}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors((e) => ({ ...e, email: '' }));
            }}
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={[styles.input, errors.password ? styles.inputError : null]}
            placeholder="••••••••"
            placeholderTextColor={COLORS.charcoalSoft}
            secureTextEntry
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors((e) => ({ ...e, password: '' }));
            }}
          />
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
        </View>

        <TouchableOpacity activeOpacity={1} onPressIn={pressIn} onPressOut={pressOut} onPress={handleSubmit}>
          <Animated.View style={[styles.cta, { transform: [{ scale: ctaScale }] }]}>
            <Text style={styles.ctaText}>{mode === 'signup' ? 'Create account' : 'Log in'}</Text>
          </Animated.View>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.ghostBtn}>
          <Text style={styles.ghostBtnText}>Continue with Apple</Text>
        </TouchableOpacity>

        <View style={styles.badge}>
          <View style={styles.dot} />
          <Text style={styles.badgeText}>Vendors near you saved 340 lbs this week</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#E9EDE3', alignItems: 'center', justifyContent: 'center' },
  card:          { width: '100%', maxWidth: 375, flex: 1, backgroundColor: COLORS.sage, padding: 24, paddingTop: 40 },
  brand:         { fontWeight: '800', fontSize: 19, color: COLORS.fern, marginBottom: 6 },
  sub:           { color: COLORS.charcoalSoft, fontSize: 14, marginBottom: 24, lineHeight: 20 },
  tabs:          { flexDirection: 'row', backgroundColor: COLORS.line, borderRadius: 12, padding: 4, marginBottom: 28, position: 'relative' },
  tabBg: {
    position: 'absolute', top: 4, bottom: 4, left: 4, width: 160,
    backgroundColor: COLORS.card, borderRadius: 9, elevation: 2,
    shadowColor: '#142820', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
  },
  tab:           { flex: 1, alignItems: 'center', paddingVertical: 10, zIndex: 1 },
  tabText:       { fontSize: 14, fontWeight: '700', color: COLORS.charcoalSoft },
  tabTextActive: { color: COLORS.fern },
  field:         { marginBottom: 16 },
  label:         { fontSize: 12, fontWeight: '700', color: COLORS.charcoalSoft, marginBottom: 6 },
  input:         { paddingVertical: 13, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1.5, borderColor: COLORS.line, backgroundColor: COLORS.card, fontSize: 15, color: COLORS.charcoal },
  inputError:    { borderColor: COLORS.error },
  errorText:     { marginTop: 5, fontSize: 12, color: COLORS.error, fontWeight: '600' },
  cta:           { marginTop: 8, paddingVertical: 15, borderRadius: 12, backgroundColor: COLORS.ember, alignItems: 'center' },
  ctaText:       { color: '#fff', fontSize: 15, fontWeight: '700' },
  divider:       { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  dividerLine:   { flex: 1, height: 1, backgroundColor: COLORS.line },
  dividerText:   { marginHorizontal: 10, color: COLORS.charcoalSoft, fontSize: 12 },
  ghostBtn:      { paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.line, backgroundColor: COLORS.card, alignItems: 'center' },
  ghostBtnText:  { fontWeight: '700', fontSize: 14, color: COLORS.charcoal },
  badge:         { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(240,180,41,0.18)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 },
  dot:           { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.wheat, marginRight: 8 },
  badgeText:     { fontSize: 12, fontWeight: '700', color: '#8A5E0C' },
});
