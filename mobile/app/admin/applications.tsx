import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import BrandGradient from '../../components/BrandGradient';
import PillTabs from '../../components/PillTabs';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type TabKey = 'new' | 'interview' | 'final_review' | 'decided';

function getPhaseForTab(tab: TabKey, app: any): boolean {
  const status = app.applicationStatus;
  const phase = app.applicationPhase;
  switch (tab) {
    case 'new':
      return (status === 'submitted' || status === 'under_review') && !phase;
    case 'interview':
      return phase === 'interview_scheduled';
    case 'final_review':
      return phase === 'interview_complete';
    case 'decided':
      return (
        status === 'approved' ||
        status === 'rejected' ||
        status === 'waitlisted' ||
        phase === 'final_approved'
      );
    default:
      return false;
  }
}

function getPhaseBadge(app: any): { label: string; color: string } {
  const status = app.applicationStatus;
  const phase = app.applicationPhase;
  if (phase === 'final_approved') return { label: 'Final Approved', color: '#10B981' };
  if (phase === 'interview_complete') return { label: 'Interview Complete', color: '#6366F1' };
  if (phase === 'interview_scheduled') return { label: 'Interview Scheduled', color: '#3B82F6' };
  if (status === 'approved') return { label: 'Approved', color: '#10B981' };
  if (status === 'rejected') return { label: 'Rejected', color: '#EF4444' };
  if (status === 'waitlisted') return { label: 'Waitlisted', color: '#F59E0B' };
  if (status === 'under_review') return { label: 'Under Review', color: '#8B5CF6' };
  return { label: 'Submitted', color: colors.pink };
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function InitialsAvatar({ name, size = 48 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <LinearGradient
      colors={[colors.pink, colors.purple]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.35 }}>{initials}</Text>
    </LinearGradient>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AdminApplicationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const theme = useTheme();
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<TabKey>('new');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<'member' | 'angel' | 'admin'>('member');

  const { data: meData } = trpc.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const isAdmin = user?.role === 'admin' || (meData as any)?.role === 'admin';

  const { data, isLoading } = trpc.admin.pendingApplications.useQuery(undefined, {
    enabled: isAdmin,
  });
  const applications = (data as any[]) ?? [];

  // Detail query — only enabled when an app is expanded
  const { data: detailData, isLoading: detailLoading } = trpc.admin.getApplicationDetail.useQuery(
    { profileId: expandedId! },
    { enabled: expandedId !== null && isAdmin }
  );
  const detail = detailData as any;

  const advanceMutation = trpc.admin.advanceApplication.useMutation({
    onSuccess: () => {
      utils.admin.pendingApplications.invalidate();
      utils.admin.stats.invalidate();
      setExpandedId(null);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const reviewMutation = trpc.admin.reviewApplication.useMutation({
    onSuccess: () => {
      utils.admin.pendingApplications.invalidate();
      utils.admin.stats.invalidate();
      setExpandedId(null);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const isMutating = advanceMutation.isPending || reviewMutation.isPending;

  // ─── Guard ───────────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }}
      >
        <Ionicons name="lock-closed" size={48} color={theme.colors.textMuted} />
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 }}>
          Access Denied
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ paddingVertical: 12, paddingHorizontal: 24, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}
        >
          <Text style={{ color: theme.colors.pink, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── Tab counts ──────────────────────────────────────────────────────────
  const TABS: { key: TabKey; label: string }[] = [
    { key: 'new', label: 'New' },
    { key: 'interview', label: 'Interview' },
    { key: 'final_review', label: 'Final Review' },
    { key: 'decided', label: 'Decided' },
  ];

  const tabCounts = TABS.reduce(
    (acc, t) => {
      acc[t.key] = applications.filter((a: any) => getPhaseForTab(t.key, a)).length;
      return acc;
    },
    {} as Record<TabKey, number>
  );

  const visibleApps = applications.filter((a: any) => getPhaseForTab(activeTab, a));

  // ─── Action handlers ─────────────────────────────────────────────────────
  function handleToggleExpand(profileId: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedId((prev) => (prev === profileId ? null : profileId));
    setSelectedRole('member');
  }

  function handleApproveInterview(profileId: number) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    advanceMutation.mutate({ profileId, phase: 'interview_scheduled' });
  }

  function handleMarkInterviewComplete(profileId: number) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    advanceMutation.mutate({ profileId, phase: 'interview_complete' });
  }

  function handleFinalApprove(profileId: number) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    advanceMutation.mutate({ profileId, phase: 'final_approved', memberRole: selectedRole });
  }

  function handleWaitlist(profileId: number, displayName: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Waitlist Application', `Waitlist ${displayName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Waitlist',
        onPress: () => reviewMutation.mutate({ profileId, status: 'waitlisted' }),
      },
    ]);
  }

  function handleReject(profileId: number, displayName: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert('Reject Application', `Reject ${displayName}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () => reviewMutation.mutate({ profileId, status: 'rejected' }),
      },
    ]);
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomColor: theme.colors.border,
          borderBottomWidth: 1,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.isDark ? theme.alpha(theme.colors.white, 0.06) : theme.colors.surfaceHigh, borderWidth: 1, borderColor: theme.colors.border }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '800', flex: 1 }}>
          Applications
        </Text>
      </View>

      {/* Phase Tabs */}
      <PillTabs
        equalWidth
        compact
        items={TABS.map((tab) => ({
          ...tab,
          badge: tabCounts[tab.key],
        }))}
        value={activeTab}
        onChange={(next) => {
          Haptics.selectionAsync();
          setActiveTab(next);
          setExpandedId(null);
        }}
      />

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.pink} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
          {visibleApps.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="checkmark-circle-outline" size={48} color={theme.colors.success} />
              <Text style={{ color: theme.colors.textMuted, marginTop: 12, fontSize: 15 }}>
                No applications in this phase
              </Text>
            </View>
          )}

          {visibleApps.map((app: any) => {
            const profileId = app.id ?? app.profileId;
            const displayName = app.displayName ?? app.name ?? 'Unknown';
            const photos = app.photos ?? app.applicationPhotos ?? [];
            const firstPhoto = photos[0]?.url ?? photos[0]?.photoUrl ?? photos[0];
            const badge = getPhaseBadge(app);
            const isExpanded = expandedId === profileId;
            const status = app.applicationStatus;
            const phase = app.applicationPhase;

            return (
              <View
                key={profileId}
                style={{
                  backgroundColor: theme.colors.card,
                  borderRadius: 16,
                  marginBottom: 14,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  overflow: 'hidden',
                }}
              >
                {/* Top gradient stripe */}
                <BrandGradient
                  style={{ height: 3 }}
                />

                {/* Card header — always visible */}
                <TouchableOpacity
                  onPress={() => handleToggleExpand(profileId)}
                  activeOpacity={0.8}
                  style={{ padding: 16 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                    {/* Avatar */}
                    {firstPhoto ? (
                      <Image
                        source={{ uri: firstPhoto }}
                        style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={{ marginRight: 12 }}>
                        <InitialsAvatar name={displayName} />
                      </View>
                    )}

                    {/* Name + badge */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                        <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 16 }}>
                          {displayName}
                        </Text>
                        <View
                          style={{
                            backgroundColor: `${badge.color}22`,
                            borderRadius: 20,
                            paddingHorizontal: 9,
                            paddingVertical: 3,
                            borderColor: `${badge.color}44`,
                            borderWidth: 1,
                          }}
                        >
                          <Text style={{ color: badge.color, fontSize: 11, fontWeight: '700' }}>
                            {badge.label}
                          </Text>
                        </View>
                      </View>

                      {/* Meta row */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        {app.gender && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Ionicons name="person-outline" size={12} color={colors.muted} />
                            <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>{app.gender}</Text>
                          </View>
                        )}
                        {app.orientation && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Ionicons name="heart-outline" size={12} color={colors.muted} />
                            <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>{app.orientation}</Text>
                          </View>
                        )}
                        {app.location && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Ionicons name="location-outline" size={12} color={colors.muted} />
                            <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>{app.location}</Text>
                          </View>
                        )}
                        {app.referredByCode && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Ionicons name="sparkles-outline" size={12} color={colors.purple} />
                            <Text style={{ color: theme.colors.purple, fontSize: 11 }}>{app.referredByCode}</Text>
                          </View>
                        )}
                        {app.createdAt && (
                          <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>
                            {formatDate(app.createdAt)}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Expand chevron */}
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.muted}
                      style={{ marginLeft: 8, marginTop: 2 }}
                    />
                  </View>

                  {/* Bio preview */}
                  {app.bio ? (
                    <Text
                      numberOfLines={2}
                      style={{ color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 }}
                    >
                      {app.bio}
                    </Text>
                  ) : null}
                </TouchableOpacity>

                {/* ── Expanded detail panel ────────────────────────────────── */}
                {isExpanded && (
                  <View
                    style={{
                      borderTopColor: colors.border,
                      borderTopWidth: 1,
                      padding: 16,
                    }}
                  >
                    {detailLoading && expandedId === profileId ? (
                      <ActivityIndicator color={colors.pink} style={{ marginVertical: 24 }} />
                    ) : detail ? (
                      <>
                        {/* Photos grid */}
                        {(detail.photos?.length ?? 0) > 0 && (
                          <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                              Photos
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                              {detail.photos.map((photo: any, idx: number) => {
                                const uri = photo.url ?? photo.photoUrl ?? photo;
                                return (
                                  <TouchableOpacity
                                    key={idx}
                                    onPress={() => Linking.openURL(uri)}
                                  >
                                    <Image
                                      source={{ uri }}
                                      style={{ width: 90, height: 90, borderRadius: 10 }}
                                      contentFit="cover"
                                    />
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
                        )}

                        {/* Contact info */}
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                            Contact
                          </Text>
                          {detail.email ? (
                            <TouchableOpacity
                              onPress={() => Linking.openURL(`mailto:${detail.email}`)}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}
                            >
                              <Ionicons name="mail-outline" size={14} color={colors.purple} />
                              <Text style={{ color: theme.colors.purple, fontSize: 14 }}>{detail.email}</Text>
                            </TouchableOpacity>
                          ) : null}
                          {detail.phone ? (
                            <TouchableOpacity
                              onPress={() => Linking.openURL(`tel:${detail.phone}`)}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                            >
                              <Ionicons name="call-outline" size={14} color={colors.purple} />
                              <Text style={{ color: theme.colors.purple, fontSize: 14 }}>{detail.phone}</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        {/* Profile details */}
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                            Profile
                          </Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {detail.gender && (
                              <View style={{ backgroundColor: theme.alpha(theme.colors.purple, 0.12), borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                                <Text style={{ color: theme.colors.purple, fontSize: 12 }}>👤 {detail.gender}</Text>
                              </View>
                            )}
                            {detail.orientation && (
                              <View style={{ backgroundColor: `${colors.pink}22`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                                <Text style={{ color: theme.colors.pink, fontSize: 12 }}>♥ {detail.orientation}</Text>
                              </View>
                            )}
                            {detail.location && (
                              <View style={{ backgroundColor: theme.colors.card, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderColor: theme.colors.border, borderWidth: 1 }}>
                                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>📍 {detail.location}</Text>
                              </View>
                            )}
                            {detail.referredByCode && (
                              <View style={{ backgroundColor: theme.alpha(theme.colors.purple, 0.12), borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                                <Text style={{ color: theme.colors.purple, fontSize: 12 }}>✨ Ref: {detail.referredByCode}</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Bio */}
                        {detail.bio ? (
                          <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                              Bio
                            </Text>
                            <Text style={{ color: theme.colors.text, fontSize: 14, lineHeight: 20 }}>{detail.bio}</Text>
                          </View>
                        ) : null}

                        {/* Booked Intro Call */}
                        {detail.introCallSlots?.length > 0 && (
                          <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                              Intro Call
                            </Text>
                            {detail.introCallSlots.map((slot: any, idx: number) => (
                              <View
                                key={idx}
                                style={{
                                  backgroundColor: theme.alpha(theme.colors.purple, 0.12),
                                  borderRadius: 10,
                                  paddingHorizontal: 12,
                                  paddingVertical: 10,
                                  borderColor: theme.alpha(theme.colors.purple, 0.24),
                                  borderWidth: 1,
                                  marginBottom: 6,
                                }}
                              >
                                <Text style={{ color: theme.colors.purple, fontWeight: '600', fontSize: 14 }}>
                                  📅{' '}
                                  {slot.scheduledAt
                                    ? new Date(slot.scheduledAt).toLocaleString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                      })
                                    : '—'}
                                  {slot.duration ? ` · ${slot.duration} min` : ''}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Application Timeline */}
                        {detail.applicationLogs?.length > 0 && (
                          <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                              Timeline
                            </Text>
                            {detail.applicationLogs.map((log: any, idx: number) => (
                              <View
                                key={idx}
                                style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}
                              >
                                <View
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: colors.pink,
                                    marginTop: 5,
                                    marginRight: 10,
                                    flexShrink: 0,
                                  }}
                                />
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' }}>
                                    {(log.action ?? '').replace(/_/g, ' ')}
                                  </Text>
                                  {log.notes ? (
                                    <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{log.notes}</Text>
                                  ) : null}
                                  {log.createdAt ? (
                                    <Text style={{ color: theme.colors.textMuted, fontSize: 11, marginTop: 1 }}>
                                      {formatDateTime(log.createdAt)}
                                    </Text>
                                  ) : null}
                                </View>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* ── Phase-specific actions ───────────────────────── */}

                        {/* NEW phase */}
                        {!phase && (status === 'submitted' || status === 'under_review') && (
                          <View style={{ gap: 10 }}>
                            <TouchableOpacity
                              onPress={() => handleApproveInterview(profileId)}
                              disabled={isMutating}
                              style={{ borderRadius: 12, overflow: 'hidden' }}
                            >
                              <BrandGradient
                                style={{ paddingVertical: 14, alignItems: 'center', opacity: isMutating ? 0.7 : 1 }}
                              >
                                {isMutating ? (
                                  <ActivityIndicator color={theme.colors.white} size="small" />
                                ) : (
                                  <Text style={{ color: theme.colors.white, fontWeight: '700', fontSize: 15 }}>
                                    ✅ Approve for Interview
                                  </Text>
                                )}
                              </BrandGradient>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleWaitlist(profileId, displayName)}
                              disabled={isMutating}
                              style={{
                                borderRadius: 12,
                                paddingVertical: 13,
                                alignItems: 'center',
                                borderColor: theme.alpha(theme.colors.warning, 0.5),
                                borderWidth: 1.5,
                                backgroundColor: theme.colors.warningSoft,
                              }}
                            >
                              <Text style={{ color: theme.colors.warning, fontWeight: '700', fontSize: 15 }}>⏳ Waitlist</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleReject(profileId, displayName)}
                              disabled={isMutating}
                              style={{
                                borderRadius: 12,
                                paddingVertical: 13,
                                alignItems: 'center',
                                borderColor: theme.alpha(theme.colors.danger, 0.5),
                                borderWidth: 1.5,
                                backgroundColor: theme.colors.dangerSoft,
                              }}
                            >
                              <Text style={{ color: theme.colors.danger, fontWeight: '700', fontSize: 15 }}>❌ Reject</Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {/* INTERVIEW phase */}
                        {phase === 'interview_scheduled' && (
                          <View style={{ gap: 10 }}>
                            <TouchableOpacity
                              onPress={() => handleMarkInterviewComplete(profileId)}
                              disabled={isMutating}
                              style={{ borderRadius: 12, overflow: 'hidden' }}
                            >
                              <LinearGradient
                                colors={[theme.colors.purple, '#6366F1']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{ paddingVertical: 14, alignItems: 'center', opacity: isMutating ? 0.7 : 1 }}
                              >
                                {isMutating ? (
                                  <ActivityIndicator color={theme.colors.white} size="small" />
                                ) : (
                                  <Text style={{ color: theme.colors.white, fontWeight: '700', fontSize: 15 }}>
                                    ✅ Mark Interview Complete
                                  </Text>
                                )}
                              </LinearGradient>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleReject(profileId, displayName)}
                              disabled={isMutating}
                              style={{
                                borderRadius: 12,
                                paddingVertical: 13,
                                alignItems: 'center',
                                borderColor: theme.alpha(theme.colors.danger, 0.5),
                                borderWidth: 1.5,
                                backgroundColor: theme.colors.dangerSoft,
                              }}
                            >
                              <Text style={{ color: theme.colors.danger, fontWeight: '700', fontSize: 15 }}>❌ Reject</Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {/* FINAL REVIEW phase */}
                        {phase === 'interview_complete' && (
                          <View style={{ gap: 12 }}>
                            {/* Member role selector */}
                            <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                              Member Type
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              {(
                                [
                                  { key: 'member', label: 'Member ✨' },
                                  { key: 'angel', label: 'Angel 💗' },
                                  { key: 'admin', label: 'Admin 🛡️' },
                                ] as { key: 'member' | 'angel' | 'admin'; label: string }[]
                              ).map((r) => (
                                <TouchableOpacity
                                  key={r.key}
                                  onPress={() => {
                                    Haptics.selectionAsync();
                                    setSelectedRole(r.key);
                                  }}
                                  style={{ flex: 1, borderRadius: 10, overflow: 'hidden' }}
                                >
                                  {selectedRole === r.key ? (
                                    <BrandGradient
                                      style={{ paddingVertical: 10, alignItems: 'center' }}
                                    >
                                      <Text style={{ color: theme.colors.white, fontWeight: '700', fontSize: 12 }}>{r.label}</Text>
                                    </BrandGradient>
                                  ) : (
                                    <View
                                      style={{
                                        paddingVertical: 10,
                                        alignItems: 'center',
                                        backgroundColor: colors.bg,
                                        borderColor: theme.colors.border,
                                        borderWidth: 1,
                                        borderRadius: 10,
                                      }}
                                    >
                                      <Text style={{ color: theme.colors.textMuted, fontWeight: '600', fontSize: 12 }}>{r.label}</Text>
                                    </View>
                                  )}
                                </TouchableOpacity>
                              ))}
                            </View>

                            <TouchableOpacity
                              onPress={() => handleFinalApprove(profileId)}
                              disabled={isMutating}
                              style={{ borderRadius: 12, overflow: 'hidden' }}
                            >
                              <LinearGradient
                                colors={[theme.colors.success, '#059669']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{ paddingVertical: 14, alignItems: 'center', opacity: isMutating ? 0.7 : 1 }}
                              >
                                {isMutating ? (
                                  <ActivityIndicator color={theme.colors.white} size="small" />
                                ) : (
                                  <Text style={{ color: theme.colors.white, fontWeight: '700', fontSize: 15 }}>
                                    ✅ Final Approve as {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
                                  </Text>
                                )}
                              </LinearGradient>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleReject(profileId, displayName)}
                              disabled={isMutating}
                              style={{
                                borderRadius: 12,
                                paddingVertical: 13,
                                alignItems: 'center',
                                borderColor: theme.alpha(theme.colors.danger, 0.5),
                                borderWidth: 1.5,
                                backgroundColor: theme.colors.dangerSoft,
                              }}
                            >
                              <Text style={{ color: theme.colors.danger, fontWeight: '700', fontSize: 15 }}>❌ Reject</Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {/* DECIDED phase — read only */}
                        {(status === 'approved' ||
                          status === 'rejected' ||
                          status === 'waitlisted' ||
                          phase === 'final_approved') && (
                          <View
                            style={{
                              borderRadius: 12,
                              paddingVertical: 12,
                              alignItems: 'center',
                              backgroundColor: `${badge.color}22`,
                              borderColor: `${badge.color}44`,
                              borderWidth: 1,
                            }}
                          >
                            <Text style={{ color: badge.color, fontWeight: '700', fontSize: 14 }}>
                              {badge.label}
                            </Text>
                          </View>
                        )}
                      </>
                    ) : null}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
