import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import Avatar from '../../components/Avatar';
import { useAuth } from '../../lib/auth';
import * as Haptics from 'expo-haptics';

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { logout } = useAuth();
  const router = useRouter();
  const { data: me, isLoading } = trpc.auth.me.useQuery();

  const profile = me as any;

  function copyReferral() {
    const code = profile?.referralCode ?? profile?.openId ?? 'N/A';
    Clipboard.setStringAsync(code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied!', 'Referral code copied to clipboard.');
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
            name={profile?.name ?? '?'}
            url={profile?.avatarUrl}
            size={88}
            style={{ marginBottom: 12 }}
          />
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>
            {profile?.name ?? 'Member'}
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

        {/* Referral code */}
        <View
          style={{
            margin: 20,
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
              {profile?.referralCode ?? profile?.openId?.slice(0, 8).toUpperCase() ?? 'N/A'}
            </Text>
            <TouchableOpacity onPress={copyReferral}>
              <Ionicons name="copy-outline" size={20} color={colors.purple} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Actions */}
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <TouchableOpacity
            onPress={() => { router.push('/edit-profile' as any); }}
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
            <Text style={{ color: colors.text, fontWeight: '600', marginLeft: 12 }}>
              Edit Profile
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Alert.alert('Sign Out', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: logout },
              ]);
            }}
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
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={{ color: '#EF4444', fontWeight: '600', marginLeft: 12 }}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
