import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Animated,
  Dimensions,
  Alert,
  Switch,
  StyleSheet,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc } from '../../lib/trpc';
import { useAuth } from '../../lib/auth';
import {
  calculateMatchScore,
  calculateMatchBreakdown,
  type MatchFactor,
} from '../../lib/pulseScore';
import { FONT } from '../../lib/fonts';
import { useTheme } from '../../lib/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SIGNAL_COLORS = {
  available: '#10B981',
  looking: '#EC4899',
  busy: '#F59E0B',
  offline: '#6B7280',
} as const;

const SIGNAL_CONFIG = {
  available: { color: '#10B981', label: 'Available', bg: '#10B98120' },
  looking: { color: '#EC4899', label: 'Looking', bg: '#EC489920' },
  busy: { color: '#F59E0B', label: 'Busy', bg: '#F59E0B20' },
  offline: { color: '#6B7280', label: 'Offline', bg: '#6B728020' },
} as const;

type SignalType = keyof typeof SIGNAL_CONFIG;

const DISTANCE_OPTIONS = [
  { label: '5km', value: 5 },
  { label: '10km', value: 10 },
  { label: '25km', value: 25 },
  { label: '50km', value: 50 },
  { label: '100km', value: 100 },
  { label: 'Any', value: 999 },
];

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// Force-spread layout — places bubbles in a sunflower spiral then runs a few
// repulsion passes to push overlapping bubbles apart.
function layoutPositions(count: number, w: number, h: number): { x: number; y: number }[] {
  if (count === 0) return [];
  const cx = w / 2;
  const cy = h / 2;
  // Reserve center for "You" bubble (80px radius), so start at radius 70
  const minR = 80;
  const maxR = Math.min(w, h) * 0.46;
  const golden = Math.PI * (3 - Math.sqrt(5)); // golden angle
  // Initial sunflower spiral placement
  const pts = Array.from({ length: count }, (_, i) => {
    const r = minR + (maxR - minR) * Math.sqrt((i + 0.5) / count);
    const angle = i * golden;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
  // Clamp to canvas with padding
  const pad = 44;
  const clamp = (p: { x: number; y: number }) => ({
    x: Math.max(pad, Math.min(w - pad, p.x)),
    y: Math.max(pad, Math.min(h - pad, p.y)),
  });
  // Run 4 repulsion iterations to push overlapping bubbles apart
  const BUBBLE_R = 44; // rough average bubble radius
  for (let iter = 0; iter < 4; iter++) {
    for (let a = 0; a < pts.length; a++) {
      for (let b = a + 1; b < pts.length; b++) {
        const dx = pts[b].x - pts[a].x;
        const dy = pts[b].y - pts[a].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = BUBBLE_R * 2;
        if (dist < minDist) {
          const push = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          pts[a].x -= nx * push * 0.5;
          pts[a].y -= ny * push * 0.5;
          pts[b].x += nx * push * 0.5;
          pts[b].y += ny * push * 0.5;
        }
      }
    }
  }
  return pts.map(clamp);
}

// ─── Chip ────────────────────────────────────────────────────────────────────
function Chip({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        margin: 3,
        backgroundColor: `${color}22`,
        borderColor: `${color}44`,
        borderWidth: 1,
      }}
    >
      <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

// ─── MemberBubble ─────────────────────────────────────────────────────────────
interface BubbleProps {
  member: any;
  matchScore: number;
  x: number;
  y: number;
  onPress: () => void;
  isPartner?: boolean;
  isStale?: boolean;
}

function MemberBubble({
  member,
  matchScore,
  x,
  y,
  onPress,
  isPartner = false,
  isStale = false,
}: BubbleProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const isDragging = useRef(false);

  const sigColor = isPartner
    ? '#EC4899'
    : (SIGNAL_COLORS[member.signalType as keyof typeof SIGNAL_COLORS] ?? '#6B7280');
  let size = Math.round(38 + (matchScore / 100) * 34);
  if (isPartner) size = Math.max(size, 58);
  const badgeOffset = Math.max(4, Math.round(size * 0.08));

  useEffect(() => {
    // Don't animate stale signals — they're no longer active
    if (matchScore >= 70 && !isStale) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 950, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 950, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [matchScore, isStale, pulseAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4,
      onPanResponderGrant: () => {
        isDragging.current = false;
        // @ts-ignore
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gs) => {
        if (Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4) isDragging.current = true;
        Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })(_, gs);
      },
      onPanResponderRelease: (_, gs) => {
        pan.flattenOffset();
        // Snap back slightly with spring
        Animated.spring(pan, {
          toValue: { x: (pan.x as any)._value, y: (pan.y as any)._value },
          useNativeDriver: false,
          friction: 5,
        }).start();
        if (!isDragging.current) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
        isDragging.current = false;
      },
    })
  ).current;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x - size / 2 - 8,
        top: y - size / 2 - 8,
        alignItems: 'center',
        opacity: isStale ? 0.5 : 1,
        transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: pulseAnim }],
      }}
      {...panResponder.panHandlers}
    >
      {/* Outer glow */}
      <View
        style={{
          width: size + 18,
          height: size + 18,
          borderRadius: (size + 18) / 2,
          backgroundColor: `${sigColor}16`,
          borderWidth: 1,
          borderColor: `${sigColor}1F`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LinearGradient
          colors={['#FFFFFF10', '#FFFFFF03', '#00000018']}
          start={{ x: 0.15, y: 0.1 }}
          end={{ x: 0.85, y: 0.9 }}
          style={{
            position: 'absolute',
            top: 2,
            left: 2,
            right: 2,
            bottom: 2,
            borderRadius: (size + 14) / 2,
          }}
        />
        {/* Avatar */}
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: 'hidden',
            backgroundColor: '#120F1C',
            borderWidth: matchScore >= 70 ? 2.5 : 1.5,
            borderColor: matchScore >= 70 ? sigColor : `${sigColor}77`,
          }}
        >
          {member.avatarUrl ? (
            <>
              <Image
                source={{ uri: member.avatarUrl }}
                style={{ width: size, height: size }}
                contentFit="cover"
              />
              <LinearGradient
                colors={['transparent', '#05050A66', '#05050ACC']}
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: size * 0.42 }}
              />
            </>
          ) : (
            <LinearGradient
              colors={matchScore >= 70 ? ['#EC4899', '#A855F7'] : ['#A855F766', '#EC489944']}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.32 }}>
                {member.displayName?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </LinearGradient>
          )}
        </View>
      </View>

      {/* Signal dot */}
      <View
        style={{
          position: 'absolute',
          bottom: badgeOffset,
          right: badgeOffset,
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: sigColor,
          borderWidth: 2,
          borderColor: '#0A0A0F',
        }}
      />

      {/* Partner badge */}
      {isPartner && (
        <View
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: '#0A0A0F',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 11 }}>💗</Text>
        </View>
      )}

      {/* Match % badge */}
      {matchScore >= 55 && (
        <View
          style={{
            position: 'absolute',
            top: 2,
            alignSelf: 'center',
            backgroundColor: matchScore >= 80 ? '#EC4899' : '#A855F7',
            borderRadius: 7,
            paddingHorizontal: 5,
            paddingVertical: 1,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>{matchScore}%</Text>
        </View>
      )}

      {/* First name */}
      <View
        style={{
          marginTop: 4,
          paddingHorizontal: 7,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: '#05050AB8',
          borderWidth: 1,
          borderColor: '#FFFFFF12',
          maxWidth: size + 28,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            color: '#E5E7EB',
            fontSize: 9,
            fontWeight: '700',
            textAlign: 'center',
            textShadowColor: '#000',
            textShadowRadius: 6,
          }}
        >
          {member.displayName?.split(' ')[0] ?? ''}
        </Text>
      </View>

      {/* Stale caption */}
      {isStale && (
        <Text
          style={{
            color: '#9CA3AF',
            fontSize: 8,
            fontWeight: '700',
            textAlign: 'center',
            marginTop: 1,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
          }}
        >
          stale
        </Text>
      )}
    </Animated.View>
  );
}

