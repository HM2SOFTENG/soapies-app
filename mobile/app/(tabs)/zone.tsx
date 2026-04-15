import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView, TextInput,
  Animated, Dimensions, Alert, Image, Switch, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import { useAuth } from '../../lib/auth';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SIGNAL_COLORS = {
  available: '#10B981',
  looking: '#EC4899',
  busy: '#F59E0B',
  offline: '#6B7280',
} as const;

const SIGNAL_CONFIG = {
  available: { color: '#10B981', label: 'Available', bg: '#10B98120' },
  looking:   { color: '#EC4899', label: 'Looking',   bg: '#EC489920' },
  busy:      { color: '#F59E0B', label: 'Busy',      bg: '#F59E0B20' },
  offline:   { color: '#6B7280', label: 'Offline',   bg: '#6B728020' },
} as const;

type SignalType = keyof typeof SIGNAL_CONFIG;

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function calculateMatchScore(
  member: any,
  myProfile: any,
  myPrefs: any,
  mySignalType: string,
  seekingGender: string,
): number {
  let score = 0;

  // Gender match
  if (seekingGender && member.gender) {
    const s = seekingGender.toLowerCase();
    const g = member.gender.toLowerCase();
    if (s === 'any' || s === g) score += 30;
  }

  // Orientation compat
  if (myProfile?.orientation && member.orientation) {
    const mine = myProfile.orientation.toLowerCase();
    const theirs = member.orientation.toLowerCase();
    if (
      mine === theirs ||
      mine === 'bisexual' || theirs === 'bisexual' ||
      mine === 'pansexual' || theirs === 'pansexual'
    ) score += 20;
  }

  // Same community
  if (myProfile?.communityId && member.communityId === myProfile.communityId) score += 15;

  // Shared interests
  const myInterests: string[] = myPrefs?.interests ?? [];
  let theirPrefs: any = {};
  try {
    theirPrefs = typeof member.preferences === 'string'
      ? JSON.parse(member.preferences || '{}')
      : (member.preferences ?? {});
  } catch {}
  const shared = myInterests.filter((i: string) => (theirPrefs?.interests ?? []).includes(i));
  score += shared.length * 5;

  // Queer friendly
  if (member.isQueerFriendly && myProfile?.orientation !== 'straight') score += 10;

  // Distance bonus
  if (member.distance != null) {
    const d = parseFloat(String(member.distance));
    if (d < 1) score += 25;
    else if (d < 5) score += 15;
    else if (d < 20) score += 5;
  }

  // Both looking
  if (mySignalType === 'looking' && member.signalType === 'looking') score += 10;

  return Math.min(score, 100);
}

// Deterministic spiral layout — no random per render
function layoutPositions(count: number, w: number, h: number): { x: number; y: number }[] {
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.min(w, h) * 0.42;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / Math.max(count, 1)) * 2 * Math.PI + (i % 4) * 0.25;
    const rFrac = 0.3 + ((i * 0.13) % 0.55);
    return {
      x: cx + maxR * rFrac * Math.cos(angle),
      y: cy + maxR * rFrac * Math.sin(angle),
    };
  });
}

