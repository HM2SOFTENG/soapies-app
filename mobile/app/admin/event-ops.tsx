import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Image,
  TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import { useAuth } from '../../lib/auth';

const SETUP_DUTIES = [
  { id: 'tables', label: 'Set up tables & furniture', icon: 'grid-outline' as const },
  { id: 'lighting', label: 'Lighting & ambiance setup', icon: 'bulb-outline' as const },
  { id: 'bar', label: 'Bar & beverage station', icon: 'wine-outline' as const },
  { id: 'music', label: 'Music & sound check', icon: 'musical-notes-outline' as const },
  { id: 'entrance', label: 'Entrance & check-in station', icon: 'door-open-outline' as const },
  { id: 'supplies', label: 'Supplies & safety kit', icon: 'medical-outline' as const },
  { id: 'decor', label: 'Decor & theming', icon: 'color-palette-outline' as const },
];

const TEARDOWN_DUTIES = [
  { id: 'cleanup', label: 'General cleanup', icon: 'trash-outline' as const },
  { id: 'furniture', label: 'Break down furniture', icon: 'grid-outline' as const },
  { id: 'bar_cleanup', label: 'Bar cleanup', icon: 'wine-outline' as const },
  { id: 'lost_found', label: 'Lost & found collection', icon: 'search-outline' as const },
  { id: 'final_check', label: 'Final walkthrough', icon: 'checkmark-circle-outline' as const },
];

const TICKET_TYPE_LABELS: Record<string, string> = {
  single_female: 'Single Woman',
  single_male: 'Single Man',
  couple: 'Couple',
  volunteer: 'Volunteer',
};

const WRISTBAND_CONFIG: Record<string, { color: string; emoji: string }> = {
  rainbow: { color: '#FF6B6B', emoji: '🌈' },
  pink:    { color: '#EC4899', emoji: '💗' },
  purple:  { color: '#A855F7', emoji: '💜' },
  blue:    { color: '#3B82F6', emoji: '💙' },
  green:   { color: '#10B981', emoji: '💚' },
};

const WRISTBAND_COLORS: Record<string, string> = {
  rainbow: '#FF6B6B',
  pink: '#EC4899',
  purple: '#A855F7',
  blue: '#3B82F6',
  green: '#10B981',
};

const WRISTBAND_EMOJI: Record<string, string> = {
  rainbow: '🌈',
  pink: '💗',
  purple: '💜',
  blue: '💙',
  green: '💚',
};

function DutyCheckbox({ item, completed, onToggle }: { item: { id: string; label: string; icon: any }; completed: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
      }}
    >
      <View style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: completed ? '#10B981' : colors.border,
        backgroundColor: completed ? '#10B981' : 'transparent',
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {completed && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <Ionicons name={item.icon} size={18} color={completed ? '#10B981' : colors.muted} style={{ marginRight: 10 }} />
      <Text style={{ color: completed ? '#10B981' : colors.text, fontSize: 14, flex: 1, textDecorationLine: completed ? 'line-through' : 'none' }}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}

