import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  Modal,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import BrandGradient from '../../components/BrandGradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import { useAuth } from '../../lib/auth';
import { FONT } from '../../lib/fonts';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_MAX = 320;
const HERO_MIN = 90;

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(date: string | Date) {
  const diff = new Date(date).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days <= 0 ? 'Tonight! 🔥' : days === 1 ? 'Tomorrow 🎉' : `In ${days} days`;
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function formatDateShort(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
    case 'published': return '● Live';
    case 'completed': return 'Past';
    case 'sold_out': return '🔥 Sold Out';
    default: return status;
  }
}

// Theme colors for event type thumbnails (fallback when no image)
const EVENT_GRADIENTS: [string, string][] = [
  [colors.pink, colors.purple],
  ['#F59E0B', '#EF4444'],
  ['#8B5CF6', '#EC4899'],
  ['#10B981', '#3B82F6'],
  ['#F97316', '#EC4899'],
];

function eventGradient(id: number): [string, string] {
  return EVENT_GRADIENTS[id % EVENT_GRADIENTS.length];
}

// Emoji thumbnails for event types
function eventEmoji(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('rave')) return '🎆';
  if (t.includes('barbie')) return '💗';
  if (t.includes('mardi gras')) return '🎭';
  if (t.includes('valentine')) return '💕';
  if (t.includes('cowboy') || t.includes('cowgirl')) return '🤠';
  if (t.includes('circus')) return '🎪';
  if (t.includes('disco')) return '🪩';
  if (t.includes('beach') || t.includes('blacks')) return '🏖️';
  if (t.includes('vegas')) return '🎰';
  if (t.includes('halloween')) return '🎃';
  if (t.includes('christmas') || t.includes('holiday')) return '🎄';
  return '🎉';
}

// ── Shimmer Skeleton ─────────────────────────────────────────────────────────

function ShimmerSkeleton() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
      <View style={styles.skeletonThumb} />
      <View style={styles.skeletonBody}>
        <View style={[styles.skeletonLine, { width: '75%', height: 16 }]} />
        <View style={[styles.skeletonLine, { width: '50%', height: 11, marginTop: 8 }]} />
        <View style={[styles.skeletonLine, { width: '60%', height: 11, marginTop: 6 }]} />
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
          <View style={[styles.skeletonPill, { width: 64 }]} />
          <View style={[styles.skeletonPill, { width: 80 }]} />
        </View>
      </View>
    </Animated.View>
  );
}

// ── Thumbnail ─────────────────────────────────────────────────────────────────

function EventThumbnail({ event, size = 88 }: { event: any; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const grad = eventGradient(event.id);
  const emoji = eventEmoji(event.title ?? '');
  const hasImage = event.coverImageUrl && !imgError;

  return (
    <View style={{ width: size, height: size, borderRadius: 14, overflow: 'hidden', flexShrink: 0 }}>
      {hasImage ? (
        <Image
          source={{ uri: event.coverImageUrl }}
          style={{ width: size, height: size }}
          onError={() => setImgError(true)}
          contentFit="cover"
        />
      ) : (
        <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: size * 0.38 }}>{emoji}</Text>
        </LinearGradient>
      )}
    </View>
  );
}

// ── Price Tags ────────────────────────────────────────────────────────────────

