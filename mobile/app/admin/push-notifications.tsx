import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { useTheme } from '../../lib/theme';
import AdminAccessGate from '../../components/AdminAccessGate';
import { useAdminAccess } from '../../lib/useAdminAccess';

const COMMUNITIES = [
  { label: 'All Communities', value: undefined },
  { label: 'Soapies', value: 'soapies' },
  { label: 'Gaypeez', value: 'gaypeez' },
  { label: 'Groupus', value: 'groupus' },
];

const QUICK_TEMPLATES = [
  {
    label: '🎉 Event Reminder',
    title: "Don't forget tonight!",
    body: 'Your event is coming up! Check the Events tab for details.',
  },
  {
    label: '📣 Announcement',
    title: 'Soapies Update',
    body: 'We have an important update for the community. Open the app to learn more.',
  },
  {
    label: '💗 Welcome',
    title: 'Welcome to Soapies! 🎉',
    body: "You've been approved! Come say hi on the community wall.",
  },
  {
    label: '🎟️ New Event',
    title: 'New event just dropped!',
    body: 'A new event is now available. Grab your spot before it fills up!',
  },
];

export default function PushNotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { isAdmin, isCheckingAdmin } = useAdminAccess();

  const [tab, setTab] = useState<'broadcast' | 'individual'>('broadcast');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [communityFilter, setCommunityFilter] = useState<string | undefined>(undefined);
  const [targetUserId, setTargetUserId] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  const broadcastMutation = trpc.admin.broadcastPush.useMutation({
    onSuccess: (data: any) => {
      Alert.alert(
        'Sent!',
        `Notification delivered to ${data.sent} of ${data.total} members with push tokens.`
      );
      setTitle('');
      setBody('');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const sendToUserMutation = trpc.admin.sendPushToUser.useMutation({
    onSuccess: () => {
      Alert.alert('Sent!', 'Push notification delivered to that user.');
      setTitle('');
      setBody('');
      setTargetUserId('');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const {
    data: membersData,
    isLoading: membersLoading,
    isError: membersIsError,
    error: membersError,
    refetch: refetchMembers,
  } = trpc.admin.adminMembers.useQuery(
    {
      search: memberSearch,
      role: 'all',
      status: 'all',
      community: communityFilter ?? 'all',
    },
    {
      enabled: isAdmin && tab === 'individual',
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    }
  );
  const members = (Array.isArray(membersData) ? membersData : []) as any[];

  if (isCheckingAdmin) return <AdminAccessGate mode="loading" />;
  if (!isAdmin) return <AdminAccessGate mode="denied" onBack={() => router.back()} />;

  function applyTemplate(t: (typeof QUICK_TEMPLATES)[0]) {
    setTitle(t.title);
    setBody(t.body);
  }

  function handleSend() {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Missing fields', 'Please fill in both title and message body.');
      return;
    }
    if (tab === 'broadcast') {
      Alert.alert(
        'Broadcast Push',
        `Send "${title}" to all${communityFilter ? ` ${communityFilter}` : ''} members with push tokens?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send',
            onPress: () =>
              broadcastMutation.mutate({
                title: title.trim(),
                body: body.trim(),
                communityId: communityFilter,
              }),
          },
        ]
      );
    } else {
      const uid = parseInt(targetUserId);
      if (!uid || isNaN(uid)) {
        Alert.alert('Invalid user', 'Please enter a valid user ID or select a member.');
        return;
      }
      sendToUserMutation.mutate({ userId: uid, title: title.trim(), body: body.trim() });
    }
  }

  const isPending = broadcastMutation.isPending || sendToUserMutation.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header */}
      <LinearGradient
        colors={[
          theme.alpha(theme.colors.secondary, 0.22),
          theme.alpha(theme.colors.primary, 0.1),
          theme.colors.background,
        ]}
        style={{ paddingTop: insets.top + 12, paddingBottom: 16, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: theme.alpha(theme.colors.white, 0.12),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '800' }}>
              Push Notifications
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>Send to members</Text>
          </View>
          <View
            style={{
              backgroundColor: theme.alpha(theme.colors.primary, 0.12),
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: theme.alpha(theme.colors.primary, 0.24),
            }}
          >
            <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '700' }}>
              📣 ADMIN
            </Text>
          </View>
        </View>

        {/* Tab toggle */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: theme.colors.floating,
            borderRadius: 12,
            padding: 3,
            marginTop: 14,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          {(['broadcast', 'individual'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={{
                flex: 1,
                borderRadius: 10,
                paddingVertical: 9,
                backgroundColor: tab === t ? theme.colors.primary : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: tab === t ? theme.colors.white : theme.colors.textMuted,
                  fontWeight: '700',
                  fontSize: 13,
                }}
              >
                {t === 'broadcast' ? '📣 Broadcast' : '👤 Individual'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Quick templates */}
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: 11,
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            marginBottom: 10,
          }}
        >
          Quick Templates
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 8 }}>
            {QUICK_TEMPLATES.map((t) => (
              <TouchableOpacity
                key={t.label}
                onPress={() => applyTemplate(t)}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Audience filter (broadcast only) */}
        {tab === 'broadcast' && (
          <>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: 11,
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                marginBottom: 10,
              }}
            >
              Audience
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {COMMUNITIES.map((c) => (
                <TouchableOpacity
                  key={String(c.value)}
                  onPress={() => setCommunityFilter(c.value)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 1,
                    backgroundColor:
                      communityFilter === c.value
                        ? theme.alpha(theme.colors.primary, 0.12)
                        : theme.colors.surface,
                    borderColor:
                      communityFilter === c.value ? theme.colors.primary : theme.colors.border,
                  }}
                >
                  <Text
                    style={{
                      color:
                        communityFilter === c.value
                          ? theme.colors.primary
                          : theme.colors.textSecondary,
                      fontWeight: '600',
                      fontSize: 13,
                    }}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Individual user selector */}
        {tab === 'individual' && (
          <>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: 11,
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                marginBottom: 10,
              }}
            >
              Select Member
            </Text>
            <TextInput
              value={targetUserId}
              onChangeText={setTargetUserId}
              placeholder="User ID (tap member below to fill)"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="numeric"
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
                color: theme.colors.text,
                padding: 14,
                fontSize: 15,
                marginBottom: 12,
              }}
            />
            <TextInput
              value={memberSearch}
              onChangeText={setMemberSearch}
              placeholder="Search members by name, email, or ID"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: memberSearch
                  ? theme.alpha(theme.colors.primary, 0.32)
                  : theme.colors.border,
                color: theme.colors.text,
                padding: 14,
                fontSize: 15,
                marginBottom: 12,
              }}
            />
            <View
              style={{
                maxHeight: 200,
                backgroundColor: theme.colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
                marginBottom: 20,
                overflow: 'hidden',
              }}
            >
              {membersLoading ? (
                <View style={{ paddingVertical: 28, alignItems: 'center' }}>
                  <ActivityIndicator color={theme.colors.primary} />
                </View>
              ) : membersIsError ? (
                <View style={{ paddingVertical: 24, paddingHorizontal: 18, alignItems: 'center' }}>
                  <Ionicons name="cloud-offline-outline" size={24} color={theme.colors.textMuted} />
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontWeight: '700',
                      fontSize: 14,
                      marginTop: 10,
                      textAlign: 'center',
                    }}
                  >
                    Could not load member list
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      fontSize: 12,
                      marginTop: 6,
                      textAlign: 'center',
                    }}
                  >
                    {(membersError as any)?.message ?? 'Please try again in a moment.'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => refetchMembers()}
                    style={{
                      marginTop: 14,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: theme.colors.background,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 12 }}>
                      Retry
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView>
                  {members.length === 0 ? (
                    <View
                      style={{ paddingVertical: 24, paddingHorizontal: 18, alignItems: 'center' }}
                    >
                      <Ionicons name="search-outline" size={24} color={theme.colors.textMuted} />
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontWeight: '700',
                          fontSize: 14,
                          marginTop: 10,
                          textAlign: 'center',
                        }}
                      >
                        No matching members
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.textMuted,
                          fontSize: 12,
                          marginTop: 6,
                          textAlign: 'center',
                        }}
                      >
                        Try a broader search or clear the community filter.
                      </Text>
                    </View>
                  ) : null}
                  {members.map((m: any) => (
                    <TouchableOpacity
                      key={m.userId ?? m.id}
                      onPress={() => setTargetUserId(String(m.userId ?? m.id))}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.colors.border,
                        backgroundColor:
                          targetUserId === String(m.userId ?? m.id)
                            ? theme.alpha(theme.colors.primary, 0.08)
                            : 'transparent',
                      }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: theme.alpha(theme.colors.primary, 0.18),
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 10,
                        }}
                      >
                        <Text
                          style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13 }}
                        >
                          {(m.displayName ?? m.name ?? '?')[0]?.toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }}>
                          {m.displayName ?? m.name}
                        </Text>
                        <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>
                          ID: {m.userId ?? m.id} · {m.communityId ?? m.community ?? 'member'}
                        </Text>
                      </View>
                      {targetUserId === String(m.userId ?? m.id) && (
                        <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </>
        )}

        {/* Compose */}
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: 11,
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            marginBottom: 10,
          }}
        >
          Compose
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Notification title"
          placeholderTextColor={theme.colors.textMuted}
          maxLength={100}
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: title ? theme.alpha(theme.colors.primary, 0.38) : theme.colors.border,
            color: theme.colors.text,
            padding: 14,
            fontSize: 15,
            marginBottom: 10,
          }}
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Message body..."
          placeholderTextColor={theme.colors.textMuted}
          multiline
          numberOfLines={4}
          maxLength={500}
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: body ? theme.alpha(theme.colors.primary, 0.38) : theme.colors.border,
            color: theme.colors.text,
            padding: 14,
            fontSize: 15,
            minHeight: 100,
            textAlignVertical: 'top',
            marginBottom: 6,
          }}
        />
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: 11,
            textAlign: 'right',
            marginBottom: 20,
          }}
        >
          {body.length}/500
        </Text>

        {/* Preview */}
        {(title || body) && (
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.colors.border,
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: 11,
                fontWeight: '700',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}
            >
              Preview
            </Text>
            <View
              style={{ backgroundColor: theme.colors.surfaceHigh, borderRadius: 12, padding: 14 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    backgroundColor: theme.colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14 }}>🧼</Text>
                </View>
                <Text
                  style={{ color: theme.colors.text, fontWeight: '700', fontSize: 13, flex: 1 }}
                >
                  Soapies
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>now</Text>
              </View>
              <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 14 }}>
                {title || '—'}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 3 }}>
                {body || '—'}
              </Text>
            </View>
          </View>
        )}

        {/* Send button */}
        <TouchableOpacity onPress={handleSend} disabled={isPending} activeOpacity={0.85}>
          <LinearGradient
            colors={[theme.colors.pink, theme.colors.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 16,
              padding: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <>
                <Ionicons name="send" size={18} color={theme.colors.white} />
                <Text style={{ color: theme.colors.white, fontWeight: '800', fontSize: 16 }}>
                  {tab === 'broadcast' ? 'Broadcast to All' : 'Send to Member'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
