import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Animated,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { trpc } from '../../lib/trpc';
import NotificationItem from '../../components/NotificationItem';
import { FONT } from '../../lib/fonts';
import { useTheme } from '../../lib/theme';

function NotificationSkeleton({ theme }: { theme: ReturnType<typeof useTheme> }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeletonRow,
        { opacity, backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border },
      ]}
    >
      <View style={[styles.skeletonIcon, { backgroundColor: theme.colors.border }]} />
      <View style={styles.skeletonBody}>
        <View style={[styles.skeletonLinePrimary, { backgroundColor: theme.colors.border }]} />
        <View style={[styles.skeletonLineSecondary, { backgroundColor: theme.colors.border }]} />
      </View>
    </Animated.View>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const themed = useMemo(
    () => ({
      screen: theme.colors.background,
      headerGradient: theme.isDark
        ? (['#18071F', '#10061A', '#080810'] as const)
        : (['#FFF7FC', '#FBEFFC', '#F7EFFA'] as const),
      headerBorder: theme.isDark ? 'rgba(255,255,255,0.05)' : theme.colors.border,
      eyebrowBg: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.72)',
      eyebrowBorder: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.colors.border,
      eyebrowText: theme.isDark ? '#F9A8D4' : theme.colors.primary,
      glow: theme.isDark ? 'rgba(236,72,153,0.12)' : 'rgba(236,72,153,0.08)',
      miniStatBg: theme.isDark ? 'rgba(168,85,247,0.12)' : 'rgba(168,85,247,0.1)',
      miniStatBorder: theme.isDark ? 'rgba(168,85,247,0.2)' : 'rgba(168,85,247,0.18)',
      miniStatValue: theme.isDark ? '#DDD6FE' : theme.colors.secondary,
      miniStatLabel: theme.colors.textSecondary,
      title: theme.colors.text,
      subtitle: theme.colors.textSecondary,
      bubbleBg: theme.isDark ? 'rgba(236,72,153,0.16)' : 'rgba(236,72,153,0.1)',
      bubbleBorder: theme.isDark ? 'rgba(236,72,153,0.22)' : 'rgba(236,72,153,0.16)',
      bubbleText: theme.isDark ? '#F9A8D4' : theme.colors.primary,
      buttonGradient: theme.isDark
        ? (['rgba(236,72,153,0.18)', 'rgba(168,85,247,0.14)'] as const)
        : (['rgba(236,72,153,0.12)', 'rgba(168,85,247,0.1)'] as const),
      emptyTitle: theme.colors.text,
      emptyBody: theme.colors.textSecondary,
    }),
    [theme]
  );
  const [refreshing, setRefreshing] = useState(false);
  const [locallyReadIds, setLocallyReadIds] = useState<Set<number>>(new Set());

  const { data, isLoading, isError, error, refetch } = trpc.notifications.list.useQuery(undefined, {
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      setLocallyReadIds(new Set());
      refetch();
    },
  });
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => refetch(),
  });

  const handleMarkRead = useCallback(
    (id: number) => {
      setLocallyReadIds((prev) => new Set(prev).add(id));
      markRead.mutate({ id });
    },
    [markRead]
  );

  const notifications = useMemo(() => (data as any[]) ?? [], [data]);
  const visibleNotifications = useMemo(
    () => notifications.filter((n: any) => !locallyReadIds.has(n.id)),
    [notifications, locallyReadIds]
  );
  const unreadCount = useMemo(
    () => notifications.filter((n: any) => !n.readAt && !locallyReadIds.has(n.id)).length,
    [notifications, locallyReadIds]
  );

  const renderNotification = useCallback(
    ({ item }: { item: any }) => (
      <View style={{ opacity: item.readAt ? 0.5 : 1 }}>
        <NotificationItem notification={item} onMarkRead={handleMarkRead} />
      </View>
    ),
    [handleMarkRead]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themed.screen }]}
      edges={['bottom', 'left', 'right']}
    >
      <LinearGradient
        colors={themed.headerGradient}
        style={[
          styles.header,
          { paddingTop: insets.top + 12, borderBottomColor: themed.headerBorder },
        ]}
      >
        <View style={[styles.headerGlow, { backgroundColor: themed.glow }]} />
        <View style={styles.headerTopline}>
          <View
            style={[
              styles.eyebrowPill,
              { backgroundColor: themed.eyebrowBg, borderColor: themed.eyebrowBorder },
            ]}
          >
            <Text style={[styles.eyebrowText, { color: themed.eyebrowText }]}>AFTER DARK</Text>
          </View>
          <View
            style={[
              styles.headerMiniStat,
              { backgroundColor: themed.miniStatBg, borderColor: themed.miniStatBorder },
            ]}
          >
            <Text style={[styles.headerMiniValue, { color: themed.miniStatValue }]}>
              {unreadCount}
            </Text>
            <Text style={[styles.headerMiniLabel, { color: themed.miniStatLabel }]}>fresh</Text>
          </View>
        </View>

        <View style={styles.headerRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[styles.headerTitle, { color: themed.title }]}>Alerts</Text>
            <Text style={[styles.headerSubtitle, { color: themed.subtitle }]}>
              RSVPs, mentions, and little sparks from the community land here first.
            </Text>
          </View>
          {unreadCount > 0 && (
            <View
              style={[
                styles.unreadBubble,
                { backgroundColor: themed.bubbleBg, borderColor: themed.bubbleBorder },
              ]}
            >
              <Text style={[styles.unreadBubbleText, { color: themed.bubbleText }]}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            markAllRead.mutate();
          }}
          disabled={markAllRead.isPending || unreadCount === 0}
          activeOpacity={0.8}
          style={[styles.markAllBtn, unreadCount === 0 && styles.markAllBtnDisabled]}
        >
          <LinearGradient
            colors={themed.buttonGradient}
            style={[styles.markAllInner, { borderColor: themed.bubbleBorder }]}
          >
            <Ionicons name="checkmark-done" size={16} color={theme.colors.primary} />
            <Text style={[styles.markAllText, { color: theme.colors.primary }]}>Mark all read</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {isLoading ? (
        <View>
          <NotificationSkeleton theme={theme} />
          <NotificationSkeleton theme={theme} />
          <NotificationSkeleton theme={theme} />
          <NotificationSkeleton theme={theme} />
        </View>
      ) : isError ? (
        <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
          <Text style={[styles.emptyTitle, { color: themed.emptyTitle }]}>
            Could not load alerts
          </Text>
          <Text style={[styles.emptyBody, { color: themed.emptyBody }]}>
            {(error as any)?.message ?? 'Please try again.'}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{
              marginTop: 16,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={visibleNotifications}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={renderNotification}
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={5}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🔔</Text>
              <Text style={[styles.emptyTitle, { color: themed.emptyTitle }]}>
                You&apos;re all caught up!
              </Text>
              <Text style={[styles.emptyBody, { color: themed.emptyBody }]}>
                We&apos;ll let you know when something happens
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute',
    top: -44,
    left: -10,
    width: 170,
    height: 170,
    borderRadius: 85,
  },
  headerTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  eyebrowPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    fontFamily: FONT.displaySemiBold,
  },
  headerMiniStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  headerMiniValue: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: FONT.displayBold,
  },
  headerMiniLabel: { fontSize: 11, fontWeight: '700' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  headerTitle: {
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: -0.9,
    fontFamily: FONT.displayBold,
  },
  headerSubtitle: { fontSize: 13, lineHeight: 20, marginTop: 8, maxWidth: 280 },
  unreadBubble: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  unreadBubbleText: { fontSize: 13, fontWeight: '800', fontFamily: FONT.displaySemiBold },
  markAllBtn: { alignSelf: 'flex-start', borderRadius: 16, overflow: 'hidden' },
  markAllBtnDisabled: { opacity: 0.45 },
  markAllInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderRadius: 16,
  },
  markAllText: { fontSize: 13, fontWeight: '800', fontFamily: FONT.displaySemiBold },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  skeletonIcon: { width: 40, height: 40, borderRadius: 20 },
  skeletonBody: { marginLeft: 12, gap: 8, flex: 1 },
  skeletonLinePrimary: { width: '60%', height: 12, borderRadius: 6 },
  skeletonLineSecondary: { width: '85%', height: 10, borderRadius: 5 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: FONT.displayBold,
  },
  emptyBody: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 21,
  },
});
