import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { colors } from '../../lib/colors';
import { trpc } from '../../lib/trpc';
import { useAuth } from '../../lib/auth';

function BadgeIcon({ name, color, size, badge }: { name: any; color: string; size: number; badge?: number }) {
  return (
    <View style={{ width: size + 8, height: size + 8, justifyContent: 'center', alignItems: 'center' }}>
      <Ionicons name={name} size={size} color={color} />
      {!!badge && badge > 0 && (
        <View style={{
          position: 'absolute', top: 0, right: 0,
          backgroundColor: colors.pink, borderRadius: 9,
          minWidth: 18, height: 18, justifyContent: 'center',
          alignItems: 'center', paddingHorizontal: 3,
        }}>
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
      <View style={{
        position: 'absolute', top: 0, right: 0,
        backgroundColor: colors.purple, borderRadius: 6,
        width: 12, height: 12, justifyContent: 'center', alignItems: 'center',
      }}>
        <Ionicons name="shield-checkmark" size={7} color="#fff" />
      </View>
    </View>
  );
}

const SIGNAL_COLORS: Record<string, string> = {
  available: '#10B981',
  looking:   '#EC4899',
  busy:      '#F59E0B',
};

function PulseTabIcon({ color, size, focused, signalType }: {
  color: string; size: number; focused: boolean; signalType: string | null;
}) {
  const isActive = !!signalType && signalType !== 'offline';
  const sigColor = signalType ? (SIGNAL_COLORS[signalType] ?? color) : color;

  // Outer ring pulse
  const ringScale   = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  // Icon scale breathe
  const iconScale   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isActive) {
      ringScale.setValue(0.6);
      ringOpacity.setValue(0);
      iconScale.setValue(1);
      return;
    }

    // Pulse ring loop
    const ringAnim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale,   { toValue: 1.9, duration: 1200, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0,   duration: 1200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale,   { toValue: 0.6, duration: 0, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.7, duration: 0, useNativeDriver: true }),
        ]),
        Animated.delay(300),
      ])
    );

    // Gentle icon breathe
    const breatheAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(iconScale, { toValue: 1.18, duration: 800, useNativeDriver: true }),
        Animated.timing(iconScale, { toValue: 1.0,  duration: 800, useNativeDriver: true }),
      ])
    );

    ringAnim.start();
    breatheAnim.start();

    return () => {
      ringAnim.stop();
      breatheAnim.stop();
    };
  }, [isActive, signalType]);

  const iconColor = isActive ? sigColor : (focused ? colors.pink : color);

  return (
    <View style={{ width: size + 16, height: size + 16, alignItems: 'center', justifyContent: 'center' }}>
      {/* Expanding pulse ring */}
      {isActive && (
        <Animated.View style={{
          position: 'absolute',
          width: size + 10, height: size + 10,
          borderRadius: (size + 10) / 2,
          borderWidth: 1.5,
          borderColor: sigColor,
          opacity: ringOpacity,
          transform: [{ scale: ringScale }],
        }} />
      )}

      {/* Icon */}
      <Animated.View style={{ transform: [{ scale: iconScale }] }}>
        <Ionicons
          name={focused || isActive ? 'radio-button-on' : 'radio-button-off'}
          size={size}
          color={iconColor}
        />
      </Animated.View>

      {/* Active signal dot */}
      {isActive && (
        <View style={{
          position: 'absolute', top: 2, right: 2,
          width: 7, height: 7, borderRadius: 3.5,
          backgroundColor: sigColor,
          borderWidth: 1.5, borderColor: '#0D0D0D',
        }} />
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { user, hasToken } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: unreadData } = trpc.messages.unreadCounts.useQuery(undefined, {
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const { data: mySignalData } = trpc.members.mySignal.useQuery(undefined, {
    enabled: hasToken,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000, // refresh every 5 min
  });

  const mySignalType: string | null = (mySignalData as any)?.signalType ?? null;

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
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: -2 },
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
        name="pulse"
        options={{
          title: 'Pulse',
          tabBarIcon: ({ color, size, focused }) => (
            <PulseTabIcon
              color={color} size={size} focused={focused}
              signalType={mySignalType}
            />
          ),
          // Label color follows signal when active
          tabBarActiveTintColor: mySignalType && mySignalType !== 'offline'
            ? (SIGNAL_COLORS[mySignalType] ?? colors.pink)
            : colors.pink,
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
