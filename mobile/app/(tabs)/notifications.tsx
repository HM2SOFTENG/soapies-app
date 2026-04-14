import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import NotificationItem from '../../components/NotificationItem';

export default function NotificationsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = trpc.notifications.list.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => refetch(),
  });

  const notifications = (data as any[]) ?? [];
  const unreadCount = notifications.filter((n: any) => !n.readAt).length;

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
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>
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
          <TouchableOpacity
            onPress={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <Text style={{ color: colors.pink, fontWeight: '600', fontSize: 13 }}>
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.pink} size="large" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={({ item }) => <NotificationItem notification={item} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.pink}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <Text style={{ fontSize: 48 }}>🔔</Text>
              <Text style={{ color: colors.muted, marginTop: 12, fontSize: 16 }}>
                All caught up!
              </Text>
              <Text style={{ color: colors.border, fontSize: 13, marginTop: 4 }}>
                No new notifications
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