// ─── Chip ────────────────────────────────────────────────────────────────────
function Chip({ label, color }: { label: string; color: string }) {
  return (
    <View style={{
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, margin: 3,
      backgroundColor: `${color}22`, borderColor: `${color}44`, borderWidth: 1,
    }}>
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
}

function MemberBubble({ member, matchScore, x, y, onPress }: BubbleProps) {
  const pulse = useRef(new Animated.Value(1)).current;
  const sigColor = SIGNAL_COLORS[member.signalType as keyof typeof SIGNAL_COLORS] ?? '#6B7280';
  const size = Math.round(36 + (matchScore / 100) * 36); // 36–72px

  useEffect(() => {
    if (matchScore >= 70) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.12, duration: 950, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1.0, duration: 950, useNativeDriver: true }),
        ]),
      );
      anim.start();
      return () => anim.stop();
    }
  }, [matchScore]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x - size / 2 - 8,
        top: y - size / 2 - 8,
        alignItems: 'center',
        transform: [{ scale: pulse }],
      }}
    >
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
      >
        {/* Outer glow */}
        <View style={{
          width: size + 16, height: size + 16, borderRadius: (size + 16) / 2,
          backgroundColor: `${sigColor}16`,
          alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Avatar */}
          <View style={{
            width: size, height: size, borderRadius: size / 2, overflow: 'hidden',
            borderWidth: matchScore >= 70 ? 2.5 : 1.5,
            borderColor: matchScore >= 70 ? sigColor : `${sigColor}77`,
          }}>
            {member.avatarUrl ? (
              <Image source={{ uri: member.avatarUrl }} style={{ width: size, height: size }} />
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
        <View style={{
          position: 'absolute', bottom: 6, right: 6,
          width: 11, height: 11, borderRadius: 6,
          backgroundColor: sigColor, borderWidth: 2, borderColor: '#0A0A0F',
        }} />

        {/* Match % badge */}
        {matchScore >= 55 && (
          <View style={{
            position: 'absolute', top: 2, alignSelf: 'center',
            backgroundColor: matchScore >= 80 ? '#EC4899' : '#A855F7',
            borderRadius: 7, paddingHorizontal: 5, paddingVertical: 1,
          }}>
            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>{matchScore}%</Text>
          </View>
        )}

        {/* First name */}
        <Text
          numberOfLines={1}
          style={{
            color: '#E5E7EB', fontSize: 9, fontWeight: '600',
            textAlign: 'center', marginTop: 3, maxWidth: size + 20,
            textShadowColor: '#000', textShadowRadius: 6,
          }}
        >
          {member.displayName?.split(' ')[0] ?? ''}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── ZoneScreen ───────────────────────────────────────────────────────────────
export default function ZoneScreen() {
  const router = useRouter();
  const { hasToken } = useAuth();
  const zoneHeight = SCREEN_HEIGHT - 190;

  const [myLocation, setMyLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [showSignalModal, setShowSignalModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  // Signal form state
  const [mySignalType, setMySignalType] = useState<SignalType>('offline');
  const [seekingGender, setSeekingGender] = useState('any');
  const [seekingDynamic, setSeekingDynamic] = useState('');
  const [signalMessage, setSignalMessage] = useState('');
  const [isQueerFriendly, setIsQueerFriendly] = useState(false);

  const { data: profileData } = trpc.profile.me.useQuery(undefined, { enabled: hasToken });
  const { data: mySignalData, refetch: refetchMySignal } = trpc.members.mySignal.useQuery(
    undefined,
    { enabled: hasToken },
  );
  const { data: signalsData, refetch: refetchSignals } = trpc.members.activeSignals.useQuery(
    { latitude: myLocation?.lat, longitude: myLocation?.lon },
    { enabled: hasToken, refetchInterval: 30_000 },
  );

  const myProfile = profileData as any;
  const myPrefs = useMemo(() => {
    try {
      const raw = myProfile?.preferences;
      return typeof raw === 'string' ? JSON.parse(raw) : (raw ?? {});
    } catch { return {}; }
  }, [myProfile]);

  const members = useMemo(() => (signalsData as any[]) ?? [], [signalsData]);

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

  // Sync signal form from server data
  useEffect(() => {
    if (mySignalData) {
      const s = mySignalData as any;
      setMySignalType((s.signalType ?? 'offline') as SignalType);
      setSeekingGender(s.seekingGender ?? 'any');
      setSeekingDynamic(s.seekingDynamic ?? '');
      setSignalMessage(s.message ?? '');
      setIsQueerFriendly(!!s.isQueerFriendly);
    }
  }, [mySignalData]);

  const signalMutation = trpc.members.signal.useMutation({
    onSuccess: () => { refetchSignals(); refetchMySignal(); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  function handleSaveSignal() {
    signalMutation.mutate({
      signalType: mySignalType,
      seekingGender: seekingGender || undefined,
      seekingDynamic: seekingDynamic || undefined,
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
          matchScore: calculateMatchScore(m, myProfile, myPrefs, mySignalType, seekingGender),
        }))
        .sort((a, b) => b.matchScore - a.matchScore),
    [members, myProfile, myPrefs, mySignalType, seekingGender],
  );

  const positions = useMemo(
    () => layoutPositions(scoredMembers.length, SCREEN_WIDTH, zoneHeight),
    [scoredMembers.length, zoneHeight],
  );

  const myConfig = SIGNAL_CONFIG[mySignalType];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A0F' }} edges={['top']}>
      {/* ── Header ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900' }}>The Zone 💫</Text>
          <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 1 }}>
            {scoredMembers.length} active · {myLocation ? '📍 on' : '📍 off'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowSignalModal(true)}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
            backgroundColor: myConfig.bg, borderColor: myConfig.color, borderWidth: 1,
          }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: myConfig.color }} />
          <Text style={{ color: myConfig.color, fontWeight: '700', fontSize: 13 }}>{myConfig.label}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Bubble canvas ── */}
      <View style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Ambient glow */}
        <View style={[styles.glow, { width: 320, height: 320, borderRadius: 160,
          backgroundColor: '#EC489907', top: zoneHeight * 0.25, alignSelf: 'center' }]} />
        <View style={[styles.glow, { width: 480, height: 480, borderRadius: 240,
          backgroundColor: '#A855F704', top: zoneHeight * 0.1, alignSelf: 'center' }]} />

        {/* Member bubbles — sorted by matchScore (highest = largest) */}
        {scoredMembers.map((member, i) => (
          <MemberBubble
            key={String(member.userId)}
            member={member}
            matchScore={member.matchScore}
            x={positions[i]?.x ?? SCREEN_WIDTH / 2}
            y={positions[i]?.y ?? zoneHeight / 2}
            onPress={() => setSelectedMember(member)}
          />
        ))}

        {/* My bubble — center */}
        <View style={{
          position: 'absolute',
          left: SCREEN_WIDTH / 2 - 40,
          top: zoneHeight / 2 - 40,
          alignItems: 'center',
        }}>
          <TouchableOpacity onPress={() => setShowSignalModal(true)}>
            <View style={{
              width: 80, height: 80, borderRadius: 40, overflow: 'hidden',
              borderWidth: 2.5, borderColor: myConfig.color,
            }}>
              {myProfile?.avatarUrl ? (
                <Image source={{ uri: myProfile.avatarUrl }} style={{ width: 80, height: 80 }} />
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
            <View style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 16, height: 16, borderRadius: 8,
              backgroundColor: myConfig.color, borderWidth: 2, borderColor: '#0A0A0F',
            }} />
            <Text style={{ color: '#9CA3AF', fontSize: 11, textAlign: 'center', marginTop: 5 }}>You</Text>
          </TouchableOpacity>
        </View>

        {/* Empty state */}
        {scoredMembers.length === 0 && (
          <View style={{
            position: 'absolute', bottom: 110, left: 0, right: 0,
            alignItems: 'center', paddingHorizontal: 44,
          }}>
            <Text style={{ fontSize: 38, marginBottom: 12 }}>👀</Text>
            <Text style={{ color: '#9CA3AF', textAlign: 'center', fontSize: 15, lineHeight: 22 }}>
              No one's active right now.{'\n'}
              Tap your signal above to go <Text style={{ color: '#EC4899', fontWeight: '700' }}>Available</Text> or{' '}
              <Text style={{ color: '#A855F7', fontWeight: '700' }}>Looking</Text> and appear in others' Zone.
            </Text>
          </View>
        )}
      </View>

      {/* ── Signal modal ── */}
      <Modal visible={showSignalModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#111118',
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            paddingTop: 20, paddingHorizontal: 24, paddingBottom: 36,
            maxHeight: '88%',
          }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#2D2D3A', alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4 }}>Set Your Signal 📡</Text>
            <Text style={{ color: '#6B7280', fontSize: 13, marginBottom: 20 }}>
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
                      flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                      backgroundColor: mySignalType === t ? SIGNAL_CONFIG[t].bg : '#1A1A24',
                      borderColor: mySignalType === t ? SIGNAL_CONFIG[t].color : '#2D2D3A',
                      borderWidth: 1,
                    }}
                  >
                    <Text style={{
                      color: mySignalType === t ? SIGNAL_CONFIG[t].color : '#6B7280',
                      fontSize: 11, fontWeight: '700',
                    }}>
                      {cap(t)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Seeking gender */}
              <Text style={styles.label}>Seeking</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['Any', 'Female', 'Male', 'Non-binary', 'Couple', 'Group'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setSeekingGender(g.toLowerCase())}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                        backgroundColor: seekingGender === g.toLowerCase() ? '#EC489930' : '#1A1A24',
                        borderColor: seekingGender === g.toLowerCase() ? '#EC4899' : '#2D2D3A',
                        borderWidth: 1,
                      }}
                    >
                      <Text style={{ color: seekingGender === g.toLowerCase() ? '#EC4899' : '#6B7280', fontWeight: '600' }}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Dynamic */}
              <Text style={styles.label}>Looking For</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { label: 'Chat', value: 'chat' },
                    { label: 'Play Date', value: 'play_date' },
                    { label: 'Event Buddy', value: 'event_buddy' },
                    { label: 'Friendship', value: 'friendship' },
                    { label: 'Couple Play', value: 'couple_play' },
                    { label: 'Group Play', value: 'group_play' },
                  ].map((d) => (
                    <TouchableOpacity
                      key={d.value}
                      onPress={() => setSeekingDynamic(seekingDynamic === d.value ? '' : d.value)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                        backgroundColor: seekingDynamic === d.value ? '#A855F730' : '#1A1A24',
                        borderColor: seekingDynamic === d.value ? '#A855F7' : '#2D2D3A',
                        borderWidth: 1,
                      }}
                    >
                      <Text style={{ color: seekingDynamic === d.value ? '#A855F7' : '#6B7280', fontWeight: '600' }}>{d.label}</Text>
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
                placeholderTextColor="#6B7280"
                style={{
                  backgroundColor: '#1A1A24', borderRadius: 12, borderColor: '#2D2D3A',
                  borderWidth: 1, padding: 12, color: '#fff', marginBottom: 16,
                }}
                maxLength={200}
              />

              {/* Queer friendly toggle */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                <Text style={{ color: '#fff', flex: 1, fontSize: 15 }}>🌈 Queer Friendly</Text>
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
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 14, padding: 16, alignItems: 'center', opacity: signalMutation.isPending ? 0.6 : 1 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                    {signalMutation.isPending ? 'Saving...' : 'Update Signal 📡'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowSignalModal(false)} style={{ marginTop: 14, alignItems: 'center' }}>
                <Text style={{ color: '#6B7280', fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Member detail modal ── */}
      <Modal visible={!!selectedMember} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
          activeOpacity={1}
          onPress={() => setSelectedMember(null)}
        >
          {selectedMember && (
            <TouchableOpacity activeOpacity={1} style={{ width: '100%' }}>
              {(() => {
                const sc = SIGNAL_COLORS[selectedMember.signalType as keyof typeof SIGNAL_COLORS] ?? '#6B7280';
                const isHighMatch = selectedMember.matchScore >= 70;
                return (
                  <View style={{
                    backgroundColor: '#111118', borderRadius: 24, padding: 24,
                    alignItems: 'center', borderColor: `${sc}55`, borderWidth: 1,
                  }}>
                    {/* Avatar */}
                    <View style={{
                      width: 88, height: 88, borderRadius: 44, overflow: 'hidden',
                      marginBottom: 12, borderWidth: 2.5, borderColor: sc,
                    }}>
                      {selectedMember.avatarUrl ? (
                        <Image source={{ uri: selectedMember.avatarUrl }} style={{ width: 88, height: 88 }} />
                      ) : (
                        <LinearGradient colors={['#EC4899', '#A855F7']}
                          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 30, fontWeight: '700' }}>
                            {selectedMember.displayName?.[0] ?? '?'}
                          </Text>
                        </LinearGradient>
                      )}
                    </View>

                    <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 6 }}>
                      {selectedMember.displayName}
                    </Text>

                    {/* Match badge */}
                    <View style={{
                      paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, marginBottom: 12,
                      backgroundColor: isHighMatch ? '#EC489922' : '#A855F722',
                    }}>
                      <Text style={{ color: isHighMatch ? '#EC4899' : '#A855F7', fontWeight: '800', fontSize: 14 }}>
                        {selectedMember.matchScore}% Match ✨
                      </Text>
                    </View>

                    {selectedMember.message ? (
                      <Text style={{
                        color: '#9CA3AF', textAlign: 'center', marginBottom: 12,
                        fontStyle: 'italic', fontSize: 14, lineHeight: 20,
                      }}>
                        "{selectedMember.message}"
                      </Text>
                    ) : null}

                    {/* Chips */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
                      {selectedMember.gender ? <Chip label={cap(selectedMember.gender)} color="#A855F7" /> : null}
                      {selectedMember.seekingDynamic ? (
                        <Chip label={selectedMember.seekingDynamic.replace(/_/g, ' ')} color="#EC4899" />
                      ) : null}
                      {selectedMember.distance != null ? (
                        <Chip label={`${selectedMember.distance} km away`} color="#10B981" />
                      ) : null}
                      {selectedMember.isQueerFriendly ? <Chip label="🌈 Queer Friendly" color="#F59E0B" /> : null}
                    </View>

                    {/* CTA */}
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedMember(null);
                        router.push(`/member/${selectedMember.userId}` as any);
                      }}
                      style={{ width: '100%', marginBottom: 10 }}
                    >
                      <LinearGradient
                        colors={['#EC4899', '#A855F7']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={{ borderRadius: 14, padding: 14, alignItems: 'center' }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>View Profile</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setSelectedMember(null)}>
                      <Text style={{ color: '#6B7280', fontSize: 14 }}>Close</Text>
                    </TouchableOpacity>
                  </View>
                );
              })()}
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute' },
  label: {
    color: '#9CA3AF', fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
});
