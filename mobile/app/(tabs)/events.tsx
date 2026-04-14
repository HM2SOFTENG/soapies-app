import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ScrollView,
  Animated,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_MAX = 280;
const HERO_MIN = 100;

// ── helpers ───────────────────────────────────────────────────────────────────

function daysUntil(date: string | Date) {
  const diff = new Date(date).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days <= 0 ? 'Today!' : days === 1 ? 'Tomorrow' : `In ${days} days`;
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusColor(status: string) {
  switch (status) {
    case 'published': return '#10B981';
    case 'completed': return colors.muted;
    case 'sold_out': return colors.pink;
    default: return colors.muted;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'published': return 'Published';
    case 'completed': return 'Completed';
    case 'sold_out': return 'Sold Out';
    default: return status;
  }
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function EventSkeleton() {
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
        backgroundColor: colors.card,
        borderRadius: 16,
        marginBottom: 12,
        borderColor: colors.border,
        borderWidth: 1,
        padding: 16,
        overflow: 'hidden',
      }}
    >
      <View style={{ width: '70%', height: 16, borderRadius: 8, backgroundColor: colors.border, marginBottom: 10 }} />
      <View style={{ width: '45%', height: 12, borderRadius: 6, backgroundColor: colors.border, marginBottom: 8 }} />
      <View style={{ width: '55%', height: 12, borderRadius: 6, backgroundColor: colors.border }} />
    </Animated.View>
  );
}

// ── Animated Event Card ───────────────────────────────────────────────────────

