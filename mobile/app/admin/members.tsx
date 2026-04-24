import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';

const ROLE_OPTIONS = ['all', 'member', 'angel', 'admin'] as const;
const STATUS_OPTIONS = ['all', 'submitted', 'under_review', 'approved', 'rejected', 'waitlisted'] as const;

export default function AdminMembersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const theme = useTheme();
  const utils = trpc.useUtils();

  const [search, setSearch] = useState('');
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]>('all');
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>('all');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const { data: meData } = trpc.auth.me.useQuery(undefined, { staleTime: 60000 });
  const isAdmin = user?.role === 'admin' || (meData as any)?.role === 'admin';

  const { data, isLoading } = trpc.admin.adminMembers.useQuery({ search, role, status }, { enabled: isAdmin });
  const { data: detail, isLoading: detailLoading } = trpc.admin.adminMemberDetail.useQuery({ userId: selectedUserId! }, { enabled: !!selectedUserId && isAdmin });

  const roleMutation = trpc.admin.updateMemberRole.useMutation({
    onSuccess: () => { utils.admin.adminMembers.invalidate(); utils.admin.adminMemberDetail.invalidate(); Alert.alert('Updated', 'Member role updated.'); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });
  const clearSignalMutation = trpc.admin.clearMemberSignal.useMutation({
    onSuccess: () => { utils.admin.adminMemberDetail.invalidate(); Alert.alert('Updated', 'Member signal cleared.'); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });
  const nudgeMutation = trpc.admin.sendMemberNudge.useMutation({
    onSuccess: () => Alert.alert('Sent', 'Member notification sent.'),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const members = useMemo(() => (data as any[]) ?? [], [data]);

  if (!isAdmin) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: theme.colors.text }}>Access denied</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.pageHeader }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.isDark ? theme.alpha(theme.colors.white, 0.06) : theme.colors.surfaceHigh, borderWidth: 1, borderColor: theme.colors.border }}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '800', flex: 1 }}>Members Admin</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.page, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 12 }}>
            <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
            <TextInput value={search} onChangeText={setSearch} placeholder="Search name, email, phone, id" placeholderTextColor={theme.colors.textMuted} style={{ flex: 1, color: theme.colors.text, paddingVertical: 12 }} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {ROLE_OPTIONS.map((option) => {
              const active = role === option;
              return <TouchableOpacity key={option} onPress={() => setRole(option)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: active ? theme.colors.primary : theme.colors.border, backgroundColor: active ? theme.alpha(theme.colors.primary, 0.12) : theme.colors.page }}><Text style={{ color: active ? theme.colors.primary : theme.colors.textSecondary, fontWeight: '700', fontSize: 12 }}>{option}</Text></TouchableOpacity>;
            })}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {STATUS_OPTIONS.map((option) => {
              const active = status === option;
              return <TouchableOpacity key={option} onPress={() => setStatus(option)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: active ? theme.colors.secondary : theme.colors.border, backgroundColor: active ? theme.alpha(theme.colors.secondary, 0.12) : theme.colors.page }}><Text style={{ color: active ? theme.colors.secondary : theme.colors.textSecondary, fontWeight: '700', fontSize: 12 }}>{option}</Text></TouchableOpacity>;
            })}
          </ScrollView>
        </View>

        {isLoading ? <ActivityIndicator color={theme.colors.pink} style={{ marginTop: 40 }} /> : members.map((member: any) => (
          <TouchableOpacity key={member.userId} onPress={() => setSelectedUserId(member.userId)} style={{ backgroundColor: theme.colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16 }}>{member.displayName}</Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>{member.email || member.phone || `User #${member.userId}`}</Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}>{[member.memberRole || member.role, member.applicationStatus, member.communityId].filter(Boolean).join(' • ')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={!!selectedUserId} animationType="slide" onRequestClose={() => setSelectedUserId(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
            <TouchableOpacity onPress={() => setSelectedUserId(null)} style={{ marginRight: 14 }}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '800', flex: 1 }}>Member Detail</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
            {detailLoading ? <ActivityIndicator color={theme.colors.pink} style={{ marginTop: 40 }} /> : detail ? <>
              <View style={{ backgroundColor: theme.colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 12 }}>
                <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800' }}>{(detail as any).profile?.displayName || (detail as any).user?.name || 'Member'}</Text>
                <Text style={{ color: theme.colors.textMuted, marginTop: 4 }}>{(detail as any).user?.email || 'No email'}</Text>
                <Text style={{ color: theme.colors.textSecondary, marginTop: 6 }}>{[((detail as any).profile?.memberRole || (detail as any).user?.role), (detail as any).profile?.applicationStatus, (detail as any).profile?.communityId].filter(Boolean).join(' • ')}</Text>
              </View>

              <View style={{ gap: 10 }}>
                <TouchableOpacity onPress={() => Alert.alert('Update Role', 'Choose role', [ 'member', 'angel', 'admin' ].map((r) => ({ text: r, onPress: () => roleMutation.mutate({ userId: selectedUserId!, role: r as any }) })).concat([{ text: 'Cancel', style: 'cancel' as const }]))} style={{ backgroundColor: theme.alpha(theme.colors.primary, 0.12), borderColor: theme.colors.primary, borderWidth: 1, borderRadius: 12, padding: 14 }}><Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Change Role</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => clearSignalMutation.mutate({ userId: selectedUserId! })} style={{ backgroundColor: theme.alpha(theme.colors.warning, 0.12), borderColor: theme.colors.warning, borderWidth: 1, borderRadius: 12, padding: 14 }}><Text style={{ color: theme.colors.warning, fontWeight: '700' }}>Clear Signal</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => nudgeMutation.mutate({ userId: selectedUserId!, title: 'Admin Check-In', body: 'Hi — the team wanted to check in with you. Reply in app if you need anything.' })} style={{ backgroundColor: theme.alpha(theme.colors.purple, 0.12), borderColor: theme.colors.purple, borderWidth: 1, borderRadius: 12, padding: 14 }}><Text style={{ color: theme.colors.purple, fontWeight: '700' }}>Send Nudge</Text></TouchableOpacity>
                {(detail as any).profile?.userId ? <TouchableOpacity onPress={() => router.push(`/member/${(detail as any).profile.userId}` as any)} style={{ backgroundColor: theme.colors.page, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 12, padding: 14 }}><Text style={{ color: theme.colors.text, fontWeight: '700' }}>View Public Profile</Text></TouchableOpacity> : null}
              </View>
            </> : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
