import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import Avatar from '../../components/Avatar';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../components/Toast';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

// ─── Constants ──────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  admin:   { label: 'Admin',   color: '#fff',         bg: '#6366F1',            emoji: '🛡️' },
  angel:   { label: 'Angel',   color: colors.pink,    bg: `${colors.pink}22`,   emoji: '💗' },
  member:  { label: 'Member',  color: colors.purple,  bg: `${colors.purple}22`, emoji: '✨' },
  pending: { label: 'Pending', color: colors.muted,   bg: colors.card,          emoji: '⏳' },
};

const COMMUNITY_NAMES: Record<string, string> = {
  soapies:  '🎉 Soapies',
  groupies: '💑 Groupies',
  gaypeez:  '🌈 Gaypeez',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function capitalize(str: string) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: '#F1F0FF', fontSize: 24, fontWeight: '900' as const }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
      <View style={{
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: `${colors.purple}22`,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
      }}>
        <Ionicons name={icon} size={16} color={colors.purple} />
      </View>
      <View>
        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </Text>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500', marginTop: 1 }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const REFERRAL_STEPS = [
  { key: 'joined', label: 'Joined' },
  { key: 'applied', label: 'Applied' },
  { key: 'approved', label: 'Approved' },
  { key: 'eventBooked', label: 'Event booked' },
  { key: 'creditEarned', label: 'Credit earned' },
] as const;

function formatShortDate(value?: string | Date | null) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getReferralStep(row: any) {
  if (row?.creditAwarded || row?.referralConverted) return 4;
  if (row?.firstReservationAt) return 3;
  if (row?.applicationStatus === 'approved' || row?.applicationPhase === 'final_approved') return 2;
  if (row?.applicationStatus === 'submitted' || row?.applicationStatus === 'under_review' || row?.applicationPhase === 'interview_scheduled' || row?.applicationPhase === 'interview_complete') return 1;
  if (row?.userCreatedAt) return 0;
  return -1;
}

