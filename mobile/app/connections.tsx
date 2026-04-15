import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, Modal, FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { trpc } from '../lib/trpc';
import { colors } from '../lib/colors';
import { useAuth } from '../lib/auth';
import Avatar from '../components/Avatar';

const RELATIONSHIP_TYPES = [
  { value: 'couple', label: '💑 Couple', desc: 'Romantic partnership' },
  { value: 'play_partners', label: '🎭 Play Partners', desc: 'Consensual play dynamic' },
  { value: 'fwb', label: '💫 Friends with Benefits', desc: 'Casual intimacy' },
  { value: 'dom_sub', label: '🔗 Dom/Sub', desc: 'Dominant/submissive dynamic' },
  { value: 'master_slave', label: '⛓️ Master/Slave', desc: 'Total power exchange' },
  { value: 'daddy_little', label: '🍼 Daddy/Little', desc: 'Age play dynamic' },
  { value: 'mommy_little', label: '🌸 Mommy/Little', desc: 'Nurturing dynamic' },
  { value: 'pet_play', label: '🐾 Pet Play', desc: 'Pet/owner dynamic' },
  { value: 'bdsm_partners', label: '🖤 BDSM Partners', desc: 'Kink-focused partnership' },
  { value: 'polyam_partner', label: '🌈 Poly Partner', desc: 'Part of a poly network' },
  { value: 'throuple', label: '💜💗💙 Throuple', desc: 'Three-way partnership' },
  { value: 'play_couple', label: '🔥 Play Couple', desc: 'Couple who plays together' },
  { value: 'swing_partner', label: '🎪 Swing Partners', desc: 'Swinging dynamic' },
  { value: 'hotwife_stag', label: '♠️ Hotwife/Stag', desc: 'Stag/vixen or hotwife arrangement' },
  { value: 'bull_couple', label: '🐂 Bull/Couple', desc: 'Bull dynamic' },
  { value: 'ethical_non_mono', label: '🌿 ENM Partners', desc: 'Ethically non-monogamous' },
  { value: 'anchor_partner', label: '⚓ Anchor Partner', desc: 'Primary partner in a poly network' },
];

function relLabel(type: string) {
  return RELATIONSHIP_TYPES.find(r => r.value === type)?.label ?? type.replace(/_/g, ' ');
}

