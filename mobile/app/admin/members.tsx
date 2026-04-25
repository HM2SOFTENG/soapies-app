import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';

const ROLE_OPTIONS = ['all', 'member', 'angel', 'admin'] as const;
const STATUS_OPTIONS = ['all', 'submitted', 'under_review', 'approved', 'rejected', 'waitlisted'] as const;

function formatLabel(value?: string | null) {
  if (!value) return null;
  return value.replace(/_/g, ' ').replace(/\w/g, (c) => c.toUpperCase());
}

function StatChip({ label, value, tone, theme }: any) {
  const palette = tone === 'primary'
    ? { bg: theme.alpha(theme.colors.primary, 0.12), border: theme.alpha(theme.colors.primary, 0.28), text: theme.colors.primary }
    : tone === 'warning'
    ? { bg: theme.alpha(theme.colors.warning, 0.12), border: theme.alpha(theme.colors.warning, 0.28), text: theme.colors.warning }
    : tone === 'success'
    ? { bg: theme.alpha(theme.colors.success, 0.12), border: theme.alpha(theme.colors.success, 0.28), text: theme.colors.success }
    : { bg: theme.colors.page, border: theme.colors.border, text: theme.colors.textSecondary };

  return (
    <View style={{ minWidth: '31%', flexGrow: 1, backgroundColor: palette.bg, borderWidth: 1, borderColor: palette.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
      <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <Text style={{ color: palette.text, fontSize: 13, fontWeight: '800', marginTop: 4 }}>{value || '—'}</Text>
    </View>
  );
}

function AlertBadge({ label, count, color, theme }: any) {
  if (!count) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: theme.alpha(color, 0.12), borderWidth: 1, borderColor: theme.alpha(color, 0.24) }}>
      <Text style={{ color, fontSize: 11, fontWeight: '800' }}>{label} · {count}</Text>
    </View>
  );
}

function ActionRow({ icon, title, subtitle, color, onPress, danger = false }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: danger ? 'rgba(255,59,48,0.08)' : 'transparent', borderWidth: 1, borderColor: danger ? 'rgba(255,59,48,0.22)' : 'rgba(127,127,127,0.18)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 }}>
      <View style={{ width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg }}>
        <Ionicons name={icon} size={18} color={color.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: color.text, fontSize: 15, fontWeight: '800' }}>{title}</Text>
        {!!subtitle && <Text style={{ color: color.subtle, fontSize: 12, marginTop: 2 }}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={color.chevron} />
    </TouchableOpacity>
  );
}