// ─── PulseRing ────────────────────────────────────────────────────────────────
function PulseRing({
  delay,
  color = '#EC4899',
  canvasHeight,
}: {
  delay: number;
  color?: string;
  canvasHeight: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 2.2] });
  const opacity = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.4, 0.15, 0] });
  const size = SCREEN_WIDTH * 0.5;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: color,
        left: SCREEN_WIDTH / 2 - size / 2,
        top: canvasHeight / 2 - size / 2,
        transform: [{ scale }],
        opacity,
      }}
    />
  );
}

// ─── SpinningRing ─────────────────────────────────────────────────────────────
function SpinningRing({
  size,
  duration,
  clockwise,
  color,
  canvasHeight,
}: {
  size: number;
  duration: number;
  clockwise: boolean;
  color: string;
  canvasHeight: number;
}) {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [duration, spinAnim]);

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: clockwise ? ['0deg', '360deg'] : ['360deg', '0deg'],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: color,
        left: SCREEN_WIDTH / 2 - size / 2,
        top: canvasHeight / 2 - size / 2,
        transform: [{ rotate }],
      }}
    />
  );
}

// ─── FloatingDot ──────────────────────────────────────────────────────────────
function FloatingDot({ index }: { index: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const duration = 6000 + index * 400;
  const delay = index * 1100;
  const x = 40 + (index * (SCREEN_WIDTH - 80)) / 5;
  const startY = SCREEN_HEIGHT * 0.6 - (index % 3) * 80;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay, duration]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -80] });
  const opacity = anim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.5, 0.4, 0] });
  const dotColor = index % 2 === 0 ? '#EC4899' : '#A855F7';
  const dotSize = 3 + (index % 3);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: dotSize,
        height: dotSize,
        borderRadius: dotSize / 2,
        backgroundColor: dotColor,
        left: x,
        top: startY,
        transform: [{ translateY }],
        opacity,
      }}
    />
  );
}

// ─── MemberDetailModal ───────────────────────────────────────────────────────
interface MemberDetailModalProps {
  member: any | null;
  myProfile: any;
  myPrefs: any;
  mySignalType: string;
  seekingGender: string[];
  maxDistance: number;
  onClose: () => void;
  onViewProfile: (userId: number) => void;
  onMessage: (userId: number) => void;
  onPoke: (userId: number) => void;
}

function getFactorColor(factor: MatchFactor): string {
  if (!factor.matched) return '#374151';
  switch (factor.key) {
    case 'proximity':
      return '#10B981';
    case 'community':
      return '#A855F7';
    case 'gender':
      return '#EC4899';
    case 'orientation':
      return '#F472B6';
    case 'interests':
      return '#FBBF24';
    case 'signal':
      return '#60A5FA';
    case 'queer':
      return '#F59E0B';
    case 'relstyle':
      return '#C084FC';
    case 'lookingfor':
      return '#34D399';
    default:
      return '#EC4899';
  }
}

