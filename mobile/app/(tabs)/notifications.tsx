import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { trpc } from '../../lib/trpc';
import NotificationItem from '../../components/NotificationItem';

// ── Skeleton loader ───────────────────────────────────────────────────────────
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
    <Animated.View
      style={{
        opacity,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomColor: '#1A1A30',
        borderBottomWidth: 1,
        backgroundColor: '#10101C',
      }}
    >
      {/* Icon circle */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: '#1A1A30',
        }}
      />
      <View style={{ marginLeft: 12, gap: 8, flex: 1 }}>
        <View style={{ width: '60%', height: 12, borderRadius: 6, backgroundColor: '#1A1A30' }} />
        <View style={{ width: '85%', height: 10, borderRadius: 5, backgroundColor: '#1A1A30' }} />
      </View>
    </Animated.View>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = trpc.notifications.list.useQuery(undefined, {
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => refetch(),
  });

  const notifications = (data as any[]) ?? [];
  const unreadCount = useMemo(
    () => notifications.filter((n: any) => !n.readAt).length,
    [notifications],
  );

  const renderNotification = useCallback(
    ({ item }: { item: any }) => <NotificationItem notification={item} />,
    [],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080810' }} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <LinearGradient
        colors={['#12051E', '#080810']}
        style={{
          paddingTop: insets.top + 18,
          paddingBottom: 20,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: '#F1F0FF', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>
            Alerts 🔔
          </Text>
          {unreadCount > 0 && (
            <View
              style={{
                backgroundColor: '#EC4899',
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 5,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
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
          disabled={markAllRead.isPending}
          activeOpacity={0.7}
        >
          <Text style={{ color: '#EC4899', fontWeight: '700', fontSize: 13 }}>
            Mark all read
          </Text>
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
          data={notifications}
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
              <Text
                style={{
                  color: '#F1F0FF',
                  fontSize: 18,
                  fontWeight: '800',
                  textAlign: 'center',
                  marginBottom: 8,
                }}
              >
                You're all caught up!
              </Text>
              <Text
                style={{
                  color: '#5A5575',
                  fontSize: 15,
                  fontWeight: '400',
                  textAlign: 'center',
                }}
              >
                We'll let you know when something happens
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
