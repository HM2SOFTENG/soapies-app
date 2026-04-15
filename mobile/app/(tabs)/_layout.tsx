import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import { colors } from '../../lib/colors';
import { trpc } from '../../lib/trpc';
import { useAuth } from '../../lib/auth';

function BadgeIcon({ name, color, size, badge }: { name: any; color: string; size: number; badge?: number }) {
  return (
    <View style={{ width: size + 8, height: size + 8, justifyContent: 'center', alignItems: 'center' }}>
      <Ionicons name={name} size={size} color={color} />
      {!!badge && badge > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            backgroundColor: colors.pink,
            borderRadius: 9,
            minWidth: 18,
            height: 18,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 3,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </View>
  );
}

function AdminBadgeIcon({ name, color, size }: { name: any; color: string; size: number }) {
  return (
    <View style={{ width: size + 8, height: size + 8, justifyContent: 'center', alignItems: 'center' }}>
      <Ionicons name={name} size={size} color={color} />
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          backgroundColor: colors.purple,
          borderRadius: 6,
          width: 12,
          height: 12,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons name="shield-checkmark" size={7} color="#fff" />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: unreadData } = trpc.messages.unreadCounts.useQuery(undefined, {
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  // Sum all unread counts across conversations
  const totalUnread = (() => {
    if (!unreadData) return 0;
    if (typeof unreadData === 'number') return unreadData;
    if (Array.isArray(unreadData)) {
      return (unreadData as any[]).reduce((sum: number, c: any) => {
        const count = typeof c === 'number' ? c : (c?.unreadCount ?? c?.count ?? 0);
        return sum + count;
      }, 0);
    }
    if (typeof unreadData === 'object') {
      // Could be { conversationId: count, ... }
      return Object.values(unreadData as Record<string, number>).reduce((sum: number, v) => sum + (Number(v) || 0), 0);
    }
    return 0;
  })();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarActiveTintColor: colors.pink,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <BadgeIcon name="chatbubbles" color={color} size={size} badge={totalUnread} />
          ),
        }}
      />
      <Tabs.Screen
        name="zone"
        options={{
          title: 'Zone',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'radio-button-on' : 'radio-button-off'}
              size={size}
              color={focused ? '#EC4899' : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => isAdmin
            ? <AdminBadgeIcon name="person" color={color} size={size} />
            : <Ionicons name="person" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