function PriceTags({ event }: { event: any }) {
  type Tag = { label: string; price: string | null; color: string };
  const tags: Tag[] = [];
  if (event.priceSingleFemale != null) tags.push({ label: '♀ Woman', price: `$${parseFloat(event.priceSingleFemale).toFixed(0)}`, color: colors.pink });
  if (event.priceSingleMale != null) tags.push({ label: '♂ Man', price: `$${parseFloat(event.priceSingleMale).toFixed(0)}`, color: colors.purple });
  if (event.priceCouple != null) tags.push({ label: '♥ Couple', price: `$${parseFloat(event.priceCouple).toFixed(0)}`, color: '#10B981' });

  if (!tags.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {tags.map((t, i) => (
          <View key={i} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: `${t.color}20`, borderColor: `${t.color}50`, borderWidth: 1 }}>
            <Text style={{ color: t.color, fontSize: 11, fontWeight: '700' }}>{t.label} {t.price}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Animated Event Card ───────────────────────────────────────────────────────

function AnimatedEventCard({ event, index, isGoing }: { event: any; index: number; isGoing?: boolean }) {
  const router = useRouter();
  const translateY = useRef(new Animated.Value(50)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 450, delay: index * 70, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 450, delay: index * 70, useNativeDriver: true }),
    ]).start();

    // Subtle glow pulse for upcoming events
    if (event.status === 'published') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [index, event.status]);

  function onPressIn() {
    Haptics.selectionAsync();
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }
  function onPressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  }
  function onPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/event/[id]', params: { id: String(event.id) } });
  }

  const sc = statusColor(event.status);
  const sl = statusLabel(event.status);
  const spotsLeft = event.capacity && event.currentAttendees != null
    ? event.capacity - event.currentAttendees
    : null;
  const spotsPercent = event.capacity ? (event.currentAttendees ?? 0) / event.capacity : 0;
  const isHot = spotsLeft !== null && spotsLeft < 10 && event.status === 'published';

  const borderGlowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [`${colors.pink}30`, `${colors.pink}80`],
  });

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }], marginBottom: 12 }}>
      <TouchableOpacity activeOpacity={1} onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress}>
        <Animated.View style={[styles.eventCard, { borderColor: event.status === 'published' ? borderGlowColor as any : colors.border }]}>
          {/* Gradient left accent */}
          <LinearGradient
            colors={eventGradient(event.id)}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ width: 4, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 }}
          />

          {/* Thumbnail */}
          <View style={{ padding: 12, paddingRight: 0 }}>
            <EventThumbnail event={event} size={88} />
          </View>

          {/* Content */}
          <View style={{ flex: 1, padding: 12, paddingLeft: 10 }}>
            {/* Status + hot badge row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 }}>
              <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: `${sc}20` }}>
                <Text style={{ color: sc, fontSize: 10, fontWeight: '800', fontFamily: FONT.displaySemiBold }}>{sl}</Text>
              </View>
              {isHot && (
                <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: `${colors.pink}30` }}>
                  <Text style={{ color: colors.pink, fontSize: 10, fontWeight: '800', fontFamily: FONT.displaySemiBold }}>🔥 {spotsLeft} left</Text>
                </View>
              )}
              {isGoing && (
                <View style={{
                  paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
                  backgroundColor: '#10B98122', borderColor: '#10B981', borderWidth: 1,
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                }}>
                  <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '800', fontFamily: FONT.displaySemiBold }}>✅ You're Going</Text>
                </View>
              )}
              {event.status === 'published' && (
                <View style={{ marginLeft: 'auto' }}>
                  <Text style={{ color: colors.pink, fontSize: 11, fontWeight: '700', fontFamily: FONT.displaySemiBold }}>{daysUntil(event.startDate)}</Text>
                </View>
              )}
            </View>

            {/* Title */}
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, lineHeight: 20, marginBottom: 6, fontFamily: FONT.displayBold }} numberOfLines={2}>
              {event.title}
            </Text>

            {/* Date + location */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <Ionicons name="calendar-outline" size={11} color={colors.muted} />
              <Text style={{ color: colors.muted, fontSize: 11 }}>{formatDate(event.startDate)}</Text>
            </View>
            {event.location && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="location-outline" size={11} color={colors.muted} />
                <Text style={{ color: colors.muted, fontSize: 11 }} numberOfLines={1}>{event.location}</Text>
              </View>
            )}

            {/* Price tags */}
            <PriceTags event={event} />

            {/* Capacity bar */}
            {event.capacity > 0 && event.status === 'published' && (
              <View style={{ marginTop: 8 }}>
                <View style={{ height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' }}>
                  <LinearGradient
                    colors={spotsPercent > 0.8 ? [colors.pink, '#EF4444'] : [colors.purple, colors.pink]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ height: '100%', width: `${Math.min(spotsPercent * 100, 100)}%`, borderRadius: 2 }}
                  />
                </View>
                <Text style={{ color: colors.muted, fontSize: 10, marginTop: 3 }}>
                  {event.currentAttendees ?? 0}/{event.capacity} reserved
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection({ event, scrollY, isGoing }: { event: any | null; scrollY: Animated.Value; isGoing?: boolean }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse the CTA button
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();

    // Shimmer on hero
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 2500, useNativeDriver: true })
    );
    shimmer.start();

    return () => { pulse.stop(); shimmer.stop(); };
  }, []);

  const heroHeight = scrollY.interpolate({
    inputRange: [0, HERO_MAX - HERO_MIN],
    outputRange: [HERO_MAX, HERO_MIN],
    extrapolate: 'clamp',
  });
  const contentOpacity = scrollY.interpolate({
    inputRange: [0, (HERO_MAX - HERO_MIN) * 0.4],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const miniOpacity = scrollY.interpolate({
    inputRange: [(HERO_MAX - HERO_MIN) * 0.55, HERO_MAX - HERO_MIN],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const imageScale = scrollY.interpolate({
    inputRange: [-80, 0, HERO_MAX - HERO_MIN],
    outputRange: [1.15, 1, 1],
    extrapolate: 'clamp',
  });

  const grad = event ? eventGradient(event.id) : [colors.purple, colors.pink] as [string, string];
  const hasImage = event?.coverImageUrl && !imgError;
  const countdown = event ? daysUntil(event.startDate) : '';
  const emoji = event ? eventEmoji(event.title ?? '') : '🎉';

  return (
    <Animated.View style={{ height: heroHeight, overflow: 'hidden', paddingTop: insets.top }}>
      {/* Background image or gradient */}
      <Animated.View style={{ position: 'absolute', inset: 0, transform: [{ scale: imageScale }] }}>
        {hasImage ? (
          <Image source={{ uri: event.coverImageUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" onError={() => setImgError(true)} />
        ) : (
          <LinearGradient colors={[`${grad[0]}EE`, `${grad[1]}CC`, `${colors.bg}FF`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
        )}
      </Animated.View>

      {/* Dark overlay so text is always legible */}
      <LinearGradient
        colors={['transparent', '#08081099', '#080810']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Floating emoji decoration */}
      {!hasImage && (
        <Animated.Text style={{ position: 'absolute', top: 30, right: 24, fontSize: 72, opacity: 0.18, transform: [{ rotate: '15deg' }] }}>
          {emoji}
        </Animated.Text>
      )}

      {/* Mini collapsed bar */}
      <Animated.View style={[styles.miniBar, { opacity: miniOpacity }]}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.pink, marginRight: 10, shadowColor: colors.pink, shadowOpacity: 0.6, shadowRadius: 10 }} />
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14, flex: 1, fontFamily: FONT.displaySemiBold }} numberOfLines={1}>
          {event?.title ?? 'No upcoming events'}
        </Text>
        {countdown ? (
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: `${colors.pink}33` }}>
            <Text style={{ color: colors.pink, fontSize: 12, fontWeight: '700' }}>{countdown}</Text>
          </View>
        ) : null}
      </Animated.View>

      {/* Full expanded content */}
      {event ? (
        <Animated.View style={[styles.heroContent, { opacity: contentOpacity }]}>
          {/* Countdown pill */}
          <BrandGradient
            style={styles.countdownPill}
          >
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800', fontFamily: FONT.displaySemiBold }}>🎟 {countdown}</Text>
          </BrandGradient>

          <Text style={styles.heroTitle} numberOfLines={2}>{event.title}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 }}>
            <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.heroMeta}>{formatDate(event.startDate)}</Text>
          </View>
          {event.location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 6 }}>
              <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.7)" />
              <Text style={styles.heroMeta}>{event.location}</Text>
            </View>
          )}

          {/* CTA button with pulse */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }], alignSelf: 'flex-start' }}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({ pathname: '/event/[id]', params: { id: String(event.id) } });
              }}
            >
              {isGoing ? (
                <LinearGradient colors={['#10B981', '#059669']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.heroBtn}>
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, fontFamily: FONT.displaySemiBold }}>You're Going! ✅</Text>
                </LinearGradient>
              ) : (
                <BrandGradient
                  style={styles.heroBtn}
                >
                  <Ionicons name="ticket-outline" size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, fontFamily: FONT.displaySemiBold }}>Reserve My Spot</Text>
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
                </BrandGradient>
              )}
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.muted, fontSize: 16 }}>No upcoming events</Text>
        </View>
      )}
    </Animated.View>
  );
}

