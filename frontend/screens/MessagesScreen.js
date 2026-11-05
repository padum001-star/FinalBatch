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

// Mock message threads
const MOCK_THREADS = [];

function ThreadItem({ thread }) {
  return (
    <TouchableOpacity style={styles.thread} activeOpacity={0.7}>
      {/* Avatar */}
      <View style={styles.threadAvatar}>
        <Text style={styles.threadEmoji}>{thread.vendorEmoji}</Text>
        {thread.unread && <View style={styles.unreadDot} />}
      </View>

      {/* Content */}
      <View style={styles.threadContent}>
        <View style={styles.threadTopRow}>
          <Text style={[styles.threadName, thread.unread && styles.threadNameUnread]} numberOfLines={1}>
            {thread.vendorName}
          </Text>
          <Text style={[styles.threadTime, thread.unread && styles.threadTimeUnread]}>
            {thread.timeAgo}
          </Text>
        </View>
        <Text
          style={[styles.threadPreview, thread.unread && styles.threadPreviewUnread]}
          numberOfLines={2}
        >
          {thread.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function MessagesScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>0 new</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Section label */}
        <Text style={styles.sectionLabel}>Recent</Text>

        {/* Threads */}
        <View style={styles.threadList}>
          {MOCK_THREADS.map((thread, index) => (
            <React.Fragment key={thread.id}>
              <ThreadItem thread={thread} />
              {index < MOCK_THREADS.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Footer hint */}
        <View style={styles.hintBox}>
          <Text style={styles.hintEmoji}>💬</Text>
          <Text style={styles.hintText}>
            Messages from vendors about your pickups will appear here.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.sage },
  scroll: { paddingBottom: 100 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: COLORS.charcoal, letterSpacing: -0.5 },
  headerBadge: {
    backgroundColor: COLORS.ember,
    borderRadius: 12,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  headerBadgeText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },

  // Section label
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.charcoalSoft,
    letterSpacing: 0.8, textTransform: 'uppercase',
    paddingHorizontal: 22, marginBottom: 8,
  },

  // Thread list
  threadList: {
    marginHorizontal: 20,
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
  thread: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 14,
  },

  // Avatar
  threadAvatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: COLORS.sage,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  threadEmoji: { fontSize: 24 },
  unreadDot: {
    position: 'absolute', top: 1, right: 1,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: COLORS.ember,
    borderWidth: 2, borderColor: COLORS.card,
  },

  // Content
  threadContent: { flex: 1, gap: 4 },
  threadTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  threadName: {
    flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.charcoal, letterSpacing: -0.1,
  },
  threadNameUnread: { fontWeight: '800' },
  threadTime: { fontSize: 12, color: COLORS.charcoalSoft, fontWeight: '500' },
  threadTimeUnread: { color: COLORS.ember, fontWeight: '700' },
  threadPreview: { fontSize: 13, color: COLORS.charcoalSoft, lineHeight: 18, fontWeight: '400' },
  threadPreviewUnread: { color: COLORS.charcoal, fontWeight: '600' },

  divider: { height: 1, backgroundColor: COLORS.line, marginLeft: 80 },

  // Hint
  hintBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginTop: 24,
    backgroundColor: 'rgba(31,77,61,0.07)',
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 14,
  },
  hintEmoji: { fontSize: 20 },
  hintText: { flex: 1, fontSize: 13, color: COLORS.charcoalSoft, lineHeight: 18, fontWeight: '500' },
});
