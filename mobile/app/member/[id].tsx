import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpc } from '../../lib/trpc';
import Avatar from '../../components/Avatar';
import { FONT } from '../../lib/fonts';
import { useTheme } from '../../lib/theme';

// ── helpers ───────────────────────────────────────────────────────────────────

function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function safeParsePrefs(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function formatSharedEventDate(date: string | Date | null | undefined) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function capitalize(value?: string | null) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const ORIENTATION_COLORS: Record<string, string> = {
  straight: '#F9A8D4',
  gay: '#C084FC',
  lesbian: '#FDA4AF',
  bisexual: '#A78BFA',
  queer: '#67E8F9',
  pansexual: '#FDE68A',
};

const SIGNAL_COLORS: Record<string, string> = {
  available: '#22C55E',
  looking: '#EAB308',
  busy: '#F97316',
  offline: '#6B7280',
};

const SIGNAL_LABELS: Record<string, string> = {
  available: 'Available',
  looking: 'Looking',
  busy: 'Busy',
  offline: 'Offline',
};

// ── component ─────────────────────────────────────────────────────────────────

export default function MemberProfileScreen() {
  const { id, returnTo, reopenUserId } = useLocalSearchParams<{
    id: string;
    returnTo?: string;
    reopenUserId?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, alpha, gradients } = useTheme();

  const {
    data: member,
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.members.byId.useQuery({ userId: Number(id) }, { enabled: !!id });
  const { data: wallPosts, isLoading: wallLoading } = trpc.members.wall.useQuery(
    { userId: Number(id), limit: 30 },
    { enabled: !!id }
  );
  const { data: connectionsData } = trpc.partners.connectionsFor.useQuery(
    { userId: Number(id) },
    { enabled: !!id }
  );
  const connections = (connectionsData as any[]) ?? [];

  const createConversation = trpc.messages.createConversation.useMutation({
    onSuccess: (cid: any) => router.push(`/chat/${cid}` as any),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const pokeMutation = trpc.members.poke.useMutation({
    onSuccess: () =>
      Alert.alert('Poke sent', 'They have been notified that you are open to meeting up.'),
    onError: (e: any) => Alert.alert('Could not send poke', e.message),
  });

  const blockMutation = trpc.blocking.block.useMutation({
    onSuccess: () => {
      Alert.alert('Blocked', 'This member has been blocked. You will no longer see their content.');
      router.back();
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const reportMutation = trpc.blocking.report.useMutation({
    onSuccess: () =>
      Alert.alert('Report Submitted', 'Thank you. Our team will review this report.'),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  function handleBlockReport() {
    Alert.alert('Block or Report', 'What would you like to do?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block Member',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Block Member', 'They will not be able to see your profile or message you.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Block',
              style: 'destructive',
              onPress: () => blockMutation.mutate({ userId: Number(id) }),
            },
          ]),
      },
      {
        text: 'Report Member',
        onPress: () =>
          Alert.alert('Report Member', 'Select a reason:', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Harassment',
              onPress: () => reportMutation.mutate({ userId: Number(id), reason: 'harassment' }),
            },
            {
              text: 'Fake Profile',
              onPress: () => reportMutation.mutate({ userId: Number(id), reason: 'fake_profile' }),
            },
            {
              text: 'Underage',
              onPress: () => reportMutation.mutate({ userId: Number(id), reason: 'underage' }),
            },
            {
              text: 'Inappropriate Content',
              onPress: () =>
                reportMutation.mutate({ userId: Number(id), reason: 'inappropriate_content' }),
            },
            {
              text: 'Spam',
              onPress: () => reportMutation.mutate({ userId: Number(id), reason: 'spam' }),
            },
          ]),
      },
    ]);
  }

  const m = member as any;

  // ── All hooks above early returns ─────────────────────────────────────────
  const msgScale = React.useRef(new Animated.Value(1)).current;
  const avatarScale = React.useRef(new Animated.Value(0.72)).current;
  const avatarOpacity = React.useRef(new Animated.Value(0)).current;
  const signalPulse = React.useRef(new Animated.Value(1)).current;
  const contentOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(avatarScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(avatarOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 400,
      delay: 180,
      useNativeDriver: true,
    }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(signalPulse, { toValue: 1.65, duration: 880, useNativeDriver: true }),
        Animated.timing(signalPulse, { toValue: 1, duration: 880, useNativeDriver: true }),
      ])
    ).start();
  }, [avatarOpacity, avatarScale, contentOpacity, signalPulse]);

  const handleMsgPressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.spring(msgScale, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const handleMsgPressOut = () =>
    Animated.spring(msgScale, { toValue: 1, useNativeDriver: true }).start();

  const goBack = React.useCallback(() => {
    if (returnTo === 'admin-members') {
      router.replace({
        pathname: '/admin/members' as any,
        params: reopenUserId ? { reopenUserId } : {},
      } as any);
      return;
    }

    router.back();
  }, [reopenUserId, returnTo, router]);

  // ── Loading / not-found guards ────────────────────────────────────────────
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.page,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  if (isError) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.page,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 28,
        }}
      >
        <Ionicons name="cloud-offline-outline" size={42} color={colors.textMuted} />
        <Text
          style={{
            color: colors.text,
            fontSize: 20,
            fontWeight: '800',
            textAlign: 'center',
            marginTop: 14,
          }}
        >
          Could not load this member
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 14,
            textAlign: 'center',
            lineHeight: 21,
            marginTop: 8,
          }}
        >
          {(error as any)?.message ?? 'Please try again in a moment.'}
        </Text>
        <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 18 }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!m) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.page,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: colors.textMuted }}>Member not found</Text>
        <TouchableOpacity onPress={goBack} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const displayName = m.displayName ?? m.name ?? 'Member';
  const firstName = displayName.split(' ')[0];
  const community = m.communityId ?? m.community?.name;
  const joinedDate = m.createdAt
    ? new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  const prefs = safeParsePrefs(m.preferences);
  const interests: string[] = Array.isArray(prefs.interests) ? prefs.interests : [];
  const lookingFor: string[] = Array.isArray(prefs.lookingFor) ? prefs.lookingFor : [];
  const relationshipStatus = prefs.relationshipStatus as string | undefined;

  const signal = m.signal as any;
  const showSignal = signal && signal.signalType && signal.signalType !== 'offline';
  const canPoke = signal?.signalType === 'available';
  const signalColor = signal
    ? (SIGNAL_COLORS[signal.signalType] ?? SIGNAL_COLORS.offline)
    : SIGNAL_COLORS.offline;
  const signalLabel = signal ? (SIGNAL_LABELS[signal.signalType] ?? signal.signalType) : '';
  const orientationColor = m.orientation
    ? (ORIENTATION_COLORS[m.orientation.toLowerCase()] ?? colors.primary)
    : null;
  const roleColor = m.memberRole === 'admin' ? colors.danger : colors.warning;
  const membershipState = (m.preferences as any)?.membership as any;
  const hasVipBadge =
    (membershipState?.status === 'active' ||
      membershipState?.status === 'trialing' ||
      membershipState?.status === 'complimentary') &&
    membershipState?.tierKey === 'inner_circle';

  const heroStats = [
    { label: 'Events', value: m.eventsAttended ?? 0, minWidth: 86, fontSize: 22 },
    { label: 'Posts', value: m.postsCount ?? 0, minWidth: 86, fontSize: 22 },
    ...(joinedDate ? [{ label: 'Joined', value: joinedDate, minWidth: 104, fontSize: 18 }] : []),
  ];

  const hasBio = !!(m.bio || m.location || relationshipStatus);
  const hasTags = interests.length > 0 || lookingFor.length > 0;
  const posts = (wallPosts ?? []) as any[];
  const mutualEvents = (m.mutualEvents ?? { upcoming: [], past: [] }) as {
    upcoming?: any[];
    past?: any[];
  };
  const upcomingTogether = mutualEvents.upcoming ?? [];
  const pastTogether = mutualEvents.past ?? [];
  const hasMutualEvents = upcomingTogether.length > 0 || pastTogether.length > 0;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      {/* Back button */}
      <TouchableOpacity
        onPress={goBack}
        accessibilityLabel="Go back"
        accessibilityRole="button"
        style={{
          position: 'absolute',
          top: insets.top + 10,
          left: 16,
          zIndex: 10,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: alpha(colors.floating, 0.88),
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="arrow-back" size={20} color={colors.text} />
      </TouchableOpacity>

      {/* Block / Report button */}
      <TouchableOpacity
        onPress={handleBlockReport}
        accessibilityLabel="Block or report this member"
        accessibilityRole="button"
        style={{
          position: 'absolute',
          top: insets.top + 10,
          right: 16,
          zIndex: 10,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: alpha(colors.floating, 0.88),
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ── A. Hero ──────────────────────────────────────────────────── */}
        <LinearGradient
          colors={gradients.screen}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 60, paddingBottom: 26, paddingHorizontal: 16 }}
        >
          <View
            style={{
              borderRadius: 30,
              borderWidth: 1,
              borderColor: alpha(colors.white, 0.16),
              overflow: 'hidden',
              backgroundColor: alpha(colors.surface, 0.88),
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: -48,
                right: -18,
                width: 150,
                height: 150,
                borderRadius: 75,
                backgroundColor: alpha(colors.primary, 0.1),
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: -70,
                left: -26,
                width: 180,
                height: 180,
                borderRadius: 90,
                backgroundColor: alpha(colors.secondary, 0.08),
              }}
            />
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 22,
                paddingBottom: 20,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                Member spotlight
              </Text>

              {/* Avatar */}
              <Animated.View
                style={{
                  transform: [{ scale: avatarScale }],
                  opacity: avatarOpacity,
                  marginBottom: 14,
                }}
              >
                <View
                  style={{
                    borderRadius: 64,
                    padding: 4,
                    borderWidth: 1.5,
                    borderColor: alpha(colors.white, 0.2),
                    backgroundColor: alpha(colors.white, 0.18),
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.45,
                    shadowRadius: 24,
                    elevation: 12,
                  }}
                >
                  <View
                    style={{
                      borderRadius: 60,
                      padding: 3,
                      borderWidth: 2,
                      borderColor: alpha(colors.primary, 0.5),
                    }}
                  >
                    <Avatar name={displayName} url={m.avatarUrl} size={106} />
                  </View>
                </View>
              </Animated.View>

              {m.memberRole && m.memberRole !== 'member' && (
                <View
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: alpha(roleColor, 0.14),
                    borderColor: alpha(roleColor, 0.34),
                    borderWidth: 1,
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{
                      color: roleColor,
                      fontSize: 12,
                      fontFamily: FONT.displaySemiBold,
                    }}
                  >
                    {m.memberRole === 'admin' ? '⚙️ Admin' : '👼 Angel'}
                  </Text>
                </View>
              )}
              {hasVipBadge && (
                <View
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: alpha(colors.primary, 0.14),
                    borderColor: alpha(colors.primary, 0.34),
                    borderWidth: 1,
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: 12,
                      fontFamily: FONT.displaySemiBold,
                    }}
                  >
                    👑 Inner Circle VIP
                  </Text>
                </View>
              )}

              {/* Name */}
              <Animated.Text
                style={{
                  color: colors.text,
                  fontSize: 31,
                  textAlign: 'center',
                  letterSpacing: -0.9,
                  opacity: avatarOpacity,
                  fontFamily: FONT.displayBold,
                }}
              >
                {displayName}
              </Animated.Text>

              <Animated.Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 14,
                  textAlign: 'center',
                  opacity: avatarOpacity,
                  marginTop: 6,
                }}
              >
                {m.location || relationshipStatus || 'Open to good energy'}
              </Animated.Text>

              {/* Inline stats under name */}
              <Animated.View
                style={{ flexDirection: 'row', gap: 12, marginTop: 18, opacity: avatarOpacity }}
              >
                {heroStats.map((stat) => (
                  <View
                    key={stat.label}
                    style={{
                      alignItems: 'center',
                      minWidth: stat.minWidth,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 18,
                      backgroundColor: alpha(colors.white, 0.18),
                      borderWidth: 1,
                      borderColor: alpha(colors.white, 0.22),
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: stat.fontSize,
                        fontFamily: FONT.displayBold,
                      }}
                    >
                      {stat.value}
                    </Text>
                    <Text
                      style={{
                        color: colors.textMuted,
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: 1.1,
                      }}
                    >
                      {stat.label}
                    </Text>
                  </View>
                ))}
              </Animated.View>

              {/* Badge row */}
              <Animated.View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 6,
                  marginTop: 14,
                  opacity: avatarOpacity,
                }}
              >
                {showSignal && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      backgroundColor: alpha(signalColor, 0.12),
                      borderRadius: 20,
                      borderColor: alpha(signalColor, 0.28),
                      borderWidth: 1,
                    }}
                  >
                    <Animated.View
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 3.5,
                        backgroundColor: signalColor,
                        transform: [{ scale: signalPulse }],
                        shadowColor: signalColor,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.9,
                        shadowRadius: 4,
                      }}
                    />
                    <Text style={{ color: signalColor, fontWeight: '700', fontSize: 12 }}>
                      {signalLabel}
                    </Text>
                  </View>
                )}
                {m.gender && (
                  <View
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      backgroundColor: colors.infoSoft,
                      borderRadius: 20,
                      borderColor: colors.infoBorder,
                      borderWidth: 1,
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>
                      {capitalize(m.gender)}
                    </Text>
                  </View>
                )}
                {community && (
                  <View
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      backgroundColor: alpha(colors.secondary, 0.12),
                      borderRadius: 20,
                      borderColor: alpha(colors.secondary, 0.26),
                      borderWidth: 1,
                    }}
                  >
                    <Text style={{ color: colors.secondary, fontWeight: '700', fontSize: 12 }}>
                      {capitalize(String(community))}
                    </Text>
                  </View>
                )}
                {orientationColor && m.orientation && (
                  <View
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      backgroundColor: alpha(orientationColor, 0.13),
                      borderRadius: 20,
                      borderColor: alpha(orientationColor, 0.33),
                      borderWidth: 1,
                    }}
                  >
                    <Text style={{ color: orientationColor, fontWeight: '700', fontSize: 12 }}>
                      {capitalize(m.orientation)}
                    </Text>
                  </View>
                )}
              </Animated.View>
            </View>
          </View>
        </LinearGradient>

        {/* ── B. Signal detail card ─────────────────────────────────────── */}
        {showSignal && (signal.seekingGender || signal.isQueerFriendly || signal.message) && (
          <Animated.View
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              backgroundColor: alpha(signalColor, 0.06),
              borderRadius: 14,
              borderWidth: 1,
              borderColor: alpha(signalColor, 0.18),
              padding: 14,
              opacity: contentOpacity,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <View
                style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}
              >
                <Animated.View
                  style={{
                    position: 'absolute',
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: signalColor,
                    opacity: 0.28,
                    transform: [{ scale: signalPulse }],
                  }}
                />
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: signalColor,
                    shadowColor: signalColor,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.9,
                    shadowRadius: 6,
                  }}
                />
              </View>
              <Text
                style={{
                  color: colors.text,
                  fontWeight: '700',
                  fontSize: 14,
                  fontFamily: FONT.displaySemiBold,
                }}
              >
                {signalLabel}
              </Text>
              {signal.seekingGender && (
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    backgroundColor: alpha(colors.primary, 0.12),
                    borderRadius: 12,
                    borderColor: alpha(colors.primary, 0.24),
                    borderWidth: 1,
                  }}
                >
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                    Seeking: {signal.seekingGender}
                  </Text>
                </View>
              )}
              {signal.isQueerFriendly && (
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    backgroundColor: colors.infoSoft,
                    borderRadius: 12,
                    borderColor: colors.infoBorder,
                    borderWidth: 1,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>
                    Queer Friendly
                  </Text>
                </View>
              )}
            </View>
            {signal.message ? (
              <Text
                style={{ color: colors.textMuted, fontSize: 13, marginTop: 8, fontStyle: 'italic' }}
              >
                &quot;{signal.message}&quot;
              </Text>
            ) : null}
          </Animated.View>
        )}

        {/* ── C. Connections — linked avatar cards ──────────────────────── */}
        {connections.length > 0 && (
          <Animated.View style={{ marginHorizontal: 16, marginTop: 12, opacity: contentOpacity }}>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 11,
                marginBottom: 10,
                textTransform: 'uppercase',
                letterSpacing: 1.6,
              }}
            >
              💗 Connections
            </Text>
            {connections.map((conn: any) => {
              const partnerFirstName = (conn.partnerDisplayName ?? '').split(' ')[0];

              return (
                <TouchableOpacity
                  key={conn.groupId}
                  activeOpacity={0.85}
                  onPress={() =>
                    conn.partnerUserId && router.push(`/member/${conn.partnerUserId}` as any)
                  }
                  style={{ marginBottom: 10 }}
                >
                  <View
                    style={{
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: alpha(colors.primary, 0.24),
                      backgroundColor: colors.card,
                      overflow: 'hidden',
                    }}
                  >
                    <LinearGradient
                      colors={[
                        alpha(colors.secondary, 0.18),
                        alpha(colors.primary, 0.1),
                        alpha(colors.card, 0.96),
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ padding: 18 }}
                    >
                      <View style={{ alignItems: 'center', marginBottom: 14 }}>
                        <View
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 4,
                            backgroundColor: alpha(colors.primary, 0.12),
                            borderRadius: 20,
                            borderColor: alpha(colors.primary, 0.3),
                            borderWidth: 1,
                          }}
                        >
                          <Text
                            style={{
                              color: colors.primary,
                              fontSize: 12,
                              letterSpacing: 0.3,
                              fontFamily: FONT.displaySemiBold,
                            }}
                          >
                            {conn.relationshipType?.replace(/_/g, ' ')}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <View style={{ alignItems: 'center' }}>
                          <View
                            style={{
                              borderRadius: 34,
                              borderWidth: 2.5,
                              borderColor: colors.primary,
                              shadowColor: colors.primary,
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: 0.6,
                              shadowRadius: 10,
                              elevation: 8,
                            }}
                          >
                            <Avatar name={displayName} url={m.avatarUrl} size={64} />
                          </View>
                          <Text
                            style={{
                              color: colors.textSecondary,
                              fontSize: 12,
                              fontWeight: '600',
                              marginTop: 7,
                              maxWidth: 80,
                              textAlign: 'center',
                            }}
                            numberOfLines={1}
                          >
                            {firstName}
                          </Text>
                        </View>

                        <View style={{ alignItems: 'center', marginHorizontal: 4, zIndex: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View
                              style={{
                                width: 24,
                                height: 2,
                                borderTopWidth: 1.5,
                                borderTopColor: alpha(colors.primary, 0.38),
                              }}
                            />
                            <View
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 17,
                                backgroundColor: colors.floating,
                                borderWidth: 1.5,
                                borderColor: alpha(colors.primary, 0.5),
                                alignItems: 'center',
                                justifyContent: 'center',
                                shadowColor: colors.primary,
                                shadowOffset: { width: 0, height: 0 },
                                shadowOpacity: 0.9,
                                shadowRadius: 10,
                              }}
                            >
                              <Text style={{ fontSize: 15 }}>💗</Text>
                            </View>
                            <View
                              style={{
                                width: 24,
                                height: 2,
                                borderTopWidth: 1.5,
                                borderTopColor: alpha(colors.primary, 0.38),
                              }}
                            />
                          </View>
                          <Text
                            style={{
                              color: colors.textMuted,
                              fontSize: 9,
                              marginTop: 5,
                              letterSpacing: 0.5,
                              textTransform: 'uppercase',
                            }}
                          >
                            linked
                          </Text>
                        </View>

                        <View style={{ alignItems: 'center' }}>
                          <View
                            style={{
                              borderRadius: 34,
                              borderWidth: 2.5,
                              borderColor: colors.secondary,
                              shadowColor: colors.secondary,
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: 0.6,
                              shadowRadius: 10,
                              elevation: 8,
                            }}
                          >
                            <Avatar
                              name={conn.partnerDisplayName}
                              url={conn.partnerAvatarUrl}
                              size={64}
                            />
                          </View>
                          <Text
                            style={{
                              color: colors.textSecondary,
                              fontSize: 12,
                              fontWeight: '600',
                              marginTop: 7,
                              maxWidth: 80,
                              textAlign: 'center',
                            }}
                            numberOfLines={1}
                          >
                            {partnerFirstName}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          marginTop: 12,
                        }}
                      >
                        <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                          View {partnerFirstName}&apos;s profile
                        </Text>
                        <Ionicons name="chevron-forward" size={11} color={colors.textMuted} />
                      </View>
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        )}

        {/* ── D. Shared events ─────────────────────────────────────────── */}
        {hasMutualEvents && (
          <Animated.View style={{ marginHorizontal: 16, marginTop: 12, opacity: contentOpacity }}>
            <View
              style={{
                borderRadius: 24,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: alpha(colors.white, 0.18),
                backgroundColor: colors.card,
              }}
            >
              <LinearGradient
                colors={[alpha(colors.secondary, 0.16), alpha(colors.primary, 0.08), colors.card]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 18 }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 14,
                  }}
                >
                  <View>
                    <Text
                      style={{
                        color: colors.textMuted,
                        fontSize: 11,
                        letterSpacing: 1.4,
                        textTransform: 'uppercase',
                        marginBottom: 6,
                      }}
                    >
                      Shared events
                    </Text>
                    <Text
                      style={{ color: colors.text, fontSize: 22, fontFamily: FONT.displayBold }}
                    >
                      Your nights together
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: alpha(colors.primary, 0.1),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="sparkles" size={18} color={colors.primary} />
                  </View>
                </View>

                {upcomingTogether.length > 0 && (
                  <View style={{ marginBottom: pastTogether.length > 0 ? 14 : 0 }}>
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: 12,
                        fontWeight: '800',
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        marginBottom: 10,
                        fontFamily: FONT.displaySemiBold,
                      }}
                    >
                      Going together
                    </Text>
                    {upcomingTogether.map((event: any) => (
                      <View
                        key={`upcoming-${event.id}`}
                        style={{
                          borderRadius: 18,
                          padding: 14,
                          backgroundColor: alpha(colors.white, 0.2),
                          borderWidth: 1,
                          borderColor: alpha(colors.white, 0.26),
                          marginBottom: 10,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Text
                            style={{
                              color: colors.text,
                              fontSize: 17,
                              flex: 1,
                              marginRight: 10,
                              fontFamily: FONT.displaySemiBold,
                            }}
                            numberOfLines={1}
                          >
                            {event.title}
                          </Text>
                          <View
                            style={{
                              borderRadius: 999,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              backgroundColor: colors.successSoft,
                              borderWidth: 1,
                              borderColor: colors.successBorder,
                            }}
                          >
                            <Text
                              style={{ color: colors.success, fontSize: 10, fontWeight: '800' }}
                            >
                              {event.mutualLabel}
                            </Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                          <Text
                            style={{ color: colors.textSecondary, fontSize: 13, marginLeft: 8 }}
                          >
                            {formatSharedEventDate(event.startDate)}
                          </Text>
                        </View>
                        {!!event.location && (
                          <View
                            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}
                          >
                            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                            <Text
                              style={{ color: colors.textMuted, fontSize: 13, marginLeft: 8 }}
                              numberOfLines={1}
                            >
                              {event.location}
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {pastTogether.length > 0 && (
                  <View>
                    <Text
                      style={{
                        color: colors.secondary,
                        fontSize: 12,
                        fontWeight: '800',
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        marginBottom: 10,
                        fontFamily: FONT.displaySemiBold,
                      }}
                    >
                      Attended together
                    </Text>
                    {pastTogether.map((event: any) => (
                      <View
                        key={`past-${event.id}`}
                        style={{
                          borderRadius: 18,
                          padding: 14,
                          backgroundColor: alpha(colors.white, 0.16),
                          borderWidth: 1,
                          borderColor: alpha(colors.white, 0.22),
                          marginBottom: 10,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Text
                            style={{
                              color: colors.text,
                              fontSize: 16,
                              flex: 1,
                              marginRight: 10,
                              fontFamily: FONT.displaySemiBold,
                            }}
                            numberOfLines={1}
                          >
                            {event.title}
                          </Text>
                          <Text
                            style={{ color: colors.secondary, fontSize: 10, fontWeight: '800' }}
                          >
                            {event.mutualLabel}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                          <Text
                            style={{ color: colors.textSecondary, fontSize: 13, marginLeft: 8 }}
                          >
                            {formatSharedEventDate(event.startDate)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </LinearGradient>
            </View>
          </Animated.View>
        )}

        {/* ── E. About + Tags — single combined card ────────────────────── */}
        {(hasBio || hasTags || m.orientation) && (
          <Animated.View
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 16,
              borderColor: colors.border,
              borderWidth: 1,
              opacity: contentOpacity,
            }}
          >
            {m.bio && (
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 14,
                  lineHeight: 21,
                  marginBottom: 12,
                }}
              >
                {m.bio}
              </Text>
            )}

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: hasTags ? 14 : 0,
              }}
            >
              {m.location && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>{m.location}</Text>
                </View>
              )}
              {relationshipStatus && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="ribbon-outline" size={13} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                    {capitalize(relationshipStatus)}
                  </Text>
                </View>
              )}
            </View>

            {hasTags && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                {interests.map((tag) => (
                  <View
                    key={`i-${tag}`}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      backgroundColor: alpha(colors.secondary, 0.12),
                      borderRadius: 12,
                      borderColor: alpha(colors.secondary, 0.26),
                      borderWidth: 1,
                    }}
                  >
                    <Text style={{ color: colors.secondary, fontSize: 12, fontWeight: '700' }}>
                      {tag}
                    </Text>
                  </View>
                ))}
                {lookingFor.map((tag) => (
                  <View
                    key={`l-${tag}`}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      backgroundColor: alpha(colors.primary, 0.1),
                      borderRadius: 12,
                      borderColor: alpha(colors.primary, 0.22),
                      borderWidth: 1,
                    }}
                  >
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {/* ── E. Wall posts ─────────────────────────────────────────────── */}
        <Animated.View style={{ marginHorizontal: 16, marginTop: 16, opacity: contentOpacity }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1.6,
              }}
            >
              Posts
            </Text>
            {posts.length > 0 && (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  backgroundColor: alpha(colors.primary, 0.2),
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                  {posts.length}
                </Text>
              </View>
            )}
          </View>

          {wallLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          ) : posts.length === 0 ? (
            <View
              style={{
                alignItems: 'center',
                paddingVertical: 32,
                backgroundColor: colors.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 32, marginBottom: 10 }}>🌸</Text>
              <Text style={{ color: colors.textMuted, fontSize: 15, fontWeight: '600' }}>
                No posts yet
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
                {firstName} hasn&apos;t posted anything
              </Text>
            </View>
          ) : (
            posts.map((post: any) => (
              <View
                key={post.post?.id ?? post.id}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  padding: 14,
                  borderColor: colors.border,
                  borderWidth: 1,
                  marginBottom: 12,
                }}
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}
                >
                  <Avatar
                    name={post.resolvedAuthorName ?? post.profile?.displayName ?? displayName}
                    url={post.profile?.avatarUrl ?? m.avatarUrl}
                    size={36}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>
                      {post.resolvedAuthorName ?? post.profile?.displayName ?? displayName}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                      {timeAgo(post.post?.createdAt ?? post.createdAt)}
                    </Text>
                  </View>
                </View>
                {(post.post?.content ?? post.content) ? (
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 14,
                      lineHeight: 20,
                      marginBottom: 8,
                    }}
                  >
                    {post.post?.content ?? post.content}
                  </Text>
                ) : null}
                {(post.post?.mediaUrl ?? post.mediaUrl) ? (
                  <Image
                    source={{ uri: post.post?.mediaUrl ?? post.mediaUrl }}
                    style={{ width: '100%', height: 240, borderRadius: 12, marginBottom: 8 }}
                    contentFit="cover"
                  />
                ) : null}
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="heart-outline" size={14} color={colors.textMuted} />
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      {post.post?.likesCount ?? post.likesCount ?? 0}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="chatbubble-outline" size={14} color={colors.textMuted} />
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      {post.post?.commentsCount ?? post.commentsCount ?? 0}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </Animated.View>
      </ScrollView>

      {/* ── Message button (sticky footer) ───────────────────────────────── */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 20,
          paddingBottom: insets.bottom + 16,
          backgroundColor: colors.page,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {canPoke && (
            <TouchableOpacity
              onPress={() => pokeMutation.mutate({ userId: Number(id) })}
              disabled={pokeMutation.isPending}
              style={{
                paddingHorizontal: 14,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: alpha(signalColor, 0.14),
                borderWidth: 1,
                borderColor: alpha(signalColor, 0.3),
                minHeight: 54,
              }}
            >
              {pokeMutation.isPending ? (
                <ActivityIndicator size="small" color={signalColor} />
              ) : (
                <Ionicons name="hand-left-outline" size={18} color={signalColor} />
              )}
            </TouchableOpacity>
          )}

          <Animated.View style={{ transform: [{ scale: msgScale }], flex: 1 }}>
            <TouchableOpacity
              onPress={() =>
                createConversation.mutate({ type: 'dm', participantIds: [Number(id)] })
              }
              onPressIn={handleMsgPressIn}
              onPressOut={handleMsgPressOut}
              disabled={createConversation.isPending}
              activeOpacity={1}
              accessibilityLabel={`Send a message to ${firstName}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: createConversation.isPending }}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: 16,
                  padding: 15,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: createConversation.isPending ? 0.7 : 1,
                }}
              >
                {createConversation.isPending ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color={colors.white} />
                    <Text
                      style={{
                        color: colors.white,
                        fontWeight: '800',
                        fontSize: 16,
                        fontFamily: FONT.displaySemiBold,
                      }}
                    >
                      Message {firstName}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}
