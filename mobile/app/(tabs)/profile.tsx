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
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{value}</Text>
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

  const credits = (creditsData as any)?.balance ?? (creditsData as any) ?? 0;
  const myCode = (referralCode as any)?.code ?? 'N/A';
  const referralsCount = (referralCode as any)?.totalReferrals ?? 0;
  const eventsCount = ((myReservationsData as any[]) ?? []).filter((r: any) => r.status !== 'cancelled').length;

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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.pink} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>

        {/* ── Gradient Header ── */}
        <LinearGradient
          colors={['#7C3AED22', '#EC489922', '#0D0D0D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ paddingTop: insets.top + 20, paddingBottom: 28, alignItems: 'center', paddingHorizontal: 20 }}
        >
          <Avatar
            name={profile?.displayName ?? profile?.name ?? '?'}
            url={profile?.avatarUrl}
            size={100}
            style={{ marginBottom: 14 }}
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
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 20,
          borderColor: colors.border,
          borderWidth: 1,
        }}>
          <StatBox label="Events" value={eventsCount} />
          <View style={{ width: 1, backgroundColor: colors.border }} />
          <StatBox label="Posts" value={profile?.postsCount ?? 0} />
          <View style={{ width: 1, backgroundColor: colors.border }} />
          <StatBox label="Referrals" value={referralsCount} />
        </View>

        {/* ── About Me ── */}
        {(profile?.location || profile?.gender || profile?.orientation || prefs?.relationshipStatus) && (
          <View style={{
            marginHorizontal: 20, marginTop: 16,
            backgroundColor: colors.card,
            borderRadius: 16, padding: 16,
            borderColor: colors.border, borderWidth: 1,
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
            backgroundColor: colors.card,
            borderRadius: 16, padding: 16,
            borderColor: colors.border, borderWidth: 1,
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
            backgroundColor: colors.card,
            borderRadius: 16, padding: 16,
            borderColor: colors.border, borderWidth: 1,
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
          backgroundColor: colors.card,
          borderRadius: 16, padding: 16,
          borderColor: colors.border, borderWidth: 1,
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
              {typeof credits === 'number' ? credits.toLocaleString() : credits} credits
            </Text>
          </View>
        </View>

        {/* ── Referral Code ── */}
        <View style={{
          marginHorizontal: 20, marginTop: 12,
          backgroundColor: colors.card,
          borderRadius: 16, padding: 16,
          borderColor: colors.border, borderWidth: 1,
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
              backgroundColor: colors.card,
              borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20,
              flexDirection: 'row', alignItems: 'center',
              borderColor: colors.border, borderWidth: 1,
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
              backgroundColor: colors.card,
              borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20,
              flexDirection: 'row', alignItems: 'center',
              borderColor: colors.border, borderWidth: 1,
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
              backgroundColor: colors.card,
              borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20,
              flexDirection: 'row', alignItems: 'center',
              borderColor: colors.border, borderWidth: 1,
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
              backgroundColor: colors.card,
              borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20,
              flexDirection: 'row', alignItems: 'center',
              borderColor: colors.border, borderWidth: 1,
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
              backgroundColor: colors.card,
              borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20,
              flexDirection: 'row', alignItems: 'center',
              borderColor: colors.border, borderWidth: 1,
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
