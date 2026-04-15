import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import BrandGradient from '../../components/BrandGradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import { useAuth } from '../../lib/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

type SlotStatus = 'available' | 'booked' | 'completed' | 'cancelled';
type FilterTab = 'all' | 'available' | 'booked' | 'completed';

const STATUS_COLORS: Record<SlotStatus, string> = {
  available: '#10B981',
  booked: '#3B82F6',
  completed: '#8B5CF6',
  cancelled: '#EF4444',
};

// ─── Slot generation ─────────────────────────────────────────────────────────

function generateSlots(
  startDate: string,
  endDate: string,
  times: string[],
  duration: number
): { scheduledAt: string; duration: number }[] {
  if (!startDate || times.length === 0) return [];
  try {
    const slots: { scheduledAt: string; duration: number }[] = [];
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(startDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
    const cur = new Date(start);
    while (cur <= end) {
      for (const t of times) {
        const parts = t.split(':');
        if (parts.length < 2) continue;
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (isNaN(h) || isNaN(m)) continue;
        const dt = new Date(cur);
        dt.setHours(h, m, 0, 0);
        slots.push({ scheduledAt: dt.toISOString(), duration });
      }
      cur.setDate(cur.getDate() + 1);
    }
    return slots;
  } catch {
    return [];
  }
}

function formatSlotDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
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

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function InterviewSlotsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: meData } = trpc.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const isAdmin = user?.role === 'admin' || (meData as any)?.role === 'admin';

  // Form state
  const [formOpen, setFormOpen] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [times, setTimes] = useState<string[]>([]);
  const [duration, setDuration] = useState<number>(30);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const { data, isLoading, refetch } = trpc.introCalls.all.useQuery(undefined, {
    enabled: isAdmin,
  });
  const slots = (data as any[]) ?? [];

  const bulkCreateMutation = trpc.introCalls.bulkCreate.useMutation({
    onSuccess: () => {
      utils.introCalls.all.invalidate();
      setStartDate('');
      setEndDate('');
      setTimes([]);
      setTimeInput('');
      setDuration(30);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const updateMutation = trpc.introCalls.update.useMutation({
    onSuccess: () => utils.introCalls.all.invalidate(),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const deleteMutation = trpc.introCalls.delete.useMutation({
    onSuccess: () => utils.introCalls.all.invalidate(),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  // ─── Guard ───────────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 }}
      >
        <Ionicons name="lock-closed" size={48} color={colors.muted} />
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 24 }}>
          Access Denied
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ paddingVertical: 12, paddingHorizontal: 24, backgroundColor: colors.card, borderRadius: 12 }}
        >
          <Text style={{ color: colors.pink, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── Derived ─────────────────────────────────────────────────────────────
  const previewSlots = generateSlots(startDate, endDate, times, duration);

  const filteredSlots = slots.filter((s: any) => {
    if (filterTab === 'all') return true;
    return s.status === filterTab;
  });

  const FILTER_TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'available', label: 'Available' },
    { key: 'booked', label: 'Booked' },
    { key: 'completed', label: 'Completed' },
  ];

  const DURATION_OPTIONS = [15, 20, 30, 45];

  // ─── Handlers ────────────────────────────────────────────────────────────
  function addTime() {
    const t = timeInput.trim();
    if (!t) return;
    // Basic HH:MM validation
    if (!/^\d{1,2}:\d{2}$/.test(t)) {
      Alert.alert('Invalid time', 'Enter time in HH:MM format (24h), e.g. 10:00');
      return;
    }
    if (times.includes(t)) return;
    Haptics.selectionAsync();
    setTimes((prev) => [...prev, t].sort());
    setTimeInput('');
  }

  function removeTime(t: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimes((prev) => prev.filter((x) => x !== t));
  }

  function handleCreateSlots() {
    if (previewSlots.length === 0) {
      Alert.alert('Nothing to create', 'Add at least one time and a start date.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    bulkCreateMutation.mutate({ slots: previewSlots });
  }

  function handleMarkCompleted(id: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateMutation.mutate({ id, status: 'completed' });
  }

  function handleCancel(id: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateMutation.mutate({ id, status: 'cancelled' });
  }

  function handleDelete(id: number) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Delete Slot', 'Permanently delete this slot?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate({ id }),
      },
    ]);
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', flex: 1 }}>
          Interview Slots 📅
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        {/* ── Create Slots Form ──────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            borderColor: colors.border,
            borderWidth: 1,
            marginBottom: 20,
            overflow: 'hidden',
          }}
        >
          {/* Form header */}
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              setFormOpen((o) => !o);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              borderBottomColor: formOpen ? colors.border : 'transparent',
              borderBottomWidth: formOpen ? 1 : 0,
            }}
          >
            <LinearGradient
              colors={[colors.pink, colors.purple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 10,
              }}
            >
              <Ionicons name="add" size={18} color="#fff" />
            </LinearGradient>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, flex: 1 }}>
              Create Slots
            </Text>
            <Ionicons name={formOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
          </TouchableOpacity>

          {formOpen && (
            <View style={{ padding: 16, gap: 14 }}>
              {/* Start Date */}
              <View>
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
                  Start Date
                </Text>
                <TextInput
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="2026-05-10"
                  placeholderTextColor={colors.muted}
                  keyboardType="numbers-and-punctuation"
                  style={{
                    backgroundColor: colors.bg,
                    borderRadius: 10,
                    borderColor: colors.border,
                    borderWidth: 1,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: colors.text,
                    fontSize: 14,
                  }}
                />
              </View>

              {/* End Date */}
              <View>
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
                  End Date{' '}
                  <Text style={{ fontWeight: '400', fontSize: 11 }}>(optional — for date range)</Text>
                </Text>
                <TextInput
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="2026-05-14"
                  placeholderTextColor={colors.muted}
                  keyboardType="numbers-and-punctuation"
                  style={{
                    backgroundColor: colors.bg,
                    borderRadius: 10,
                    borderColor: colors.border,
                    borderWidth: 1,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: colors.text,
                    fontSize: 14,
                  }}
                />
              </View>

              {/* Time input */}
              <View>
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
                  Time Slots (24h HH:MM)
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    value={timeInput}
                    onChangeText={setTimeInput}
                    placeholder="10:00"
                    placeholderTextColor={colors.muted}
                    keyboardType="numbers-and-punctuation"
                    returnKeyType="done"
                    onSubmitEditing={addTime}
                    style={{
                      flex: 1,
                      backgroundColor: colors.bg,
                      borderRadius: 10,
                      borderColor: colors.border,
                      borderWidth: 1,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      color: colors.text,
                      fontSize: 14,
                    }}
                  />
                  <TouchableOpacity
                    onPress={addTime}
                    style={{ borderRadius: 10, overflow: 'hidden' }}
                  >
                    <BrandGradient
                      style={{ paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center', alignItems: 'center' }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Add</Text>
                    </BrandGradient>
                  </TouchableOpacity>
                </View>

                {/* Time chips */}
                {times.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    {times.map((t) => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => removeTime(t)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: `${colors.purple}33`,
                          borderRadius: 20,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderColor: `${colors.purple}66`,
                          borderWidth: 1,
                          gap: 5,
                        }}
                      >
                        <Text style={{ color: colors.purple, fontWeight: '600', fontSize: 13 }}>{t}</Text>
                        <Ionicons name="close" size={12} color={colors.purple} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Duration pills */}
              <View>
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                  Duration
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {DURATION_OPTIONS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setDuration(d);
                      }}
                      style={{ flex: 1, borderRadius: 10, overflow: 'hidden' }}
                    >
                      {duration === d ? (
                        <BrandGradient
                          style={{ paddingVertical: 10, alignItems: 'center' }}
                        >
                          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{d}m</Text>
                        </BrandGradient>
                      ) : (
                        <View
                          style={{
                            paddingVertical: 10,
                            alignItems: 'center',
                            backgroundColor: colors.bg,
                            borderRadius: 10,
                            borderColor: colors.border,
                            borderWidth: 1,
                          }}
                        >
                          <Text style={{ color: colors.muted, fontWeight: '600', fontSize: 13 }}>{d}m</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Preview count */}
              <View
                style={{
                  backgroundColor: colors.bg,
                  borderRadius: 10,
                  padding: 12,
                  borderColor: colors.border,
                  borderWidth: 1,
                }}
              >
                <Text style={{ color: previewSlots.length > 0 ? colors.text : colors.muted, fontSize: 14, fontWeight: '600' }}>
                  {previewSlots.length > 0
                    ? `Will create ${previewSlots.length} slot${previewSlots.length !== 1 ? 's' : ''}`
                    : 'Enter dates and times to preview'}
                </Text>
              </View>

              {/* Create button */}
              <TouchableOpacity
                onPress={handleCreateSlots}
                disabled={bulkCreateMutation.isPending || previewSlots.length === 0}
                style={{ borderRadius: 12, overflow: 'hidden', opacity: previewSlots.length === 0 ? 0.5 : 1 }}
              >
                <BrandGradient
                  style={{
                    paddingVertical: 14,
                    alignItems: 'center',
                    opacity: bulkCreateMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {bulkCreateMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                      Create {previewSlots.length > 0 ? previewSlots.length : ''} Slots
                    </Text>
                  )}
                </BrandGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Filter tabs ───────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = filterTab === tab.key;
            const count = slots.filter((s: any) =>
              tab.key === 'all' ? true : s.status === tab.key
            ).length;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilterTab(tab.key);
                }}
                style={{ borderRadius: 20, overflow: 'hidden' }}
              >
                {isActive ? (
                  <BrandGradient
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 5 }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{tab.label}</Text>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>{count}</Text>
                    </View>
                  </BrandGradient>
                ) : (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      backgroundColor: colors.card,
                      borderRadius: 20,
                      borderColor: colors.border,
                      borderWidth: 1,
                      gap: 5,
                    }}
                  >
                    <Text style={{ color: colors.muted, fontWeight: '600', fontSize: 13 }}>{tab.label}</Text>
                    <View style={{ backgroundColor: `${colors.pink}22`, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ color: colors.pink, fontWeight: '800', fontSize: 11 }}>{count}</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Slot list ─────────────────────────────────────────────────── */}
        {isLoading ? (
          <ActivityIndicator color={colors.pink} style={{ marginTop: 40 }} />
        ) : filteredSlots.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Ionicons name="calendar-outline" size={40} color={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 15, marginTop: 12 }}>No slots found</Text>
          </View>
        ) : (
          filteredSlots.map((slot: any) => {
            const statusColor = STATUS_COLORS[slot.status as SlotStatus] ?? colors.muted;
            return (
              <View
                key={slot.id}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 10,
                  borderColor: colors.border,
                  borderWidth: 1,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  {/* Icon */}
                  <LinearGradient
                    colors={[colors.purple, '#6366F1']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 10,
                      flexShrink: 0,
                    }}
                  >
                    <Ionicons name="calendar" size={16} color="#fff" />
                  </LinearGradient>

                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14, marginBottom: 2 }}>
                      {formatSlotDate(slot.scheduledAt)}
                    </Text>
                    {slot.duration ? (
                      <Text style={{ color: colors.muted, fontSize: 12 }}>{slot.duration} min</Text>
                    ) : null}
                    {slot.status === 'booked' && slot.bookedByProfileId ? (
                      <Text style={{ color: '#3B82F6', fontSize: 12, marginTop: 2 }}>
                        Booked by profile #{slot.bookedByProfileId}
                      </Text>
                    ) : null}
                  </View>

                  {/* Status badge */}
                  <View
                    style={{
                      backgroundColor: `${statusColor}22`,
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderColor: `${statusColor}44`,
                      borderWidth: 1,
                      marginLeft: 8,
                    }}
                  >
                    <Text style={{ color: statusColor, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>
                      {slot.status}
                    </Text>
                  </View>
                </View>

                {/* Action buttons */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  {slot.status === 'booked' && (
                    <TouchableOpacity
                      onPress={() => handleMarkCompleted(slot.id)}
                      disabled={updateMutation.isPending}
                      style={{
                        flex: 1,
                        paddingVertical: 9,
                        alignItems: 'center',
                        borderRadius: 9,
                        borderColor: '#8B5CF688',
                        borderWidth: 1.5,
                        backgroundColor: '#8B5CF611',
                      }}
                    >
                      <Text style={{ color: '#8B5CF6', fontWeight: '700', fontSize: 13 }}>✓ Done</Text>
                    </TouchableOpacity>
                  )}
                  {slot.status === 'available' && (
                    <TouchableOpacity
                      onPress={() => handleCancel(slot.id)}
                      disabled={updateMutation.isPending}
                      style={{
                        flex: 1,
                        paddingVertical: 9,
                        alignItems: 'center',
                        borderRadius: 9,
                        borderColor: `${colors.border}`,
                        borderWidth: 1.5,
                        backgroundColor: colors.bg,
                      }}
                    >
                      <Text style={{ color: colors.muted, fontWeight: '700', fontSize: 13 }}>✕ Cancel</Text>
                    </TouchableOpacity>
                  )}
                  {/* Delete */}
                  <TouchableOpacity
                    onPress={() => handleDelete(slot.id)}
                    disabled={deleteMutation.isPending}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      alignItems: 'center',
                      borderRadius: 9,
                      borderColor: '#EF444488',
                      borderWidth: 1.5,
                      backgroundColor: '#EF444411',
                    }}
                  >
                    <Ionicons name="trash-outline" size={15} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