function ReferralPipelineCard({ row }: { row: any }) {
  const currentStep = getReferralStep(row);
  const earnedDollars = Number(row?.creditAmount ?? 0) / 100;

  return (
    <View style={{
      marginTop: 12,
      backgroundColor: row?.creditAwarded || row?.referralConverted ? 'rgba(16, 185, 129, 0.10)' : '#10101C',
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: row?.creditAwarded || row?.referralConverted ? 'rgba(16, 185, 129, 0.25)' : '#1A1A30',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>
            {row?.referredDisplayName || 'New referral'}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
            Code {row?.referredByCode || '—'}
          </Text>
        </View>
        <View style={{
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: row?.creditAwarded || row?.referralConverted
            ? 'rgba(16, 185, 129, 0.16)'
            : currentStep >= 2
              ? 'rgba(168, 85, 247, 0.16)'
              : 'rgba(236, 72, 153, 0.16)',
        }}>
          <Text style={{
            color: row?.creditAwarded || row?.referralConverted ? '#34D399' : currentStep >= 2 ? '#C084FC' : '#F472B6',
            fontSize: 11,
            fontWeight: '800',
          }}>
            {row?.creditAwarded || row?.referralConverted ? `+$${earnedDollars.toFixed(2)}` : REFERRAL_STEPS[Math.max(currentStep, 0)]?.label || 'Pending'}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 16 }}>
        {REFERRAL_STEPS.map((step, index) => {
          const active = index <= currentStep;
          const isLast = index === REFERRAL_STEPS.length - 1;
          return (
            <React.Fragment key={step.key}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  borderWidth: 2,
                  borderColor: active ? colors.pink : '#2A2544',
                  backgroundColor: active ? colors.pink : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {active ? <Ionicons name="checkmark" size={13} color="#fff" /> : <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: '#4B5563' }} />}
                </View>
                <Text style={{
                  color: active ? colors.text : colors.muted,
                  fontSize: 10,
                  fontWeight: active ? '700' : '500',
                  textAlign: 'center',
                  marginTop: 6,
                  paddingHorizontal: 2,
                }}>
                  {step.label}
                </Text>
              </View>
              {!isLast && <View style={{ flex: 1, height: 2, marginTop: 11, backgroundColor: index < currentStep ? colors.pink : '#2A2544' }} />}
            </React.Fragment>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
        <View style={{ minWidth: '47%' as any }}>
          <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Joined</Text>
          <Text style={{ color: colors.text, fontSize: 13, marginTop: 3 }}>{formatShortDate(row?.userCreatedAt)}</Text>
        </View>
        <View style={{ minWidth: '47%' as any }}>
          <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Application</Text>
          <Text style={{ color: colors.text, fontSize: 13, marginTop: 3, textTransform: 'capitalize' }}>{row?.applicationStatus || 'draft'}</Text>
        </View>
        <View style={{ minWidth: '47%' as any }}>
          <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>First event</Text>
          <Text style={{ color: colors.text, fontSize: 13, marginTop: 3 }} numberOfLines={2}>
            {row?.firstReservationEventTitle || (row?.firstReservationAt ? 'Booked' : '—')}
          </Text>
        </View>
        <View style={{ minWidth: '47%' as any }}>
          <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Credit</Text>
          <Text style={{ color: row?.creditAwarded || row?.referralConverted ? '#34D399' : colors.text, fontSize: 13, marginTop: 3, fontWeight: '700' }}>
            {row?.creditAwarded || row?.referralConverted ? `Earned $${earnedDollars.toFixed(2)}` : 'Pending'}
          </Text>
        </View>
      </View>

      {(row?.creditAwardedAt || row?.firstReservationAt) && (
        <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#1A1A30' }}>
          <Text style={{ color: colors.muted, fontSize: 11 }}>
            {row?.creditAwardedAt
              ? `Reward posted ${formatShortDate(row.creditAwardedAt)}`
              : `First booking ${formatShortDate(row.firstReservationAt)}`}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { logout, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const router = useRouter();
  const { hasToken } = useAuth();

  const { data: me, isLoading } = trpc.auth.me.useQuery(undefined, { staleTime: 0, enabled: hasToken });
  const { data: profileData } = trpc.profile.me.useQuery(undefined, { staleTime: 0, enabled: hasToken });
  const { data: creditsData } = trpc.credits.balance.useQuery(undefined, { enabled: hasToken });
  const { data: referralCode } = trpc.referrals.myCode.useQuery(undefined, { enabled: hasToken });
  const { data: myReferralsData } = trpc.referrals.myReferrals.useQuery(undefined, { enabled: hasToken });
  const { data: myReservationsData } = trpc.reservations.myReservations.useQuery(undefined, { enabled: hasToken });

  // Merge auth.me + profile.me
  const profile = useMemo(() => ({ ...(me as any), ...(profileData as any) }), [me, profileData]);

  // Parse preferences JSON
  const prefs = useMemo(() => {
    try {
      const raw = (profileData as any)?.preferences;
      if (!raw) return null;
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch { return null; }
  }, [profileData]);

  const creditsRaw = (creditsData as any)?.balance ?? (creditsData as any) ?? 0;
  const credits = `$${Number(creditsRaw).toFixed(2)}`; // stored as dollars
  const myCode = (referralCode as any)?.code ?? 'N/A';
  const referralsCount = Math.max(
    (referralCode as any)?.totalReferrals ?? 0,
    ((myReferralsData as any[]) ?? []).length,
  );
  const eventsCount = ((myReservationsData as any[]) ?? []).filter((r: any) => r.status !== 'cancelled').length;
  const referralRewardsEarned = (((myReferralsData as any[]) ?? []).filter((r: any) => r?.creditAwarded || r?.referralConverted).length);
  const pendingReferralRewards = (((myReferralsData as any[]) ?? []).filter((r: any) => !(r?.creditAwarded || r?.referralConverted)).length);

  const memberRole: string | undefined = profile?.memberRole ?? profile?.role;
  const roleConfig = memberRole ? (ROLE_CONFIG[memberRole] ?? ROLE_CONFIG.pending) : null;
  const communityLabel = profile?.communityId ? (COMMUNITY_NAMES[profile.communityId] ?? profile.communityId) : null;

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      toast.info('Logged out');
      await logout();
      router.replace('/(auth)/login');
    },
    onError: async () => {
      await logout();
      router.replace('/(auth)/login');
    },
  });

  function copyReferral() {
    Clipboard.setStringAsync(myCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied!', 'Referral code copied to clipboard.');
  }

  async function shareReferral() {
    try {
      await Share.share({
        message: `Join me on Soapies! Use my referral code: ${myCode}`,
        title: 'Soapies Referral',
      });
    } catch (err: any) {
      if (__DEV__) console.error('[Profile] share error:', err);
    }
  }

  function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logoutMutation.mutate(),
      },
    ]);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#080810', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.pink} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080810' }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>

        {/* ── Gradient Header ── */}
        <LinearGradient
          colors={['#1A082E', '#0D0520', '#080810']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ paddingTop: insets.top + 20, paddingBottom: 28, alignItems: 'center', paddingHorizontal: 20 }}
        >
          <Avatar
            name={profile?.displayName ?? profile?.name ?? '?'}
            url={profile?.avatarUrl}
            size={100}
            style={{ marginBottom: 14, shadowColor: '#EC4899', shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } }}
          />

          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }}>
            {profile?.displayName ?? profile?.name ?? 'Member'}
          </Text>

          {/* Role badge */}
          {roleConfig && (
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 12, paddingVertical: 5,
              borderRadius: 20,
              backgroundColor: roleConfig.bg,
              borderColor: `${roleConfig.color}33`,
              borderWidth: 1,
              marginTop: 8, gap: 4,
            }}>
              <Text style={{ fontSize: 14 }}>{roleConfig.emoji}</Text>
              <Text style={{ color: roleConfig.color, fontWeight: '700', fontSize: 13 }}>{roleConfig.label}</Text>
            </View>
          )}

          {/* Community badge */}
          {communityLabel && (
            <View style={{
              marginTop: 8,
              paddingHorizontal: 14, paddingVertical: 5,
              backgroundColor: colors.card,
              borderRadius: 20,
              borderColor: colors.border,
              borderWidth: 1,
            }}>
              <Text style={{ color: colors.purple, fontWeight: '700', fontSize: 13 }}>
                {communityLabel}
              </Text>
            </View>
          )}

          {/* Bio */}
          {profile?.bio && (
            <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 20 }}>
              {profile.bio}
            </Text>
          )}
        </LinearGradient>

        {/* ── Stats Row ── */}
        <View style={{
          flexDirection: 'row',
          marginHorizontal: 20,
          backgroundColor: '#10101C',
          borderRadius: 16,
          padding: 20,
          borderColor: '#1A1A30',
          borderWidth: 1,
        }}>
          <StatBox label="Events" value={eventsCount} />
          <View style={{ width: 1, backgroundColor: '#1A1A30' }} />
          <StatBox label="Posts" value={profile?.postsCount ?? 0} />
          <View style={{ width: 1, backgroundColor: '#1A1A30' }} />
          <StatBox label="Referrals" value={referralsCount} />
        </View>

        {/* ── About Me ── */}
        {(profile?.location || profile?.gender || profile?.orientation || prefs?.relationshipStatus) && (
          <View style={{
            marginHorizontal: 20, marginTop: 16,
            backgroundColor: '#10101C',
            borderRadius: 16, padding: 16,
            borderColor: '#1A1A30', borderWidth: 1,
          }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 14 }}>About Me</Text>
            {profile?.location && (
              <InfoRow icon="location-outline" label="Location" value={profile.location} />
            )}
            {profile?.gender && (
              <InfoRow icon="person-outline" label="Gender" value={capitalize(profile.gender)} />
            )}
            {profile?.orientation && (
              <InfoRow icon="heart-outline" label="Orientation" value={capitalize(profile.orientation)} />
            )}
            {prefs?.relationshipStatus && (
              <InfoRow icon="people-outline" label="Relationship" value={prefs.relationshipStatus} />
            )}
          </View>
        )}

        {/* ── Interests ── */}
        {prefs?.interests?.length > 0 && (
          <View style={{
            marginHorizontal: 20, marginTop: 12,
            backgroundColor: '#10101C',
            borderRadius: 16, padding: 16,
            borderColor: '#1A1A30', borderWidth: 1,
          }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 12 }}>Interests</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {prefs.interests.map((interest: string) => (
                <View key={interest} style={{
                  paddingHorizontal: 12, paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: `${colors.pink}22`,
                  borderColor: `${colors.pink}44`,
                  borderWidth: 1,
                }}>
                  <Text style={{ color: colors.pink, fontSize: 13, fontWeight: '600' }}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Looking For ── */}
        {prefs?.lookingFor?.length > 0 && (
          <View style={{
            marginHorizontal: 20, marginTop: 12,
            backgroundColor: '#10101C',
            borderRadius: 16, padding: 16,
            borderColor: '#1A1A30', borderWidth: 1,
          }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 12 }}>Looking For</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {prefs.lookingFor.map((item: string) => (
                <View key={item} style={{
                  paddingHorizontal: 12, paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: `${colors.purple}22`,
                  borderColor: `${colors.purple}44`,
                  borderWidth: 1,
                }}>
                  <Text style={{ color: colors.purple, fontSize: 13, fontWeight: '600' }}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Credits Balance ── */}
        <View style={{
          marginHorizontal: 20, marginTop: 16,
          backgroundColor: '#10101C',
          borderRadius: 16, padding: 16,
          borderColor: '#1A1A30', borderWidth: 1,
          flexDirection: 'row', alignItems: 'center',
        }}>
          <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: `${colors.pink}22`,
            justifyContent: 'center', alignItems: 'center',
            marginRight: 14,
          }}>
            <Ionicons name="star" size={20} color={colors.pink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600' }}>CREDITS BALANCE</Text>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 2 }}>
              {credits}
            </Text>
          </View>
        </View>

        {/* ── Referral Code ── */}
        <View style={{
          marginHorizontal: 20, marginTop: 12,
          backgroundColor: '#10101C',
          borderRadius: 16, padding: 16,
          borderColor: '#1A1A30', borderWidth: 1,
        }}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
            REFERRAL CODE
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: colors.pink, fontSize: 18, fontWeight: '800', flex: 1, letterSpacing: 2 }}>
              {myCode}
            </Text>
            <TouchableOpacity onPress={copyReferral} style={{ marginRight: 12 }}>
              <Ionicons name="copy-outline" size={20} color={colors.purple} />
            </TouchableOpacity>
            <TouchableOpacity onPress={shareReferral}>
              <Ionicons name="share-outline" size={20} color={colors.purple} />
            </TouchableOpacity>
          </View>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 10, lineHeight: 18 }}>
            Share your code and track when someone joins, applies, books their first event, and when your reward lands.
          </Text>
        </View>

        {/* ── Referral Tracker ── */}
        <View style={{
          marginHorizontal: 20, marginTop: 12,
          backgroundColor: '#10101C',
          borderRadius: 16, padding: 16,
          borderColor: '#1A1A30', borderWidth: 1,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>Referral Tracker</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 18 }}>
                Follow each referral from signup through approval, first event booking, and reward payout.
              </Text>
            </View>
            <View style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: `${colors.purple}22`, alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="git-network-outline" size={20} color={colors.purple} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(236,72,153,0.10)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(236,72,153,0.18)' }}>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Tracked</Text>
              <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 4 }}>{((myReferralsData as any[]) ?? []).length}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(16,185,129,0.10)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.18)' }}>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Rewards earned</Text>
              <Text style={{ color: '#34D399', fontSize: 22, fontWeight: '900', marginTop: 4 }}>{referralRewardsEarned}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(168,85,247,0.10)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(168,85,247,0.18)' }}>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>In progress</Text>
              <Text style={{ color: colors.purple, fontSize: 22, fontWeight: '900', marginTop: 4 }}>{pendingReferralRewards}</Text>
            </View>
          </View>

          {((myReferralsData as any[]) ?? []).length === 0 ? (
            <View style={{ marginTop: 14, padding: 14, borderRadius: 14, backgroundColor: '#0D0D18', borderWidth: 1, borderColor: '#1A1A30' }}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>No referrals yet</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6, lineHeight: 18 }}>
                When someone signs up with your code, their progress will appear here automatically.
              </Text>
            </View>
          ) : (
            ((myReferralsData as any[]) ?? []).map((row: any) => (
              <ReferralPipelineCard key={row.referredProfileId} row={row} />
            ))
          )}
        </View>

        {/* ── Actions ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 16, gap: 12 }}>

          {/* Admin Dashboard */}
          {isAdmin && (
            <TouchableOpacity
              onPress={() => router.push('/admin' as any)}
              style={{ borderRadius: 14, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={[`${colors.purple}33`, `${colors.pink}33`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 14, paddingHorizontal: 20,
                  flexDirection: 'row', alignItems: 'center',
                  borderRadius: 14,
                  borderColor: `${colors.purple}66`,
                  borderWidth: 1,
                }}
              >
                <Ionicons name="shield-checkmark" size={20} color={colors.purple} />
                <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 12, flex: 1 }}>Admin Dashboard</Text>
                <View style={{
                  backgroundColor: `${colors.purple}44`,
                  paddingHorizontal: 10, paddingVertical: 3,
                  borderRadius: 20, marginRight: 8,
                }}>
                  <Text style={{ color: colors.purple, fontWeight: '800', fontSize: 11 }}>ADMIN</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Edit Profile */}
          <TouchableOpacity
            onPress={() => router.push('/edit-profile' as any)}
            style={{
              backgroundColor: '#10101C',
              borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20,
              flexDirection: 'row', alignItems: 'center',
              borderColor: '#1A1A30', borderWidth: 1,
            }}
          >
            <Ionicons name="create-outline" size={20} color={colors.pink} />
            <Text style={{ color: colors.text, fontWeight: '600', marginLeft: 12 }}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          {/* Settings */}
          <TouchableOpacity
            onPress={() => router.push('/settings' as any)}
            style={{
              backgroundColor: '#10101C',
              borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20,
              flexDirection: 'row', alignItems: 'center',
              borderColor: '#1A1A30', borderWidth: 1,
            }}
          >
            <Ionicons name="settings-outline" size={20} color={colors.muted} />
            <Text style={{ color: colors.text, fontWeight: '600', marginLeft: 12 }}>Settings</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          {/* My Tickets */}
          <TouchableOpacity
            onPress={() => router.push('/tickets' as any)}
            style={{
              backgroundColor: '#10101C',
              borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20,
              flexDirection: 'row', alignItems: 'center',
              borderColor: '#1A1A30', borderWidth: 1,
            }}
          >
            <Ionicons name="ticket-outline" size={20} color={colors.pink} />
            <Text style={{ color: colors.text, fontWeight: '600', marginLeft: 12 }}>My Tickets</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          {/* Member Directory */}
          <TouchableOpacity
            onPress={() => router.push('/members' as any)}
            style={{
              backgroundColor: '#10101C',
              borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20,
              flexDirection: 'row', alignItems: 'center',
              borderColor: '#1A1A30', borderWidth: 1,
            }}
          >
            <Ionicons name="people-outline" size={20} color={colors.pink} />
            <Text style={{ color: colors.text, fontWeight: '600', marginLeft: 12 }}>Member Directory</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          {/* Sign Out */}
          <TouchableOpacity
            onPress={handleLogout}
            disabled={logoutMutation.isPending}
            style={{
              backgroundColor: '#10101C',
              borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20,
              flexDirection: 'row', alignItems: 'center',
              borderColor: '#1A1A30', borderWidth: 1,
            }}
          >
            {logoutMutation.isPending ? (
              <ActivityIndicator color="#EF4444" size="small" />
            ) : (
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            )}
            <Text style={{ color: '#EF4444', fontWeight: '600', marginLeft: 12 }}>Sign Out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