export default function AdminMembersScreen() {
  const router = useRouter();
  const { reopenUserId } = useLocalSearchParams<{ reopenUserId?: string }>();
  const { user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();

  const [search, setSearch] = useState('');
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]>('all');
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);

  const { data: meData } = trpc.auth.me.useQuery(undefined, { staleTime: 60000 });
  const isAdmin = user?.role === 'admin' || (meData as any)?.role === 'admin';

  const { data, isLoading, isError, error, refetch } = trpc.admin.adminMembers.useQuery({ search, role, status, community: groupFilter }, { enabled: isAdmin });
  const { data: detail, isLoading: detailLoading, isError: detailIsError, error: detailError, refetch: refetchDetail } = trpc.admin.adminMemberDetail.useQuery({ userId: selectedUserId! }, { enabled: !!selectedUserId && isAdmin });

  const roleMutation = trpc.admin.updateUserRole.useMutation({
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
  const suspendMutation = trpc.admin.suspendUser.useMutation({
    onSuccess: () => { utils.admin.adminMembers.invalidate(); utils.admin.adminMemberDetail.invalidate(); Alert.alert('Updated', 'Member suspended.'); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });
  const unsuspendMutation = trpc.admin.unsuspendUser.useMutation({
    onSuccess: () => { utils.admin.adminMembers.invalidate(); utils.admin.adminMemberDetail.invalidate(); Alert.alert('Updated', 'Member restored.'); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });
  const deleteMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => { utils.admin.adminMembers.invalidate(); setSelectedUserId(null); Alert.alert('Deleted', 'Member deleted.'); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });
  const reviewProfileChangeMutation = trpc.admin.reviewMemberProfileChange.useMutation({
    onSuccess: () => { utils.admin.adminMemberDetail.invalidate(); Alert.alert('Updated', 'Profile change request reviewed.'); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });
  const reviewGroupChangeMutation = trpc.admin.reviewMemberGroupChange.useMutation({
    onSuccess: () => { utils.admin.adminMemberDetail.invalidate(); Alert.alert('Updated', 'Group change request reviewed.'); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });
  const requestPasswordResetMutation = trpc.admin.requestMemberPasswordReset.useMutation({
    onSuccess: () => Alert.alert('Sent', 'Password reset email/code has been sent.'),
    onError: (e: any) => Alert.alert('Error', e.message),
  });
  const reviewApplicationMutation = trpc.admin.reviewMemberApplication.useMutation({
    onSuccess: () => { utils.admin.adminMembers.invalidate(); utils.admin.adminMemberDetail.invalidate(); Alert.alert('Updated', 'Application reviewed.'); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });
  const advanceApplicationMutation = trpc.admin.advanceMemberApplication.useMutation({
    onSuccess: () => { utils.admin.adminMembers.invalidate(); utils.admin.adminMemberDetail.invalidate(); Alert.alert('Updated', 'Application phase updated.'); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });
  const confirmReservationMutation = trpc.admin.confirmMemberReservation.useMutation({
    onSuccess: () => { utils.admin.adminMembers.invalidate(); utils.admin.adminMemberDetail.invalidate(); Alert.alert('Updated', 'Payment confirmed and reservation updated.'); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });
  const reviewTestMutation = trpc.admin.reviewMemberTest.useMutation({
    onSuccess: () => { utils.admin.adminMembers.invalidate(); utils.admin.adminMemberDetail.invalidate(); Alert.alert('Updated', 'Test result reviewed.'); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });
  const setMemberGroupsMutation = trpc.admin.setMemberGroups.useMutation({
    onSuccess: (result: any) => {
      utils.admin.adminMemberDetail.invalidate();
      setSelectedGroupIds((result as any)?.memberships?.map((membership: any) => membership.groupId) ?? []);
      Alert.alert('Updated', 'Member group assignments saved.');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const members = useMemo(() => (data as any[]) ?? [], [data]);
  const availableFilterGroups = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((member: any) => {
      if (member.communityId) map.set(String(member.communityId), String(member.communityId));
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [members]);
  const selectedDetail: any = detail as any;
  const selectedProfile = selectedDetail?.profile;
  const selectedUser = selectedDetail?.user;
  const selectedNotifications = selectedDetail?.notifications ?? [];
  const selectedCredits = selectedDetail?.credits ?? [];
  const selectedReferralCodes = selectedDetail?.referralCodes ?? [];
  const availableGroups = selectedDetail?.groups ?? [];
  const groupMemberships = selectedDetail?.groupMemberships ?? [];
  const pendingProfileRequests = selectedDetail?.pendingProfileRequests ?? [];
  const pendingGroupRequests = selectedDetail?.pendingGroupRequests ?? [];
  const pendingApplications = selectedDetail?.pendingApplications ?? [];
  const pendingReservations = selectedDetail?.pendingReservations ?? [];
  const pendingTests = selectedDetail?.pendingTests ?? [];
  const isSuspended = !!selectedUser?.isSuspended;

  const neutralAction = { bg: theme.colors.page, fg: theme.colors.textSecondary, text: theme.colors.text, subtle: theme.colors.textMuted, chevron: theme.colors.textMuted };
  const primaryAction = { bg: theme.alpha(theme.colors.primary, 0.14), fg: theme.colors.primary, text: theme.colors.text, subtle: theme.colors.textMuted, chevron: theme.colors.primary };
  const warningAction = { bg: theme.alpha(theme.colors.warning, 0.14), fg: theme.colors.warning, text: theme.colors.text, subtle: theme.colors.textMuted, chevron: theme.colors.warning };
  const purpleAction = { bg: theme.alpha(theme.colors.purple, 0.14), fg: theme.colors.purple, text: theme.colors.text, subtle: theme.colors.textMuted, chevron: theme.colors.purple };
  const dangerAction = { bg: 'rgba(255,59,48,0.14)', fg: '#ff3b30', text: '#ff3b30', subtle: theme.colors.textMuted, chevron: '#ff3b30' };

  React.useEffect(() => {
    const nextIds = groupMemberships.map((membership: any) => membership.groupId);
    setSelectedGroupIds(nextIds);
  }, [selectedUserId, detail]);

  React.useEffect(() => {
    if (!reopenUserId) return;
    const parsed = Number(reopenUserId);
    if (!Number.isFinite(parsed)) return;
    setSelectedUserId(parsed);
    router.setParams({ reopenUserId: undefined as any });
  }, [reopenUserId]);

  if (!isAdmin) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: theme.colors.text }}>Access denied</Text></SafeAreaView>;
  }

  if (isError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Ionicons name="cloud-offline-outline" size={46} color={theme.colors.textMuted} />
        <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '800', marginTop: 16, textAlign: 'center' }}>Could not load members admin</Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 21 }}>{(error as any)?.message ?? 'Please try again in a moment.'}</Text>
        <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 18, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: theme.colors.surface, borderRadius: 12, borderColor: theme.colors.border, borderWidth: 1 }}>
          <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.pageHeader }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.isDark ? theme.alpha(theme.colors.white, 0.06) : theme.colors.surfaceHigh, borderWidth: 1, borderColor: theme.colors.border }}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '800', flex: 1 }}>Members Admin</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 14, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.page, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 12 }}>
            <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
            <TextInput value={search} onChangeText={setSearch} placeholder="Search name, email, phone, id" placeholderTextColor={theme.colors.textMuted} style={{ flex: 1, color: theme.colors.text, paddingVertical: 12 }} />
          </View>
          <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' }}>Role</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ROLE_OPTIONS.map((option) => {
              const active = role === option;
              return <TouchableOpacity key={option} onPress={() => setRole(option)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: active ? theme.colors.primary : theme.colors.border, backgroundColor: active ? theme.alpha(theme.colors.primary, 0.12) : theme.colors.page }}><Text style={{ color: active ? theme.colors.primary : theme.colors.textSecondary, fontWeight: '700', fontSize: 12 }}>{formatLabel(option)}</Text></TouchableOpacity>;
            })}
          </View>
          <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' }}>Application Status</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {STATUS_OPTIONS.map((option) => {
              const active = status === option;
              return <TouchableOpacity key={option} onPress={() => setStatus(option)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: active ? theme.colors.secondary : theme.colors.border, backgroundColor: active ? theme.alpha(theme.colors.secondary, 0.12) : theme.colors.page }}><Text style={{ color: active ? theme.colors.secondary : theme.colors.textSecondary, fontWeight: '700', fontSize: 12 }}>{formatLabel(option)}</Text></TouchableOpacity>;
            })}
          </View>
          <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' }}>Group</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <TouchableOpacity onPress={() => setGroupFilter('all')} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: groupFilter === 'all' ? theme.colors.primary : theme.colors.border, backgroundColor: groupFilter === 'all' ? theme.alpha(theme.colors.primary, 0.12) : theme.colors.page }}><Text style={{ color: groupFilter === 'all' ? theme.colors.primary : theme.colors.textSecondary, fontWeight: '700', fontSize: 12 }}>All</Text></TouchableOpacity>
            {availableFilterGroups.map((group) => {
              const active = groupFilter === group.id;
              return <TouchableOpacity key={group.id} onPress={() => setGroupFilter(group.id)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: active ? theme.colors.primary : theme.colors.border, backgroundColor: active ? theme.alpha(theme.colors.primary, 0.12) : theme.colors.page }}><Text style={{ color: active ? theme.colors.primary : theme.colors.textSecondary, fontWeight: '700', fontSize: 12 }}>{formatLabel(group.name)}</Text></TouchableOpacity>;
            })}
          </View>
        </View>

        {isLoading ? <ActivityIndicator color={theme.colors.pink} style={{ marginTop: 40 }} /> : members.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="people-outline" size={42} color={theme.colors.textMuted} />
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700', marginTop: 12 }}>No members found</Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 6, textAlign: 'center' }}>Try clearing filters or check whether admin member data is available on this environment.</Text>
          </View>
        ) : members.map((member: any) => (
          <TouchableOpacity key={member.userId} onPress={() => setSelectedUserId(member.userId)} style={{ backgroundColor: theme.colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: member.alerts?.total ? theme.alpha(theme.colors.warning, 0.28) : theme.colors.border, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16 }}>{member.displayName}</Text>
                  {member.alerts?.total ? (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: theme.alpha(theme.colors.warning, 0.14), borderWidth: 1, borderColor: theme.alpha(theme.colors.warning, 0.28) }}>
                      <Text style={{ color: theme.colors.warning, fontSize: 11, fontWeight: '800' }}>{member.alerts.total} alert{member.alerts.total === 1 ? '' : 's'}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>{member.email || member.phone || `User #${member.userId}`}</Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}>{[formatLabel(member.memberRole || member.role), formatLabel(member.applicationStatus), member.communityId].filter(Boolean).join(' • ')}</Text>
                {member.alerts?.total ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    <AlertBadge label="Application" count={member.alerts.application} color={theme.colors.warning} theme={theme} />
                    <AlertBadge label="Profile" count={member.alerts.profileChanges} color={theme.colors.primary} theme={theme} />
                    <AlertBadge label="Group" count={member.alerts.groupChanges} color={theme.colors.secondary} theme={theme} />
                    <AlertBadge label="Payments" count={member.alerts.payments} color={theme.colors.purple} theme={theme} />
                    <AlertBadge label="Testing" count={member.alerts.tests} color={theme.colors.success} theme={theme} />
                  </View>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={!!selectedUserId} animationType="slide" onRequestClose={() => setSelectedUserId(null)}>
        <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.pageHeader }}>
            <TouchableOpacity onPress={() => setSelectedUserId(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginRight: 14, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.page, borderWidth: 1, borderColor: theme.colors.border }}>
              <Ionicons name="close" size={22} color={theme.colors.text} />
            </TouchableOpacity>
            <Text numberOfLines={1} style={{ color: theme.colors.text, fontSize: 20, fontWeight: '800', flex: 1 }}>Member Overview</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
            {detailLoading ? <ActivityIndicator color={theme.colors.pink} style={{ marginTop: 40 }} /> : detailIsError ? (
              <View style={{ alignItems: 'center', paddingTop: 48, paddingHorizontal: 24 }}>
                <Ionicons name="cloud-offline-outline" size={36} color={theme.colors.textMuted} />
                <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800', marginTop: 14, textAlign: 'center' }}>Could not load member details</Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 21 }}>{(detailError as any)?.message ?? 'Please try again in a moment.'}</Text>
                <TouchableOpacity onPress={() => refetchDetail()} style={{ marginTop: 18, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: theme.colors.surface, borderRadius: 12, borderColor: theme.colors.border, borderWidth: 1 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : selectedDetail ? <>
              <View style={{ backgroundColor: theme.colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 14, gap: 14 }}>
                <View>
                  <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: '900' }}>{selectedProfile?.displayName || selectedUser?.name || 'Member'}</Text>
                  <Text style={{ color: theme.colors.textMuted, marginTop: 4 }}>{selectedUser?.email || selectedUser?.phone || `User #${selectedUser?.id}`}</Text>
                  <Text style={{ color: theme.colors.textSecondary, marginTop: 8 }}>{[formatLabel(selectedProfile?.applicationStatus), formatLabel(selectedProfile?.memberRole || selectedUser?.role), selectedProfile?.communityId].filter(Boolean).join(' • ')}</Text>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  <StatChip label="Role" value={formatLabel(selectedProfile?.memberRole || selectedUser?.role)} tone="primary" theme={theme} />
                  <StatChip label="Status" value={formatLabel(selectedProfile?.applicationStatus)} tone={selectedProfile?.applicationStatus === 'approved' ? 'success' : selectedProfile?.applicationStatus === 'waitlisted' ? 'warning' : 'neutral'} theme={theme} />
                  <StatChip label="Signal" value={formatLabel(selectedProfile?.signalType || 'offline')} tone="warning" theme={theme} />
                  <StatChip label="Credits" value={String(selectedCredits.length)} tone="neutral" theme={theme} />
                  <StatChip label="Referrals" value={String(selectedReferralCodes.length)} tone="neutral" theme={theme} />
                  <StatChip label="Alerts" value={String((pendingProfileRequests.length ?? 0) + (pendingGroupRequests.length ?? 0) + (pendingApplications.length ?? 0) + (pendingReservations.length ?? 0) + (pendingTests.length ?? 0))} tone="neutral" theme={theme} />
                </View>
              </View>

              <View style={{ backgroundColor: theme.colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 14, gap: 10 }}>
                <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 }}>Account</Text>
                <View style={{ gap: 8 }}>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Email: <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{selectedUser?.email || '—'}</Text></Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Phone: <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{selectedUser?.phone || '—'}</Text></Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Created: <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{selectedUser?.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : '—'}</Text></Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Email Verified: <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{selectedUser?.emailVerified ? 'Yes' : 'No'}</Text></Text>
                </View>
              </View>

              <View style={{ backgroundColor: theme.colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 14, gap: 10 }}>
                <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 }}>Pending Requests</Text>
                {pendingProfileRequests.length === 0 && pendingGroupRequests.length === 0 ? (
                  <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>No pending profile or group requests for this member.</Text>
                ) : null}
                {pendingProfileRequests.map((request: any) => (
                  <View key={`profile-${request.id}`} style={{ backgroundColor: theme.colors.page, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, padding: 14, gap: 10 }}>
                    <View>
                      <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '800' }}>Profile change: {formatLabel(request.fieldName)}</Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}>Current: {request.currentValue || '—'}</Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>Requested: {request.requestedValue || '—'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity onPress={() => reviewProfileChangeMutation.mutate({ id: request.id, status: 'approved' })} style={{ flex: 1, backgroundColor: theme.alpha(theme.colors.success, 0.14), borderWidth: 1, borderColor: theme.alpha(theme.colors.success, 0.3), borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}><Text style={{ color: theme.colors.success, fontWeight: '800' }}>Approve</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => reviewProfileChangeMutation.mutate({ id: request.id, status: 'denied' })} style={{ flex: 1, backgroundColor: theme.alpha(theme.colors.warning, 0.14), borderWidth: 1, borderColor: theme.alpha(theme.colors.warning, 0.3), borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}><Text style={{ color: theme.colors.warning, fontWeight: '800' }}>Deny</Text></TouchableOpacity>
                    </View>
                  </View>
                ))}
                {pendingGroupRequests.map((request: any) => {
                  const requestedGroup = availableGroups.find((group: any) => group.id === request.requestedGroupId);
                  const currentGroup = availableGroups.find((group: any) => group.id === request.currentGroupId);
                  return (
                    <View key={`group-${request.id}`} style={{ backgroundColor: theme.colors.page, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, padding: 14, gap: 10 }}>
                      <View>
                        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '800' }}>Group change request</Text>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}>Current: {currentGroup?.name || '—'}</Text>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>Requested: {requestedGroup?.name || `Group #${request.requestedGroupId}`}</Text>
                        {request.reason ? <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 6 }}>Reason: {request.reason}</Text> : null}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity onPress={() => reviewGroupChangeMutation.mutate({ id: request.id, status: 'approved' })} style={{ flex: 1, backgroundColor: theme.alpha(theme.colors.success, 0.14), borderWidth: 1, borderColor: theme.alpha(theme.colors.success, 0.3), borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}><Text style={{ color: theme.colors.success, fontWeight: '800' }}>Approve</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => reviewGroupChangeMutation.mutate({ id: request.id, status: 'denied' })} style={{ flex: 1, backgroundColor: theme.alpha(theme.colors.warning, 0.14), borderWidth: 1, borderColor: theme.alpha(theme.colors.warning, 0.3), borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}><Text style={{ color: theme.colors.warning, fontWeight: '800' }}>Deny</Text></TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={{ backgroundColor: theme.colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 14, gap: 10 }}>
                <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 }}>Group Assignments</Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>Assign one or more community groups directly for this member.</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {availableGroups.map((group: any) => {
                    const active = selectedGroupIds.includes(group.id);
                    return (
                      <TouchableOpacity key={group.id} onPress={() => setSelectedGroupIds((current) => current.includes(group.id) ? current.filter((id) => id !== group.id) : [...current, group.id])} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: active ? theme.colors.primary : theme.colors.border, backgroundColor: active ? theme.alpha(theme.colors.primary, 0.12) : theme.colors.page }}>
                        <Text style={{ color: active ? theme.colors.primary : theme.colors.textSecondary, fontWeight: '700', fontSize: 12 }}>{group.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity onPress={() => setMemberGroupsMutation.mutate({ userId: selectedUserId!, groupIds: selectedGroupIds })} style={{ alignSelf: 'flex-start', backgroundColor: theme.alpha(theme.colors.primary, 0.14), borderWidth: 1, borderColor: theme.alpha(theme.colors.primary, 0.3), borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
                  <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>Save Group Assignments</Text>
                </TouchableOpacity>
              </View>

              <View style={{ backgroundColor: theme.colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 14, gap: 10 }}>
                <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 }}>Application & Verification Queue</Text>
                {pendingApplications.length === 0 && pendingReservations.length === 0 && pendingTests.length === 0 ? (
                  <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>No pending application, payment, or testing actions for this member.</Text>
                ) : null}
                {pendingApplications.map((item: any) => (
                  <View key={`application-${item.id}`} style={{ backgroundColor: theme.colors.page, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, padding: 14, gap: 10 }}>
                    <View>
                      <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '800' }}>Application Review</Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}>Phase: {formatLabel(item.applicationPhase || 'initial_review')} · Status: {formatLabel(item.applicationStatus || 'submitted')}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                      <TouchableOpacity onPress={() => reviewApplicationMutation.mutate({ profileId: item.id, status: 'approved' })} style={{ backgroundColor: theme.alpha(theme.colors.success, 0.14), borderWidth: 1, borderColor: theme.alpha(theme.colors.success, 0.3), borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}><Text style={{ color: theme.colors.success, fontWeight: '800' }}>Approve</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => reviewApplicationMutation.mutate({ profileId: item.id, status: 'waitlisted' })} style={{ backgroundColor: theme.alpha(theme.colors.warning, 0.14), borderWidth: 1, borderColor: theme.alpha(theme.colors.warning, 0.3), borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}><Text style={{ color: theme.colors.warning, fontWeight: '800' }}>Waitlist</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => reviewApplicationMutation.mutate({ profileId: item.id, status: 'rejected' })} style={{ backgroundColor: theme.alpha('#ff3b30', 0.14), borderWidth: 1, borderColor: theme.alpha('#ff3b30', 0.3), borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}><Text style={{ color: '#ff3b30', fontWeight: '800' }}>Reject</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => advanceApplicationMutation.mutate({ profileId: item.id, phase: 'interview_scheduled' })} style={{ backgroundColor: theme.alpha(theme.colors.primary, 0.14), borderWidth: 1, borderColor: theme.alpha(theme.colors.primary, 0.3), borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}><Text style={{ color: theme.colors.primary, fontWeight: '800' }}>Schedule Interview</Text></TouchableOpacity>
                    </View>
                  </View>
                ))}
                {pendingReservations.map((reservation: any) => (
                  <View key={`reservation-${reservation.id}`} style={{ backgroundColor: theme.colors.page, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, padding: 14, gap: 10 }}>
                    <View>
                      <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '800' }}>Payment Verification</Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}>{reservation.eventTitle || reservation.event?.title || 'Reservation'} · {formatLabel(reservation.ticketType)} · {formatLabel(reservation.paymentMethod)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => confirmReservationMutation.mutate({ reservationId: reservation.id })} style={{ alignSelf: 'flex-start', backgroundColor: theme.alpha(theme.colors.success, 0.14), borderWidth: 1, borderColor: theme.alpha(theme.colors.success, 0.3), borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}><Text style={{ color: theme.colors.success, fontWeight: '800' }}>Confirm Payment</Text></TouchableOpacity>
                  </View>
                ))}
                {pendingTests.map((test: any) => (
                  <View key={`test-${test.id || test.submission?.id}`} style={{ backgroundColor: theme.colors.page, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, padding: 14, gap: 10 }}>
                    <View>
                      <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '800' }}>Testing Submission</Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}>{test.event?.title || 'Event pending review'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity onPress={() => reviewTestMutation.mutate({ id: test.id || test.submission?.id, status: 'approved' })} style={{ flex: 1, backgroundColor: theme.alpha(theme.colors.success, 0.14), borderWidth: 1, borderColor: theme.alpha(theme.colors.success, 0.3), borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}><Text style={{ color: theme.colors.success, fontWeight: '800' }}>Approve</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => reviewTestMutation.mutate({ id: test.id || test.submission?.id, status: 'rejected' })} style={{ flex: 1, backgroundColor: theme.alpha('#ff3b30', 0.14), borderWidth: 1, borderColor: theme.alpha('#ff3b30', 0.3), borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}><Text style={{ color: '#ff3b30', fontWeight: '800' }}>Reject</Text></TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              <View style={{ backgroundColor: theme.colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 14, gap: 10 }}>
                <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 }}>Actions</Text>
                <ActionRow icon="shield-outline" title="Change Role" subtitle="Promote, demote, or grant admin access" color={primaryAction} onPress={() => Alert.alert('Update Role', 'Choose role', [
                  { text: formatLabel('member')!, onPress: () => roleMutation.mutate({ userId: selectedUserId!, memberRole: 'member' as any }) },
                  { text: formatLabel('angel')!, onPress: () => roleMutation.mutate({ userId: selectedUserId!, memberRole: 'angel' as any }) },
                  { text: formatLabel('admin')!, onPress: () => roleMutation.mutate({ userId: selectedUserId!, memberRole: 'admin' as any }) },
                  { text: 'Cancel', style: 'cancel' },
                ])} />
                <ActionRow icon="sparkles-outline" title="Clear Signal" subtitle="Reset current meetup availability signal" color={warningAction} onPress={() => clearSignalMutation.mutate({ userId: selectedUserId! })} />
                <ActionRow icon="notifications-outline" title="Send Nudge" subtitle="Send a lightweight admin check-in notification" color={purpleAction} onPress={() => nudgeMutation.mutate({ userId: selectedUserId!, title: 'Admin Check-In', body: 'Hi — the team wanted to check in with you. Reply in app if you need anything.' })} />
                <ActionRow icon="key-outline" title="Send Password Reset" subtitle="Email a password reset code to this member" color={primaryAction} onPress={() => requestPasswordResetMutation.mutate({ userId: selectedUserId! })} />
                {!isSuspended ? <ActionRow icon="pause-circle-outline" title="Suspend Member" subtitle="Temporarily disable access without deleting data" color={warningAction} onPress={() => Alert.alert('Suspend member?', 'This will suspend access until restored.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Suspend', style: 'destructive', onPress: () => suspendMutation.mutate({ userId: selectedUserId! }) }])} /> : <ActionRow icon="play-circle-outline" title="Restore Member" subtitle="Re-enable access for this member" color={primaryAction} onPress={() => unsuspendMutation.mutate({ userId: selectedUserId! })} />}
                {selectedProfile?.userId ? <ActionRow icon="person-outline" title="View Public Profile" subtitle="Open the member-facing profile view" color={neutralAction} onPress={() => { const targetUserId = selectedProfile.userId; const returnUserId = selectedUserId; setSelectedUserId(null); setTimeout(() => router.push({ pathname: '/member/[id]' as any, params: { id: String(targetUserId), returnTo: 'admin-members', reopenUserId: String(returnUserId) } } as any), 150); }} /> : null}
              </View>

              <View style={{ backgroundColor: theme.colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 14, gap: 10 }}>
                <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 }}>Admin Notes</Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19 }}>Use suspend for reversible access control, clear signal to remove current casual-meetup intent, and delete only for permanent removal after review. For application, payment, and testing items, triage from the member card alert badges until those direct admin actions are added here.</Text>
                <ActionRow icon="trash-outline" title="Delete Member" subtitle="Permanent removal and related cleanup" color={dangerAction} danger onPress={() => Alert.alert('Delete member permanently?', 'This action is destructive and removes related user data.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate({ userId: selectedUserId! }) }])} />
              </View>
            </> : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