function AnimatedEventCard({ event, index }: { event: any; index: number }) {
  const translateY = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 400,
      delay: index * 80,
      useNativeDriver: true,
    }).start();
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      delay: index * 80,
      useNativeDriver: true,
    }).start();
  }, [index]);

  const ticketTypes = (event.ticketTypes as any[]) ?? [];
  const totalCapacity = ticketTypes.reduce((sum: number, t: any) => sum + (t.capacity ?? 0), 0);
  const totalSold = ticketTypes.reduce((sum: number, t: any) => sum + (t.sold ?? t._count?.tickets ?? 0), 0);
  const spotsLeft = totalCapacity > 0 ? totalCapacity - totalSold : null;

  const sc = statusColor(event.status);
  const sl = statusLabel(event.status);

  const pressScale = useRef(new Animated.Value(1)).current;

  function onPressIn() {
    Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  }
  function onPressOut() {
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  }

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale: pressScale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => Haptics.selectionAsync()}
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          marginBottom: 12,
          borderColor: colors.border,
          borderWidth: 1,
          overflow: 'hidden',
          flexDirection: 'row',
        }}
      >
        {/* Gradient left border */}
        <LinearGradient
          colors={[colors.pink, colors.purple]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ width: 4 }}
        />

        <View style={{ flex: 1, padding: 14 }}>
          {/* Title + status */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, flex: 1, lineHeight: 20 }}>
              {event.title}
            </Text>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 10,
                backgroundColor: `${sc}22`,
                marginLeft: 8,
                flexShrink: 0,
              }}
            >
              <Text style={{ color: sc, fontSize: 11, fontWeight: '700' }}>{sl}</Text>
            </View>
          </View>

          {/* Date */}
          {event.startDate && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Ionicons name="calendar-outline" size={13} color={colors.muted} />
              <Text style={{ color: colors.muted, fontSize: 12, marginLeft: 5 }}>
                {formatDate(event.startDate)}
              </Text>
            </View>
          )}

          {/* Location */}
          {event.location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="location-outline" size={13} color={colors.muted} />
              <Text style={{ color: colors.muted, fontSize: 12, marginLeft: 5 }} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
          )}

          {/* Ticket prices */}
          {ticketTypes.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {ticketTypes.map((t: any, i: number) => {
                  const ticketColors = [colors.pink, colors.purple, '#10B981', '#F59E0B'];
                  const tc = ticketColors[i % ticketColors.length];
                  return (
                    <View
                      key={t.id ?? i}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
                        backgroundColor: `${tc}22`,
                        borderColor: `${tc}44`,
                        borderWidth: 1,
                      }}
                    >
                      <Text style={{ color: tc, fontSize: 11, fontWeight: '600' }}>
                        {t.name ?? t.role ?? 'Ticket'}{t.price != null ? ` · $${t.price}` : ' · Free'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Spots left */}
          {spotsLeft !== null && (
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              <Text style={{ color: spotsLeft < 5 ? colors.pink : '#10B981', fontWeight: '700' }}>
                {spotsLeft}
              </Text>
              {' / '}{totalCapacity} spots left
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection({ event, scrollY }: { event: any | null; scrollY: Animated.Value }) {
  const heroHeight = scrollY.interpolate({
    inputRange: [0, HERO_MAX - HERO_MIN],
    outputRange: [HERO_MAX, HERO_MIN],
    extrapolate: 'clamp',
  });

  const contentOpacity = scrollY.interpolate({
    inputRange: [0, (HERO_MAX - HERO_MIN) * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const miniOpacity = scrollY.interpolate({
    inputRange: [(HERO_MAX - HERO_MIN) * 0.6, HERO_MAX - HERO_MIN],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (!event) {
    return (
      <Animated.View style={{ height: heroHeight, overflow: 'hidden' }}>
        <LinearGradient
          colors={[`${colors.purple}88`, `${colors.pink}44`, colors.bg]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <Text style={{ color: colors.muted, fontSize: 16 }}>No upcoming events</Text>
        </LinearGradient>
      </Animated.View>
    );
  }

  const countdown = daysUntil(event.startDate);

  return (
    <Animated.View style={{ height: heroHeight, overflow: 'hidden' }}>
      <LinearGradient
        colors={[`${colors.purple}CC`, `${colors.pink}99`, `${colors.bg}EE`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        {/* Collapsed mini view */}
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            opacity: miniOpacity,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 12,
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.pink,
              marginRight: 10,
            }}
          />
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, flex: 1 }} numberOfLines={1}>
            {event.title}
          </Text>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
              backgroundColor: `${colors.pink}33`,
            }}
          >
            <Text style={{ color: colors.pink, fontSize: 12, fontWeight: '700' }}>{countdown}</Text>
          </View>
        </Animated.View>

        {/* Expanded full content */}
        <Animated.View style={{ opacity: contentOpacity, flex: 1, justifyContent: 'flex-end', padding: 20 }}>
          {/* Countdown badge */}
          <View style={{ flexDirection: 'row', marginBottom: 10 }}>
            <LinearGradient
              colors={[colors.pink, colors.purple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 }}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{countdown}</Text>
            </LinearGradient>
          </View>

          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 6, lineHeight: 30 }}>
            {event.title}
          </Text>

          {event.startDate && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Ionicons name="calendar-outline" size={14} color={colors.muted} />
              <Text style={{ color: colors.muted, fontSize: 13, marginLeft: 6 }}>{formatDate(event.startDate)}</Text>
            </View>
          )}
          {event.location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <Ionicons name="location-outline" size={14} color={colors.muted} />
              <Text style={{ color: colors.muted, fontSize: 13, marginLeft: 6 }}>{event.location}</Text>
            </View>
          )}

          {/* Reserve button */}
          <TouchableOpacity
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
            style={{ alignSelf: 'flex-start' }}
          >
            <LinearGradient
              colors={[colors.pink, colors.purple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 11,
                borderRadius: 24,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Ionicons name="ticket-outline" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Reserve My Spot</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

const FILTER_TABS = ['All', 'Upcoming', 'Past'] as const;
type FilterTab = typeof FILTER_TABS[number];

export default function EventsScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const { data: eventsData, refetch, isLoading } = trpc.events.list.useQuery({} as any, {
    staleTime: 120_000,
    refetchOnWindowFocus: true,
  });

  const events = useMemo(() => {
    const raw = (eventsData as any)?.events ?? eventsData ?? [];
    return (raw as any[]) ?? [];
  }, [eventsData]);

  const upcoming = useMemo(
    () => events.filter((e: any) => e.status === 'published' && new Date(e.startDate) >= new Date()),
    [events],
  );
  const nextEvent = upcoming[0] ?? null;

  const filtered = useMemo(() => {
    if (activeFilter === 'All') return events;
    if (activeFilter === 'Upcoming') return upcoming;
    if (activeFilter === 'Past') {
      return events.filter((e: any) => e.status === 'completed' || new Date(e.startDate) < new Date());
    }
    return events;
  }, [events, upcoming, activeFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <AnimatedEventCard event={item} index={index} />
  ), []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Sticky animated hero */}
      <HeroSection event={nextEvent} scrollY={scrollY} />

      {/* Filter tabs */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          gap: 8,
        }}
      >
        {FILTER_TABS.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveFilter(tab);
            }}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 7,
              borderRadius: 20,
              backgroundColor: activeFilter === tab ? colors.pink : colors.card,
              borderColor: activeFilter === tab ? colors.pink : colors.border,
              borderWidth: 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
          >
            <Text
              style={{
                color: activeFilter === tab ? '#fff' : colors.muted,
                fontWeight: '600',
                fontSize: 13,
              }}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
        <View style={{ flex: 1 }} />
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 7,
            borderRadius: 20,
            backgroundColor: `${colors.pink}22`,
          }}
        >
          <Text style={{ color: colors.pink, fontWeight: '700', fontSize: 13 }}>{filtered.length}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: 16 }}>
          <EventSkeleton />
          <EventSkeleton />
          <EventSkeleton />
        </View>
      ) : (
        <Animated.FlatList
          data={filtered}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={renderItem}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={8}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.pink} />
          }
          ListHeaderComponent={
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              All Events
            </Text>
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🎉</Text>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
                No events yet
              </Text>
              <Text style={{ color: colors.muted, fontSize: 15, textAlign: 'center' }}>
                Check back soon — something exciting is always brewing
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
