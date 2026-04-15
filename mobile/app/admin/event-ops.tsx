import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export default function EventOpsScreen() {
  const { eventId, eventTitle } = useLocalSearchParams<{ eventId: string; eventTitle: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [completedSetup, setCompletedSetup] = useState<Record<string, boolean>>({});
  const [completedTeardown, setCompletedTeardown] = useState<Record<string, boolean>>({});
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeSection, setActiveSection] = useState<'volunteers' | 'duties' | 'stats' | 'actions'>('volunteers');

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
  const { data: reservationsData, isLoading, refetch } = trpc.admin.eventReservations.useQuery(
    { eventId: Number(eventId) },
    { enabled: !!eventId }
  );
  const reservations = (reservationsData as any[]) ?? [];

  // Mutations
  const creditVolunteerMutation = trpc.admin.creditVolunteer.useMutation({
    onSuccess: () => { Alert.alert('✅ Credit Issued', 'Volunteer has been credited their ticket amount.'); refetch(); },
    onError: (e) => Alert.alert('Error', e.message),
  });

  const markNoShowMutation = trpc.admin.markVolunteerNoShow.useMutation({
    onSuccess: () => { Alert.alert('⚠️ Marked No-Show', 'Volunteer has been marked as no-show.'); refetch(); },
    onError: (e) => Alert.alert('Error', e.message),
  });

  const sendRemindersMutation = trpc.admin.sendEventReminders.useMutation({
    onSuccess: (data: any) => Alert.alert('📨 Reminders Sent', `Sent reminders to ${data.count} attendees.`),
    onError: (e) => Alert.alert('Error', e.message),
  });

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

  function getVolunteerStatus(r: any): { label: string; color: string } {
    if (r.notes === 'volunteer_completed') return { label: 'Completed', color: '#10B981' };
    if (r.notes === 'volunteer_noshow') return { label: 'No Show', color: '#EF4444' };
    return { label: 'Pending', color: '#F59E0B' };
  }

  const sections = [
    { key: 'volunteers', label: 'Volunteers', icon: 'people-outline' as const },
    { key: 'duties', label: 'Duties', icon: 'checkbox-outline' as const },
    { key: 'stats', label: 'Stats', icon: 'bar-chart-outline' as const },
    { key: 'actions', label: 'Actions', icon: 'flash-outline' as const },
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
                          {v.displayName ?? v.userName ?? `User #${v.userId}`}
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

      </ScrollView>

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
                        {item.displayName ?? item.userName ?? `#${item.userId}`}
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
