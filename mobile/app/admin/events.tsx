import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import { useAuth } from '../../lib/auth';

const STATUS_COLORS: Record<string, string> = {
  published: '#10B981',
  draft: '#F59E0B',
  cancelled: '#EF4444',
  completed: '#6366F1',
};

const STATUSES = ['draft', 'published', 'cancelled', 'completed'] as const;
type EventStatus = typeof STATUSES[number];

function LabeledInput({ label, value, onChangeText, placeholder, multiline, keyboardType }: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        keyboardType={keyboardType}
        style={{
          backgroundColor: colors.card,
          color: colors.text,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderColor: colors.border,
          borderWidth: 1,
          fontSize: 15,
          minHeight: multiline ? 80 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}

export default function AdminEventsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [showCreate, setShowCreate] = useState(false);
  const [editEvent, setEditEvent] = useState<any>(null);

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    venue: '',
    address: '',
    startDate: '',
    capacity: '',
    priceSingleMale: '',
    priceSingleFemale: '',
    priceCouple: '',
    status: 'draft' as EventStatus,
  });

  const { data: meData } = trpc.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const isAdmin = user?.role === 'admin' || (meData as any)?.role === 'admin';

  const { data, isLoading } = trpc.events.all.useQuery(
    undefined,
    { enabled: isAdmin }
  );
  const events = (data as any[]) ?? [];

  const createMutation = trpc.events.create.useMutation({
    onSuccess: () => {
      utils.events.all.invalidate();
      setShowCreate(false);
      resetForm();
      Alert.alert('✅ Created', 'Event created successfully.');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const updateMutation = trpc.events.update.useMutation({
    onSuccess: () => {
      utils.events.all.invalidate();
      setEditEvent(null);
      Alert.alert('✅ Updated', 'Event updated successfully.');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  // Guard AFTER all hooks
  if (!isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Access Denied</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ paddingVertical: 12, paddingHorizontal: 24, backgroundColor: colors.card, borderRadius: 12 }}>
          <Text style={{ color: colors.pink, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  function resetForm() {
    setForm({ title: '', description: '', venue: '', address: '', startDate: '', capacity: '', priceSingleMale: '', priceSingleFemale: '', priceCouple: '', status: 'draft' });
  }

  function openEdit(ev: any) {
    setForm({
      title: ev.title ?? '',
      description: ev.description ?? '',
      venue: ev.venue ?? '',
      address: ev.address ?? '',
      startDate: ev.startDate ? new Date(ev.startDate).toISOString().slice(0, 16) : '',
      capacity: ev.capacity?.toString() ?? '',
      priceSingleMale: ev.priceSingleMale ?? '',
      priceSingleFemale: ev.priceSingleFemale ?? '',
      priceCouple: ev.priceCouple ?? '',
      status: ev.status ?? 'draft',
    });
    setEditEvent(ev);
  }

  function handleSubmit() {
    if (!form.title.trim()) { Alert.alert('Error', 'Title is required'); return; }
    if (!form.startDate.trim()) { Alert.alert('Error', 'Start date is required'); return; }

    const payload: any = {
      title: form.title,
      description: form.description || undefined,
      venue: form.venue || undefined,
      address: form.address || undefined,
      startDate: new Date(form.startDate).toISOString(),
      capacity: form.capacity ? parseInt(form.capacity) : undefined,
      priceSingleMale: form.priceSingleMale || undefined,
      priceSingleFemale: form.priceSingleFemale || undefined,
      priceCouple: form.priceCouple || undefined,
      status: form.status,
    };

    if (editEvent) {
      updateMutation.mutate({ id: editEvent.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function quickStatusUpdate(ev: any) {
    Alert.alert('Change Status', `Update status for "${ev.title}"`, [
      ...STATUSES.map((s) => ({
        text: s.charAt(0).toUpperCase() + s.slice(1),
        onPress: () => updateMutation.mutate({ id: ev.id, status: s }),
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomColor: colors.border, borderBottomWidth: 1 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', flex: 1 }}>Manage Events</Text>
        <TouchableOpacity
          onPress={() => { resetForm(); setEditEvent(null); setShowCreate(true); }}
          style={{ backgroundColor: `${colors.pink}22`, borderRadius: 20, padding: 8, borderColor: `${colors.pink}44`, borderWidth: 1 }}
        >
          <Ionicons name="add" size={22} color={colors.pink} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.pink} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {events.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="calendar-outline" size={48} color={colors.muted} />
              <Text style={{ color: colors.muted, marginTop: 12, fontSize: 15 }}>No events yet</Text>
            </View>
          )}
          {events.map((ev: any) => {
            const statusColor = STATUS_COLORS[ev.status] ?? colors.muted;
            const dateStr = ev.startDate
              ? new Date(ev.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'TBD';
            return (
              <View
                key={ev.id}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 12,
                  borderColor: colors.border,
                  borderWidth: 1,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 4 }}>{ev.title}</Text>
                    <Text style={{ color: colors.muted, fontSize: 13 }}>{dateStr}</Text>
                    {ev.venue && <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{ev.venue}</Text>}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <View style={{ backgroundColor: `${statusColor}22`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                      <Text style={{ color: statusColor, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>{ev.status}</Text>
                    </View>
                  </View>
                </View>
                {ev.capacity && (
                  <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 10 }}>
                    {ev.currentAttendees ?? 0}/{ev.capacity} attending
                  </Text>
                )}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => openEdit(ev)}
                    style={{ flex: 1, backgroundColor: `${colors.purple}22`, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderColor: `${colors.purple}44`, borderWidth: 1 }}
                  >
                    <Text style={{ color: colors.purple, fontWeight: '700', fontSize: 13 }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => quickStatusUpdate(ev)}
                    style={{ flex: 1, backgroundColor: `${statusColor}22`, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderColor: `${statusColor}44`, borderWidth: 1 }}
                  >
                    <Text style={{ color: statusColor, fontWeight: '700', fontSize: 13 }}>Status</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={() => router.push(`/admin/event-ops?eventId=${ev.id}&eventTitle=${encodeURIComponent(ev.title ?? '')}` as any)}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: `${colors.purple}22`, borderRadius: 10, paddingVertical: 10, borderColor: `${colors.purple}44`, borderWidth: 1 }}
                  >
                    <Ionicons name="settings-outline" size={16} color={colors.purple} />
                    <Text style={{ color: colors.purple, fontWeight: '700', fontSize: 13 }}>Event Ops</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Create/Edit Modal */}
      <Modal visible={showCreate || !!editEvent} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomColor: colors.border, borderBottomWidth: 1 }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', flex: 1 }}>
                {editEvent ? 'Edit Event' : 'Create Event'}
              </Text>
              <TouchableOpacity onPress={() => { setShowCreate(false); setEditEvent(null); }}>
                <Ionicons name="close" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              <LabeledInput label="Title *" value={form.title} onChangeText={(v: string) => setForm(f => ({ ...f, title: v }))} />
              <LabeledInput label="Description" value={form.description} onChangeText={(v: string) => setForm(f => ({ ...f, description: v }))} multiline />
              <LabeledInput label="Venue" value={form.venue} onChangeText={(v: string) => setForm(f => ({ ...f, venue: v }))} />
              <LabeledInput label="Address" value={form.address} onChangeText={(v: string) => setForm(f => ({ ...f, address: v }))} />
              <LabeledInput label="Start Date (YYYY-MM-DDTHH:MM) *" value={form.startDate} onChangeText={(v: string) => setForm(f => ({ ...f, startDate: v }))} placeholder="2025-06-01T19:00" />
              <LabeledInput label="Capacity" value={form.capacity} onChangeText={(v: string) => setForm(f => ({ ...f, capacity: v }))} keyboardType="numeric" />
              <LabeledInput label="Price Single Male ($)" value={form.priceSingleMale} onChangeText={(v: string) => setForm(f => ({ ...f, priceSingleMale: v }))} keyboardType="numeric" />
              <LabeledInput label="Price Single Female ($)" value={form.priceSingleFemale} onChangeText={(v: string) => setForm(f => ({ ...f, priceSingleFemale: v }))} keyboardType="numeric" />
              <LabeledInput label="Price Couple ($)" value={form.priceCouple} onChangeText={(v: string) => setForm(f => ({ ...f, priceCouple: v }))} keyboardType="numeric" />

              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                {STATUSES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setForm(f => ({ ...f, status: s }))}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: form.status === s ? `${STATUS_COLORS[s]}33` : colors.card,
                      borderColor: form.status === s ? STATUS_COLORS[s] : colors.border,
                      borderWidth: 1,
                    }}
                  >
                    <Text style={{ color: form.status === s ? STATUS_COLORS[s] : colors.muted, fontWeight: '600', textTransform: 'capitalize' }}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity onPress={handleSubmit} disabled={isMutating} activeOpacity={0.85}>
                <LinearGradient
                  colors={[colors.pink, colors.purple]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center', opacity: isMutating ? 0.7 : 1 }}
                >
                  {isMutating ? <ActivityIndicator color="#fff" /> : (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{editEvent ? 'Save Changes' : 'Create Event'}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
