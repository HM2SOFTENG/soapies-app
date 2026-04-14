import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import Avatar from '../../components/Avatar';
import { useAuth } from '../../lib/auth';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { logout, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const router = useRouter();
  const { data: me, isLoading } = trpc.auth.me.useQuery(undefined, { staleTime: 0 });
  const { data: profileData } = trpc.profile.me.useQuery(undefined, { staleTime: 0 });
  const { data: creditsData } = trpc.credits.balance.useQuery();
  const { data: referralCode } = trpc.referrals.myCode.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      console.log('[Profile] logout success, clearing session');
      await logout();
      router.replace('/(auth)/login');
    },
    onError: async (err) => {
      console.error('[Profile] logout error:', err.message);
      // Still clear local session even if server logout fails
      await logout();
      router.replace('/(auth)/login');
    },
  });

  // Merge auth.me (role/email) with profile.me (displayName, bio, avatar, stats)
  const profile = { ...(me as any), ...(profileData as any) };

  const credits = (creditsData as any)?.balance ?? (creditsData as any) ?? 0;
  const myCode = (referralCode as any)?.code ?? 'N/A';

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
      console.error('[Profile] share error:', err);
    }
  }

  function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          console.log('[Profile] triggering logout');
          logoutMutation.mutate();
        },
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Header gradient */}
        <LinearGradient
          colors={['#7C3AED22', '#EC489922', '#0D0D0D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ paddingTop: 48, paddingBottom: 24, alignItems: 'center', paddingHorizontal: 20 }}
        >
          <Avatar
            name={profile?.displayName ?? profile?.name ?? '?'}
            url={profile?.avatarUrl}
            size={88}
            style={{ marginBottom: 12 }}
          />
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>
            {profile?.displayName ?? profile?.name ?? 'Member'}
          </Text>
          {profile?.bio && (
            <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 6 }}>
              {profile.bio}
            </Text>
          )}

          {/* Community badge */}
          {profile?.community?.name && (
            <View
              style={{
                marginTop: 10,
                paddingHorizontal: 14,
                paddingVertical: 5,
                backgroundColor: colors.card,
                borderRadius: 20,
                borderColor: colors.border,
                borderWidth: 1,
              }}
            >
              <Text style={{ color: colors.purple, fontWeight: '700', fontSize: 13 }}>
                {profile.community.name}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Stats */}
        <View
          style={{
            flexDirection: 'row',
            marginHorizontal: 20,
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 20,
            borderColor: colors.border,
            borderWidth: 1,
          }}
        >
          <StatBox label="Events" value={profile?.eventsAttended ?? 0} />
          <View style={{ width: 1, backgroundColor: colors.border }} />
          <StatBox label="Posts" value={profile?.postsCount ?? 0} />
          <View style={{ width: 1, backgroundColor: colors.border }} />
          <StatBox label="Referrals" value={profile?.referralsCount ?? 0} />
        </View>

        {/* Credits Balance */}
        <View
          style={{
            marginHorizontal: 20,
            marginTop: 12,
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 16,
            borderColor: colors.border,
            borderWidth: 1,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: `${colors.pink}22`,
            justifyContent: 'center',
            alignItems: 'center',
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

        {/* Referral code */}
        <View
          style={{
            margin: 20,
            marginTop: 12,
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 16,
            borderColor: colors.border,
            borderWidth: 1,
          }}
        >
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

        {/* Actions */}
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {isAdmin && (
            <TouchableOpacity
              onPress={() => router.push('/admin' as any)}
              style={{
                borderRadius: 14,
                overflow: 'hidden',
                marginBottom: 2,
              }}
            >
              <LinearGradient
                colors={[`${colors.purple}33`, `${colors.pink}33`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderRadius: 14,
                  borderColor: `${colors.purple}66`,
                  borderWidth: 1,
                }}
              >
                <Ionicons name="shield-checkmark" size={20} color={colors.purple} />
                <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 12, flex: 1 }}>Admin Dashboard</Text>
                <View style={{
                  backgroundColor: `${colors.purple}44`,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 20,
                  marginRight: 8,
                }}>
                  <Text style={{ color: colors.purple, fontWeight: '800', fontSize: 11 }}>ADMIN</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => router.push('/edit-profile' as any)}
            style={{
              backgroundColor: colors.card,
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 20,
              flexDirection: 'row',
              alignItems: 'center',
              borderColor: colors.border,
              borderWidth: 1,
            }}
          >
            <Ionicons name="create-outline" size={20} color={colors.pink} />
            <Text style={{ color: colors.text, fontWeight: '600', marginLeft: 12 }}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/tickets' as any)}
            style={{
              backgroundColor: colors.card,
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 20,
              flexDirection: 'row',
              alignItems: 'center',
              borderColor: colors.border,
              borderWidth: 1,
            }}
          >
            <Ionicons name="ticket-outline" size={20} color={colors.pink} />
            <Text style={{ color: colors.text, fontWeight: '600', marginLeft: 12 }}>My Tickets</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/members' as any)}
            style={{
              backgroundColor: colors.card,
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 20,
              flexDirection: 'row',
              alignItems: 'center',
              borderColor: colors.border,
              borderWidth: 1,
            }}
          >
            <Ionicons name="people-outline" size={20} color={colors.pink} />
            <Text style={{ color: colors.text, fontWeight: '600', marginLeft: 12 }}>Member Directory</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            disabled={logoutMutation.isPending}
            style={{
              backgroundColor: colors.card,
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 20,
              flexDirection: 'row',
              alignItems: 'center',
              borderColor: colors.border,
              borderWidth: 1,
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
