import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import Avatar from '../../components/Avatar';
import { communityColor, formatDistanceToNow } from '../../lib/utils';

export default function MemberProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: member, isLoading } = trpc.members.byId.useQuery(
    { userId: Number(id) },
    { enabled: !!id },
  );

  const createConversation = trpc.messages.createConversation.useMutation({
    onSuccess: (conversationId) => {
      router.push(`/chat/${conversationId}` as any);
    },
    onError: (e) => Alert.alert('Error', e.message),
  });

  const m = member as any;

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

  const displayName = m.displayName ?? m.name ?? 'Member';
  const community = m.communityId ?? m.community?.name;
  const badgeColor = communityColor(community);
  const joinedDate = m.createdAt
    ? new Date(m.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  function handleMessage() {
    createConversation.mutate({
      type: 'dm',
      participantIds: [Number(id)],
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Back button */}
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

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero gradient */}
        <LinearGradient
          colors={['#7C3AED33', '#EC489933', '#0D0D0D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ paddingTop: insets.top + 60, paddingBottom: 28, alignItems: 'center', paddingHorizontal: 20 }}
        >
          <Avatar name={displayName} url={m.avatarUrl} size={88} style={{ marginBottom: 14 }} />
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>{displayName}</Text>

          {community && (
            <View
              style={{
                marginTop: 8,
                paddingHorizontal: 14,
                paddingVertical: 5,
                backgroundColor: `${badgeColor}22`,
                borderRadius: 20,
                borderColor: `${badgeColor}44`,
                borderWidth: 1,
              }}
            >
              <Text style={{ color: badgeColor, fontWeight: '700', fontSize: 13 }}>
                {community.charAt(0).toUpperCase() + community.slice(1)}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Bio */}
        {m.bio && (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' }}>
              {m.bio}
            </Text>
          </View>
        )}

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
            marginBottom: 16,
          }}
        >
          {[
            { label: 'Events', value: m.eventsAttended ?? 0 },
            { label: 'Posts', value: m.postsCount ?? 0 },
            joinedDate ? { label: 'Joined', value: joinedDate } : null,
          ].filter(Boolean).map((stat: any, i, arr) => (
            <React.Fragment key={stat.label}>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{stat.value}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{stat.label}</Text>
              </View>
              {i < arr.length - 1 && <View style={{ width: 1, backgroundColor: colors.border }} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>

      {/* Message button */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 20,
          paddingBottom: insets.bottom + 16,
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        }}
      >
        <TouchableOpacity
          onPress={handleMessage}
          disabled={createConversation.isPending}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[colors.pink, colors.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              opacity: createConversation.isPending ? 0.7 : 1,
            }}
          >
            {createConversation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="chatbubble-outline" size={20} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                  Message {displayName.split(' ')[0]}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}