function AttendeeCard({ reservation, onCheckin }: { reservation: any; onCheckin: () => void }) {
  const isCheckedIn = reservation.status === 'checked_in';
  const wristband = reservation.wristbandColor ?? 'purple';
  const wColor = WRISTBAND_COLORS[wristband] ?? '#A855F7';

  return (
    <View style={{
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderColor: isCheckedIn ? '#10B981' : colors.border,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      {/* Wristband color indicator strip on left */}
      <View style={{ width: 6, borderRadius: 3, backgroundColor: wColor, marginRight: 12, alignSelf: 'stretch' }} />

      {/* Avatar placeholder with wristband emoji */}
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${wColor}33`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Text style={{ fontSize: 18 }}>{WRISTBAND_EMOJI[wristband] ?? '👤'}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
          {reservation.displayName ?? reservation.memberName ?? reservation.user?.name ?? 'Guest'}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          {reservation.ticketType?.replace('_', ' ')} · {wristband} wristband
        </Text>
        {reservation.isQueerPlay && (
          <Text style={{ color: '#FF6B6B', fontSize: 11, fontWeight: '600' }}>🌈 Queer Play Zone</Text>
        )}
      </View>

      {isCheckedIn ? (
        <View style={{ backgroundColor: '#10B98133', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
          <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700' }}>✓ IN</Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={onCheckin}
          style={{ backgroundColor: colors.pink, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}
        >
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Check In</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function EventOpsScreen() {
  const { eventId, eventTitle } = useLocalSearchParams<{ eventId: string; eventTitle: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [completedSetup, setCompletedSetup] = useState<Record<string, boolean>>({});
  const [completedTeardown, setCompletedTeardown] = useState<Record<string, boolean>>({});
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeSection, setActiveSection] = useState<'volunteers' | 'duties' | 'stats' | 'actions' | 'checkin'>('volunteers');

  // Check-in tab state
  const [checkinMode, setCheckinMode] = useState<'list' | 'scanner'>('list');
  const [scanResult, setScanResult] = useState<any>(null);
  const [checkinSearch, setCheckinSearch] = useState('');
  const [scanned, setScanned] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const scanCooldown = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();

  const storageKey = `event-ops-duties-${eventId}`;

  // Load duties state from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(storageKey).then(val => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          setCompletedSetup(parsed.setup ?? {});
          setCompletedTeardown(parsed.teardown ?? {});
        } catch {}
      }
    });
  }, [storageKey]);

  const saveDuties = useCallback((setup: Record<string, boolean>, teardown: Record<string, boolean>) => {
    AsyncStorage.setItem(storageKey, JSON.stringify({ setup, teardown })).catch(() => {});
  }, [storageKey]);

  function toggleSetup(id: string) {
    const updated = { ...completedSetup, [id]: !completedSetup[id] };
    setCompletedSetup(updated);
    saveDuties(updated, completedTeardown);
  }

  function toggleTeardown(id: string) {
    const updated = { ...completedTeardown, [id]: !completedTeardown[id] };
    setCompletedTeardown(updated);
    saveDuties(completedSetup, updated);
  }

  // Data
  const { data: reservationsData, isLoading, refetch: refetchReservations } = trpc.admin.eventReservations.useQuery(
    { eventId: Number(eventId) },
    { enabled: !!eventId }
  );
  const reservations = (reservationsData as any[]) ?? [];

  // Mutations
  const creditVolunteerMutation = trpc.admin.creditVolunteer.useMutation({
    onSuccess: () => { Alert.alert('✅ Credit Issued', 'Volunteer has been credited their ticket amount.'); refetchReservations(); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const markNoShowMutation = trpc.admin.markVolunteerNoShow.useMutation({
    onSuccess: () => { Alert.alert('⚠️ Marked No-Show', 'Volunteer has been marked as no-show.'); refetchReservations(); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const sendRemindersMutation = trpc.admin.sendEventReminders.useMutation({
    onSuccess: (data: any) => Alert.alert('📨 Reminders Sent', `Sent reminders to ${data.count} attendees.`),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const manualCheckinMutation = trpc.reservations.updateStatus.useMutation({
    onSuccess: () => refetchReservations(),
    onError: (e: any) => Alert.alert('Check-In Error', e.message),
  });

  const checkInMutation = trpc.reservations.checkInByQR.useMutation();

  // Computed stats
  const volunteers = reservations.filter((r: any) => r.notes === 'volunteer' || r.notes === 'volunteer_completed' || r.notes === 'volunteer_noshow' || r.ticketType === 'volunteer');
  const ticketBreakdown = reservations.reduce((acc: Record<string, number>, r: any) => {
    const key = r.ticketType ?? 'unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const paymentBreakdown = reservations.reduce((acc: Record<string, number>, r: any) => {
    const key = r.paymentStatus ?? 'unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const checkedIn = reservations.filter((r: any) => r.status === 'checked_in').length;

  // Filtered attendees for check-in list
  const filteredReservations = reservations.filter((r: any) => {
    if (!checkinSearch.trim()) return true;
    const q = checkinSearch.toLowerCase();
    return (
      (r.displayName ?? r.memberName ?? '').toLowerCase().includes(q) ||
      (r.user?.name ?? '').toLowerCase().includes(q)
    );
  });

  function getVolunteerStatus(r: any): { label: string; color: string } {
    if (r.notes === 'volunteer_completed') return { label: 'Completed', color: '#10B981' };
    if (r.notes === 'volunteer_noshow') return { label: 'No Show', color: '#EF4444' };
    return { label: 'Pending', color: '#F59E0B' };
  }

  async function processQRScan(qrCode: string) {
    if (isCheckingIn || !qrCode.trim()) return;
    setIsCheckingIn(true);
    try {
      const result = await checkInMutation.mutateAsync({
        qrCode: qrCode.trim(),
        eventId: Number(eventId),
      });
      const res = result as any;
      setScanResult({
        success: true,
        guestName: res.guestName ?? 'Guest',
        ticketType: res.ticketType,
        wristbandColor: res.wristbandColor ?? 'purple',
        isQueerPlay: res.isQueerPlay,
        avatarUrl: res.avatarUrl ?? null,
        alreadyCheckedIn: res.alreadyCheckedIn ?? false,
      });
      refetchReservations();
    } catch (err: any) {
      setScanResult({ success: false, error: err.message ?? 'Check-in failed' });
    } finally {
      setIsCheckingIn(false);
      setScanned(true);
      setTimeout(() => {
        setScanned(false);
        scanCooldown.current = false;
      }, 3000);
    }
  }

  function handleBarCodeScanned({ data }: { data: string }) {
    if (scanned || scanCooldown.current) return;
    scanCooldown.current = true;
    processQRScan(data);
  }

  function handleConfirmCheckin() {
    // Check-in already completed server-side on scan; just close the modal
    setScanResult(null);
  }

  const sections = [
    { key: 'volunteers', label: 'Volunteers', icon: 'people-outline' as const },
    { key: 'duties', label: 'Duties', icon: 'checkbox-outline' as const },
    { key: 'stats', label: 'Stats', icon: 'bar-chart-outline' as const },
    { key: 'actions', label: 'Actions', icon: 'flash-outline' as const },
    { key: 'checkin', label: 'Check-In', icon: 'qr-code-outline' as const },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomColor: colors.border, borderBottomWidth: 1 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Event Operations</Text>
          {eventTitle ? (
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{eventTitle}</Text>
          ) : null}
        </View>
        {isLoading && <ActivityIndicator color={colors.pink} size="small" />}
      </View>

      {/* Section tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomColor: colors.border, borderBottomWidth: 1 }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row' }}>
        {sections.map(s => (
          <TouchableOpacity
            key={s.key}
            onPress={() => setActiveSection(s.key as any)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: activeSection === s.key ? `${colors.pink}22` : colors.card,
              borderColor: activeSection === s.key ? colors.pink : colors.border,
              borderWidth: 1,
            }}
          >
            <Ionicons name={s.icon} size={15} color={activeSection === s.key ? colors.pink : colors.muted} />
            <Text style={{ color: activeSection === s.key ? colors.pink : colors.muted, fontWeight: '600', fontSize: 13 }}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

        {/* ── Volunteer Staff Management ── */}
        {activeSection === 'volunteers' && (
          <View>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 14 }}>🙌 Volunteer Staff</Text>
            {volunteers.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="people-outline" size={40} color={colors.muted} />
                <Text style={{ color: colors.muted, marginTop: 10, fontSize: 14 }}>No volunteers for this event</Text>
              </View>
            ) : (
              volunteers.map((v: any) => {
                const status = getVolunteerStatus(v);
                const isPending = status.label === 'Pending';
                return (
                  <View
                    key={v.id}
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 10,
                      borderColor: colors.border,
                      borderWidth: 1,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
                          {v.displayName ?? v.memberName ?? v.userName ?? `User #${v.userId}`}
                        </Text>
                        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                          {TICKET_TYPE_LABELS[v.ticketType] ?? v.ticketType ?? 'Volunteer'}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: `${status.color}22`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                        <Text style={{ color: status.color, fontSize: 11, fontWeight: '700' }}>{status.label}</Text>
                      </View>
                    </View>
                    {isPending && (
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity
                          onPress={() => Alert.alert(
                            '✅ Mark Complete?',
                            `Credit ${v.displayName ?? 'this volunteer'} their ticket amount?`,
                            [
                              { text: 'Yes, Credit Them', onPress: () => creditVolunteerMutation.mutate({ reservationId: v.id }) },
                              { text: 'Cancel', style: 'cancel' },
                            ]
                          )}
                          disabled={creditVolunteerMutation.isPending}
                          style={{ flex: 1, backgroundColor: '#10B98122', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderColor: '#10B98144', borderWidth: 1 }}
                        >
                          <Text style={{ color: '#10B981', fontWeight: '700', fontSize: 13 }}>✅ Mark Complete</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => Alert.alert(
                            '⚠️ Mark No-Show?',
                            'This volunteer will not receive a refund.',
                            [
                              { text: 'Confirm No-Show', style: 'destructive', onPress: () => markNoShowMutation.mutate({ reservationId: v.id }) },
                              { text: 'Cancel', style: 'cancel' },
                            ]
                          )}
                          disabled={markNoShowMutation.isPending}
                          style={{ flex: 1, backgroundColor: '#EF444422', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderColor: '#EF444444', borderWidth: 1 }}
                        >
                          <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 13 }}>❌ No Show</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── Setup Duties Checklist ── */}
        {activeSection === 'duties' && (
          <View>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 4 }}>🛠️ Setup Duties</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 14 }}>Stored locally per device</Text>

            <View style={{ backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 14, marginBottom: 20, borderColor: colors.border, borderWidth: 1 }}>
              {SETUP_DUTIES.map(item => (
                <DutyCheckbox
                  key={item.id}
                  item={item}
                  completed={!!completedSetup[item.id]}
                  onToggle={() => toggleSetup(item.id)}
                />
              ))}
            </View>

            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 14 }}>🧹 Teardown Duties</Text>

            <View style={{ backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 14, marginBottom: 20, borderColor: colors.border, borderWidth: 1 }}>
              {TEARDOWN_DUTIES.map(item => (
                <DutyCheckbox
                  key={item.id}
                  item={item}
                  completed={!!completedTeardown[item.id]}
                  onToggle={() => toggleTeardown(item.id)}
                />
              ))}
            </View>

            <TouchableOpacity
              onPress={() => Alert.alert('Reset Checklist?', 'Clear all completed duties?', [
                { text: 'Reset', style: 'destructive', onPress: () => { setCompletedSetup({}); setCompletedTeardown({}); saveDuties({}, {}); } },
                { text: 'Cancel', style: 'cancel' },
              ])}
              style={{ alignItems: 'center', paddingVertical: 12 }}
            >
              <Text style={{ color: colors.muted, fontSize: 13 }}>Reset All Duties</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Attendee Stats ── */}
        {activeSection === 'stats' && (
          <View>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 14 }}>📊 Attendee Stats</Text>

            {/* Totals card */}
            <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 14, borderColor: colors.border, borderWidth: 1 }}>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Overview</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800' }}>{reservations.length}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>Total</Text>
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ color: '#10B981', fontSize: 28, fontWeight: '800' }}>{checkedIn}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>Checked In</Text>
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ color: '#F59E0B', fontSize: 28, fontWeight: '800' }}>{reservations.length - checkedIn}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>Remaining</Text>
                </View>
              </View>
            </View>

            {/* Ticket type breakdown */}
            <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 14, borderColor: colors.border, borderWidth: 1 }}>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>By Ticket Type</Text>
              {Object.entries(ticketBreakdown).map(([type, count]) => (
                <View key={type} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                  <Text style={{ color: colors.text, fontSize: 14 }}>{TICKET_TYPE_LABELS[type] ?? type}</Text>
                  <Text style={{ color: colors.pink, fontSize: 14, fontWeight: '700' }}>{count as number}</Text>
                </View>
              ))}
              {Object.keys(ticketBreakdown).length === 0 && (
                <Text style={{ color: colors.muted, fontSize: 13 }}>No reservations yet</Text>
              )}
            </View>

            {/* Payment status breakdown */}
            <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 14, borderColor: colors.border, borderWidth: 1 }}>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>By Payment Status</Text>
              {Object.entries(paymentBreakdown).map(([status, count]) => {
                const statusColors: Record<string, string> = { paid: '#10B981', pending: '#F59E0B', refunded: '#6B7280', failed: '#EF4444', partial: '#F59E0B' };
                const c = statusColors[status] ?? colors.muted;
                return (
                  <View key={status} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                    <Text style={{ color: c, fontSize: 14, textTransform: 'capitalize' }}>{status.replace('_', ' ')}</Text>
                    <Text style={{ color: c, fontSize: 14, fontWeight: '700' }}>{count as number}</Text>
                  </View>
                );
              })}
              {Object.keys(paymentBreakdown).length === 0 && (
                <Text style={{ color: colors.muted, fontSize: 13 }}>No reservations yet</Text>
              )}
            </View>
          </View>
        )}

        {/* ── Quick Actions ── */}
        {activeSection === 'actions' && (
          <View>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 14 }}>⚡ Quick Actions</Text>

            {/* Send Reminder */}
            <TouchableOpacity
              onPress={() => Alert.alert(
                '📨 Send Reminders?',
                `Send payment reminders to ${reservations.filter((r: any) => r.paymentStatus === 'pending' && r.status !== 'cancelled').length} unpaid attendees?`,
                [
                  { text: 'Send', onPress: () => sendRemindersMutation.mutate({ eventId: Number(eventId) }) },
                  { text: 'Cancel', style: 'cancel' },
                ]
              )}
              disabled={sendRemindersMutation.isPending}
              style={{ backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderColor: colors.border, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}
            >
              {sendRemindersMutation.isPending ? (
                <ActivityIndicator color={colors.pink} size="small" />
              ) : (
                <Ionicons name="notifications-outline" size={24} color={colors.pink} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>Send Reminder to Unpaid</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                  Notify {reservations.filter((r: any) => r.paymentStatus === 'pending' && r.status !== 'cancelled').length} pending attendees
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>

            {/* Export Attendee List */}
            <TouchableOpacity
              onPress={() => setShowExportModal(true)}
              style={{ backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderColor: colors.border, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}
            >
              <Ionicons name="list-outline" size={24} color={colors.purple} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>Export Attendee List</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{reservations.length} attendees</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Check-In ── */}
        {activeSection === 'checkin' && (
          <View>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 14 }}>
              🎟️ Check-In · {checkedIn}/{reservations.length}
            </Text>

            {/* Mode toggle */}
            <View style={{ flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 12, padding: 4, marginBottom: 16, borderColor: colors.border, borderWidth: 1 }}>
              <TouchableOpacity
                onPress={() => setCheckinMode('list')}
                style={{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: checkinMode === 'list' ? colors.pink : 'transparent', alignItems: 'center' }}
              >
                <Text style={{ color: checkinMode === 'list' ? '#fff' : colors.muted, fontWeight: '600' }}>📋 Guest List</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setCheckinMode('scanner')}
                style={{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: checkinMode === 'scanner' ? colors.pink : 'transparent', alignItems: 'center' }}
              >
                <Text style={{ color: checkinMode === 'scanner' ? '#fff' : colors.muted, fontWeight: '600' }}>📷 QR Scanner</Text>
              </TouchableOpacity>
            </View>

            {/* ── List Mode ── */}
            {checkinMode === 'list' && (
              <View>
                {/* Search bar */}
                <TextInput
                  value={checkinSearch}
                  onChangeText={setCheckinSearch}
                  placeholder="Search by name…"
                  placeholderTextColor={colors.muted}
                  style={{
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    borderColor: colors.border,
                    borderWidth: 1,
                    fontSize: 14,
                    marginBottom: 14,
                  }}
                />

                {filteredReservations.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <Ionicons name="people-outline" size={40} color={colors.muted} />
                    <Text style={{ color: colors.muted, marginTop: 10, fontSize: 14 }}>
                      {checkinSearch ? 'No matching attendees' : 'No attendees yet'}
                    </Text>
                  </View>
                ) : (
                  filteredReservations.map((r: any) => (
                    <AttendeeCard
                      key={r.id}
                      reservation={r}
                      onCheckin={() => manualCheckinMutation.mutate({ id: r.id, status: 'checked_in' })}
                    />
                  ))
                )}
              </View>
            )}

            {/* ── Scanner Mode ── */}
            {checkinMode === 'scanner' && (
              <View>
                {!permission ? (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <ActivityIndicator color={colors.pink} size="large" />
                  </View>
                ) : !permission.granted ? (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <Ionicons name="camera-outline" size={48} color={colors.muted} style={{ marginBottom: 16 }} />
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
                      Camera Permission Required
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
                      We need camera access to scan QR codes at check-in.
                    </Text>
                    <TouchableOpacity
                      onPress={requestPermission}
                      style={{ backgroundColor: colors.pink, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700' }}>Grant Permission</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    {/* Camera viewfinder */}
                    <View style={{ height: 320, borderRadius: 16, overflow: 'hidden', position: 'relative', marginBottom: 16 }}>
                      <CameraView
                        style={StyleSheet.absoluteFillObject}
                        facing="back"
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                      />
                      {/* Scan overlay */}
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <View style={{ width: 200, height: 200, position: 'relative' }}>
                          {[
                            { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
                            { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
                            { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
                            { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
                          ].map((style, i) => (
                            <View
                              key={i}
                              style={{
                                position: 'absolute',
                                width: 32,
                                height: 32,
                                borderColor: scanned ? '#10B981' : colors.pink,
                                ...style,
                              }}
                            />
                          ))}
                        </View>
                        <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 16, fontSize: 13 }}>
                          {isCheckingIn ? 'Processing…' : scanned ? 'Hold on…' : 'Align QR code within the frame'}
                        </Text>
                        {isCheckingIn && <ActivityIndicator color={colors.pink} style={{ marginTop: 8 }} />}
                      </View>
                    </View>

                    <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center' }}>
                      Point the camera at a guest's QR code to check them in automatically
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* Scan Result Modal */}
      <Modal visible={!!scanResult} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{
            backgroundColor: colors.card,
            borderRadius: 24,
            padding: 28,
            width: '100%',
            alignItems: 'center',
            borderColor: scanResult?.success ? '#10B981' : '#EF4444',
            borderWidth: 2,
          }}>
            {scanResult?.success ? (
              <>
                {/* Avatar */}
                <View style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: `${WRISTBAND_COLORS[scanResult.wristbandColor ?? 'purple'] ?? '#A855F7'}33`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  borderWidth: 3,
                  borderColor: WRISTBAND_COLORS[scanResult.wristbandColor ?? 'purple'] ?? '#A855F7',
                }}>
                  {scanResult.avatarUrl ? (
                    <Image
                      source={{ uri: scanResult.avatarUrl }}
                      style={{ width: 80, height: 80, borderRadius: 40 }}
                    />
                  ) : (
                    <Text style={{ fontSize: 36 }}>{WRISTBAND_EMOJI[scanResult.wristbandColor ?? 'purple'] ?? '👤'}</Text>
                  )}
                </View>

                <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900', marginBottom: 4 }}>
                  {scanResult.guestName ?? 'Guest'}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 14, marginBottom: 12 }}>
                  {scanResult.ticketType?.replace(/_/g, ' ')}
                </Text>

                {/* Wristband badge */}
                <View style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  marginBottom: 20,
                  backgroundColor: `${WRISTBAND_COLORS[scanResult.wristbandColor ?? 'purple'] ?? '#A855F7'}22`,
                  borderWidth: 1,
                  borderColor: WRISTBAND_COLORS[scanResult.wristbandColor ?? 'purple'] ?? '#A855F7',
                }}>
                  <Text style={{ color: WRISTBAND_COLORS[scanResult.wristbandColor ?? 'purple'] ?? '#A855F7', fontWeight: '700' }}>
                    {WRISTBAND_EMOJI[scanResult.wristbandColor ?? 'purple']} {scanResult.wristbandColor} wristband
                  </Text>
                </View>

                {scanResult.isQueerPlay && (
                  <View style={{ backgroundColor: '#FF6B6B22', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 }}>
                    <Text style={{ color: '#FF6B6B', fontWeight: '700' }}>🌈 Queer Play Zone</Text>
                  </View>
                )}

                {scanResult.alreadyCheckedIn ? (
                  <View style={{ backgroundColor: '#F59E0B22', padding: 12, borderRadius: 10, marginBottom: 16, width: '100%' }}>
                    <Text style={{ color: '#F59E0B', fontWeight: '700', textAlign: 'center' }}>⚠️ Already Checked In</Text>
                  </View>
                ) : (
                  <TouchableOpacity onPress={handleConfirmCheckin} style={{ width: '100%', marginBottom: 10 }}>
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ borderRadius: 14, padding: 16, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>✅ Checked In!</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>❌</Text>
                <Text style={{ color: '#EF4444', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Ticket Not Found</Text>
                <Text style={{ color: colors.muted, textAlign: 'center' }}>{scanResult?.error ?? 'Invalid QR code'}</Text>
              </>
            )}

            <TouchableOpacity onPress={() => setScanResult(null)} style={{ marginTop: 12 }}>
              <Text style={{ color: colors.muted, fontSize: 15 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Export Modal */}
      <Modal visible={showExportModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%', borderColor: colors.border, borderTopWidth: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', flex: 1 }}>📋 Attendee List</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <Ionicons name="close" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={reservations}
              keyExtractor={(item: any) => String(item.id)}
              renderItem={({ item }: { item: any }) => {
                const wristband = WRISTBAND_CONFIG[item.wristbandColor ?? ''];
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomColor: colors.border, borderBottomWidth: 1 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>
                        {item.displayName ?? item.memberName ?? item.userName ?? `#${item.userId}`}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                        {TICKET_TYPE_LABELS[item.ticketType] ?? item.ticketType} · {item.status}
                      </Text>
                    </View>
                    {wristband ? (
                      <Text style={{ fontSize: 20 }}>{wristband.emoji}</Text>
                    ) : (
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: `${colors.muted}33` }} />
                    )}
                  </View>
                );
              }}
              style={{ maxHeight: 420 }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <Text style={{ color: colors.muted }}>No attendees yet</Text>
                </View>
              }
            />

            <TouchableOpacity
              onPress={() => setShowExportModal(false)}
              style={{ marginTop: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, borderColor: colors.border, borderWidth: 1 }}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
