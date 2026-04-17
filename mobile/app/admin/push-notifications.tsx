import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';

const COMMUNITIES = [
  { label: 'All Communities', value: undefined },
  { label: 'Soapies', value: 'soapies' },
  { label: 'Gaypeez', value: 'gaypeez' },
  { label: 'Groupus', value: 'groupus' },
];

const QUICK_TEMPLATES = [
  { label: '🎉 Event Reminder', title: "Don't forget tonight!", body: "Your event is coming up! Check the Events tab for details." },
  { label: '📣 Announcement', title: 'Soapies Update', body: 'We have an important update for the community. Open the app to learn more.' },
  { label: '💗 Welcome', title: 'Welcome to Soapies! 🎉', body: "You've been approved! Come say hi on the community wall." },
  { label: '🎟️ New Event', title: 'New event just dropped!', body: 'A new event is now available. Grab your spot before it fills up!' },
];

export default function PushNotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<'broadcast' | 'individual'>('broadcast');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [communityFilter, setCommunityFilter] = useState<string | undefined>(undefined);
  const [targetUserId, setTargetUserId] = useState('');

  const broadcastMutation = trpc.admin.broadcastPush.useMutation({
    onSuccess: (data: any) => {
      Alert.alert('Sent!', `Notification delivered to ${data.sent} of ${data.total} members with push tokens.`);
      setTitle(''); setBody('');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const sendToUserMutation = trpc.admin.sendPushToUser.useMutation({
    onSuccess: () => {
      Alert.alert('Sent!', 'Push notification delivered to that user.');
      setTitle(''); setBody(''); setTargetUserId('');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  // Fetch all members for the user picker
  const { data: membersData } = trpc.members.browse.useQuery(
    { community: 'all' },
    { staleTime: 60_000 }
  );
  const members = (Array.isArray(membersData) ? membersData : []) as any[];

  function applyTemplate(t: typeof QUICK_TEMPLATES[0]) {
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
          { text: 'Send', onPress: () => broadcastMutation.mutate({ title: title.trim(), body: body.trim(), communityId: communityFilter }) },
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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <LinearGradient
        colors={['#1A082E', '#080810']}
        style={{ paddingTop: insets.top + 12, paddingBottom: 16, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffffff15', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="arrow-back" size={20} color="#F1F0FF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#F1F0FF', fontSize: 20, fontWeight: '800' }}>Push Notifications</Text>
            <Text style={{ color: '#5A5575', fontSize: 13 }}>Send to members</Text>
          </View>
          <View style={{ backgroundColor: '#EC489920', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#EC489940' }}>
            <Text style={{ color: '#EC4899', fontSize: 12, fontWeight: '700' }}>📣 ADMIN</Text>
          </View>
        </View>

        {/* Tab toggle */}
        <View style={{ flexDirection: 'row', backgroundColor: '#0C0C1A', borderRadius: 12, padding: 3, marginTop: 14, borderWidth: 1, borderColor: '#1A1A30' }}>
          {(['broadcast', 'individual'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={{
                flex: 1, borderRadius: 10, paddingVertical: 9,
                backgroundColor: tab === t ? '#EC4899' : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: tab === t ? '#fff' : '#5A5575', fontWeight: '700', fontSize: 13 }}>
                {t === 'broadcast' ? '📣 Broadcast' : '👤 Individual'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        {/* Quick templates */}
        <Text style={{ color: '#5A5575', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
          Quick Templates
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 8 }}>
            {QUICK_TEMPLATES.map((t) => (
              <TouchableOpacity
                key={t.label}
                onPress={() => applyTemplate(t)}
                style={{
                  backgroundColor: '#10101C', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
                  borderWidth: 1, borderColor: '#1A1A30',
                }}
              >
                <Text style={{ color: '#F1F0FF', fontWeight: '600', fontSize: 13 }}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Audience filter (broadcast only) */}
        {tab === 'broadcast' && (
          <>
            <Text style={{ color: '#5A5575', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
              Audience
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {COMMUNITIES.map((c) => (
                <TouchableOpacity
                  key={String(c.value)}
                  onPress={() => setCommunityFilter(c.value)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8,
                    borderRadius: 20, borderWidth: 1,
                    backgroundColor: communityFilter === c.value ? '#EC489920' : '#10101C',
                    borderColor: communityFilter === c.value ? '#EC4899' : '#1A1A30',
                  }}
                >
                  <Text style={{ color: communityFilter === c.value ? '#EC4899' : '#A09CB8', fontWeight: '600', fontSize: 13 }}>
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
            <Text style={{ color: '#5A5575', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
              Select Member
            </Text>
            <TextInput
              value={targetUserId}
              onChangeText={setTargetUserId}
              placeholder="User ID (tap member below to fill)"
              placeholderTextColor="#5A5575"
              keyboardType="numeric"
              style={{
                backgroundColor: '#10101C', borderRadius: 12, borderWidth: 1, borderColor: '#1A1A30',
                color: '#F1F0FF', padding: 14, fontSize: 15, marginBottom: 12,
              }}
            />
            <View style={{ maxHeight: 200, backgroundColor: '#10101C', borderRadius: 12, borderWidth: 1, borderColor: '#1A1A30', marginBottom: 20, overflow: 'hidden' }}>
              <ScrollView>
                {members.slice(0, 50).map((m: any) => (
                  <TouchableOpacity
                    key={m.userId ?? m.id}
                    onPress={() => setTargetUserId(String(m.userId ?? m.id))}
                    style={{
                      flexDirection: 'row', alignItems: 'center', padding: 12,
                      borderBottomWidth: 1, borderBottomColor: '#1A1A30',
                      backgroundColor: targetUserId === String(m.userId ?? m.id) ? '#EC489915' : 'transparent',
                    }}
                  >
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EC489930', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                      <Text style={{ color: '#EC4899', fontWeight: '700', fontSize: 13 }}>
                        {(m.displayName ?? m.name ?? '?')[0]?.toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#F1F0FF', fontWeight: '600', fontSize: 13 }}>{m.displayName ?? m.name}</Text>
                      <Text style={{ color: '#5A5575', fontSize: 11 }}>ID: {m.userId ?? m.id} · {m.communityId ?? m.community}</Text>
                    </View>
                    {targetUserId === String(m.userId ?? m.id) && (
                      <Ionicons name="checkmark-circle" size={18} color="#EC4899" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        )}

        {/* Compose */}
        <Text style={{ color: '#5A5575', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
          Compose
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Notification title"
          placeholderTextColor="#5A5575"
          maxLength={100}
          style={{
            backgroundColor: '#10101C', borderRadius: 12, borderWidth: 1, borderColor: title ? '#EC489960' : '#1A1A30',
            color: '#F1F0FF', padding: 14, fontSize: 15, marginBottom: 10,
          }}
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Message body..."
          placeholderTextColor="#5A5575"
          multiline
          numberOfLines={4}
          maxLength={500}
          style={{
            backgroundColor: '#10101C', borderRadius: 12, borderWidth: 1, borderColor: body ? '#EC489960' : '#1A1A30',
            color: '#F1F0FF', padding: 14, fontSize: 15, minHeight: 100,
            textAlignVertical: 'top', marginBottom: 6,
          }}
        />
        <Text style={{ color: '#5A5575', fontSize: 11, textAlign: 'right', marginBottom: 20 }}>
          {body.length}/500
        </Text>

        {/* Preview */}
        {(title || body) && (
          <View style={{
            backgroundColor: '#10101C', borderRadius: 16, padding: 16,
            borderWidth: 1, borderColor: '#1A1A30', marginBottom: 20,
          }}>
            <Text style={{ color: '#5A5575', fontSize: 11, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>Preview</Text>
            <View style={{ backgroundColor: '#1A1A30', borderRadius: 12, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#EC4899', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14 }}>🧼</Text>
                </View>
                <Text style={{ color: '#F1F0FF', fontWeight: '700', fontSize: 13, flex: 1 }}>Soapies</Text>
                <Text style={{ color: '#5A5575', fontSize: 11 }}>now</Text>
              </View>
              <Text style={{ color: '#F1F0FF', fontWeight: '600', fontSize: 14 }}>{title || '—'}</Text>
              <Text style={{ color: '#A09CB8', fontSize: 13, marginTop: 3 }}>{body || '—'}</Text>
            </View>
          </View>
        )}

        {/* Send button */}
        <TouchableOpacity onPress={handleSend} disabled={isPending} activeOpacity={0.85}>
          <LinearGradient
            colors={['#EC4899', '#A855F7']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 16, padding: 16, alignItems: 'center',
              flexDirection: 'row', justifyContent: 'center', gap: 8,
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
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
