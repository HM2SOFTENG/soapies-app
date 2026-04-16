import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useEffect, useRef } from 'react';
import { DS } from '../../lib/design';
import { trpc } from '../../lib/trpc';
import { useAuth } from '../../lib/auth';

const SIGNAL_COLORS: Record<string, string> = {
  available: '#10B981',
  looking:   '#EC4899',
  busy:      '#F59E0B',
};

function BadgeIcon({ name, color, size, badge }: { name: any; color: string; size: number; badge?: number }) {
  return (
    <View style={{ width: size + 10, height: size + 10, justifyContent: 'center', alignItems: 'center' }}>
      <Ionicons name={name} size={size} color={color} />
      {!!badge && badge > 0 && (
        <View style={[styles.badge, { backgroundColor: DS.colors.pink }]}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

function AdminBadgeIcon({ name, color, size }: { name: any; color: string; size: number }) {
  return (
    <View style={{ width: size + 10, height: size + 10, justifyContent: 'center', alignItems: 'center' }}>
      <Ionicons name={name} size={size} color={color} />
      <View style={[styles.adminDot, { backgroundColor: '#6366F1' }]}>
        <Ionicons name="shield-checkmark" size={7} color="#fff" />
      </View>
    </View>
  );
}

function PulseTabIcon({ color, size, focused, signalType }: { color: string; size: number; focused: boolean; signalType: string | null }) {
  const isActive = !!signalType && signalType !== 'offline';
  const sigColor = signalType ? (SIGNAL_COLORS[signalType] ?? color) : color;
  const ringScale   = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const iconScale   = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isActive) { ringScale.setValue(0.6); ringOpacity.setValue(0); iconScale.setValue(1); return; }
    const ring = Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(ringScale,   { toValue: 2.0, duration: 1400, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0,   duration: 1400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(ringScale,   { toValue: 0.6, duration: 0, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0.8, duration: 0, useNativeDriver: true }),
      ]),
      Animated.delay(400),
    ]));
    const breathe = Animated.loop(Animated.sequence([
      Animated.timing(iconScale, { toValue: 1.2, duration: 900, useNativeDriver: true }),
      Animated.timing(iconScale, { toValue: 1.0, duration: 900, useNativeDriver: true }),
    ]));
    ring.start(); breathe.start();
    return () => { ring.stop(); breathe.stop(); };
  }, [isActive, signalType]);
  const iconColor = isActive ? sigColor : (focused ? DS.colors.pink : color);
  return (
    <View style={{ width: size + 18, height: size + 18, alignItems: 'center', justifyContent: 'center' }}>
      {isActive && (
        <Animated.View style={{ position: 'absolute', width: size + 12, height: size + 12, borderRadius: (size + 12) / 2, borderWidth: 1.5, borderColor: sigColor, opacity: ringOpacity, transform: [{ scale: ringScale }] }} />
      )}
      <Animated.View style={{ transform: [{ scale: iconScale }] }}>
        <Ionicons name={focused || isActive ? 'radio-button-on' : 'radio-button-off'} size={size} color={iconColor} />
      </Animated.View>
      {isActive && (
        <View style={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: sigColor, borderWidth: 2, borderColor: DS.colors.bg }} />
      )}
    </View>
  );
}

function TabBarIcon({ name, color, size, focused }: { name: any; color: string; size: number; focused: boolean }) {
  const glowAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(glowAnim, { toValue: focused ? 1 : 0, useNativeDriver: false, speed: 30 }).start();
  }, [focused]);
  const dotOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.9] });
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      <Ionicons name={name} size={size} color={color} />
      <Animated.View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: DS.colors.pink, opacity: dotOpacity }} />
    </View>
  );
}

export default function TabsLayout() {
  const { user, hasToken } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: unreadData } = trpc.messages.unreadCounts.useQuery(undefined, { staleTime: 15_000, refetchInterval: 30_000 });
  const { data: mySignalData } = trpc.members.mySignal.useQuery(undefined, { enabled: hasToken, staleTime: 60_000, refetchInterval: 5 * 60_000 });
  const mySignalType: string | null = (mySignalData as any)?.signalType ?? null;
  const totalUnread = (() => {
    if (!unreadData) return 0;
    if (typeof unreadData === 'number') return unreadData;
    if (Array.isArray(unreadData)) return (unreadData as any[]).reduce((sum: number, c: any) => sum + (typeof c === 'number' ? c : (c?.unreadCount ?? c?.count ?? 0)), 0);
    if (typeof unreadData === 'object') return Object.values(unreadData as Record<string, number>).reduce((sum: number, v) => sum + (Number(v) || 0), 0);
    return 0;
  })();
  const signalTabColor = mySignalType && mySignalType !== 'offline' ? (SIGNAL_COLORS[mySignalType] ?? DS.colors.pink) : DS.colors.pink;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarStyle: {
          position: 'absolute',
          bottom: 24,
          left: 20,
          right: 20,
          height: 64,
          borderRadius: 32,
          backgroundColor: '#0C0C1A',
          borderWidth: 1,
          borderColor: '#EC489928',
          shadowColor: '#EC4899',
          shadowOpacity: 0.18,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 6 },
          elevation: 12,
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarActiveTintColor: DS.colors.pink,
        tabBarInactiveTintColor: DS.colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 0, letterSpacing: 0.3 },
        tabBarItemStyle: { paddingVertical: 6 },
      }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Home',     tabBarIcon: ({ color, size, focused }) => <TabBarIcon name="home"          color={color} size={size} focused={focused} /> }} />
      <Tabs.Screen name="events"   options={{ title: 'Events',   tabBarIcon: ({ color, size, focused }) => <TabBarIcon name="calendar"       color={color} size={size} focused={focused} /> }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', tabBarIcon: ({ color, size })          => <BadgeIcon  name="chatbubbles"    color={color} size={size} badge={totalUnread} /> }} />
      <Tabs.Screen name="pulse"    options={{ title: 'Pulse',    tabBarActiveTintColor: signalTabColor,  tabBarIcon: ({ color, size, focused }) => <PulseTabIcon color={color} size={size} focused={focused} signalType={mySignalType} /> }} />
      <Tabs.Screen name="profile"  options={{ title: 'Profile',  tabBarIcon: ({ color, size, focused }) => isAdmin ? <AdminBadgeIcon name="person" color={color} size={size} /> : <TabBarIcon name="person" color={color} size={size} focused={focused} /> }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts', tabBarIcon: ({ color, size, focused }) => <TabBarIcon name="notifications" color={color} size={size} focused={focused} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge:     { position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  adminDot:  { position: 'absolute', top: 0, right: 0, width: 13, height: 13, borderRadius: 6.5, justifyContent: 'center', alignItems: 'center' },
});
