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

function NotificationSkeleton() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.skeletonRow, { opacity }]}>
      <View style={styles.skeletonIcon} />
      <View style={styles.skeletonBody}>
        <View style={styles.skeletonLinePrimary} />
        <View style={styles.skeletonLineSecondary} />
      </View>
    </Animated.View>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [locallyReadIds, setLocallyReadIds] = useState<Set<number>>(new Set());

  const { data, isLoading, refetch } = trpc.notifications.list.useQuery(undefined, {
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => { setLocallyReadIds(new Set()); refetch(); },
  });
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => refetch(),
  });

  const handleMarkRead = useCallback((id: number) => {
    setLocallyReadIds((prev) => new Set(prev).add(id));
    markRead.mutate({ id });
  }, [markRead]);

  const notifications = (data as any[]) ?? [];
  const visibleNotifications = useMemo(
    () => notifications.filter((n: any) => !locallyReadIds.has(n.id)),
    [notifications, locallyReadIds],
  );
  const unreadCount = useMemo(
    () => notifications.filter((n: any) => !n.readAt && !locallyReadIds.has(n.id)).length,
    [notifications, locallyReadIds],
  );

  const renderNotification = useCallback(
    ({ item }: { item: any }) => (
      <View style={{ opacity: item.readAt ? 0.5 : 1 }}>
        <NotificationItem notification={item} onMarkRead={handleMarkRead} />
      </View>
    ),
    [handleMarkRead],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <LinearGradient
        colors={['#18071F', '#10061A', '#080810']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerGlow} />
        <View style={styles.headerTopline}>
          <View style={styles.eyebrowPill}>
            <Text style={styles.eyebrowText}>AFTER DARK</Text>
          </View>
          <View style={styles.headerMiniStat}>
            <Text style={styles.headerMiniValue}>{unreadCount}</Text>
            <Text style={styles.headerMiniLabel}>fresh</Text>
          </View>
        </View>

        <View style={styles.headerRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.headerTitle}>Alerts</Text>
            <Text style={styles.headerSubtitle}>
              RSVPs, mentions, and little sparks from the community land here first.
            </Text>
          </View>
          {unreadCount > 0 && (
            <View style={styles.unreadBubble}>
              <Text style={styles.unreadBubbleText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
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
          <LinearGradient colors={['rgba(236,72,153,0.18)', 'rgba(168,85,247,0.14)']} style={styles.markAllInner}>
            <Ionicons name="checkmark-done" size={16} color="#EC4899" />
            <Text style={styles.markAllText}>Mark all read</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {isLoading ? (
        <View>
          <NotificationSkeleton />
          <NotificationSkeleton />
          <NotificationSkeleton />
          <NotificationSkeleton />
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
              tintColor="#EC4899"
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🔔</Text>
              <Text style={styles.emptyTitle}>
                You're all caught up!
              </Text>
              <Text style={styles.emptyBody}>
                We'll let you know when something happens
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080810' },
  header: {
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute',
    top: -44,
    left: -10,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(236,72,153,0.12)',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  eyebrowText: {
    color: '#F9A8D4',
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
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.2)',
  },
  headerMiniValue: {
    color: '#DDD6FE',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: FONT.displayBold,
  },
  headerMiniLabel: { color: '#A09CB8', fontSize: 11, fontWeight: '700' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  headerTitle: {
    color: '#F1F0FF',
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: -0.9,
    fontFamily: FONT.displayBold,
  },
  headerSubtitle: { color: '#A09CB8', fontSize: 13, lineHeight: 20, marginTop: 8, maxWidth: 280 },
  unreadBubble: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(236,72,153,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EC4899',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  unreadBubbleText: { color: '#F9A8D4', fontSize: 13, fontWeight: '800', fontFamily: FONT.displaySemiBold },
  markAllBtn: { alignSelf: 'flex-start', borderRadius: 16, overflow: 'hidden' },
  markAllBtnDisabled: { opacity: 0.45 },
  markAllInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.18)',
    borderRadius: 16,
  },
  markAllText: { color: '#EC4899', fontSize: 13, fontWeight: '800', fontFamily: FONT.displaySemiBold },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomColor: '#1A1A30',
    borderBottomWidth: 1,
    backgroundColor: '#10101C',
  },
  skeletonIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A1A30' },
  skeletonBody: { marginLeft: 12, gap: 8, flex: 1 },
  skeletonLinePrimary: { width: '60%', height: 12, borderRadius: 6, backgroundColor: '#1A1A30' },
  skeletonLineSecondary: { width: '85%', height: 10, borderRadius: 5, backgroundColor: '#1A1A30' },
  emptyTitle: {
    color: '#F1F0FF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: FONT.displayBold,
  },
  emptyBody: {
    color: '#8B84A7',
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 21,
  },
});
