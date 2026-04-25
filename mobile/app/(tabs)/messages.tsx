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
import { FONT } from '../../lib/fonts';
import { useTheme } from '../../lib/theme';

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ theme }: { theme: ReturnType<typeof useTheme> }) {
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
    <Animated.View style={[styles.skeletonRow, { opacity: anim, backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={[styles.skeletonAvatar, { backgroundColor: theme.colors.border }]} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={[styles.skeletonLine, { width: '45%', backgroundColor: theme.colors.border }]} />
        <View style={[styles.skeletonLine, { width: '70%', height: 11, backgroundColor: theme.colors.border }]} />
      </View>
    </Animated.View>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, count }: { title: string; count: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
      <View style={[styles.sectionBadge, { backgroundColor: theme.colors.tintSoft, borderColor: theme.alpha(theme.colors.primary, 0.2) }]}>
        <Text style={[styles.sectionBadgeText, { color: theme.colors.primary }]}>{count}</Text>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const themed = useMemo(() => ({
    screen: theme.colors.background,
    headerGradient: theme.isDark ? ['#18071F', '#10061A', '#080810'] as const : ['#FFF7FC', '#FBEFFC', '#F7EFFA'] as const,
    headerBorder: theme.isDark ? 'rgba(255,255,255,0.05)' : theme.colors.border,
    glow: theme.isDark ? 'rgba(168,85,247,0.12)' : 'rgba(168,85,247,0.08)',
    chipBg: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.72)',
    chipBorder: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.colors.border,
    title: theme.colors.text,
    subtitle: theme.colors.textSecondary,
    mutedStrong: theme.isDark ? '#8B84A7' : theme.colors.textSecondary,
    mutedSoft: theme.isDark ? '#5A5575' : theme.colors.textMuted,
    surface: theme.colors.card,
    surfaceAlt: theme.isDark ? '#120F20' : theme.colors.surfaceHigh,
    surfaceBorder: theme.isDark ? 'rgba(255,255,255,0.05)' : theme.colors.border,
    accentSoft: theme.isDark ? '#EC489920' : 'rgba(236,72,153,0.1)',
    accentBorder: theme.isDark ? '#EC489960' : 'rgba(236,72,153,0.2)',
  }), [theme]);
  const router = useRouter();
  const { hasToken } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Entrance animation - fade + slide from top
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const searchScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(headerTranslateY, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const onSearchFocus = useCallback(() => {
    setSearchFocused(true);
    Animated.spring(searchScale, { toValue: 1.01, useNativeDriver: true, friction: 8 }).start();
  }, []);

  const onSearchBlur = useCallback(() => {
    setSearchFocused(false);
    Animated.spring(searchScale, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
  }, []);

  const { data, isLoading, isError, error, refetch } = trpc.messages.conversations.useQuery(undefined, {
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
    <SafeAreaView style={[styles.container, { backgroundColor: themed.screen }]} edges={['bottom']}>

      {/* ── Header ── */}
      <Animated.View style={{ opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }}>
        <LinearGradient
          colors={themed.headerGradient}
          style={[styles.header, { paddingTop: insets.top + 6, borderBottomColor: themed.headerBorder }]}
        >
          <View style={[styles.headerGlow, { backgroundColor: themed.glow }]} />
          <View style={styles.headerTopline}>
            <View style={[styles.headerEyebrow, { backgroundColor: themed.chipBg, borderColor: themed.chipBorder }]}> 
              <Text style={[styles.headerEyebrowText, { color: theme.isDark ? '#C4B5FD' : theme.colors.secondary }]}>PRIVATE INBOX</Text>
            </View>
            {totalUnread > 0 ? (
              <View style={[styles.headerStatChip, { backgroundColor: themed.accentSoft, borderColor: themed.accentBorder }]}>
                <Text style={[styles.headerStatValue, { color: theme.isDark ? '#F9A8D4' : theme.colors.primary }]}>{totalUnread}</Text>
                <Text style={[styles.headerStatLabel, { color: themed.mutedStrong }]}>unread</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.headerRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.headerTitle, { color: themed.title }]}>Messages</Text>
              <Text style={[styles.headerSubtitle, { color: themed.subtitle }]}>
                Keep the flirtation, planning, and after-hours chatter in one velvet thread.
              </Text>
              {totalUnread > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: themed.accentSoft, borderColor: themed.accentBorder }]}>
                  <Ionicons name="sparkles" size={12} color={theme.colors.primary} />
                  <Text style={[styles.unreadBadgeText, { color: theme.colors.primary }]}>
                    {totalUnread} unread message{totalUnread > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.headerActions}>
              {totalUnread > 0 && (
                <TouchableOpacity
                  onPress={() => { Haptics.selectionAsync(); markAllRead.mutate(); }}
                  style={[styles.headerBtn, { shadowColor: theme.colors.primary }]}
                >
                  <LinearGradient colors={theme.isDark ? ['rgba(236,72,153,0.2)', 'rgba(168,85,247,0.18)'] : ['rgba(236,72,153,0.12)', 'rgba(168,85,247,0.12)']} style={[styles.headerBtnInner, { borderColor: themed.accentBorder }]}>
                    <Ionicons name="checkmark-done" size={18} color={theme.colors.primary} />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Animated.View style={[styles.searchShell, { transform: [{ scale: searchScale }] }]}>
            <View style={[styles.searchBar, { backgroundColor: themed.surface, borderColor: themed.surfaceBorder }, searchFocused && [styles.searchBarFocused, { borderColor: themed.accentBorder, backgroundColor: themed.surfaceAlt }]]}>
              <Ionicons name="search" size={16} color={themed.mutedStrong} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={onSearchFocus}
                onBlur={onSearchBlur}
                placeholder="Search messages..."
                placeholderTextColor={themed.mutedSoft}
                style={[styles.searchInput, { color: themed.title }]}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={themed.mutedStrong} />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </LinearGradient>
      </Animated.View>

      {/* ── Content ── */}
      {isLoading ? (
        <View style={{ paddingTop: 8 }}>
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} theme={theme} />)}
        </View>
      ) : isError ? (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800' }}>Could not load messages</Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 8 }}>{(error as any)?.message ?? 'Please try again.'}</Text>
          <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
            <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Retry</Text>
          </TouchableOpacity>
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
                  <Text style={styles.emptyEmoji}>🔍</Text>
                  <Text style={[styles.emptyTitle, { color: themed.title }]}>No results</Text>
                  <Text style={[styles.emptyBody, { color: themed.mutedSoft }]}>No conversations match &quot;{searchQuery}&quot;</Text>
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={styles.emptySecondary}
                  >
                    <Text style={[styles.emptySecondaryText, { color: theme.colors.primary }]}>Clear search</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={[styles.emptyIconWrap, { backgroundColor: theme.alpha(theme.colors.primary, 0.09), borderColor: theme.alpha(theme.colors.primary, 0.16) }]}>
                    <Text style={styles.emptyEmoji}>💬</Text>
                  </View>
                  <Text style={[styles.emptyTitle, { color: themed.title }]}>No conversations yet</Text>
                  <Text style={[styles.emptyBody, { color: themed.mutedSoft }]}>
                    Start a conversation with a community member, or join a channel at your next event.
                  </Text>

                  <TouchableOpacity
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push({ pathname: '/members', params: { mode: 'compose', returnTo: '/(tabs)/messages' } } as any);
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
                    <Text style={[styles.emptySecondaryText, { color: theme.colors.primary }]}>See upcoming events</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          }
          stickySectionHeadersEnabled
          removeClippedSubviews
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      )}

      {/* ── FAB: New Message ── */}
      <TouchableOpacity
        onPress={() => { Haptics.selectionAsync(); router.push({ pathname: '/members', params: { mode: 'compose', returnTo: '/(tabs)/messages' } } as any); }}
        activeOpacity={0.85}
        style={[styles.fab, { shadowColor: theme.colors.primary }]}
      >
        <LinearGradient
          colors={['#EC4899', '#A855F7']}
          style={styles.fabGradient}
        >
          <Ionicons name="create" size={22} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute',
    top: -40,
    right: -10,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  headerTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerEyebrow: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  headerEyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    fontFamily: FONT.displaySemiBold,
  },
  headerStatChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  headerStatValue: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: FONT.displayBold,
  },
  headerStatLabel: { fontSize: 11, fontWeight: '700' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  headerTitle: {
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: -0.9,
    fontFamily: FONT.displayBold,
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 280,
  },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  headerBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  headerBtnInner: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  unreadBadge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadBadgeText: { fontSize: 11, fontWeight: '800', fontFamily: FONT.displaySemiBold },

  searchShell: {
    borderRadius: 20,
    padding: 1,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 19,
    paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1,
  },
  searchBarFocused: {},
  searchInput: { flex: 1, fontSize: 15 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: FONT.displaySemiBold,
  },
  sectionBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionBadgeText: { fontSize: 11, fontWeight: '800' },

  skeletonRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 13,
    borderBottomWidth: 1,
  },
  skeletonAvatar: { width: 54, height: 54, borderRadius: 17 },
  skeletonLine: { height: 13, borderRadius: 6 },

  empty: { alignItems: 'center', paddingTop: 72, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 4 },
  emptyIconWrap: {
    width: 84, height: 84, borderRadius: 42,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 2, marginBottom: 6, fontFamily: FONT.displayBold },
  emptyBody: { textAlign: 'center', lineHeight: 20, marginBottom: 24 },
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
  emptyCtaPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15, fontFamily: FONT.displaySemiBold },
  emptySecondary: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  emptySecondaryText: { fontSize: 14, fontWeight: '600' },

  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