// ── Month Divider ─────────────────────────────────────────────────────────────

function MonthDivider({ month }: { month: string }) {
  return (
    <View style={styles.monthDivider}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      <Text style={styles.monthLabel}>{month}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

const FILTER_TABS = ['All', 'Upcoming', 'Past'] as const;
type FilterTab = typeof FILTER_TABS[number];

export default function EventsScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('Upcoming');
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const { user } = useAuth();
  const hasToken = !!user;

  const { data: eventsData, refetch, isLoading } = trpc.events.list.useQuery({}, {
    staleTime: 60_000,
    enabled: hasToken, // server auto-scopes to user's community
  });

  const { data: myReservationsData } = trpc.reservations.myReservations.useQuery(undefined, {
    enabled: hasToken,
    staleTime: 30_000,
  });
  const myReservations = (myReservationsData as any[]) ?? [];

  const events = useMemo(() => {
    const raw = (eventsData as any)?.events ?? eventsData ?? [];
    return (raw as any[]).sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [eventsData]);

  const upcoming = useMemo(
    () => events.filter((e: any) => e.status === 'published' && new Date(e.startDate) >= new Date())
              .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [events],
  );
  const nextEvent = upcoming[0] ?? null;

  const filtered = useMemo(() => {
    if (activeFilter === 'Upcoming') return upcoming;
    if (activeFilter === 'Past') return events.filter((e: any) => e.status === 'completed' || new Date(e.startDate) < new Date());
    return [...upcoming, ...events.filter((e: any) => !(e.status === 'published' && new Date(e.startDate) >= new Date()))];
  }, [events, upcoming, activeFilter]);

  // Group by month
  const groupedItems = useMemo(() => {
    const items: ({ type: 'divider'; month: string } | { type: 'event'; event: any })[] = [];
    let lastMonth = '';
    filtered.forEach(e => {
      const month = new Date(e.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (month !== lastMonth) {
        items.push({ type: 'divider', month });
        lastMonth = month;
      }
      items.push({ type: 'event', event: e });
    });
    return items;
  }, [filtered]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    if (item.type === 'divider') return <MonthDivider month={item.month} />;
    const isGoing = myReservations.some((r: any) => r.eventId === item.event.id && r.status !== 'cancelled');
    return <AnimatedEventCard event={item.event} index={index} isGoing={isGoing} />;
  }, [myReservations]);

  const filterAnim = useRef(new Animated.Value(0)).current;
  const filterScale = useRef(
    FILTER_TABS.map(() => new Animated.Value(1))
  ).current;

  function onFilterPress(tab: FilterTab, idx: number) {
    Haptics.selectionAsync();
    setActiveFilter(tab);
    Animated.spring(filterScale[idx], { toValue: 0.92, useNativeDriver: true, speed: 50 }).start(() => {
      Animated.spring(filterScale[idx], { toValue: 1, useNativeDriver: true, speed: 30 }).start();
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080810' }} edges={['bottom']}>
      {/* Hero */}
      <HeroSection
        event={nextEvent}
        scrollY={scrollY}
        isGoing={nextEvent ? myReservations.some((r: any) => r.eventId === nextEvent.id && r.status !== 'cancelled') : false}
      />

      {/* Filter tabs */}
      <View style={styles.filterRowWrap}>
        <View style={styles.filterSummaryCard}>
          <View>
            <Text style={styles.filterSummaryEyebrow}>CURATED NIGHTS</Text>
            <Text style={styles.filterSummaryTitle}>{filtered.length} experiences</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={{ color: colors.pink, fontWeight: '800', fontSize: 13, fontFamily: FONT.displaySemiBold }}>{filtered.length}</Text>
          </View>
        </View>
        <View style={styles.filterRow}>
          {FILTER_TABS.map((tab, idx) => {
            const active = activeFilter === tab;
            return (
              <Animated.View key={tab} style={{ transform: [{ scale: filterScale[idx] }] }}>
                <TouchableOpacity onPress={() => onFilterPress(tab, idx)} style={[styles.filterTab, active && styles.filterTabActive]}>
                  <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{tab}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={{ padding: 16 }}>
          {[0, 1, 2].map(i => <ShimmerSkeleton key={i} />)}
        </View>
      ) : (
        <Animated.FlatList
          data={groupedItems}
          keyExtractor={(item: any, index) => item.type === 'divider' ? `div-${item.month}` : String(item.event.id)}
          renderItem={renderItem}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
          removeClippedSubviews
          maxToRenderPerBatch={8}
          windowSize={5}
          contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.pink} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 64, marginBottom: 12 }}>🎉</Text>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 6, fontFamily: FONT.displayBold }}>Nothing here yet</Text>
              <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 14 }}>
                Check back soon — something exciting is always brewing
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  eventCard: {
    backgroundColor: '#10101C',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  skeletonCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderColor: colors.border,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    overflow: 'hidden',
  },
  skeletonThumb: {
    width: 88,
    height: 112,
    backgroundColor: colors.border,
  },
  skeletonBody: {
    flex: 1,
    padding: 12,
  },
  skeletonLine: {
    backgroundColor: colors.border,
    borderRadius: 6,
  },
  skeletonPill: {
    height: 20,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  miniBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(8,8,16,0.88)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 20,
  },
  countdownPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 10,
    lineHeight: 32,
    fontFamily: FONT.displayBold,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 28,
    shadowColor: colors.pink,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  filterRowWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomColor: '#1A1A30',
    borderBottomWidth: 1,
    backgroundColor: '#080810',
    gap: 12,
  },
  filterSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: '#10101C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  filterSummaryEyebrow: {
    color: '#8B84A7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    fontFamily: FONT.displaySemiBold,
  },
  filterSummaryTitle: {
    color: '#F1F0FF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
    fontFamily: FONT.displayBold,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 24,
    backgroundColor: '#10101C',
    borderColor: '#1A1A30',
    borderWidth: 1,
  },
  filterTabActive: {
    backgroundColor: '#EC489920',
    borderColor: '#EC4899',
  },
  filterLabel: {
    color: '#5A5575',
    fontWeight: '600',
    fontSize: 13,
    fontFamily: FONT.displaySemiBold,
  },
  filterLabelActive: {
    color: '#EC4899',
    fontWeight: '800' as const,
    fontFamily: FONT.displaySemiBold,
  },
  countBadge: {
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: `${colors.pink}22`,
    borderWidth: 1,
    borderColor: `${colors.pink}25`,
  },
  monthDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 12,
  },
  monthLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: FONT.displaySemiBold,
  },
});
