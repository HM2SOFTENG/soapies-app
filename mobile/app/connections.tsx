import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, Modal, FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { trpc } from '../lib/trpc';
import { useAuth } from '../lib/auth';
import Avatar from '../components/Avatar';
import { FONT } from '../lib/fonts';

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
  const trimmedQuery = searchQuery.trim();
  const { data: searchResults, isLoading: searchLoading, error: searchError } = trpc.members.browse.useQuery(
    { search: trimmedQuery, page: 0 },
    { enabled: hasToken && trimmedQuery.length > 0, staleTime: 0, retry: 1 }
  );

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
  const members = Array.isArray(searchResults) ? searchResults : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080810' }} edges={['bottom']}>
      {/* Header */}
      <LinearGradient
        colors={['#12051E', '#080810']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: '#10101C', borderWidth: 1, borderColor: '#1A1A30',
            alignItems: 'center', justifyContent: 'center',
            marginRight: 14,
          }}
        >
          <Ionicons name="arrow-back" size={18} color="#F1F0FF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#F1F0FF', fontSize: 28, fontWeight: '900', flex: 1, fontFamily: FONT.displayBold }}>Connections 💗</Text>
          <Text style={{ color: '#8B84A7', fontSize: 12, marginTop: 2 }}>Keep your inner circle close</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}>

        <LinearGradient
          colors={['rgba(236,72,153,0.16)', 'rgba(168,85,247,0.08)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ marginTop: 18, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: 'rgba(236,72,153,0.18)' }}
        >
          <Text style={{ color: '#8B84A7', fontSize: 11, letterSpacing: 1.1, fontWeight: '800', fontFamily: FONT.displaySemiBold }}>YOUR NETWORK</Text>
          <View style={{ flexDirection: 'row', marginTop: 14, gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(8,8,16,0.45)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
              <Text style={{ color: '#F1F0FF', fontSize: 24, fontWeight: '900', fontFamily: FONT.displayBold }}>{connections.length}</Text>
              <Text style={{ color: '#A09CB8', fontSize: 11, marginTop: 4 }}>Active</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(8,8,16,0.45)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
              <Text style={{ color: '#F1F0FF', fontSize: 24, fontWeight: '900', fontFamily: FONT.displayBold }}>{incoming.length + outgoing.length}</Text>
              <Text style={{ color: '#A09CB8', fontSize: 11, marginTop: 4 }}>Pending</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Pending incoming ── */}
        {incoming.length > 0 && (
          <View style={{ marginTop: 20, marginBottom: 8 }}>
            <Text style={{ color: '#EC4899', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>
              Pending Requests ({incoming.length})
            </Text>
            {incoming.map((inv: any) => (
              <View key={inv.id} style={{
                backgroundColor: '#10101C', borderRadius: 16, padding: 14,
                marginBottom: 10, borderWidth: 1, borderColor: '#EC489940',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ borderRadius: 26, borderWidth: 2, borderColor: '#EC4899', marginRight: 12 }}>
                    <Avatar name={inv.inviterName} url={inv.inviterAvatarUrl} size={44} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#F1F0FF', fontWeight: '700', fontSize: 15 }}>{inv.inviterName}</Text>
                    <Text style={{ color: '#5A5575', fontSize: 13 }}>wants to connect as</Text>
                    <View style={{ alignSelf: 'flex-start', backgroundColor: '#EC489920', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginTop: 3, borderWidth: 1, borderColor: '#EC489944' }}>
                      <Text style={{ color: '#EC4899', fontWeight: '600', fontSize: 12 }}>{relLabel(inv.relationshipType)}</Text>
                    </View>
                  </View>
                  <View style={{ backgroundColor: '#F59E0B20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#F59E0B44' }}>
                    <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>Pending</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {/* Accept */}
                  <TouchableOpacity
                    onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); acceptConn.mutate({ invitationId: inv.id }); }}
                    style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}
                  >
                    <LinearGradient
                      colors={['#EC4899', '#A855F7']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>✓ Accept</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  {/* Decline */}
                  <TouchableOpacity
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); declineConn.mutate({ invitationId: inv.id }); }}
                    style={{ flex: 1, backgroundColor: '#EF444420', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#EF444440' }}
                  >
                    <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 14 }}>✕ Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Active connections ── */}
        <View style={{ marginTop: incoming.length > 0 ? 8 : 20, marginBottom: 8 }}>
          <Text style={{ color: '#5A5575', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>
            Active Connections
          </Text>
          {connections.length === 0 ? (
            <View style={{ backgroundColor: '#10101C', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#1A1A30' }}>
              <Text style={{ fontSize: 36, marginBottom: 10 }}>💗</Text>
              <Text style={{ color: '#F1F0FF', fontWeight: '700', fontSize: 16, marginBottom: 6 }}>No connections yet</Text>
              <Text style={{ color: '#5A5575', textAlign: 'center', fontSize: 14 }}>Search for a member below to send your first connection request.</Text>
            </View>
          ) : (
            connections.map((conn: any) => (
              <View key={conn.groupId} style={{
                backgroundColor: '#10101C', borderRadius: 16, padding: 14,
                marginBottom: 10, borderWidth: 1, borderColor: '#1A1A30',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ borderRadius: 28, borderWidth: 2, borderColor: '#EC4899', marginRight: 14, shadowColor: '#EC4899', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } }}>
                    <Avatar name={conn.partnerDisplayName} url={conn.partnerAvatarUrl} size={48} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#F1F0FF', fontWeight: '700', fontSize: 15 }}>{conn.partnerDisplayName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                      <View style={{ backgroundColor: '#EC489920', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#EC489944' }}>
                        <Text style={{ color: '#EC4899', fontSize: 11, fontWeight: '600' }}>{relLabel(conn.relationshipType)}</Text>
                      </View>
                      <View style={{ backgroundColor: '#10B98120', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#10B98144' }}>
                        <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '700' }}>Connected</Text>
                      </View>
                    </View>
                    {conn.connectedSince && (
                      <Text style={{ color: '#5A5575', fontSize: 11, marginTop: 4 }}>
                        Since {new Date(conn.connectedSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => Alert.alert('Remove Connection', `Remove your connection with ${conn.partnerDisplayName}?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => removeConn.mutate({ groupId: conn.groupId }) },
                    ])}
                    style={{ backgroundColor: '#EF444420', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#EF444440' }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── Outgoing pending ── */}
        {outgoing.length > 0 && (
          <View style={{ marginBottom: 8 }}>
            <Text style={{ color: '#5A5575', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>
              Sent Requests
            </Text>
            {outgoing.map((inv: any) => (
              <View key={inv.id} style={{
                backgroundColor: '#10101C', borderRadius: 16, padding: 14,
                marginBottom: 10, borderWidth: 1, borderColor: '#1A1A30',
                flexDirection: 'row', alignItems: 'center',
              }}>
                <View style={{ flex: 1 }}>
                  <View style={{ backgroundColor: '#F59E0B20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#F59E0B44', marginBottom: 4 }}>
                    <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>Pending</Text>
                  </View>
                  <Text style={{ color: '#5A5575', fontSize: 13 }}>Connection request sent</Text>
                  <Text style={{ color: '#F1F0FF', fontSize: 12, marginTop: 2 }}>
                    Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => cancelInvite.mutate({ id: inv.id })}
                  style={{ backgroundColor: '#EF444420', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#EF444440' }}
                >
                  <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── Connect with someone ── */}
        <View style={{ marginTop: 4 }}>
          <Text style={{ color: '#5A5575', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>
            Connect with Someone
          </Text>
          {/* Search bar */}
          <View style={{
            backgroundColor: '#10101C', borderRadius: 16,
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 14, paddingVertical: 12,
            borderWidth: 1, borderColor: '#EC489928',
            marginBottom: 12,
          }}>
            <Ionicons name="search" size={16} color="#5A5575" style={{ marginRight: 8 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search members..."
              placeholderTextColor="#5A5575"
              style={{ flex: 1, color: '#F1F0FF', fontSize: 15 }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#5A5575" />
              </TouchableOpacity>
            )}
          </View>

          {trimmedQuery.length > 0 && (
            searchLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <ActivityIndicator color="#EC4899" />
                <Text style={{ color: '#5A5575', fontSize: 13, marginTop: 10 }}>Searching...</Text>
              </View>
            ) : members.length === 0 ? (
              <View style={{ backgroundColor: '#10101C', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#1A1A30' }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
                <Text style={{ color: '#F1F0FF', fontWeight: '700', fontSize: 15, marginBottom: 4 }}>No members found</Text>
                <Text style={{ color: '#5A5575', fontSize: 13, textAlign: 'center' }}>
                  {searchError ? `Error: ${(searchError as any)?.message ?? 'Search failed'}` : `No results for "${trimmedQuery}"`}
                </Text>
              </View>
            ) : (
              members.map((m: any) => (
                <TouchableOpacity
                  key={m.id ?? m.userId}
                  onPress={() => { setSelectedMember(m); setShowRelPicker(true); }}
                  style={{
                    backgroundColor: '#10101C', borderRadius: 16, padding: 14,
                    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
                    borderWidth: 1, borderColor: '#1A1A30',
                  }}
                >
                  <View style={{ borderRadius: 24, borderWidth: 1.5, borderColor: '#EC489960', marginRight: 12 }}>
                    <Avatar name={m.displayName ?? m.name} url={m.avatarUrl} size={40} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#F1F0FF', fontWeight: '700', fontSize: 15 }}>{m.displayName ?? m.name}</Text>
                    {m.communityId && (
                      <Text style={{ color: '#5A5575', fontSize: 12, textTransform: 'capitalize', marginTop: 2 }}>{m.communityId}</Text>
                    )}
                  </View>
                  <View style={{ backgroundColor: '#EC489920', borderRadius: 20, padding: 6, borderWidth: 1, borderColor: '#EC489944' }}>
                    <Ionicons name="add" size={18} color="#EC4899" />
                  </View>
                </TouchableOpacity>
              ))
            )
          )}
        </View>
      </ScrollView>

      {/* ── Relationship type picker modal ── */}
      <Modal visible={showRelPicker} transparent animationType="slide" onRequestClose={() => setShowRelPicker(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowRelPicker(false)}
        >
          <View
            onStartShouldSetResponder={() => true}
            style={{ backgroundColor: '#0C0C1A', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '82%' }}
          >
            <View style={{ padding: 20, paddingBottom: 8 }}>
              {/* Drag handle */}
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#2D2D3A', alignSelf: 'center', marginBottom: 20 }} />
              <Text style={{ color: '#F1F0FF', fontSize: 20, fontWeight: '800', marginBottom: 4, fontFamily: FONT.displayBold }}>
                Connect with {selectedMember?.displayName ?? selectedMember?.name}
              </Text>
              <Text style={{ color: '#5A5575', fontSize: 13, marginBottom: 4 }}>Select your relationship dynamic</Text>
            </View>

            <FlatList
              data={RELATIONSHIP_TYPES}
              keyExtractor={item => item.value}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
              removeClippedSubviews
              windowSize={7}
              initialNumToRender={10}
              maxToRenderPerBatch={8}
              renderItem={({ item }) => {
                const selected = selectedRelType === item.value;
                return (
                  <TouchableOpacity
                    onPress={() => setSelectedRelType(item.value)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', padding: 14,
                      borderRadius: 12, marginBottom: 8,
                      backgroundColor: selected ? '#EC489912' : '#10101C',
                      borderWidth: 1,
                      borderColor: selected ? '#EC4899' : '#1A1A30',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#F1F0FF', fontWeight: '700', fontSize: 15 }}>{item.label}</Text>
                      <Text style={{ color: '#5A5575', fontSize: 12, marginTop: 2 }}>{item.desc}</Text>
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={20} color="#EC4899" />}
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
                style={{
                  shadowColor: '#EC4899', shadowOpacity: 0.4,
                  shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
                }}
              >
                <LinearGradient
                  colors={['#EC4899', '#A855F7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 18, paddingVertical: 16,
                    alignItems: 'center',
                    opacity: sendRequest.isPending ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, fontFamily: FONT.displaySemiBold }}>
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
