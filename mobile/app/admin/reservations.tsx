import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';

const TICKET_LABELS: Record<string, string> = {
  single_female: 'Single Woman',
  single_male: 'Single Man',
  couple: 'Couple',
  volunteer: 'Volunteer',
};

export default function AdminReservationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const theme = useTheme();
  const utils = trpc.useUtils();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: meData } = trpc.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const isAdmin = user?.role === 'admin' || (meData as any)?.role === 'admin';

  const { data, isLoading, refetch } = trpc.admin.pendingVenmoReservations.useQuery(
    undefined,
    { enabled: isAdmin }
  );
  const reservations = (data as any[]) ?? [];

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
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Access Denied</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ paddingVertical: 12, paddingHorizontal: 24, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
          <Text style={{ color: colors.pink, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function handleConfirm(id: number, name: string) {
    Alert.alert('Confirm Payment', `Confirm Venmo payment from ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => confirmMutation.mutate({ id }) },
    ]);
  }

  function handleReject(id: number, name: string) {
    Alert.alert('Reject Reservation', `Reject reservation from ${name}? This will cancel their spot.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => rejectMutation.mutate({ id }) },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomColor: theme.colors.border, borderBottomWidth: 1, backgroundColor: theme.colors.pageHeader }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '800', flex: 1 }}>Manage Reservations</Text>
        <View style={{ backgroundColor: theme.colors.warningSoft, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: theme.colors.warningBorder }}>
          <Text style={{ color: theme.colors.warning, fontWeight: '700', fontSize: 13 }}>{reservations.length} pending</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.pink} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.pink} />}
        >
          {reservations.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="checkmark-circle-outline" size={48} color={theme.colors.success} />
              <Text style={{ color: theme.colors.textMuted, marginTop: 12, fontSize: 15 }}>No pending reservations</Text>
            </View>
          )}
          {reservations.map((res: any) => {
            const name = res.user?.name ?? res.userName ?? 'Unknown';
            const email = res.user?.email ?? res.userEmail ?? '';
            const eventName = res.event?.title ?? res.eventTitle ?? 'Event';
            const ticketLabel = TICKET_LABELS[res.ticketType] ?? res.ticketType ?? 'Ticket';
            const amount = res.amount ?? res.totalAmount;
            const paymentMethod = res.paymentMethod ?? 'venmo';

            return (
              <View
                key={res.id}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 12,
                  borderColor: theme.colors.warningBorder,
                  borderWidth: 1,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 16 }}>{name}</Text>
                    {email ? <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 2 }}>{email}</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    {amount && (
                      <Text style={{ color: theme.colors.success, fontWeight: '700', fontSize: 15 }}>
                        ${parseFloat(amount).toFixed(0)}
                      </Text>
                    )}
                    <View style={{ backgroundColor: theme.colors.warningSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.warningBorder }}>
                      <Text style={{ color: theme.colors.warning, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>{paymentMethod}</Text>
                    </View>
                  </View>
                </View>

                <Text style={{ color: colors.purple, fontWeight: '600', fontSize: 14, marginBottom: 2 }}>{eventName}</Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginBottom: 14 }}>{ticketLabel}</Text>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => handleConfirm(res.id, name)}
                    disabled={confirmMutation.isPending || rejectMutation.isPending}
                    style={{ flex: 1, borderRadius: 10, overflow: 'hidden' }}
                  >
                    <LinearGradient
                      colors={[theme.colors.success, '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ paddingVertical: 12, alignItems: 'center', opacity: (confirmMutation.isPending || rejectMutation.isPending) ? 0.7 : 1 }}
                    >
                      {confirmMutation.isPending ? (
                        <ActivityIndicator color={theme.colors.white} size="small" />
                      ) : (
                        <Text style={{ color: theme.colors.white, fontWeight: '700', fontSize: 14 }}>✓ Confirm</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleReject(res.id, name)}
                    disabled={confirmMutation.isPending || rejectMutation.isPending}
                    style={{
                      flex: 1,
                      borderRadius: 10,
                      paddingVertical: 12,
                      alignItems: 'center',
                      backgroundColor: theme.colors.dangerSoft,
                      borderColor: theme.colors.dangerBorder,
                      borderWidth: 1,
                    }}
                  >
                    <Text style={{ color: theme.colors.danger, fontWeight: '700', fontSize: 14 }}>✕ Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
