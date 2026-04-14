import React from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import { formatDistanceToNow } from '../../lib/utils';

function NotifIcon({ type }: { type: string }) {
  const iconMap: Record<string, { name: any; color: string }> = {
    like: { name: 'heart', color: colors.pink },
    comment: { name: 'chatbubble', color: colors.purple },
    follow: { name: 'person-add', color: colors.violet },
    event: { name: 'calendar', color: '#10B981' },
    message: { name: 'chatbubbles', color: colors.pink },
  };
  const icon = iconMap[type] ?? { name: 'notifications', color: colors.muted };
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${icon.color}22`,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Ionicons name={icon.name} size={18} color={icon.color} />
    </View>
  );
}

export default function NotificationsScreen() {
  const { data, isLoading, refetch } = trpc.notifications.list.useQuery({});
  const markAllRead = trpc.notifications.markRead.useMutation({ onSuccess: () => refetch() });

  const notifications = (data as any)?.notifications ?? data ?? [];
  const unreadCount = notifications.filter((n: any) => !n.readAt).length;

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
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', flex: 1 }}>
          Notifications
          {unreadCount > 0 && (
            <Text style={{ color: colors.pink }}> {unreadCount}</Text>
          )}
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={() => markAllRead.mutate({})}>
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
          renderItem={({ item }) => (
            <View
              style={{
                flexDirection: 'row',
                padding: 16,
                borderBottomColor: colors.border,
                borderBottomWidth: 1,
                backgroundColor: item.readAt ? 'transparent' : `${colors.pink}08`,
              }}
            >
              <NotifIcon type={item.type ?? 'default'} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: colors.text, fontWeight: item.readAt ? '400' : '700', fontSize: 14 }}>
                  {item.title ?? item.type}
                </Text>
                {item.body && (
                  <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
                    {item.body}
                  </Text>
                )}
                <Text style={{ color: colors.border, fontSize: 11, marginTop: 4 }}>
                  {item.createdAt ? formatDistanceToNow(new Date(item.createdAt)) : ''}
                </Text>
              </View>
              {!item.readAt && (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.pink,
                    marginTop: 4,
                  }}
                />
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <Ionicons name="notifications-outline" size={48} color={colors.border} />
              <Text style={{ color: colors.muted, marginTop: 12, fontSize: 16 }}>
                All caught up!
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