export default function ConnectionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { hasToken } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedRelType, setSelectedRelType] = useState('couple');
  const [showRelPicker, setShowRelPicker] = useState(false);

  const { data: myConnections, refetch: refetchConnections } = trpc.partners.myConnections.useQuery(undefined, { enabled: hasToken });
  const { data: pendingForMe, refetch: refetchPending } = trpc.partners.pendingForMe.useQuery(undefined, { enabled: hasToken });
  const { data: myInvitations, refetch: refetchInvitations } = trpc.partners.myInvitations.useQuery(undefined, { enabled: hasToken });
  const { data: searchResults } = trpc.members.browse.useQuery({ search: searchQuery, page: 0, community: 'all' }, { enabled: hasToken && searchQuery.length > 1 }); // cross-community search for connections

  const sendRequest = trpc.partners.sendConnectionRequest.useMutation({
    onSuccess: () => {
      setSelectedMember(null);
      setShowRelPicker(false);
      refetchInvitations();
      Alert.alert('Sent! 💗', 'Connection request sent successfully.');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const acceptConn = trpc.partners.acceptConnection.useMutation({
    onSuccess: () => { refetchConnections(); refetchPending(); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const declineConn = trpc.partners.declineConnection.useMutation({
    onSuccess: () => refetchPending(),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const removeConn = trpc.partners.removeConnection.useMutation({
    onSuccess: () => refetchConnections(),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const cancelInvite = trpc.partners.cancelInvitation.useMutation({
    onSuccess: () => refetchInvitations(),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const connections = (myConnections as any[]) ?? [];
  const incoming = (pendingForMe as any[]) ?? [];
  const outgoing = ((myInvitations as any[]) ?? []).filter((i: any) => i.status === 'pending');
  const members = (searchResults as any[]) ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', flex: 1 }}>Connections 💗</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}>
        {/* Pending incoming */}
        {incoming.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: colors.pink, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Pending Requests ({incoming.length})
            </Text>
            {incoming.map((inv: any) => (
              <View key={inv.id} style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: `${colors.pink}44` }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Avatar name={inv.inviterName} url={inv.inviterAvatarUrl} size={44} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{inv.inviterName}</Text>
                    <Text style={{ color: colors.muted, fontSize: 13 }}>wants to connect as</Text>
                    <Text style={{ color: colors.pink, fontWeight: '600', fontSize: 13 }}>{relLabel(inv.relationshipType)}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); acceptConn.mutate({ invitationId: inv.id }); }}
                    style={{ flex: 1, backgroundColor: '#10B98120', borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#10B981' }}
                  >
                    <Text style={{ color: '#10B981', fontWeight: '700' }}>✓ Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); declineConn.mutate({ invitationId: inv.id }); }}
                    style={{ flex: 1, backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#EF444466' }}
                  >
                    <Text style={{ color: '#EF4444', fontWeight: '700' }}>✕ Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Active connections */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Active Connections
          </Text>
          {connections.length === 0 ? (
            <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>💗</Text>
              <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 14 }}>No connections yet. Search for a member below to connect.</Text>
            </View>
          ) : (
            connections.map((conn: any) => (
              <View key={conn.groupId} style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Avatar name={conn.partnerDisplayName} url={conn.partnerAvatarUrl} size={48} style={{ marginRight: 14 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{conn.partnerDisplayName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <View style={{ backgroundColor: `${colors.pink}22`, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: `${colors.pink}44` }}>
                        <Text style={{ color: colors.pink, fontSize: 11, fontWeight: '600' }}>{relLabel(conn.relationshipType)}</Text>
                      </View>
                    </View>
                    {conn.connectedSince && (
                      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
                        Connected {new Date(conn.connectedSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => Alert.alert('Remove Connection', `Remove your connection with ${conn.partnerDisplayName}?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => removeConn.mutate({ groupId: conn.groupId }) },
                    ])}
                    style={{ padding: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Outgoing pending */}
        {outgoing.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Sent Requests
            </Text>
            {outgoing.map((inv: any) => (
              <View key={inv.id} style={{ backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>Pending connection request</Text>
                  <Text style={{ color: colors.text, fontSize: 12, marginTop: 2 }}>Expires {new Date(inv.expiresAt).toLocaleDateString()}</Text>
                </View>
                <TouchableOpacity onPress={() => cancelInvite.mutate({ id: inv.id })} style={{ padding: 8 }}>
                  <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Connect with someone */}
        <View>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Connect with Someone
          </Text>
          <View style={{ backgroundColor: colors.card, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}>
            <Ionicons name="search" size={16} color={colors.muted} style={{ marginRight: 8 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search members..."
              placeholderTextColor={colors.muted}
              style={{ flex: 1, color: colors.text, fontSize: 15 }}
            />
          </View>
          {searchQuery.length > 1 && members.map((m: any) => (
            <TouchableOpacity
              key={m.id ?? m.userId}
              onPress={() => { setSelectedMember(m); setShowRelPicker(true); }}
              style={{ backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
            >
              <Avatar name={m.displayName ?? m.name} url={m.avatarUrl} size={40} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{m.displayName ?? m.name}</Text>
                {m.communityId && <Text style={{ color: colors.muted, fontSize: 12 }}>{m.communityId}</Text>}
              </View>
              <Ionicons name="add-circle-outline" size={22} color={colors.pink} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Relationship type picker modal */}
      <Modal visible={showRelPicker} transparent animationType="slide" onRequestClose={() => setShowRelPicker(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setShowRelPicker(false)}>
          <View onStartShouldSetResponder={() => true} style={{ backgroundColor: '#0F0F1A', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' }}>
            <View style={{ padding: 20, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#2D2D3A', alignSelf: 'center', marginBottom: 16 }} />
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 4 }}>
                Connect with {selectedMember?.displayName ?? selectedMember?.name}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 16 }}>Select your relationship dynamic</Text>
            </View>
            <FlatList
              data={RELATIONSHIP_TYPES}
              keyExtractor={item => item.value}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
              renderItem={({ item }) => {
                const selected = selectedRelType === item.value;
                return (
                  <TouchableOpacity
                    onPress={() => setSelectedRelType(item.value)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', padding: 14,
                      borderRadius: 14, marginBottom: 8,
                      backgroundColor: selected ? `${colors.pink}18` : colors.card,
                      borderWidth: 1,
                      borderColor: selected ? colors.pink : colors.border,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: selected ? colors.pink : colors.text, fontWeight: '700', fontSize: 15 }}>{item.label}</Text>
                      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{item.desc}</Text>
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={20} color={colors.pink} />}
                  </TouchableOpacity>
                );
              }}
            />
            <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
              <TouchableOpacity
                onPress={() => {
                  if (!selectedMember) return;
                  const userId = selectedMember.userId ?? selectedMember.id;
                  sendRequest.mutate({ targetUserId: userId, relationshipType: selectedRelType });
                }}
                disabled={sendRequest.isPending}
              >
                <LinearGradient colors={[colors.pink, colors.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center', opacity: sendRequest.isPending ? 0.6 : 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                    {sendRequest.isPending ? 'Sending...' : 'Send Connection Request 💗'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
