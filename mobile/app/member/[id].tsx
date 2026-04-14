import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import Avatar from '../../components/Avatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MemberProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: member, isLoading } = trpc.members.profile.useQuery({ userId: Number(id) });
  const m = member as any;

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.pink} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Back */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          position: 'absolute',
          top: insets.top + 10,
          left: 16,
          zIndex: 10,
          backgroundColor: 'rgba(0,0,0,0.6)',
          borderRadius: 20,
          padding: 8,
        }}
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header gradient */}
        <LinearGradient
          colors={['#7C3AED44', '#EC489922', '#0D0D0D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ paddingTop: insets.top + 60, paddingBottom: 24, alignItems: 'center', paddingHorizontal: 20 }}
        >
          <Avatar
            name={m?.name ?? '?'}
            url={m?.avatarUrl}
            size={88}
            style={{ marginBottom: 12 }}
          />
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>
            {m?.name ?? 'Member'}
          </Text>
          {m?.bio && (
            <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 6, maxWidth: 260 }}>
              {m.bio}
            </Text>
          )}
          {m?.community?.name && (
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
                {m.community.name}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Message button */}
        <View style={{ paddingHorizontal: 20 }}>
          <TouchableOpacity activeOpacity={0.85}>
            <LinearGradient
              colors={[colors.pink, colors.purple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 14, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
            >
              <Ionicons name="chatbubble" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Send Message</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
