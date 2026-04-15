import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, SectionList, RefreshControl, TouchableOpacity,
  TextInput, Animated, StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import { useAuth } from '../../lib/auth';
import ConversationItem from '../../components/ConversationItem';
import BrandGradient from '../../components/BrandGradient';

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[styles.skeletonRow, { opacity: anim }]}>
      <View style={styles.skeletonAvatar} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={[styles.skeletonLine, { width: '45%' }]} />
        <View style={[styles.skeletonLine, { width: '70%', height: 11 }]} />
      </View>
    </Animated.View>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionBadgeText}>{count}</Text>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { hasToken } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Entrance animation
  const headerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const { data, isLoading, refetch } = trpc.messages.conversations.useQuery(undefined, {
    enabled: hasToken,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const markAllRead = trpc.messages.markAllConversationsRead.useMutation({
    onSuccess: () => refetch(),
  });
  const markReadMutation = trpc.messages.markRead.useMutation({
    onSuccess: () => refetch(),
  });

  const conversations = useMemo(() => {
    const raw = (data as any[]) ?? [];
    return raw.map(c => ({
      ...c,
      lastMessageAt: c.lastMessageAt ?? c.updatedAt ?? null,
      lastMessage: c.lastMessage ?? c.lastMessagePreview ?? c.lastMessageContent ?? null,
      unreadCount: c.unreadCount ?? 0,
      name: c.name ?? c.otherUserName ?? null,
    }));
  }, [data]);

  const totalUnread = useMemo(
    () => conversations.reduce((s: number, c: any) => s + (c.unreadCount ?? 0), 0),
    [conversations]
  );

  const sections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? conversations.filter((c: any) => {
          const name = c.name ?? c.participants?.map((p: any) => p.displayName ?? '').join(' ') ?? '';
          return name.toLowerCase().includes(q) || (c.lastMessage ?? '').toLowerCase().includes(q);
        })
      : conversations;

    const channels = filtered.filter((c: any) => c.type === 'channel');
    const dms = filtered.filter((c: any) => c.type !== 'channel');
    const result: { title: string; count: number; data: any[] }[] = [];
    if (channels.length) result.push({ title: 'CHANNELS', count: channels.length, data: channels });
    if (dms.length)      result.push({ title: 'DIRECT MESSAGES', count: dms.length, data: dms });
    return result;
  }, [conversations, searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>

      {/* ── Header ── */}
      <Animated.View style={{ opacity: headerAnim }}>
        <LinearGradient
          colors={['#0D0820', '#0D0D0D']}
          style={[styles.header, { paddingTop: insets.top + 6 }]}
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Messages</Text>
              {totalUnread > 0 && (
                <Text style={styles.headerSub}>
                  {totalUnread} unread message{totalUnread > 1 ? 's' : ''}
                </Text>
              )}
            </View>

            <View style={styles.headerActions}>
              {totalUnread > 0 && (
                <TouchableOpacity
                  onPress={() => { Haptics.selectionAsync(); markAllRead.mutate(); }}
                  style={styles.headerBtn}
                >
                  <Ionicons name="checkmark-done" size={20} color={colors.pink} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => { Haptics.selectionAsync(); router.push('/members?mode=compose' as any); }}
                style={[styles.headerBtn, styles.headerBtnPrimary]}
              >
                <Ionicons name="create-outline" size={19} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Search ── */}
          <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
            <Ionicons name="search" size={16} color={searchFocused ? colors.pink : colors.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search messages..."
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </Animated.View>

      {/* ── Content ── */}
      {isLoading ? (
        <View style={{ paddingTop: 8 }}>
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} />)}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } } as any)}
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                markReadMutation.mutate({ conversationId: item.id });
              }}
            />
          )}
          renderSectionHeader={({ section }) => (
            <SectionHeader title={(section as any).title} count={(section as any).count} />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.pink} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              {searchQuery ? (
                <>
                  <Ionicons name="search-outline" size={52} color={colors.border} />
                  <Text style={styles.emptyTitle}>No results</Text>
                  <Text style={styles.emptyBody}>No conversations match "{searchQuery}"</Text>
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={styles.emptySecondary}
                  >
                    <Text style={styles.emptySecondaryText}>Clear search</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="chatbubbles-outline" size={44} color={colors.pink} />
                  </View>
                  <Text style={styles.emptyTitle}>No conversations yet</Text>
                  <Text style={styles.emptyBody}>
                    Start a conversation with a community member, or join a channel at your next event.
                  </Text>

                  <TouchableOpacity
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push('/members?mode=compose' as any);
                    }}
                    style={styles.emptyCtaPrimary}
                    activeOpacity={0.85}
                  >
                    <BrandGradient style={styles.emptyCtaPrimaryInner}>
                      <Ionicons name="people" size={18} color="#fff" />
                      <Text style={styles.emptyCtaPrimaryText}>Browse Members</Text>
                    </BrandGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push('/(tabs)/events' as any);
                    }}
                    style={styles.emptySecondary}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emptySecondaryText}>See upcoming events</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          }
          stickySectionHeadersEnabled
          removeClippedSubviews
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0820' },

  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  headerSub: { color: colors.pink, fontSize: 12, fontWeight: '600', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  headerBtn: {
    width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${colors.pink}18`,
  },
  headerBtnPrimary: {
    backgroundColor: colors.pink,
  },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1A1A2E', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: '#2D2D44',
  },
  searchBarFocused: { borderColor: `${colors.pink}66` },
  searchInput: { flex: 1, color: colors.text, fontSize: 15 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, paddingTop: 18,
    backgroundColor: colors.bg,
  },
  sectionTitle: {
    color: '#4B5563', fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase',
  },
  sectionBadge: {
    backgroundColor: '#1F1F2E', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  sectionBadgeText: { color: '#6B7280', fontSize: 11, fontWeight: '700' },

  skeletonRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 13 },
  skeletonAvatar: { width: 54, height: 54, borderRadius: 17, backgroundColor: colors.border },
  skeletonLine: { height: 13, borderRadius: 6, backgroundColor: colors.border },

  empty: { alignItems: 'center', paddingTop: 72, paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: `${colors.pink}18`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1, borderColor: `${colors.pink}33`,
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 2, marginBottom: 6 },
  emptyBody: { color: colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyCtaPrimary: {
    alignSelf: 'stretch',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
  },
  emptyCtaPrimaryInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  emptyCtaPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptySecondary: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  emptySecondaryText: { color: colors.pink, fontSize: 14, fontWeight: '600' },
});
