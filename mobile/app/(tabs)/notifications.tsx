import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  Pressable,
  RefreshControl,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
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
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
      }}
    >
      {/* Icon circle */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.border,
        }}
      />
      <View style={{ marginLeft: 12, gap: 8, flex: 1 }}>
        <View style={{ width: '60%', height: 12, borderRadius: 6, backgroundColor: colors.border }} />
        <View style={{ width: '85%', height: 10, borderRadius: 5, backgroundColor: colors.border }} />
      </View>
    </Animated.View>
  );
}

export default function NotificationsScreen() {
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '700' }}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <View
              style={{
                backgroundColor: colors.pink,
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
        {unreadCount > 0 && (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              markAllRead.mutate();
            }}
            disabled={markAllRead.isPending}
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
          >
            <Text style={{ color: colors.pink, fontWeight: '600', fontSize: 13 }}>
              Mark all read
            </Text>
          </Pressable>
        )}
      </View>

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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.pink}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🔔</Text>
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 18,
                  fontWeight: '600',
                  textAlign: 'center',
                  marginBottom: 8,
                }}
              >
                You're all caught up!
              </Text>
              <Text
                style={{
                  color: '#9CA3AF',
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