function MemberDetailModal({
  member,
  myProfile,
  myPrefs,
  mySignalType,
  seekingGender,
  maxDistance,
  onClose,
  onViewProfile,
  onMessage,
  onPoke,
}: MemberDetailModalProps) {
  const theme = useTheme();
  const sigColor = member
    ? (SIGNAL_COLORS[member.signalType as keyof typeof SIGNAL_COLORS] ?? '#6B7280')
    : '#6B7280';

  const factors = React.useMemo(
    () =>
      member
        ? calculateMatchBreakdown(
            member,
            myProfile,
            myPrefs,
            mySignalType,
            seekingGender,
            maxDistance
          )
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [member?.userId, mySignalType, seekingGender, maxDistance]
  );

  const matchScore = React.useMemo(
    () => Math.min(Math.round((factors.reduce((s, f) => s + f.points, 0) / 145) * 100), 100),
    [factors]
  );

  // Score count-up
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    if (!member) {
      setDisplayScore(0);
      return;
    }
    setDisplayScore(0);
    let current = 0;
    const increment = Math.max(1, Math.ceil(matchScore / 20));
    const iv = setInterval(() => {
      current += increment;
      if (current >= matchScore) {
        setDisplayScore(matchScore);
        clearInterval(iv);
      } else {
        setDisplayScore(current);
      }
    }, 30);
    return () => clearInterval(iv);
  }, [member, matchScore]);

  // Ring opacity
  const ringOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!member) {
      ringOpacity.setValue(0);
      return;
    }
    ringOpacity.setValue(0);
    Animated.timing(ringOpacity, { toValue: 1, duration: 900, useNativeDriver: true }).start();
  }, [member, ringOpacity]);

  // Avatar pulse for high match
  const avatarPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!member || matchScore < 70) {
      avatarPulse.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(avatarPulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(avatarPulse, { toValue: 1.0, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [avatarPulse, member, matchScore]);

  // Row stagger
  const rowAnims = useRef<Animated.Value[]>([]);
  useEffect(() => {
    if (!member || factors.length === 0) return;
    rowAnims.current = factors.map(() => new Animated.Value(0));
    Animated.stagger(
      60,
      rowAnims.current.map((a) =>
        Animated.timing(a, { toValue: 1, duration: 300, useNativeDriver: true })
      )
    ).start();
  }, [factors, member]);

  const matchLabel =
    matchScore >= 80
      ? 'Strong Match 🔥'
      : matchScore >= 60
        ? 'Good Vibe ✨'
        : matchScore >= 40
          ? 'Worth a Chat 💬'
          : 'Just Saying Hi 👋';

  if (!member) return null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Backdrop — tap to dismiss */}
        <TouchableOpacity
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: theme.isDark ? 'rgba(0,0,0,0.85)' : theme.colors.overlay,
          }}
          activeOpacity={1}
          onPress={onClose}
        />
        {/* Card — sits on top of backdrop, scroll is unimpeded */}
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: SCREEN_HEIGHT * 0.92,
            minHeight: SCREEN_HEIGHT * 0.85,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          {/* Drag handle + close button row */}
          <View
            style={{
              paddingTop: 14,
              paddingHorizontal: 20,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.colors.border,
              }}
            />
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: theme.colors.surfaceHigh,
                borderWidth: 1,
                borderColor: theme.colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 44 }}
          >
            {/* ── Hero ── */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Animated.View style={{ transform: [{ scale: avatarPulse }], marginBottom: 12 }}>
                <View
                  style={{
                    width: 112,
                    height: 112,
                    borderRadius: 56,
                    backgroundColor: `${sigColor}18`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 48,
                      overflow: 'hidden',
                      borderWidth: 2.5,
                      borderColor: sigColor,
                    }}
                  >
                    {member.avatarUrl ? (
                      <Image source={{ uri: member.avatarUrl }} style={{ width: 96, height: 96 }} />
                    ) : (
                      <LinearGradient
                        colors={['#EC4899', '#A855F7']}
                        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 32 }}>
                          {member.displayName?.[0]?.toUpperCase() ?? '?'}
                        </Text>
                      </LinearGradient>
                    )}
                  </View>
                </View>
              </Animated.View>

              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 22,
                  fontWeight: '800',
                  marginBottom: 6,
                }}
              >
                {member.displayName}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sigColor }} />
                <Text style={{ color: sigColor, fontSize: 13, fontWeight: '600' }}>
                  {SIGNAL_CONFIG[member.signalType as keyof typeof SIGNAL_CONFIG]?.label ??
                    cap(member.signalType ?? 'Offline')}
                </Text>
              </View>

              {/* Stale-signal notice */}
              {member.expiresAt && new Date(member.expiresAt).getTime() < Date.now() ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: theme.colors.surfaceHigh,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    marginBottom: 10,
                  }}
                >
                  <Ionicons name="time-outline" size={12} color={theme.colors.textMuted} />
                  <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' }}>
                    Signal expired — may not be current
                  </Text>
                </View>
              ) : null}

              {member.message ? (
                <Text
                  numberOfLines={2}
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: 13,
                    fontStyle: 'italic',
                    textAlign: 'center',
                    lineHeight: 20,
                    marginBottom: 10,
                    paddingHorizontal: 16,
                  }}
                >
                  &quot;{member.message}&quot;
                </Text>
              ) : null}

              <View
                style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 }}
              >
                {member.gender ? <Chip label={cap(member.gender)} color="#A855F7" /> : null}
                {member.orientation ? (
                  <Chip label={cap(member.orientation)} color="#EC4899" />
                ) : null}
                {member.isQueerFriendly ? <Chip label="🌈 QF" color="#F59E0B" /> : null}
              </View>
            </View>

            {/* ── Match Score Arc ── */}
            <View style={{ alignItems: 'center', marginBottom: 28 }}>
              <View
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 55,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Base ring */}
                <View
                  style={{
                    position: 'absolute',
                    width: 110,
                    height: 110,
                    borderRadius: 55,
                    borderWidth: 4,
                    borderColor: theme.colors.border,
                  }}
                />
                {/* Colored overlay (opacity-animated) */}
                <Animated.View
                  style={{
                    position: 'absolute',
                    width: 110,
                    height: 110,
                    borderRadius: 55,
                    borderWidth: 4,
                    borderColor: '#EC4899',
                    opacity: ringOpacity,
                  }}
                />
                <View style={{ alignItems: 'center' }}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: 30,
                      fontWeight: '900',
                      lineHeight: 34,
                    }}
                  >
                    {displayScore}
                  </Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' }}>
                    % Match
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontWeight: '700',
                  fontSize: 15,
                  marginTop: 10,
                }}
              >
                {matchLabel}
              </Text>
            </View>

            {/* ── Breakdown rows ── */}
            <Text
              style={{
                color: theme.colors.text,
                fontWeight: '700',
                fontSize: 15,
                marginBottom: 14,
              }}
            >
              Why you match
            </Text>

            {factors.map((factor, i) => {
              const fColor = getFactorColor(factor);
              const anim = rowAnims.current[i] ?? new Animated.Value(1);
              return (
                <Animated.View
                  key={factor.key}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 12,
                    opacity: anim,
                    transform: [
                      {
                        translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
                      },
                    ],
                  }}
                >
                  {/* Emoji box */}
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: factor.matched ? `${fColor}22` : theme.colors.surfaceHigh,
                      borderWidth: factor.matched ? 1 : 0,
                      borderColor: factor.matched ? `${fColor}44` : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{factor.emoji}</Text>
                  </View>

                  {/* Label + detail */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: factor.matched ? theme.colors.text : theme.colors.textMuted,
                        fontWeight: factor.matched ? '700' : '500',
                        fontSize: 13,
                      }}
                    >
                      {factor.label}
                    </Text>
                    {factor.detail ? (
                      <Text
                        style={{
                          color: factor.matched
                            ? theme.colors.textSecondary
                            : theme.colors.textMuted,
                          fontSize: 11,
                          marginTop: 1,
                        }}
                      >
                        {factor.detail}
                      </Text>
                    ) : null}
                  </View>

                  {/* Points pill */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 3,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 10,
                      backgroundColor: factor.matched ? `${fColor}22` : theme.colors.surfaceHigh,
                    }}
                  >
                    <Text
                      style={{
                        color: factor.matched ? fColor : theme.colors.textMuted,
                        fontWeight: '700',
                        fontSize: 12,
                      }}
                    >
                      +{factor.points}
                    </Text>
                    {factor.matched ? (
                      <Text style={{ color: '#10B981', fontSize: 11 }}>✓</Text>
                    ) : null}
                  </View>
                </Animated.View>
              );
            })}

            {/* ── Action buttons ── */}
            <View style={{ marginTop: 20, gap: 10 }}>
              {member.signalType === 'available' && (
                <TouchableOpacity
                  onPress={() => onPoke(member.userId)}
                  style={{
                    borderRadius: 14,
                    padding: 15,
                    alignItems: 'center',
                    borderWidth: 1.5,
                    borderColor: sigColor,
                    backgroundColor: `${sigColor}14`,
                  }}
                >
                  <Text style={{ color: sigColor, fontWeight: '700', fontSize: 15 }}>
                    👋 Poke for Casual Meetup
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={() => onMessage(member.userId)}>
                <LinearGradient
                  colors={['#EC4899', '#A855F7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 14, padding: 15, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>💬 Message</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => onViewProfile(member.userId)}
                style={{
                  borderRadius: 14,
                  padding: 15,
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: theme.colors.primary,
                  backgroundColor: 'transparent',
                }}
              >
                <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 15 }}>
                  View Full Profile
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── PulseScreen ───────────────────────────────────────────────────────────────
export default function PulseScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const themed = useMemo(
    () => ({
      screen: theme.isDark ? '#0D0820' : theme.colors.backgroundDeep,
      headerGradient: theme.isDark
        ? (['#24103F', '#140A28', '#090813'] as const)
        : (['#FFF7FC', '#F8EDFA', '#F3E7F7'] as const),
      headerBorder: theme.isDark ? '#ffffff14' : theme.colors.border,
      headerGlowPink: theme.isDark ? '#EC48991A' : 'rgba(236,72,153,0.08)',
      headerGlowPurple: theme.isDark ? '#A855F714' : 'rgba(168,85,247,0.08)',
      fieldCard: theme.isDark ? '#090811D9' : 'rgba(255,255,255,0.9)',
      fieldBorder: theme.isDark ? '#FFFFFF10' : theme.colors.border,
      fieldLabel: theme.isDark ? '#8F86A8' : theme.colors.textMuted,
      fieldValue: theme.colors.text,
      canvasBorder: theme.isDark ? '#FFFFFF10' : theme.colors.border,
    }),
    [theme]
  );
  const router = useRouter();
  const { hasToken } = useAuth();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isCompact = windowWidth < 390;
  const pulseHeight = Math.max(
    430,
    windowHeight - insets.top - insets.bottom - (isCompact ? 210 : 230)
  );

  const [myLocation, setMyLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [showSignalModal, setShowSignalModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  // Signal form state
  const [mySignalType, setMySignalType] = useState<SignalType>('offline');
  const [seekingGender, setSeekingGender] = useState<string[]>(['any']);
  const [seekingDynamic, setSeekingDynamic] = useState<string[]>([]);
  const [signalMessage, setSignalMessage] = useState('');
  const [isQueerFriendly, setIsQueerFriendly] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number>(50);
  const [minMatchThreshold, setMinMatchThreshold] = useState<number>(0); // 0 = show all

  const { data: profileData } = trpc.profile.me.useQuery(undefined, { enabled: hasToken });
  const { data: primaryPartnerData } = trpc.partners.myPrimaryPartner.useQuery(undefined, {
    enabled: hasToken,
  });
  const primaryPartner = primaryPartnerData as any;
  const { data: mySignalData, refetch: refetchMySignal } = trpc.members.mySignal.useQuery(
    undefined,
    { enabled: hasToken }
  );
  const {
    data: signalsData,
    isLoading: signalsLoading,
    isError: signalsIsError,
    error: signalsError,
    refetch: refetchSignals,
  } = trpc.members.activeSignals.useQuery(
    { latitude: myLocation?.lat, longitude: myLocation?.lon },
    { enabled: hasToken, refetchInterval: 30_000 }
  );

  const myProfile = profileData as any;
  const myPrefs = useMemo(() => {
    try {
      const raw = myProfile?.preferences;
      return typeof raw === 'string' ? JSON.parse(raw) : (raw ?? {});
    } catch {
      return {};
    }
  }, [myProfile]);

  const members = useMemo(() => (signalsData as any[]) ?? [], [signalsData]);

  // Load persisted maxDistance from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem('pulse_max_distance')
      .then((val) => {
        if (val !== null) {
          const parsed = parseInt(val, 10);
          if (!isNaN(parsed)) setMaxDistance(parsed);
        }
      })
      .catch(() => {});
  }, []);

  // Request location once on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setMyLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });
        }
      } catch {}
    })();
  }, []);

  // Sync signal form from server data — runs on load AND every time the modal opens
  const syncSignalForm = useCallback((s: any) => {
    if (!s) return;
    setMySignalType((s.signalType ?? 'offline') as SignalType);
    const sgRaw = s.seekingGender ?? 'any';
    setSeekingGender(
      sgRaw
        ? sgRaw
            .split(',')
            .map((v: string) => v.trim())
            .filter(Boolean)
        : ['any']
    );
    const sdRaw = s.seekingDynamic ?? '';
    setSeekingDynamic(
      sdRaw
        ? sdRaw
            .split(',')
            .map((v: string) => v.trim())
            .filter(Boolean)
        : []
    );
    setSignalMessage(s.message ?? '');
    setIsQueerFriendly(!!s.isQueerFriendly);
  }, []);

  useEffect(() => {
    if (mySignalData) syncSignalForm(mySignalData);
  }, [mySignalData, syncSignalForm]);

  const signalMutation = trpc.members.signal.useMutation({
    onSuccess: () => {
      refetchSignals();
      refetchMySignal();
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const pokeMutation = trpc.members.poke.useMutation({
    onSuccess: () =>
      Alert.alert('Poke sent', 'They have been notified that you are open to meeting up.'),
    onError: (e: any) => Alert.alert('Could not send poke', e.message),
  });

  const createConversation = trpc.messages.createConversation.useMutation({
    onSuccess: (convId: any) => {
      setSelectedMember(null);
      router.push(`/chat/${convId}` as any);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  function handleSaveSignal() {
    // Persist distance preference
    AsyncStorage.setItem('pulse_max_distance', String(maxDistance)).catch(() => {});

    signalMutation.mutate({
      signalType: mySignalType,
      // Join arrays to comma string for storage (DB column is varchar)
      seekingGender: seekingGender.filter((g) => g !== 'any').join(',') || 'any',
      seekingDynamic: seekingDynamic.join(',') || undefined,
      message: signalMessage || undefined,
      isQueerFriendly,
      latitude: myLocation?.lat,
      longitude: myLocation?.lon,
    });
    setShowSignalModal(false);
  }

  const scoredMembers = useMemo(
    () =>
      members
        .map((m) => ({
          ...m,
          isPartner: primaryPartner ? m.userId === primaryPartner.partnerUserId : false,
          matchScore: calculateMatchScore(
            m,
            myProfile,
            myPrefs,
            mySignalType,
            seekingGender,
            maxDistance
          ),
        }))
        // Strict gender filter: if specific genders chosen (not 'any'), hide non-matching members
        .filter((m) => {
          const hasAny = seekingGender.length === 0 || seekingGender.includes('any');
          if (hasAny) return true;
          const mg = (m.gender ?? '').toLowerCase();
          return seekingGender.map((g) => g.toLowerCase()).includes(mg);
        })
        .filter((m) => m.distance == null || m.distance <= maxDistance)
        .filter((m) => m.isPartner || m.matchScore >= minMatchThreshold)
        .sort((a, b) => b.matchScore - a.matchScore),
    [members, myProfile, myPrefs, mySignalType, primaryPartner, seekingGender, maxDistance, minMatchThreshold]
  );

  const positions = useMemo(
    () => layoutPositions(scoredMembers.length, windowWidth, pulseHeight),
    [scoredMembers.length, windowWidth, pulseHeight]
  );

  const myConfig = SIGNAL_CONFIG[mySignalType];
  const pulseCanvasLoading = signalsLoading && !signalsData;
  const pulseCanvasError = signalsIsError && !signalsData;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themed.screen }} edges={['bottom']}>
      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 6, paddingBottom: 10 }}>
        <LinearGradient
          colors={themed.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 28,
            borderWidth: 1,
            borderColor: themed.headerBorder,
            paddingHorizontal: 16,
            paddingVertical: 14,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: -30,
              right: -16,
              width: 116,
              height: 116,
              borderRadius: 58,
              backgroundColor: themed.headerGlowPink,
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: -46,
              left: -10,
              width: 136,
              height: 136,
              borderRadius: 68,
              backgroundColor: themed.headerGlowPurple,
            }}
          />
          <View
            style={{
              flexDirection: isCompact ? 'column' : 'row',
              alignItems: isCompact ? 'stretch' : 'center',
            }}
          >
            <View
              style={{
                flex: 1,
                paddingRight: isCompact ? 0 : 12,
                marginBottom: isCompact ? 14 : 0,
              }}
            >
              <Text
                style={{
                  color: theme.isDark ? '#B8A8D9' : theme.colors.textSecondary,
                  fontSize: 10,
                  letterSpacing: 1.8,
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                Live discovery field
              </Text>
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 26,
                  lineHeight: 28,
                  fontFamily: FONT.displayBold,
                }}
              >
                Pulse 💗
              </Text>
              <Text
                style={{
                  color: theme.isDark ? '#9488B5' : theme.colors.textMuted,
                  fontSize: 12,
                  marginTop: 4,
                  lineHeight: 17,
                }}
              >
                {scoredMembers.length} nearby, {myLocation ? 'location tuned in' : 'location off'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                refetchMySignal();
                setShowSignalModal(true);
              }}
              style={{
                alignSelf: isCompact ? 'stretch' : 'flex-start',
                paddingHorizontal: 13,
                paddingVertical: 10,
                borderRadius: 18,
                backgroundColor: theme.isDark ? '#090811A8' : theme.colors.surfaceHigh,
                borderColor: `${myConfig.color}88`,
                borderWidth: 1,
                minWidth: 106,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <View
                  style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: myConfig.color }}
                />
                <Text
                  style={{
                    color: myConfig.color,
                    fontWeight: '700',
                    fontSize: 13,
                    fontFamily: FONT.displaySemiBold,
                  }}
                >
                  {myConfig.label}
                </Text>
              </View>
              <Text
                style={{
                  color: theme.isDark ? '#8F86A8' : theme.colors.textMuted,
                  fontSize: 10,
                  textAlign: 'center',
                  marginTop: 4,
                }}
              >
                Tap to edit
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
            {[
              { label: 'Visible', value: scoredMembers.length },
              { label: 'Radius', value: maxDistance === 999 ? 'Any' : `${maxDistance}km` },
              {
                label: 'Min match',
                value: minMatchThreshold === 0 ? 'All' : `${minMatchThreshold}%+`,
              },
            ].map((item) => (
              <View
                key={item.label}
                style={{
                  flexGrow: 1,
                  minWidth: isCompact ? 140 : 0,
                  borderRadius: 16,
                  paddingHorizontal: 10,
                  paddingVertical: 9,
                  backgroundColor: theme.isDark ? '#FFFFFF0A' : theme.colors.surfaceHigh,
                  borderWidth: 1,
                  borderColor: theme.isDark ? '#FFFFFF10' : theme.colors.border,
                }}
              >
                <Text
                  style={{
                    color: theme.isDark ? '#8A7DAA' : theme.colors.textMuted,
                    fontSize: 9,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  {item.label}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: theme.colors.text,
                    fontSize: 16,
                    marginTop: 4,
                    fontFamily: FONT.displayBold,
                  }}
                >
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </View>

      {/* ── Bubble canvas ── */}
      <View
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          marginHorizontal: 12,
          marginBottom: 12,
          borderRadius: 34,
          borderWidth: 1,
          borderColor: themed.canvasBorder,
        }}
      >
        {pulseCanvasLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={theme.colors.pink} size="large" />
          </View>
        ) : pulseCanvasError ? (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 28,
            }}
          >
            <Ionicons name="cloud-offline-outline" size={42} color={theme.colors.textMuted} />
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 20,
                fontWeight: '800',
                textAlign: 'center',
                marginTop: 14,
              }}
            >
              Could not load Pulse
            </Text>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: 14,
                textAlign: 'center',
                lineHeight: 21,
                marginTop: 8,
              }}
            >
              {(signalsError as any)?.message ?? 'Please try again in a moment.'}
            </Text>
            <TouchableOpacity
              onPress={() => refetchSignals()}
              style={{
                marginTop: 18,
                paddingHorizontal: 18,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Text style={{ color: theme.colors.text, fontWeight: '800' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Depth gradient background */}
            <LinearGradient
              colors={['#120B24', '#090812', '#05050B']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <LinearGradient
              colors={['#EC48991A', 'transparent', '#A855F712']}
              start={{ x: 0.15, y: 0.05 }}
              end={{ x: 0.88, y: 0.95 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View
              style={{
                position: 'absolute',
                top: -70,
                left: -30,
                width: 220,
                height: 220,
                borderRadius: 110,
                backgroundColor: '#A855F710',
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: 40,
                right: -60,
                width: 240,
                height: 240,
                borderRadius: 120,
                backgroundColor: '#EC48990D',
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: -80,
                left: windowWidth * 0.2,
                width: 280,
                height: 280,
                borderRadius: 140,
                backgroundColor: '#60A5FA08',
              }}
            />

            {/* Radar grid / map texture */}
            {[0.34, 0.52, 0.72, 0.9].map((scale, idx) => {
              const size = Math.min(windowWidth - 44, pulseHeight - 72) * scale;
              return (
                <View
                  key={`grid-ring-${idx}`}
                  style={{
                    position: 'absolute',
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth: 1,
                    borderColor: idx % 2 === 0 ? '#FFFFFF10' : '#EC489912',
                    left: windowWidth / 2 - size / 2,
                    top: pulseHeight / 2 - size / 2,
                  }}
                />
              );
            })}
            <View
              style={{
                position: 'absolute',
                left: windowWidth / 2 - 0.5,
                top: pulseHeight * 0.08,
                bottom: pulseHeight * 0.08,
                width: 1,
                backgroundColor: '#FFFFFF08',
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: pulseHeight / 2 - 0.5,
                left: 24,
                right: 24,
                height: 1,
                backgroundColor: '#FFFFFF07',
              }}
            />
            <LinearGradient
              colors={['#EC489900', '#EC489916', '#EC489900']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{
                position: 'absolute',
                width: windowWidth * 0.92,
                height: 120,
                left: windowWidth / 2 - (windowWidth * 0.92) / 2,
                top: pulseHeight / 2 - 60,
                borderRadius: 999,
                transform: [{ rotate: '-22deg' }],
                opacity: 0.55,
              }}
            />

            {/* Integrated discovery controls */}
            <View style={{ position: 'absolute', top: 14, left: 14, right: 14, zIndex: 20 }}>
              <View
                style={{
                  borderRadius: 22,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: '#FFFFFF12',
                  backgroundColor: '#090811CC',
                }}
              >
                <LinearGradient
                  colors={['#FFFFFF10', '#FFFFFF04']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ padding: 12 }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text
                        style={{ color: '#F4EEFF', fontSize: 14, fontFamily: FONT.displaySemiBold }}
                      >
                        Discovery tuned
                      </Text>
                      <Text style={{ color: '#8F86A8', fontSize: 11, marginTop: 2 }}>
                        Filter the field without leaving the map
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        refetchMySignal();
                        setShowSignalModal(true);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 14,
                        backgroundColor: '#FFFFFF0A',
                        borderWidth: 1,
                        borderColor: '#FFFFFF12',
                      }}
                    >
                      <Ionicons name="options-outline" size={14} color="#F4EEFF" />
                      <Text style={{ color: '#F4EEFF', fontSize: 12, fontWeight: '700' }}>
                        Signal
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {[0, 30, 50, 70, 85].map((t) => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setMinMatchThreshold(t);
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 14,
                          backgroundColor: minMatchThreshold === t ? '#EC489934' : '#15131F',
                          borderWidth: 1,
                          borderColor: minMatchThreshold === t ? '#EC4899' : '#2D2D3A',
                        }}
                      >
                        <Text
                          style={{
                            color:
                              minMatchThreshold === t
                                ? theme.isDark
                                  ? '#F8D3E7'
                                  : theme.colors.primary
                                : theme.isDark
                                  ? '#8F86A8'
                                  : theme.colors.textMuted,
                            fontSize: 12,
                            fontWeight: '700',
                          }}
                        >
                          {t === 0 ? 'All matches' : `${t}%+`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </LinearGradient>
              </View>
            </View>

            <View
              style={{
                position: 'absolute',
                left: 14,
                right: 14,
                bottom: 16,
                zIndex: 20,
                flexDirection: 'row',
                gap: 10,
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: 18,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  backgroundColor: themed.fieldCard,
                  borderWidth: 1,
                  borderColor: themed.fieldBorder,
                }}
              >
                <Text
                  style={{
                    color: themed.fieldLabel,
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  Field radius
                </Text>
                <Text
                  style={{
                    color: themed.fieldValue,
                    fontSize: 16,
                    marginTop: 4,
                    fontFamily: FONT.displayBold,
                  }}
                >
                  {maxDistance === 999 ? 'Anywhere' : `${maxDistance}km`}
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  borderRadius: 18,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  backgroundColor: themed.fieldCard,
                  borderWidth: 1,
                  borderColor: themed.fieldBorder,
                }}
              >
                <Text
                  style={{
                    color: themed.fieldLabel,
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  Signal state
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: myConfig.color,
                    fontSize: 16,
                    marginTop: 4,
                    fontFamily: FONT.displayBold,
                  }}
                >
                  {myConfig.label}
                </Text>
              </View>
            </View>

            {/* Slow-rotating outer rings */}
            <SpinningRing
              size={windowWidth * 1.4}
              duration={30000}
              clockwise={true}
              color="#EC489918"
              canvasHeight={pulseHeight}
            />
            <SpinningRing
              size={windowWidth * 1.2}
              duration={45000}
              clockwise={false}
              color="#A855F714"
              canvasHeight={pulseHeight}
            />

            {/* Sonar pulse rings */}
            <PulseRing delay={0} color="#EC4899" canvasHeight={pulseHeight} />
            <PulseRing delay={1333} color="#A855F7" canvasHeight={pulseHeight} />
            <PulseRing delay={2666} color="#EC4899" canvasHeight={pulseHeight} />

            {/* Floating particles */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <FloatingDot key={i} index={i} />
            ))}

            {/* Member bubbles — sorted by matchScore (highest = largest) */}
            {scoredMembers.map((member, i) => {
              const isStale = !!(
                member.expiresAt && new Date(member.expiresAt).getTime() < Date.now()
              );
              return (
                <MemberBubble
                  key={String(member.userId)}
                  member={member}
                  matchScore={member.matchScore}
                  x={positions[i]?.x ?? windowWidth / 2}
                  y={positions[i]?.y ?? pulseHeight / 2}
                  onPress={() => setSelectedMember(member)}
                  isPartner={member.isPartner}
                  isStale={isStale}
                />
              );
            })}

            {/* My bubble — center */}
            <View
              style={{
                position: 'absolute',
                left: windowWidth / 2 - 58,
                top: pulseHeight / 2 - 58,
                alignItems: 'center',
                zIndex: 5,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  refetchMySignal();
                  setShowSignalModal(true);
                }}
                activeOpacity={0.9}
              >
                <View
                  style={{
                    width: 116,
                    height: 116,
                    borderRadius: 58,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.isDark ? '#0B0914E6' : theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.isDark ? '#FFFFFF10' : theme.colors.border,
                    shadowColor: myConfig.color,
                    shadowOpacity: theme.isDark ? 0.35 : 0.18,
                    shadowRadius: 28,
                    shadowOffset: { width: 0, height: 10 },
                  }}
                >
                  <LinearGradient
                    colors={
                      theme.isDark
                        ? [`${myConfig.color}33`, '#120C1E', `${myConfig.color}12`]
                        : [`${myConfig.color}18`, '#FFFFFF', `${myConfig.color}10`]
                    }
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      bottom: 0,
                      left: 0,
                      borderRadius: 58,
                    }}
                  />
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      overflow: 'hidden',
                      borderWidth: 2.5,
                      borderColor: myConfig.color,
                    }}
                  >
                    {myProfile?.avatarUrl ? (
                      <Image
                        source={{ uri: myProfile.avatarUrl }}
                        style={{ width: 80, height: 80 }}
                      />
                    ) : (
                      <LinearGradient
                        colors={['#EC4899', '#A855F7']}
                        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 26 }}>
                          {myProfile?.displayName?.[0] ?? 'M'}
                        </Text>
                      </LinearGradient>
                    )}
                  </View>
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: myConfig.color,
                      borderWidth: 2,
                      borderColor: theme.isDark ? '#0A0A0F' : theme.colors.surface,
                    }}
                  />
                  <Text
                    style={{
                      color: theme.isDark ? '#7A6F97' : theme.colors.textMuted,
                      fontSize: 10,
                      textAlign: 'center',
                      marginTop: 10,
                      textTransform: 'uppercase',
                      letterSpacing: 1.4,
                    }}
                  >
                    Broadcasting
                  </Text>
                  <Text
                    style={{
                      color: theme.isDark ? '#F3EEFF' : theme.colors.text,
                      fontSize: 18,
                      textAlign: 'center',
                      marginTop: 2,
                      fontFamily: FONT.displayBold,
                    }}
                  >
                    You
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Empty state */}
            {scoredMembers.length === 0 && (
              <View
                style={{
                  position: 'absolute',
                  bottom: 106,
                  left: 0,
                  right: 0,
                  alignItems: 'center',
                  paddingHorizontal: isCompact ? 28 : 44,
                }}
              >
                <View
                  style={{
                    borderRadius: 24,
                    paddingHorizontal: 24,
                    paddingVertical: 22,
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 38, marginBottom: 12 }}>👀</Text>
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      textAlign: 'center',
                      fontSize: 15,
                      lineHeight: 22,
                    }}
                  >
                    No one&apos;s active right now.{'\n'}
                    Tap your signal above to go{' '}
                    <Text style={{ color: '#EC4899', fontWeight: '700' }}>Available</Text> or{' '}
                    <Text style={{ color: '#A855F7', fontWeight: '700' }}>Looking</Text> and appear
                    in others&apos; Pulse.
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </View>

      {/* ── Signal modal ── */}
      <Modal visible={showSignalModal} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: theme.isDark ? 'rgba(0,0,0,0.82)' : theme.colors.overlay,
            justifyContent: 'flex-end',
          }}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingTop: 20,
                paddingHorizontal: 24,
                paddingBottom: 36,
                maxHeight: '88%',
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.colors.border,
                  alignSelf: 'center',
                  marginBottom: 16,
                }}
              />
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 22,
                  marginBottom: 4,
                  fontFamily: FONT.displayBold,
                }}
              >
                Set Your Signal 📡
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginBottom: 20 }}>
                Signals expire after 4 hours. Only approved members can see you.
              </Text>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Status row */}
                <Text style={styles.label}>Status</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                  {(['available', 'looking', 'busy', 'offline'] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setMySignalType(t)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 12,
                        alignItems: 'center',
                        backgroundColor:
                          mySignalType === t ? SIGNAL_CONFIG[t].bg : theme.colors.surfaceHigh,
                        borderColor:
                          mySignalType === t ? SIGNAL_CONFIG[t].color : theme.colors.border,
                        borderWidth: 1,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            mySignalType === t ? SIGNAL_CONFIG[t].color : theme.colors.textMuted,
                          fontSize: 11,
                          fontWeight: '700',
                        }}
                      >
                        {cap(t)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Seeking gender — multi-select */}
                <Text style={styles.label}>Seeking</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 20 }}
                >
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {['Any', 'Female', 'Male', 'Non-binary', 'Couple', 'Group'].map((g) => {
                      const val = g.toLowerCase();
                      const isAnyOpt = val === 'any';
                      const selected = isAnyOpt
                        ? seekingGender.includes('any') || seekingGender.length === 0
                        : seekingGender.includes(val);
                      return (
                        <TouchableOpacity
                          key={g}
                          onPress={() => {
                            Haptics.selectionAsync();
                            if (isAnyOpt) {
                              setSeekingGender(['any']);
                            } else {
                              setSeekingGender((prev) => {
                                const without = prev.filter((x) => x !== 'any');
                                if (without.includes(val)) {
                                  const next = without.filter((x) => x !== val);
                                  return next.length === 0 ? ['any'] : next;
                                }
                                return [...without, val];
                              });
                            }
                          }}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 20,
                            backgroundColor: selected ? '#EC489930' : theme.colors.surfaceHigh,
                            borderColor: selected ? '#EC4899' : theme.colors.border,
                            borderWidth: 1,
                          }}
                        >
                          <Text
                            style={{
                              color: selected ? '#EC4899' : theme.colors.textMuted,
                              fontWeight: '600',
                            }}
                          >
                            {g}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Looking For — multi-select */}
                <Text style={styles.label}>Looking For</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 20 }}
                >
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                      { label: 'Chat', value: 'chat' },
                      { label: 'Play Date', value: 'play_date' },
                      { label: 'Event Buddy', value: 'event_buddy' },
                      { label: 'Friendship', value: 'friendship' },
                      { label: 'Couple Play', value: 'couple_play' },
                      { label: 'Group Play', value: 'group_play' },
                    ].map((d) => {
                      const selected = seekingDynamic.includes(d.value);
                      return (
                        <TouchableOpacity
                          key={d.value}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setSeekingDynamic((prev) =>
                              prev.includes(d.value)
                                ? prev.filter((x) => x !== d.value)
                                : [...prev, d.value]
                            );
                          }}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 20,
                            backgroundColor: selected ? '#A855F730' : theme.colors.surfaceHigh,
                            borderColor: selected ? '#A855F7' : theme.colors.border,
                            borderWidth: 1,
                          }}
                        >
                          <Text
                            style={{
                              color: selected ? '#A855F7' : theme.colors.textMuted,
                              fontWeight: '600',
                            }}
                          >
                            {d.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Distance Range */}
                <Text style={styles.label}>Distance Range</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 20 }}
                >
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {DISTANCE_OPTIONS.map((d) => (
                      <TouchableOpacity
                        key={d.value}
                        onPress={() => setMaxDistance(d.value)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 20,
                          backgroundColor:
                            maxDistance === d.value ? '#A855F730' : theme.colors.surfaceHigh,
                          borderColor: maxDistance === d.value ? '#A855F7' : theme.colors.border,
                          borderWidth: 1,
                        }}
                      >
                        <Text
                          style={{
                            color: maxDistance === d.value ? '#A855F7' : theme.colors.textMuted,
                            fontWeight: '600',
                          }}
                        >
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                {/* Message */}
                <Text style={styles.label}>Message (optional)</Text>
                <TextInput
                  value={signalMessage}
                  onChangeText={setSignalMessage}
                  placeholder="What's on your mind..."
                  placeholderTextColor={theme.colors.textMuted}
                  style={{
                    backgroundColor: theme.colors.surfaceHigh,
                    borderRadius: 12,
                    borderColor: theme.colors.border,
                    borderWidth: 1,
                    padding: 12,
                    color: theme.colors.text,
                    marginBottom: 16,
                  }}
                  maxLength={200}
                />

                {/* Queer friendly toggle */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                  <Text style={{ color: theme.colors.text, flex: 1, fontSize: 15 }}>
                    🌈 Queer Friendly
                  </Text>
                  <Switch
                    value={isQueerFriendly}
                    onValueChange={setIsQueerFriendly}
                    trackColor={{ false: '#2D2D3A', true: '#EC4899' }}
                    thumbColor={isQueerFriendly ? '#fff' : '#9CA3AF'}
                  />
                </View>

                <TouchableOpacity onPress={handleSaveSignal} disabled={signalMutation.isPending}>
                  <LinearGradient
                    colors={['#EC4899', '#A855F7']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      borderRadius: 14,
                      padding: 16,
                      alignItems: 'center',
                      opacity: signalMutation.isPending ? 0.6 : 1,
                    }}
                  >
                    <Text
                      style={{
                        color: '#fff',
                        fontWeight: '800',
                        fontSize: 16,
                        fontFamily: FONT.displaySemiBold,
                      }}
                    >
                      {signalMutation.isPending ? 'Saving...' : 'Update Signal 📡'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowSignalModal(false)}
                  style={{ marginTop: 14, alignItems: 'center' }}
                >
                  <Text style={{ color: theme.colors.textMuted, fontSize: 15 }}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Member detail modal ── */}
      <MemberDetailModal
        member={selectedMember}
        myProfile={myProfile}
        myPrefs={myPrefs}
        mySignalType={mySignalType}
        seekingGender={seekingGender}
        maxDistance={maxDistance}
        onClose={() => setSelectedMember(null)}
        onViewProfile={(userId) => {
          setSelectedMember(null);
          router.push(`/member/${userId}` as any);
        }}
        onMessage={(userId) => {
          createConversation.mutate({ participantIds: [userId] });
        }}
        onPoke={(userId) => {
          pokeMutation.mutate({ userId });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  label: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
});
