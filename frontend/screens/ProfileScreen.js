import { useSession } from '../src/state/Session';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const COLORS = {
  fern:         '#1F4D3D',
  ember:        '#E85A34',
  sage:         '#F5F7F0',
  card:         '#FFFFFF',
  charcoal:     '#1C2620',
  charcoalSoft: '#5C6B62',
  wheat:        '#F0B429',
  line:         '#E1E7DC',
};

// ─── Row ─────────────────────────────────────────────────────────────────────
function SettingsRow({ icon, label, destructive, onPress }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
      {!destructive && <Text style={styles.rowChevron}>›</Text>}
    </TouchableOpacity>
  );
}

// ─── Section block ────────────────────────────────────────────────────────────
function SettingsSection({ title, children }) {
  return (
    <View style={styles.sectionWrapper}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

// ─── ProfileScreen ────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { user, signOut, favourites } = useSession();
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Avatar + user info */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{user?.name?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          <Text style={styles.userEmail}>{user?.role === 'admin' ? 'Administrator' : 'Member'}</Text>
        </View>

        <Text style={[styles.userEmail, { textAlign: 'center', marginBottom: 24 }]}>{favourites.size} favourite places</Text>
        {/* Sign out */}
        <SettingsSection>
          <SettingsRow icon="🚪" label="Sign out" destructive onPress={signOut} />
        </SettingsSection>

        {/* Footer */}
        <Text style={styles.footer}>FinalBatch v1.0.0 · Made with 🌱</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.sage },
  scroll: { paddingBottom: 100 },

  // Header
  header: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 4,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: COLORS.charcoal, letterSpacing: -0.5 },

  // Avatar section
  avatarSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.fern,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowColor: COLORS.fern,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  avatarLetter: { fontSize: 32, fontWeight: '800', color: COLORS.sage },
  userName: { fontSize: 20, fontWeight: '800', color: COLORS.charcoal, letterSpacing: -0.3 },
  userEmail: { fontSize: 13, color: COLORS.charcoalSoft, fontWeight: '500', marginTop: 4 },
  editAvatarBtn: {
    marginTop: 12,
    paddingHorizontal: 18, paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.fern,
  },
  editAvatarText: { fontSize: 13, fontWeight: '700', color: COLORS.fern },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingVertical: 16,
    shadowColor: COLORS.charcoal,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statNumber: { fontSize: 18, fontWeight: '800', color: COLORS.charcoal, letterSpacing: -0.3 },
  statLabel: { fontSize: 11, color: COLORS.charcoalSoft, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: COLORS.line },

  // Settings section
  sectionWrapper: { marginHorizontal: 20, marginBottom: 16 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: COLORS.charcoalSoft,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: 8, paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    overflow: 'hidden',
    shadowColor: COLORS.charcoal,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 14,
  },
  rowIcon: { fontSize: 18, width: 28, textAlign: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.charcoal },
  rowLabelDestructive: { color: COLORS.ember },
  rowChevron: { fontSize: 20, color: COLORS.charcoalSoft, fontWeight: '300' },
  rowDivider: { height: 1, backgroundColor: COLORS.line, marginLeft: 58 },

  // Footer
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.charcoalSoft,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 8,
  },
});
