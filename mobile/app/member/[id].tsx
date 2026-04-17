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
import { colors } from '../../lib/colors';
import Avatar from '../../components/Avatar';
import { communityColor } from '../../lib/utils';

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
  try { return JSON.parse(raw); } catch { return {}; }
}

const ORIENTATION_COLORS: Record<string, string> = {
  straight: '#f9a8d4', gay: '#c084fc', lesbian: '#fda4af',
  bisexual: '#a78bfa', queer: '#67e8f9', pansexual: '#fde68a',
};

const SIGNAL_COLORS: Record<string, string> = {
  available: '#22c55e', looking: '#eab308', busy: '#f97316', offline: '#6b7280',
};

const SIGNAL_LABELS: Record<string, string> = {
  available: 'Available', looking: 'Looking', busy: 'Busy', offline: 'Offline',
};

// ── component ─────────────────────────────────────────────────────────────────

export default function MemberProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const { data: member, isLoading } = trpc.members.byId.useQuery(
    { userId: Number(id) }, { enabled: !!id },
  );
  const { data: wallPosts, isLoading: wallLoading } = trpc.members.wall.useQuery(
    { userId: Number(id), limit: 30 }, { enabled: !!id },
  );
  const { data: connectionsData } = trpc.partners.connectionsFor.useQuery(
    { userId: Number(id) }, { enabled: !!id },
  );
  const connections = (connectionsData as any[]) ?? [];

  const createConversation = trpc.messages.createConversation.useMutation({
    onSuccess: (cid: any) => router.push(`/chat/${cid}` as any),
    onError:   (e: any)   => Alert.alert('Error', e.message),
  });

  const blockMutation = trpc.blocking.block.useMutation({
    onSuccess: () => {
      Alert.alert('Blocked', 'This member has been blocked. You will no longer see their content.');
      router.back();
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const reportMutation = trpc.blocking.report.useMutation({
    onSuccess: () => Alert.alert('Report Submitted', 'Thank you. Our team will review this report.'),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  function handleBlockReport() {
    Alert.alert(
      'Block or Report',
      `What would you like to do?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block Member',
          style: 'destructive',
          onPress: () => Alert.alert(
            'Block Member',
            'They will not be able to see your profile or message you.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Block', style: 'destructive', onPress: () => blockMutation.mutate({ userId: Number(id) }) },
            ]
          ),
        },
        {
          text: 'Report Member',
          onPress: () => Alert.alert(
            'Report Member',
            'Select a reason:',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Harassment', onPress: () => reportMutation.mutate({ userId: Number(id), reason: 'harassment' }) },
              { text: 'Fake Profile', onPress: () => reportMutation.mutate({ userId: Number(id), reason: 'fake_profile' }) },
              { text: 'Underage', onPress: () => reportMutation.mutate({ userId: Number(id), reason: 'underage' }) },
              { text: 'Inappropriate Content', onPress: () => reportMutation.mutate({ userId: Number(id), reason: 'inappropriate_content' }) },
              { text: 'Spam', onPress: () => reportMutation.mutate({ userId: Number(id), reason: 'spam' }) },
            ]
          ),
        },
      ]
    );
  }

  const m = member as any;

  // ── All hooks above early returns ─────────────────────────────────────────
  const msgScale       = React.useRef(new Animated.Value(1)).current;
  const avatarScale    = React.useRef(new Animated.Value(0.72)).current;
  const avatarOpacity  = React.useRef(new Animated.Value(0)).current;
  const signalPulse    = React.useRef(new Animated.Value(1)).current;
  const contentOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(avatarScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(avatarOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
    Animated.timing(contentOpacity, { toValue: 1, duration: 400, delay: 180, useNativeDriver: true }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(signalPulse, { toValue: 1.65, duration: 880, useNativeDriver: true }),
      Animated.timing(signalPulse, { toValue: 1,    duration: 880, useNativeDriver: true }),
    ])).start();
  }, []);

  const handleMsgPressIn  = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.spring(msgScale, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const handleMsgPressOut = () =>
    Animated.spring(msgScale, { toValue: 1, useNativeDriver: true }).start();

  // ── Loading / not-found guards ────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.pink} size="large" />
      </View>
    );
  }
  if (!m) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.muted }}>Member not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.pink }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const displayName = m.displayName ?? m.name ?? 'Member';
  const firstName   = displayName.split(' ')[0];
  const community   = m.communityId ?? m.community?.name;
  const _unused     = communityColor(community);
  const joinedDate  = m.createdAt
    ? new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  const prefs              = safeParsePrefs(m.preferences);
  const interests: string[]  = Array.isArray(prefs.interests)  ? prefs.interests  : [];
  const lookingFor: string[] = Array.isArray(prefs.lookingFor) ? prefs.lookingFor : [];
  const relationshipStatus   = prefs.relationshipStatus as string | undefined;

  const signal      = m.signal as any;
  const showSignal  = signal && signal.signalType && signal.signalType !== 'offline';
  const signalColor = signal ? (SIGNAL_COLORS[signal.signalType] ?? SIGNAL_COLORS.offline) : SIGNAL_COLORS.offline;
  const orientationColor = m.orientation
    ? (ORIENTATION_COLORS[m.orientation.toLowerCase()] ?? colors.pink) : null;

  const hasBio   = !!(m.bio || m.location || relationshipStatus);
  const hasTags  = interests.length > 0 || lookingFor.length > 0;
  const posts    = (wallPosts ?? []) as any[];

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>

      {/* Back button */}
      <TouchableOpacity
        onPress={() => router.back()}
        accessibilityLabel="Go back"
        accessibilityRole="button"
        style={{
          position: 'absolute', top: insets.top + 10, left: 16, zIndex: 10,
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: '#0C0C1A80', borderWidth: 1, borderColor: '#1A1A30',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Ionicons name="arrow-back" size={20} color="#F1F0FF" />
      </TouchableOpacity>

      {/* Block / Report button */}
      <TouchableOpacity
        onPress={handleBlockReport}
        accessibilityLabel="Block or report this member"
        accessibilityRole="button"
        style={{
          position: 'absolute', top: insets.top + 10, right: 16, zIndex: 10,
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: '#0C0C1A80', borderWidth: 1, borderColor: '#1A1A30',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color="#F1F0FF" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── A. Hero ──────────────────────────────────────────────────── */}
        <LinearGradient
          colors={['#1A082E', '#0D0520', '#080810']}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={{ paddingTop: insets.top + 60, paddingBottom: 24, alignItems: 'center', paddingHorizontal: 20 }}
        >
          {/* Avatar */}
          <Animated.View style={{ transform: [{ scale: avatarScale }], opacity: avatarOpacity, marginBottom: 14 }}>
            <View style={{
              borderRadius: 60, padding: 3, borderWidth: 2, borderColor: '#EC489980',
              shadowColor: '#EC4899', shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.75, shadowRadius: 22, elevation: 12,
            }}>
              <Avatar name={displayName} url={m.avatarUrl} size={106} />
            </View>
          </Animated.View>

          {/* Name */}
          <Animated.Text style={{
            color: '#F1F0FF', fontSize: 26, fontWeight: '900',
            textAlign: 'center', letterSpacing: -0.5, opacity: avatarOpacity,
          }}>
            {displayName}
          </Animated.Text>

          {/* Inline stats under name */}
          <Animated.View style={{ flexDirection: 'row', gap: 20, marginTop: 10, opacity: avatarOpacity }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#F1F0FF', fontSize: 16, fontWeight: '800' }}>{m.eventsAttended ?? 0}</Text>
              <Text style={{ color: '#5A5575', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Events</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#1A1A30' }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#F1F0FF', fontSize: 16, fontWeight: '800' }}>{m.postsCount ?? 0}</Text>
              <Text style={{ color: '#5A5575', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Posts</Text>
            </View>
            {joinedDate && (
              <>
                <View style={{ width: 1, backgroundColor: '#1A1A30' }} />
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: '#F1F0FF', fontSize: 16, fontWeight: '800' }}>{joinedDate}</Text>
                  <Text style={{ color: '#5A5575', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Joined</Text>
                </View>
              </>
            )}
          </Animated.View>

          {/* Badge row */}
          <Animated.View style={{
            flexDirection: 'row', flexWrap: 'wrap',
            justifyContent: 'center', gap: 6, marginTop: 12,
            opacity: avatarOpacity,
          }}>
            {showSignal && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                paddingHorizontal: 12, paddingVertical: 4,
                backgroundColor: `${signalColor}22`,
                borderRadius: 20, borderColor: signalColor, borderWidth: 1,
              }}>
                <Animated.View style={{
                  width: 7, height: 7, borderRadius: 3.5, backgroundColor: signalColor,
                  transform: [{ scale: signalPulse }],
                  shadowColor: signalColor, shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.9, shadowRadius: 4,
                }} />
                <Text style={{ color: signalColor, fontWeight: '700', fontSize: 12 }}>
                  {SIGNAL_LABELS[signal.signalType] ?? signal.signalType}
                </Text>
              </View>
            )}
            {m.gender && (
              <View style={{
                paddingHorizontal: 12, paddingVertical: 4,
                backgroundColor: '#67e8f915', borderRadius: 20, borderColor: '#67e8f935', borderWidth: 1,
              }}>
                <Text style={{ color: '#67e8f9', fontWeight: '700', fontSize: 12 }}>
                  {m.gender.charAt(0).toUpperCase() + m.gender.slice(1)}
                </Text>
              </View>
            )}
            {community && (
              <View style={{
                paddingHorizontal: 12, paddingVertical: 4,
                backgroundColor: '#A855F720', borderRadius: 20, borderColor: '#A855F740', borderWidth: 1,
              }}>
                <Text style={{ color: '#A855F7', fontWeight: '700', fontSize: 12 }}>
                  {community.charAt(0).toUpperCase() + community.slice(1)}
                </Text>
              </View>
            )}
            {orientationColor && m.orientation && (
              <View style={{
                paddingHorizontal: 12, paddingVertical: 4,
                backgroundColor: `${orientationColor}22`, borderRadius: 20,
                borderColor: `${orientationColor}55`, borderWidth: 1,
              }}>
                <Text style={{ color: orientationColor, fontWeight: '700', fontSize: 12 }}>
                  {m.orientation.charAt(0).toUpperCase() + m.orientation.slice(1)}
                </Text>
              </View>
            )}
            {m.memberRole && m.memberRole !== 'member' && (
              <View style={{
                paddingHorizontal: 12, paddingVertical: 4,
                backgroundColor: m.memberRole === 'admin' ? '#ef444422' : '#f59e0b22',
                borderRadius: 20,
                borderColor: m.memberRole === 'admin' ? '#ef444455' : '#f59e0b55',
                borderWidth: 1,
              }}>
                <Text style={{ color: m.memberRole === 'admin' ? '#ef4444' : '#f59e0b', fontWeight: '700', fontSize: 12 }}>
                  {m.memberRole === 'admin' ? '⚙️ Admin' : '👼 Angel'}
                </Text>
              </View>
            )}
          </Animated.View>
        </LinearGradient>

        {/* ── B. Signal detail card ─────────────────────────────────────── */}
        {showSignal && (signal.seekingGender || signal.isQueerFriendly || signal.message) && (
          <Animated.View style={{
            marginHorizontal: 16, marginTop: 12,
            backgroundColor: `${signalColor}10`,
            borderRadius: 14, borderWidth: 1, borderColor: `${signalColor}30`,
            padding: 14, opacity: contentOpacity,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
                <Animated.View style={{
                  position: 'absolute', width: 18, height: 18, borderRadius: 9,
                  backgroundColor: signalColor, opacity: 0.28, transform: [{ scale: signalPulse }],
                }} />
                <View style={{
                  width: 10, height: 10, borderRadius: 5, backgroundColor: signalColor,
                  shadowColor: signalColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 6,
                }} />
              </View>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
                {SIGNAL_LABELS[signal.signalType] ?? signal.signalType}
              </Text>
              {signal.seekingGender && (
                <View style={{
                  paddingHorizontal: 10, paddingVertical: 3,
                  backgroundColor: `${colors.pink}22`, borderRadius: 12, borderColor: `${colors.pink}44`, borderWidth: 1,
                }}>
                  <Text style={{ color: colors.pink, fontSize: 12, fontWeight: '600' }}>
                    Seeking: {signal.seekingGender}
                  </Text>
                </View>
              )}
              {signal.isQueerFriendly && (
                <View style={{
                  paddingHorizontal: 10, paddingVertical: 3,
                  backgroundColor: '#67e8f922', borderRadius: 12, borderColor: '#67e8f944', borderWidth: 1,
                }}>
                  <Text style={{ color: '#67e8f9', fontSize: 12, fontWeight: '600' }}>Queer Friendly</Text>
                </View>
              )}
            </View>
            {signal.message ? (
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 8, fontStyle: 'italic' }}>
                "{signal.message}"
              </Text>
            ) : null}
          </Animated.View>
        )}

        {/* ── C. Connections — linked avatar cards ──────────────────────── */}
        {connections.length > 0 && (
          <Animated.View style={{ marginHorizontal: 16, marginTop: 12, opacity: contentOpacity }}>
            <Text style={{ color: '#5A5575', fontWeight: '800', fontSize: 11, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1.2 }}>
              💗 Connections
            </Text>
            {connections.map((conn: any) => (
              <TouchableOpacity
                key={conn.groupId}
                activeOpacity={0.85}
                onPress={() => conn.partnerUserId && router.push(`/member/${conn.partnerUserId}` as any)}
                style={{ marginBottom: 10 }}
              >
                <View style={{
                  borderRadius: 20, borderWidth: 1,
                  borderColor: '#EC489940', backgroundColor: '#0D0820', overflow: 'hidden',
                }}>
                  <LinearGradient
                    colors={['#1A082E80', '#0D052080', '#08050F80']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ padding: 18 }}
                  >
                    {/* Relationship pill */}
                    <View style={{ alignItems: 'center', marginBottom: 14 }}>
                      <View style={{
                        paddingHorizontal: 14, paddingVertical: 4,
                        backgroundColor: '#EC489918', borderRadius: 20, borderColor: '#EC489950', borderWidth: 1,
                      }}>
                        <Text style={{ color: '#EC4899', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 }}>
                          {conn.relationshipType?.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    </View>

                    {/* Linked avatar row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      {/* Left: this profile */}
                      <View style={{ alignItems: 'center' }}>
                        <View style={{
                          borderRadius: 34, borderWidth: 2.5, borderColor: '#EC4899',
                          shadowColor: '#EC4899', shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.6, shadowRadius: 10, elevation: 8,
                        }}>
                          <Avatar name={displayName} url={m.avatarUrl} size={64} />
                        </View>
                        <Text style={{ color: '#A09CB8', fontSize: 12, fontWeight: '600', marginTop: 7, maxWidth: 80, textAlign: 'center' }} numberOfLines={1}>
                          {firstName}
                        </Text>
                      </View>

                      {/* Heart bridge */}
                      <View style={{ alignItems: 'center', marginHorizontal: 4, zIndex: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{ width: 24, height: 2, borderTopWidth: 1.5, borderTopColor: '#EC489960' }} />
                          <View style={{
                            width: 34, height: 34, borderRadius: 17, backgroundColor: '#130825',
                            borderWidth: 1.5, borderColor: '#EC489980',
                            alignItems: 'center', justifyContent: 'center',
                            shadowColor: '#EC4899', shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.9, shadowRadius: 10,
                          }}>
                            <Text style={{ fontSize: 15 }}>💗</Text>
                          </View>
                          <View style={{ width: 24, height: 2, borderTopWidth: 1.5, borderTopColor: '#EC489960' }} />
                        </View>
                        <Text style={{ color: '#5A5575', fontSize: 9, marginTop: 5, letterSpacing: 0.5, textTransform: 'uppercase' }}>linked</Text>
                      </View>

                      {/* Right: partner */}
                      <View style={{ alignItems: 'center' }}>
                        <View style={{
                          borderRadius: 34, borderWidth: 2.5, borderColor: '#A855F7',
                          shadowColor: '#A855F7', shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.6, shadowRadius: 10, elevation: 8,
                        }}>
                          <Avatar name={conn.partnerDisplayName} url={conn.partnerAvatarUrl} size={64} />
                        </View>
                        <Text style={{ color: '#A09CB8', fontSize: 12, fontWeight: '600', marginTop: 7, maxWidth: 80, textAlign: 'center' }} numberOfLines={1}>
                          {(conn.partnerDisplayName ?? '').split(' ')[0]}
                        </Text>
                      </View>
                    </View>

                    {/* Tap hint */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12 }}>
                      <Text style={{ color: '#5A5575', fontSize: 11 }}>
                        View {(conn.partnerDisplayName ?? '').split(' ')[0]}'s profile
                      </Text>
                      <Ionicons name="chevron-forward" size={11} color="#5A5575" />
                    </View>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {/* ── D. About + Tags — single combined card ────────────────────── */}
        {(hasBio || hasTags || m.orientation) && (
          <Animated.View style={{
            marginHorizontal: 16, marginTop: 12,
            backgroundColor: colors.card, borderRadius: 16, padding: 16,
            borderColor: colors.border, borderWidth: 1, opacity: contentOpacity,
          }}>
            {/* Bio */}
            {m.bio && (
              <Text style={{ color: '#A09CB8', fontSize: 14, lineHeight: 21, marginBottom: 12 }}>
                {m.bio}
              </Text>
            )}

            {/* Location + relationship status inline */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: hasTags ? 14 : 0 }}>
              {m.location && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="location-outline" size={13} color={colors.muted} />
                  <Text style={{ color: colors.muted, fontSize: 13 }}>{m.location}</Text>
                </View>
              )}
              {relationshipStatus && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="ribbon-outline" size={13} color={colors.muted} />
                  <Text style={{ color: colors.muted, fontSize: 13 }}>
                    {relationshipStatus.charAt(0).toUpperCase() + relationshipStatus.slice(1)}
                  </Text>
                </View>
              )}
            </View>

            {/* Interests + Looking For chips — merged, no sub-headers */}
            {hasTags && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                {interests.map((tag) => (
                  <View key={`i-${tag}`} style={{
                    paddingHorizontal: 10, paddingVertical: 4,
                    backgroundColor: '#A855F720', borderRadius: 12, borderColor: '#A855F740', borderWidth: 1,
                  }}>
                    <Text style={{ color: '#A855F7', fontSize: 12, fontWeight: '700' }}>{tag}</Text>
                  </View>
                ))}
                {lookingFor.map((tag) => (
                  <View key={`l-${tag}`} style={{
                    paddingHorizontal: 10, paddingVertical: 4,
                    backgroundColor: '#EC489912', borderRadius: 12, borderColor: '#EC489930', borderWidth: 1,
                  }}>
                    <Text style={{ color: '#EC4899', fontSize: 12, fontWeight: '700' }}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {/* ── E. Wall posts ─────────────────────────────────────────────── */}
        <Animated.View style={{ marginHorizontal: 16, marginTop: 16, opacity: contentOpacity }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Text style={{ color: '#5A5575', fontWeight: '800', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2 }}>
              Posts
            </Text>
            {posts.length > 0 && (
              <View style={{
                paddingHorizontal: 8, paddingVertical: 2,
                backgroundColor: `${colors.pink}33`, borderRadius: 10,
              }}>
                <Text style={{ color: colors.pink, fontSize: 12, fontWeight: '700' }}>{posts.length}</Text>
              </View>
            )}
          </View>

          {wallLoading ? (
            <ActivityIndicator color={colors.pink} style={{ marginVertical: 24 }} />
          ) : posts.length === 0 ? (
            <View style={{
              alignItems: 'center', paddingVertical: 32,
              backgroundColor: colors.card, borderRadius: 16,
              borderWidth: 1, borderColor: colors.border,
            }}>
              <Text style={{ fontSize: 32, marginBottom: 10 }}>🌸</Text>
              <Text style={{ color: colors.muted, fontSize: 15, fontWeight: '600' }}>No posts yet</Text>
              <Text style={{ color: '#5A5575', fontSize: 13, marginTop: 4 }}>{firstName} hasn't posted anything</Text>
            </View>
          ) : (
            posts.map((post: any) => (
              <View key={post.post?.id ?? post.id} style={{
                backgroundColor: colors.card, borderRadius: 16, padding: 14,
                borderColor: colors.border, borderWidth: 1, marginBottom: 12,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Avatar
                    name={post.resolvedAuthorName ?? post.profile?.displayName ?? displayName}
                    url={post.profile?.avatarUrl ?? m.avatarUrl}
                    size={36}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>
                      {post.resolvedAuthorName ?? post.profile?.displayName ?? displayName}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>
                      {timeAgo(post.post?.createdAt ?? post.createdAt)}
                    </Text>
                  </View>
                </View>
                {(post.post?.content ?? post.content) ? (
                  <Text style={{ color: '#A09CB8', fontSize: 14, lineHeight: 20, marginBottom: 8 }}>
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
                    <Ionicons name="heart-outline" size={14} color={colors.muted} />
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{post.post?.likesCount ?? post.likesCount ?? 0}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="chatbubble-outline" size={14} color={colors.muted} />
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{post.post?.commentsCount ?? post.commentsCount ?? 0}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </Animated.View>

      </ScrollView>

      {/* ── Message button (sticky footer) ───────────────────────────────── */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: 20, paddingBottom: insets.bottom + 16,
        backgroundColor: '#080810', borderTopColor: '#1A1A30', borderTopWidth: 1,
      }}>
        <Animated.View style={{ transform: [{ scale: msgScale }] }}>
          <TouchableOpacity
            onPress={() => createConversation.mutate({ type: 'dm', participantIds: [Number(id)] })}
            onPressIn={handleMsgPressIn}
            onPressOut={handleMsgPressOut}
            disabled={createConversation.isPending}
            activeOpacity={1}
            accessibilityLabel={`Send a message to ${firstName}`}
            accessibilityRole="button"
            accessibilityState={{ disabled: createConversation.isPending }}
          >
            <LinearGradient
              colors={['#EC4899', '#A855F7']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 16, padding: 15,
                alignItems: 'center', flexDirection: 'row',
                justifyContent: 'center', gap: 8,
                opacity: createConversation.isPending ? 0.7 : 1,
              }}
            >
              {createConversation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Message {firstName}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

    </View>
  );
}
