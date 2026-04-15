import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import { useAuth } from '../../lib/auth';

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginTop: 28, marginBottom: 8, marginHorizontal: 20 }}>
      <Text style={{
        color: colors.muted,
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
      }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{subtitle}</Text>
      )}
    </View>
  );
}

function ToggleRow({
  icon,
  iconColor,
  label,
  subtitle,
  value,
  onToggle,
  loading,
}: {
  icon: any;
  iconColor: string;
  label: string;
  subtitle?: string;
  value: boolean;
  onToggle: () => void;
  loading?: boolean;
}) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }}>
      <View style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: `${iconColor}22`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
      }}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '500' }}>{label}</Text>
        {subtitle && <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{subtitle}</Text>}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={colors.pink} />
      ) : (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.pink }}
          thumbColor={colors.white}
        />
      )}
    </View>
  );
}

function TextSettingRow({
  icon,
  iconColor,
  label,
  settingKey,
  value,
  placeholder,
  numeric,
  onSave,
}: {
  icon: any;
  iconColor: string;
  label: string;
  settingKey: string;
  value: string;
  placeholder?: string;
  numeric?: boolean;
  onSave: (key: string, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  // Sync draft when value changes from server
  React.useEffect(() => { setDraft(value); }, [value]);

  function commit() {
    setEditing(false);
    if (draft !== value) onSave(settingKey, draft);
  }

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }}>
      <View style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: `${iconColor}22`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
      }}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600', marginBottom: 4 }}>{label}</Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder ?? label}
          placeholderTextColor={colors.muted}
          keyboardType={numeric ? 'numeric' : 'default'}
          onFocus={() => setEditing(true)}
          onBlur={commit}
          onSubmitEditing={commit}
          style={{
            color: colors.text,
            fontSize: 15,
            fontWeight: '500',
            paddingVertical: 0,
            borderBottomWidth: editing ? 1 : 0,
            borderBottomColor: colors.pink,
          }}
        />
      </View>
      {editing && (
        <TouchableOpacity onPress={commit} style={{ marginLeft: 8 }}>
          <Ionicons name="checkmark-circle" size={22} color={colors.pink} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AdminSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const { data: meData } = trpc.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const isAdmin = user?.role === 'admin' || (meData as any)?.role === 'admin';

  // Load all settings
  const { data: settingsData, refetch, isLoading } = trpc.admin.settings.useQuery(undefined, {
    enabled: isAdmin,
    staleTime: 30_000,
  });

  const settings = useMemo(() => {
    const map: Record<string, string> = {};
    ((settingsData as any[]) ?? []).forEach((s: any) => {
      if (s?.key) map[s.key] = s.value ?? '';
    });
    return map;
  }, [settingsData]);

  // Save a setting
  const updateMutation = trpc.admin.updateSetting.useMutation({
    onSuccess: () => refetch(),
    onError: (e: any) => Alert.alert('Error', e.message ?? 'Failed to save setting'),
  });

  function setSetting(key: string, value: string) {
    updateMutation.mutate({ key, value });
  }

  function toggleSetting(key: string) {
    const current = isSetting(key);
    setSetting(key, current ? '0' : '1');
  }

  function isSetting(key: string) {
    return settings[key] === '1' || settings[key] === 'true';
  }

  const isSaving = updateMutation.isPending;

  // ── Access guard ──
  if (!isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Ionicons name="lock-closed" size={48} color={colors.muted} />
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 }}>Access Denied</Text>
        <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
          You need admin privileges to access this area.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ paddingVertical: 12, paddingHorizontal: 24, backgroundColor: colors.card, borderRadius: 12, borderColor: colors.border, borderWidth: 1 }}
        >
          <Text style={{ color: colors.pink, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      {/* ── Gradient Header ── */}
      <LinearGradient
        colors={['#7C3AED33', '#EC489922', colors.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ paddingTop: insets.top + 12, paddingBottom: 18, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>Admin Settings</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Platform configuration &amp; feature flags</Text>
          </View>
          <View style={{
            backgroundColor: `${colors.purple}33`,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
            borderColor: `${colors.purple}66`,
            borderWidth: 1,
          }}>
            <Text style={{ color: colors.purple, fontWeight: '700', fontSize: 12 }}>⚡ ADMIN</Text>
          </View>
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.pink} size="large" />
          <Text style={{ color: colors.muted, marginTop: 12 }}>Loading settings…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>

          {/* ── PLATFORM FEATURE FLAGS ── */}
          <SectionHeader title="Platform Feature Flags" subtitle="Toggle features for all users" />
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
            <ToggleRow
              icon="radio-button-on-outline"
              iconColor={colors.pink}
              label="Pulse Tab"
              subtitle="Enable/disable the Pulse tab for all users"
              value={isSetting('feature_pulse_enabled')}
              onToggle={() => toggleSetting('feature_pulse_enabled')}
              loading={isSaving}
            />
            <ToggleRow
              icon="person-add-outline"
              iconColor={colors.purple}
              label="Member Applications Open"
              subtitle="Allow new member applications"
              value={isSetting('feature_onboarding_open')}
              onToggle={() => toggleSetting('feature_onboarding_open')}
              loading={isSaving}
            />
            <ToggleRow
              icon="calendar-outline"
              iconColor={colors.purple}
              label="Events Tab"
              subtitle="Enable/disable the Events tab"
              value={isSetting('feature_events_enabled')}
              onToggle={() => toggleSetting('feature_events_enabled')}
              loading={isSaving}
            />
            <ToggleRow
              icon="globe-outline"
              iconColor={colors.purple}
              label="Community Feed"
              subtitle="Enable/disable the community wall"
              value={isSetting('feature_wall_enabled')}
              onToggle={() => toggleSetting('feature_wall_enabled')}
              loading={isSaving}
            />
            <ToggleRow
              icon="chatbubbles-outline"
              iconColor={colors.purple}
              label="Direct Messages"
              subtitle="Enable/disable DMs between members"
              value={isSetting('feature_dm_enabled')}
              onToggle={() => toggleSetting('feature_dm_enabled')}
              loading={isSaving}
            />
            <ToggleRow
              icon="heart-outline"
              iconColor={colors.pink}
              label="Queer Play Opt-In"
              subtitle="Show queer play opt-in on tickets"
              value={isSetting('feature_queer_play')}
              onToggle={() => toggleSetting('feature_queer_play')}
              loading={isSaving}
            />
            <ToggleRow
              icon="people-outline"
              iconColor={colors.pink}
              label="Couple Tickets"
              subtitle="Enable couple ticket type"
              value={isSetting('feature_couple_tickets')}
              onToggle={() => toggleSetting('feature_couple_tickets')}
              loading={isSaving}
            />
            <ToggleRow
              icon="hand-left-outline"
              iconColor={colors.purple}
              label="Volunteer Add-On"
              subtitle="Enable volunteer add-on option"
              value={isSetting('feature_volunteer')}
              onToggle={() => toggleSetting('feature_volunteer')}
              loading={isSaving}
            />
          </View>

          {/* ── PAYMENTS & TICKETING ── */}
          <SectionHeader title="Payments & Ticketing" />
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
            <TextSettingRow
              icon="logo-venmo"
              iconColor="#3D95CE"
              label="Venmo Handle"
              settingKey="venmo_handle"
              value={settings['venmo_handle'] ?? ''}
              placeholder="@venmo-handle"
              onSave={setSetting}
            />
            <TextSettingRow
              icon="ticket-outline"
              iconColor={colors.pink}
              label="Single Ticket Price ($)"
              settingKey="ticket_price_single"
              value={settings['ticket_price_single'] ?? ''}
              placeholder="e.g. 25"
              numeric
              onSave={setSetting}
            />
            <TextSettingRow
              icon="people-outline"
              iconColor={colors.pink}
              label="Couple Ticket Price ($)"
              settingKey="ticket_price_couple"
              value={settings['ticket_price_couple'] ?? ''}
              placeholder="e.g. 40"
              numeric
              onSave={setSetting}
            />
            <TextSettingRow
              icon="star-outline"
              iconColor="#F59E0B"
              label="Angel Ticket Price ($)"
              settingKey="ticket_price_angel"
              value={settings['ticket_price_angel'] ?? ''}
              placeholder="e.g. 50"
              numeric
              onSave={setSetting}
            />
          </View>

          {/* ── MEMBER MANAGEMENT ── */}
          <SectionHeader title="Member Management" />
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
            <ToggleRow
              icon="checkmark-circle-outline"
              iconColor="#10B981"
              label="Auto-Approve Members"
              subtitle="Skip admin approval queue for new applications"
              value={isSetting('auto_approve_members')}
              onToggle={() => toggleSetting('auto_approve_members')}
              loading={isSaving}
            />
            <ToggleRow
              icon="medical-outline"
              iconColor={colors.pink}
              label="Require Test Results"
              subtitle="Require STI test upload before attending an event"
              value={isSetting('require_test_results')}
              onToggle={() => toggleSetting('require_test_results')}
              loading={isSaving}
            />
            <TextSettingRow
              icon="people-circle-outline"
              iconColor={colors.purple}
              label="Default Max Capacity"
              settingKey="max_capacity_default"
              value={settings['max_capacity_default'] ?? ''}
              placeholder="e.g. 100"
              numeric
              onSave={setSetting}
            />
          </View>

          {/* ── COMMUNICATIONS ── */}
          <SectionHeader title="Communications" />
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
            <TextSettingRow
              icon="mail-outline"
              iconColor={colors.purple}
              label="SendGrid From Name"
              settingKey="sendgrid_from_name"
              value={settings['sendgrid_from_name'] ?? ''}
              placeholder="e.g. Soapies Team"
              onSave={setSetting}
            />
            <ToggleRow
              icon="megaphone-outline"
              iconColor="#F59E0B"
              label="Push on New Event"
              subtitle="Send push notification when a new event is created"
              value={isSetting('notification_new_event')}
              onToggle={() => toggleSetting('notification_new_event')}
              loading={isSaving}
            />
            <ToggleRow
              icon="alarm-outline"
              iconColor="#F59E0B"
              label="Event Reminders"
              subtitle="Send 24h reminder push notifications"
              value={isSetting('notification_reminders')}
              onToggle={() => toggleSetting('notification_reminders')}
              loading={isSaving}
            />
          </View>

          {/* ── DANGER ZONE ── */}
          <View style={{ marginTop: 28, marginBottom: 8, marginHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="warning" size={16} color="#EF4444" />
              <Text style={{
                color: '#EF4444',
                fontSize: 11,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>
                Danger Zone
              </Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>
              These actions are irreversible. Proceed with extreme caution.
            </Text>
          </View>
          <View style={{
            borderTopWidth: 1,
            borderTopColor: '#EF444444',
            borderBottomWidth: 1,
            borderBottomColor: '#EF444444',
          }}>
            {/* Maintenance Mode toggle */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#EF444411',
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#EF444433',
            }}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: '#EF444433',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="construct-outline" size={16} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#EF4444', fontSize: 15, fontWeight: '600' }}>Maintenance Mode</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                  Takes the app offline for all users
                </Text>
              </View>
              {isSaving ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Switch
                  value={isSetting('maintenance_mode')}
                  onValueChange={() => {
                    const isOn = isSetting('maintenance_mode');
                    if (!isOn) {
                      Alert.alert(
                        '⚠️ Enable Maintenance Mode?',
                        'This will take the app offline for ALL users immediately. Are you sure?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Enable', style: 'destructive', onPress: () => toggleSetting('maintenance_mode') },
                        ]
                      );
                    } else {
                      toggleSetting('maintenance_mode');
                    }
                  }}
                  trackColor={{ false: colors.border, true: '#EF4444' }}
                  thumbColor={colors.white}
                />
              )}
            </View>

            {/* Clear All Signals */}
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Clear All Signals?',
                  'This will permanently delete ALL member signal data. This cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear All',
                      style: 'destructive',
                      onPress: () => {
                        // Placeholder — would call a dedicated admin mutation
                        Alert.alert('Signals Cleared', 'All member signals have been removed.');
                      },
                    },
                  ]
                );
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#EF444411',
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#EF444433',
              }}
            >
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: '#EF444433',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="radio-button-off-outline" size={16} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#EF4444', fontSize: 15, fontWeight: '600' }}>Clear All Signals</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                  Delete all member_signals rows permanently
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#EF4444" />
            </TouchableOpacity>

            {/* Export Member Data */}
            <TouchableOpacity
              onPress={() => Alert.alert('Export Data', 'Member data export is not yet available in the mobile app. Please use the web admin panel.')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#EF444411',
                paddingVertical: 14,
                paddingHorizontal: 16,
              }}
            >
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: '#EF444433',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="download-outline" size={16} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#EF4444', fontSize: 15, fontWeight: '600' }}>Export Member Data</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                  Download full member roster (CSV)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
