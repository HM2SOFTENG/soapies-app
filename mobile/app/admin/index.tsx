import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import { useAuth } from '../../lib/auth';

// Compact horizontal stat tile: icon • number • label in a single row
function StatTile({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: any;
  icon: any;
  color: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderColor: colors.border,
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
          style={{ color: colors.text, fontSize: 18, fontWeight: '800', lineHeight: 22 }}
          numberOfLines={1}
        >
          {value ?? '—'}
        </Text>
        <Text
          style={{ color: colors.muted, fontSize: 10, fontWeight: '600', lineHeight: 13 }}
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
}: {
  label: string;
  icon: any;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flex: 1,
        aspectRatio: 1,
        backgroundColor: colors.card,
        borderRadius: 14,
        borderColor: colors.border,
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
          color: colors.text,
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
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: meData } = trpc.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const isAdmin = user?.role === 'admin' || (meData as any)?.role === 'admin';

  const { data: stats, isLoading: statsLoading } = trpc.admin.stats.useQuery(
    undefined,
    { enabled: isAdmin }
  );
  const { data: pendingVenmo, isLoading: venmoLoading } = trpc.admin.pendingVenmoReservations.useQuery(
    undefined,
    { enabled: isAdmin }
  );

  const confirmMutation = trpc.admin.confirmReservation.useMutation({
    onSuccess: () => {
      utils.admin.pendingVenmoReservations.invalidate();
      utils.admin.stats.invalidate();
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const rejectMutation = trpc.admin.rejectReservation.useMutation({
    onSuccess: () => {
      utils.admin.pendingVenmoReservations.invalidate();
      utils.admin.stats.invalidate();
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  // Guard AFTER all hooks
  if (!isAdmin) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <Ionicons name="lock-closed" size={48} color={colors.muted} />
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 }}>
          Access Denied
        </Text>
        <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
          You need admin privileges to access this area.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 24,
            backgroundColor: colors.card,
            borderRadius: 12,
            borderColor: colors.border,
            borderWidth: 1,
          }}
        >
          <Text style={{ color: colors.pink, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statsData = stats as any;
  const venmoList = (pendingVenmo as any[]) ?? [];

  const quickActions = [
    { label: 'Events', icon: 'calendar', route: '/admin/events', color: colors.purple },
    { label: 'Applications', icon: 'person-add', route: '/admin/applications', color: colors.pink },
    { label: 'Reservations', icon: 'ticket', route: '/admin/reservations', color: '#10B981' },
    { label: 'Announcements', icon: 'megaphone', route: '/admin/announcements', color: '#F59E0B' },
    { label: 'Push Alerts', icon: 'notifications', route: '/admin/push-notifications', color: '#EC4899' },
    { label: 'Interviews', icon: 'calendar-outline', route: '/admin/interview-slots', color: '#06B6D4' },
    { label: 'Settings', icon: 'settings', route: '/admin/settings', color: '#6366F1' },
  ];

  // Chunk actions into rows of 3 for the grid
  const actionRows: typeof quickActions[] = [];
  for (let i = 0; i < quickActions.length; i += 3) {
    actionRows.push(quickActions.slice(i, i + 3));
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <LinearGradient
        colors={['#7C3AED33', '#EC489922', colors.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', lineHeight: 27 }}>
              Admin Dashboard
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Manage your community</Text>
          </View>
          <View
            style={{
              backgroundColor: `${colors.purple}33`,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 20,
              borderColor: `${colors.purple}66`,
              borderWidth: 1,
            }}
          >
            <Text style={{ color: colors.purple, fontWeight: '700', fontSize: 12 }}>⚡ ADMIN</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}>

        {/* ── Stats ── */}
        <Text style={sectionLabel}>Overview</Text>
        {statsLoading ? (
          <ActivityIndicator color={colors.pink} style={{ marginVertical: 16 }} />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <StatTile
                label="Members"
                value={statsData?.totalUsers ?? statsData?.totalMembers}
                icon="people"
                color={colors.purple}
              />
              <StatTile
                label="Pending Apps"
                value={statsData?.pendingApplications}
                icon="person-add"
                color={colors.pink}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <StatTile
                label="Reservations"
                value={statsData?.totalReservations}
                icon="calendar"
                color="#10B981"
              />
              <StatTile
                label="Pending Pay"
                value={venmoList.length}
                icon="card"
                color="#F59E0B"
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
        <Text style={[sectionLabel, { marginTop: 12 }]}>
          Pending Venmo Payments ({venmoList.length})
        </Text>
        {venmoLoading ? (
          <ActivityIndicator color={colors.pink} style={{ marginVertical: 16 }} />
        ) : venmoList.length === 0 ? (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 14,
              padding: 20,
              borderColor: colors.border,
              borderWidth: 1,
              alignItems: 'center',
            }}
          >
            <Ionicons name="checkmark-circle" size={32} color="#10B981" />
            <Text style={{ color: colors.muted, fontSize: 14, marginTop: 8 }}>
              All payments confirmed!
            </Text>
          </View>
        ) : (
          venmoList.map((res: any) => (
            <View
              key={res.id}
              style={{
                backgroundColor: colors.card,
                borderRadius: 14,
                padding: 14,
                borderColor: colors.border,
                borderWidth: 1,
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text
                  style={{ color: colors.text, fontWeight: '700', fontSize: 15, flex: 1 }}
                  numberOfLines={1}
                >
                  {res.user?.name ?? res.userName ?? 'Unknown'}
                </Text>
                <Text style={{ color: '#F59E0B', fontWeight: '700', fontSize: 13, marginLeft: 8 }}>
                  {res.ticketType?.replace('_', ' ') ?? 'Ticket'}
                </Text>
              </View>
              <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 2 }}>
                {res.event?.title ?? res.eventTitle ?? 'Event'}
              </Text>
              {res.user?.email && (
                <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 10 }}>
                  {res.user.email}
                </Text>
              )}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => confirmMutation.mutate({ id: res.id })}
                  disabled={confirmMutation.isPending || rejectMutation.isPending}
                  style={{ flex: 1, borderRadius: 10, overflow: 'hidden' }}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      paddingVertical: 10,
                      alignItems: 'center',
                      opacity: confirmMutation.isPending ? 0.7 : 1,
                    }}
                  >
                    {confirmMutation.isPending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>✓ Confirm</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(
                      'Reject Reservation',
                      'Are you sure you want to reject this payment?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Reject',
                          style: 'destructive',
                          onPress: () => rejectMutation.mutate({ id: res.id }),
                        },
                      ]
                    )
                  }
                  disabled={confirmMutation.isPending || rejectMutation.isPending}
                  style={{
                    flex: 1,
                    borderRadius: 10,
                    paddingVertical: 10,
                    alignItems: 'center',
                    backgroundColor: '#EF444422',
                    borderColor: '#EF444444',
                    borderWidth: 1,
                  }}
                >
                  <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 14 }}>✕ Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const sectionLabel: import('react-native').TextStyle = {
  color: '#6B7280',
  fontSize: 11,
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: 1,
  marginBottom: 10,
};
