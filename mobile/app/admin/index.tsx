import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { useTheme } from '../../lib/theme';
import AdminAccessGate from '../../components/AdminAccessGate';
import { useAdminAccess } from '../../lib/useAdminAccess';

// Compact horizontal stat tile: icon • number • label in a single row
function StatTile({
  label,
  value,
  icon,
  color,
  theme,
}: {
  label: string;
  value: any;
  icon: any;
  color: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderColor: theme.colors.border,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: `${color}22`,
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800', lineHeight: 22 }}
          numberOfLines={1}
        >
          {value ?? '-'}
        </Text>
        <Text
          style={{ color: theme.colors.textMuted, fontSize: 10, fontWeight: '600', lineHeight: 13 }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

// Square icon-grid tile for quick actions
function ActionTile({
  label,
  icon,
  color,
  onPress,
  theme,
}: {
  label: string;
  icon: any;
  color: string;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flex: 1,
        aspectRatio: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        borderColor: theme.colors.border,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        gap: 6,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: `${color}22`,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text
        style={{
          color: theme.colors.text,
          fontWeight: '600',
          fontSize: 11,
          textAlign: 'center',
          lineHeight: 14,
        }}
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { isAdmin, isCheckingAdmin } = useAdminAccess();
  const theme = useTheme();

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsIsError,
    error: statsError,
    refetch: refetchStats,
  } = trpc.admin.stats.useQuery(undefined, { enabled: isAdmin });
  const {
    data: pendingVenmo,
    isLoading: venmoLoading,
    isError: venmoIsError,
    error: venmoError,
    refetch: refetchVenmo,
  } = trpc.admin.pendingVenmoReservations.useQuery(undefined, { enabled: isAdmin });

  if (isCheckingAdmin) return <AdminAccessGate mode="loading" />;
  if (!isAdmin) return <AdminAccessGate mode="denied" onBack={() => router.back()} />;

  if (statsIsError || venmoIsError) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <Ionicons name="cloud-offline-outline" size={46} color={theme.colors.textMuted} />
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 20,
            fontWeight: '800',
            marginTop: 16,
            textAlign: 'center',
          }}
        >
          Could not load admin dashboard
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: 14,
            textAlign: 'center',
            marginTop: 8,
            lineHeight: 21,
          }}
        >
          {(statsError as any)?.message ??
            (venmoError as any)?.message ??
            'Please try again in a moment.'}
        </Text>
        <TouchableOpacity
          onPress={() => {
            refetchStats();
            refetchVenmo();
          }}
          style={{
            marginTop: 18,
            paddingVertical: 12,
            paddingHorizontal: 24,
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            borderColor: theme.colors.border,
            borderWidth: 1,
          }}
        >
          <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statsData = stats as any;
  const venmoList = (pendingVenmo as any[]) ?? [];

  const quickActions = [
    { label: 'Events', icon: 'calendar', route: '/admin/events', color: theme.colors.purple },
    { label: 'Members', icon: 'people', route: '/admin/members', color: theme.colors.primary },
    {
      label: 'Applications',
      icon: 'person-add',
      route: '/admin/applications',
      color: theme.colors.pink,
    },
    {
      label: 'Reservations',
      icon: 'ticket',
      route: '/admin/reservations',
      color: theme.colors.success,
    },
    {
      label: 'Announcements',
      icon: 'megaphone',
      route: '/admin/announcements',
      color: theme.colors.warning,
    },
    {
      label: 'Push Alerts',
      icon: 'notifications',
      route: '/admin/push-notifications',
      color: theme.colors.primary,
    },
    {
      label: 'Platform Ops',
      icon: 'speedometer',
      route: '/admin/platform-ops',
      color: '#22C7F2',
    },
    {
      label: 'Interviews',
      icon: 'calendar-outline',
      route: '/admin/interview-slots',
      color: '#06B6D4',
    },
    {
      label: 'Settings',
      icon: 'settings',
      route: '/admin/settings',
      color: theme.colors.secondary,
    },
  ];

  // Chunk actions into rows of 3 for the grid
  const actionRows: (typeof quickActions)[] = [];
  for (let i = 0; i < quickActions.length; i += 3) {
    actionRows.push(quickActions.slice(i, i + 3));
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header */}
      <LinearGradient
        colors={[
          theme.alpha(theme.colors.secondary, 0.2),
          theme.alpha(theme.colors.primary, 0.12),
          theme.colors.background,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text
              style={{ color: theme.colors.text, fontSize: 22, fontWeight: '800', lineHeight: 27 }}
            >
              Admin Dashboard
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
              Manage your community
            </Text>
          </View>
          <View
            style={{
              backgroundColor: theme.alpha(theme.colors.secondary, 0.18),
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 20,
              borderColor: theme.alpha(theme.colors.secondary, 0.36),
              borderWidth: 1,
            }}
          >
            <Text style={{ color: theme.colors.secondary, fontWeight: '700', fontSize: 12 }}>
              ⚡ ADMIN
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}>
        {/* ── Stats ── */}
        <Text style={sectionLabel}>Overview</Text>
        {statsLoading ? (
          <ActivityIndicator color={theme.colors.pink} style={{ marginVertical: 16 }} />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <StatTile
                label="Members"
                value={statsData?.totalUsers ?? statsData?.totalMembers}
                icon="people"
                color={theme.colors.purple}
                theme={theme}
              />
              <StatTile
                label="Pending Apps"
                value={statsData?.pendingApplications}
                icon="person-add"
                color={theme.colors.pink}
                theme={theme}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <StatTile
                label="Reservations"
                value={statsData?.totalReservations}
                icon="calendar"
                color={theme.colors.success}
                theme={theme}
              />
              <StatTile
                label="Pending Pay"
                value={venmoList.length}
                icon="card"
                color={theme.colors.warning}
                theme={theme}
              />
            </View>
          </>
        )}

        {/* ── Quick Actions (3-column icon grid) ── */}
        <Text style={[sectionLabel, { marginTop: 20 }]}>Quick Actions</Text>
        {actionRows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            {row.map((action) => (
              <ActionTile
                key={action.route}
                label={action.label}
                icon={action.icon as any}
                color={action.color}
                onPress={() => router.push(action.route as any)}
                theme={theme}
              />
            ))}
            {/* Fill empty slots in last row so flex distributes evenly */}
            {row.length < 3 &&
              Array.from({ length: 3 - row.length }).map((_, i) => (
                <View key={`empty-${i}`} style={{ flex: 1 }} />
              ))}
          </View>
        ))}

        {/* ── Pending Venmo Payments ── */}
        <View
          style={{
            marginTop: 12,
            marginBottom: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={sectionLabel}>Pending Venmo Payments ({venmoList.length})</Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: -4 }}>
              Dashboard preview only — open Reservations for the canonical review queue.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/admin/reservations' as any)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth: 1,
            }}
          >
            <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 12 }}>
              Open Queue
            </Text>
          </TouchableOpacity>
        </View>
        {venmoLoading ? (
          <ActivityIndicator color={theme.colors.pink} style={{ marginVertical: 16 }} />
        ) : venmoList.length === 0 ? (
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 14,
              padding: 20,
              borderColor: theme.colors.border,
              borderWidth: 1,
              alignItems: 'center',
            }}
          >
            <Ionicons name="checkmark-circle" size={32} color={theme.colors.success} />
            <Text style={{ color: theme.colors.textMuted, fontSize: 14, marginTop: 8 }}>
              All payments confirmed!
            </Text>
          </View>
        ) : (
          <>
            {venmoList.slice(0, 3).map((res: any) => (
              <View
                key={res.id}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: 14,
                  padding: 14,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  marginBottom: 10,
                }}
              >
                <View
                  style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}
                >
                  <Text
                    style={{ color: theme.colors.text, fontWeight: '700', fontSize: 15, flex: 1 }}
                    numberOfLines={1}
                  >
                    {res.user?.name ?? res.userName ?? 'Unknown'}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.warning,
                      fontWeight: '700',
                      fontSize: 13,
                      marginLeft: 8,
                    }}
                  >
                    {res.ticketType?.replace('_', ' ') ?? 'Ticket'}
                  </Text>
                </View>
                <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginBottom: 2 }}>
                  {res.event?.title ?? res.eventTitle ?? 'Event'}
                </Text>
                {res.user?.email && (
                  <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                    {res.user.email}
                  </Text>
                )}
              </View>
            ))}
            {venmoList.length > 3 && (
              <TouchableOpacity
                onPress={() => router.push('/admin/reservations' as any)}
                style={{
                  paddingVertical: 14,
                  alignItems: 'center',
                  backgroundColor: theme.colors.surface,
                  borderRadius: 12,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                }}
              >
                <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
                  View all {venmoList.length} pending payments
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const sectionLabel: import('react-native').TextStyle = {
  color: '#8C7E95',
  fontSize: 11,
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: 1,
  marginBottom: 10,
};
