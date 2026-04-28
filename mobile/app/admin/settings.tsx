import React, { useState, useMemo, useReducer, useRef } from 'react';
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
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import { useTheme } from '../../lib/theme';
import AdminAccessGate from '../../components/AdminAccessGate';
import { useAdminAccess } from '../../lib/useAdminAccess';

// ─── Saving-state reducer ────────────────────────────────────────────────────
type SavingAction = { type: 'start'; key: string } | { type: 'done'; key: string };
function savingReducer(state: Set<string>, action: SavingAction): Set<string> {
  const next = new Set(state);
  if (action.type === 'start') next.add(action.key);
  else next.delete(action.key);
  return next;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginTop: 28, marginBottom: 8, marginHorizontal: 20 }}>
      <Text
        style={{
          color: colors.muted,
          fontSize: 11,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
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
  settingKey,
  onToggle,
  saving,
}: {
  icon: any;
  iconColor: string;
  label: string;
  subtitle?: string;
  value: boolean;
  settingKey: string;
  onToggle: () => void;
  saving: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: `${iconColor}22`,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '500' }}>{label}</Text>
        {subtitle && (
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{subtitle}</Text>
        )}
      </View>
      {saving ? (
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
  subtitle,
  settingKey,
  value,
  placeholder,
  numeric,
  onSave,
}: {
  icon: any;
  iconColor: string;
  label: string;
  subtitle?: string;
  settingKey: string;
  value: string;
  placeholder?: string;
  numeric?: boolean;
  onSave: (key: string, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  React.useEffect(() => {
    setDraft(value);
  }, [value]);
  function commit() {
    setEditing(false);
    if (draft !== value) onSave(settingKey, draft);
  }
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: `${iconColor}22`,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600', marginBottom: 2 }}>
          {label}
        </Text>
        {subtitle && (
          <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 4 }}>{subtitle}</Text>
        )}
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
  const { isAdmin, isCheckingAdmin } = useAdminAccess();
  const theme = useTheme();
  const [savingKeys, dispatchSaving] = useReducer(savingReducer, new Set<string>());
  const [exporting, setExporting] = useState(false);
  const seededRef = useRef(false);

  const {
    data: settingsData,
    refetch,
    isLoading,
    isError,
    error,
  } = trpc.admin.settings.useQuery(undefined, {
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

  const seedMutation = trpc.admin.seedDefaultSettings.useMutation({
    onSuccess: () => refetch(),
  });

  React.useEffect(() => {
    if (!isAdmin || isLoading || seededRef.current) return;
    const hasCritical = settings['feature_pulse_enabled'] !== undefined;
    if (!hasCritical) {
      seededRef.current = true;
      seedMutation.mutate();
    }
  }, [isAdmin, isLoading, seedMutation, settings]);

  const updateMutation = trpc.admin.updateSetting.useMutation({
    onMutate: ({ key }: { key: string }) => dispatchSaving({ type: 'start', key }),
    onSettled: (_data: any, _err: any, { key }: { key: string }) => {
      dispatchSaving({ type: 'done', key });
      refetch();
    },
    onError: (e: any) => Alert.alert('Error', e.message ?? 'Failed to save setting'),
  });

  const clearSignalsMutation = trpc.admin.clearAllSignals.useMutation({
    onSuccess: (data: any) => {
      Alert.alert(
        'Signals Cleared',
        `${data.deleted} member signal${data.deleted === 1 ? '' : 's'} removed.`
      );
    },
    onError: (e: any) => Alert.alert('Error', e.message ?? 'Failed to clear signals'),
  });

  const exportQuery = trpc.admin.exportMembers.useQuery(undefined, { enabled: false });

  function setSetting(key: string, value: string) {
    updateMutation.mutate({ key, value });
  }

  function toggleSetting(key: string) {
    setSetting(key, isSetting(key) ? '0' : '1');
  }

  function isSetting(key: string) {
    return settings[key] === '1' || settings[key] === 'true';
  }

  async function handleExport() {
    setExporting(true);
    try {
      const result = await exportQuery.refetch();
      const data = result.data as any;
      if (!data?.csv) {
        Alert.alert('Export Failed', 'No data returned from server.');
        return;
      }
      const filename = `soapies-members-${new Date().toISOString().slice(0, 10)}.csv`;
      const file = new FileSystem.File(FileSystem.Paths.cache, filename);
      file.write(data.csv, { encoding: 'utf8' });
      const fileUri = file.uri;
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: `Export ${data.count} members`,
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Exported', `Saved to: ${fileUri}`);
      }
    } catch (err: any) {
      Alert.alert('Export Error', err.message ?? 'Unknown error');
    } finally {
      setExporting(false);
    }
  }

  if (isCheckingAdmin) return <AdminAccessGate mode="loading" />;
  if (!isAdmin) return <AdminAccessGate mode="denied" onBack={() => router.back()} />;

  if (isError) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
        edges={['bottom']}
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
          Could not load admin settings
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
          {(error as any)?.message ?? 'Please try again in a moment.'}
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['bottom']}>
      <LinearGradient
        colors={[
          theme.alpha(theme.colors.secondary, 0.2),
          theme.alpha(theme.colors.primary, 0.12),
          theme.colors.background,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ paddingTop: insets.top + 12, paddingBottom: 18, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: '800' }}>
              Admin Settings
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
              Platform configuration &amp; feature flags
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

      {isLoading || seedMutation.isPending ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.colors.pink} size="large" />
          <Text style={{ color: theme.colors.textMuted, marginTop: 12 }}>
            {seedMutation.isPending ? 'Seeding defaults…' : 'Loading settings…'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
          <SectionHeader title="Platform Feature Flags" subtitle="Toggle features for all users" />
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
            <ToggleRow
              icon="radio-button-on-outline"
              iconColor={colors.pink}
              label="Pulse Tab"
              subtitle="Enable/disable the Pulse tab for all users"
              value={isSetting('feature_pulse_enabled')}
              settingKey="feature_pulse_enabled"
              onToggle={() => toggleSetting('feature_pulse_enabled')}
              saving={savingKeys.has('feature_pulse_enabled')}
            />
            <ToggleRow
              icon="person-add-outline"
              iconColor={colors.purple}
              label="Member Applications Open"
              subtitle="Allow new member applications"
              value={isSetting('feature_onboarding_open')}
              settingKey="feature_onboarding_open"
              onToggle={() => toggleSetting('feature_onboarding_open')}
              saving={savingKeys.has('feature_onboarding_open')}
            />
            <ToggleRow
              icon="calendar-outline"
              iconColor={colors.purple}
              label="Events Tab"
              subtitle="Enable/disable the Events tab"
              value={isSetting('feature_events_enabled')}
              settingKey="feature_events_enabled"
              onToggle={() => toggleSetting('feature_events_enabled')}
              saving={savingKeys.has('feature_events_enabled')}
            />
            <ToggleRow
              icon="globe-outline"
              iconColor={colors.purple}
              label="Community Feed"
              subtitle="Enable/disable the community wall"
              value={isSetting('feature_wall_enabled')}
              settingKey="feature_wall_enabled"
              onToggle={() => toggleSetting('feature_wall_enabled')}
              saving={savingKeys.has('feature_wall_enabled')}
            />
            <ToggleRow
              icon="chatbubbles-outline"
              iconColor={colors.purple}
              label="Direct Messages"
              subtitle="Enable/disable DMs between members"
              value={isSetting('feature_dm_enabled')}
              settingKey="feature_dm_enabled"
              onToggle={() => toggleSetting('feature_dm_enabled')}
              saving={savingKeys.has('feature_dm_enabled')}
            />
            <ToggleRow
              icon="heart-outline"
              iconColor={colors.pink}
              label="Queer Play Opt-In"
              subtitle="Show queer play opt-in on tickets"
              value={isSetting('feature_queer_play')}
              settingKey="feature_queer_play"
              onToggle={() => toggleSetting('feature_queer_play')}
              saving={savingKeys.has('feature_queer_play')}
            />
            <ToggleRow
              icon="people-outline"
              iconColor={colors.pink}
              label="Couple Tickets"
              subtitle="Enable couple ticket type"
              value={isSetting('feature_couple_tickets')}
              settingKey="feature_couple_tickets"
              onToggle={() => toggleSetting('feature_couple_tickets')}
              saving={savingKeys.has('feature_couple_tickets')}
            />
            <ToggleRow
              icon="hand-left-outline"
              iconColor={colors.purple}
              label="Volunteer Add-On"
              subtitle="Enable volunteer add-on option"
              value={isSetting('feature_volunteer')}
              settingKey="feature_volunteer"
              onToggle={() => toggleSetting('feature_volunteer')}
              saving={savingKeys.has('feature_volunteer')}
            />
          </View>

          <SectionHeader title="Payments & Ticketing" />
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
            <TextSettingRow
              icon="logo-venmo"
              iconColor="#3D95CE"
              label="Venmo Handle"
              subtitle="Used in payment instructions sent to members"
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
              iconColor={theme.colors.warning}
              label="Angel Ticket Price ($)"
              settingKey="ticket_price_angel"
              value={settings['ticket_price_angel'] ?? ''}
              placeholder="e.g. 50"
              numeric
              onSave={setSetting}
            />
          </View>

          <SectionHeader
            title="Membership Monetization"
            subtitle="Configure paid tier pricing and Stripe recurring price IDs"
          />
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
            <TextSettingRow
              icon="heart-outline"
              iconColor={colors.pink}
              label="Connect Monthly Price ($)"
              settingKey="membership_connect_monthly_price_usd"
              value={settings['membership_connect_monthly_price_usd'] ?? '29'}
              placeholder="29"
              numeric
              onSave={setSetting}
            />
            <TextSettingRow
              icon="calendar-outline"
              iconColor={colors.purple}
              label="Connect Yearly Price ($)"
              settingKey="membership_connect_yearly_price_usd"
              value={settings['membership_connect_yearly_price_usd'] ?? '290'}
              placeholder="290"
              numeric
              onSave={setSetting}
            />
            <TextSettingRow
              icon="logo-usd"
              iconColor={theme.colors.warning}
              label="Connect Monthly Stripe Price ID"
              subtitle="Required for live subscription checkout"
              settingKey="membership_connect_monthly_price_id"
              value={settings['membership_connect_monthly_price_id'] ?? ''}
              placeholder="price_..."
              onSave={setSetting}
            />
            <TextSettingRow
              icon="receipt-outline"
              iconColor={theme.colors.warning}
              label="Connect Yearly Stripe Price ID"
              settingKey="membership_connect_yearly_price_id"
              value={settings['membership_connect_yearly_price_id'] ?? ''}
              placeholder="price_..."
              onSave={setSetting}
            />
            <TextSettingRow
              icon="diamond-outline"
              iconColor={colors.pink}
              label="Inner Circle Monthly Price ($)"
              settingKey="membership_inner_circle_monthly_price_usd"
              value={settings['membership_inner_circle_monthly_price_usd'] ?? '79'}
              placeholder="79"
              numeric
              onSave={setSetting}
            />
            <TextSettingRow
              icon="calendar-clear-outline"
              iconColor={colors.purple}
              label="Inner Circle Yearly Price ($)"
              settingKey="membership_inner_circle_yearly_price_usd"
              value={settings['membership_inner_circle_yearly_price_usd'] ?? '790'}
              placeholder="790"
              numeric
              onSave={setSetting}
            />
            <TextSettingRow
              icon="logo-usd"
              iconColor={theme.colors.warning}
              label="Inner Circle Monthly Stripe Price ID"
              settingKey="membership_inner_circle_monthly_price_id"
              value={settings['membership_inner_circle_monthly_price_id'] ?? ''}
              placeholder="price_..."
              onSave={setSetting}
            />
            <TextSettingRow
              icon="receipt-outline"
              iconColor={theme.colors.warning}
              label="Inner Circle Yearly Stripe Price ID"
              settingKey="membership_inner_circle_yearly_price_id"
              value={settings['membership_inner_circle_yearly_price_id'] ?? ''}
              placeholder="price_..."
              onSave={setSetting}
            />
            <TextSettingRow
              icon="pricetag-outline"
              iconColor={theme.colors.success}
              label="Connect Add-on Discount (%)"
              settingKey="membership_connect_addon_discount_pct"
              value={settings['membership_connect_addon_discount_pct'] ?? '5'}
              placeholder="5"
              numeric
              onSave={setSetting}
            />
            <TextSettingRow
              icon="pricetags-outline"
              iconColor={theme.colors.success}
              label="Inner Circle Add-on Discount (%)"
              settingKey="membership_inner_circle_addon_discount_pct"
              value={settings['membership_inner_circle_addon_discount_pct'] ?? '15'}
              placeholder="15"
              numeric
              onSave={setSetting}
            />
            <TextSettingRow
              icon="time-outline"
              iconColor={colors.purple}
              label="Connect Early Access (hours)"
              settingKey="membership_connect_early_access_hours"
              value={settings['membership_connect_early_access_hours'] ?? '12'}
              placeholder="12"
              numeric
              onSave={setSetting}
            />
            <TextSettingRow
              icon="time"
              iconColor={colors.pink}
              label="Inner Circle Early Access (hours)"
              settingKey="membership_inner_circle_early_access_hours"
              value={settings['membership_inner_circle_early_access_hours'] ?? '48'}
              placeholder="48"
              numeric
              onSave={setSetting}
            />
            <TextSettingRow
              icon="lock-closed-outline"
              iconColor={theme.colors.warning}
              label="General Event Release Delay (hours)"
              subtitle="How long newly published events stay in member-tier early access before general release"
              settingKey="membership_general_release_delay_hours"
              value={settings['membership_general_release_delay_hours'] ?? '48'}
              placeholder="48"
              numeric
              onSave={setSetting}
            />
          </View>

          <SectionHeader title="Member Management" />
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
            <ToggleRow
              icon="checkmark-circle-outline"
              iconColor={theme.colors.success}
              label="Auto-Approve Members"
              subtitle="Skip admin approval queue for new applications"
              value={isSetting('auto_approve_members')}
              settingKey="auto_approve_members"
              onToggle={() => toggleSetting('auto_approve_members')}
              saving={savingKeys.has('auto_approve_members')}
            />
            <ToggleRow
              icon="medical-outline"
              iconColor={colors.pink}
              label="Require Test Results"
              subtitle="Require STI test upload before attending an event"
              value={isSetting('require_test_results')}
              settingKey="require_test_results"
              onToggle={() => toggleSetting('require_test_results')}
              saving={savingKeys.has('require_test_results')}
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

          <SectionHeader title="Communications" />
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
            <TextSettingRow
              icon="mail-outline"
              iconColor={colors.purple}
              label="SendGrid From Name"
              subtitle="Display name on outgoing emails (e.g. 'Soapies Team')"
              settingKey="sendgrid_from_name"
              value={settings['sendgrid_from_name'] ?? ''}
              placeholder="Soapies Team"
              onSave={setSetting}
            />
            <ToggleRow
              icon="megaphone-outline"
              iconColor={theme.colors.warning}
              label="Push on New Event"
              subtitle="Send push notification when a new event is created"
              value={isSetting('notification_new_event')}
              settingKey="notification_new_event"
              onToggle={() => toggleSetting('notification_new_event')}
              saving={savingKeys.has('notification_new_event')}
            />
            <ToggleRow
              icon="alarm-outline"
              iconColor={theme.colors.warning}
              label="Event Reminders"
              subtitle="Send 24h reminder push notifications"
              value={isSetting('notification_reminders')}
              settingKey="notification_reminders"
              onToggle={() => toggleSetting('notification_reminders')}
              saving={savingKeys.has('notification_reminders')}
            />
          </View>

          {/* Danger Zone */}
          <View style={{ marginTop: 28, marginBottom: 8, marginHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="warning" size={16} color={theme.colors.danger} />
              <Text
                style={{
                  color: theme.colors.danger,
                  fontSize: 11,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                Danger Zone
              </Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>
              These actions are irreversible. Proceed with extreme caution.
            </Text>
          </View>
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.colors.dangerBorder,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.dangerBorder,
            }}
          >
            {/* Maintenance Mode */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.dangerSoft,
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: theme.alpha(theme.colors.danger, 0.2),
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: theme.alpha(theme.colors.danger, 0.2),
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Ionicons name="construct-outline" size={16} color={theme.colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.danger, fontSize: 15, fontWeight: '600' }}>
                  Maintenance Mode
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                  Takes the app offline for all users
                </Text>
              </View>
              {savingKeys.has('maintenance_mode') ? (
                <ActivityIndicator size="small" color={theme.colors.danger} />
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
                          {
                            text: 'Enable',
                            style: 'destructive',
                            onPress: () => toggleSetting('maintenance_mode'),
                          },
                        ]
                      );
                    } else {
                      toggleSetting('maintenance_mode');
                    }
                  }}
                  trackColor={{ false: colors.border, true: theme.colors.danger }}
                  thumbColor={colors.white}
                />
              )}
            </View>
            {/* Clear All Signals */}
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  'Clear All Signals?',
                  'This will permanently delete ALL member signal data (Pulse tab). This cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear All',
                      style: 'destructive',
                      onPress: () => clearSignalsMutation.mutate(),
                    },
                  ]
                )
              }
              disabled={clearSignalsMutation.isPending}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.dangerSoft,
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: theme.alpha(theme.colors.danger, 0.2),
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: theme.alpha(theme.colors.danger, 0.2),
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                {clearSignalsMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.danger} />
                ) : (
                  <Ionicons name="radio-button-off-outline" size={16} color={theme.colors.danger} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.danger, fontSize: 15, fontWeight: '600' }}>
                  Clear All Signals
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                  Delete all member_signals rows permanently
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.danger} />
            </TouchableOpacity>
            {/* Export Members */}
            <TouchableOpacity
              onPress={handleExport}
              disabled={exporting}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.dangerSoft,
                paddingVertical: 14,
                paddingHorizontal: 16,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: theme.alpha(theme.colors.danger, 0.2),
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color={theme.colors.danger} />
                ) : (
                  <Ionicons name="download-outline" size={16} color={theme.colors.danger} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.danger, fontSize: 15, fontWeight: '600' }}>
                  Export Member Data
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                  Download full member roster (CSV) — share via AirDrop, Files, email
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.danger} />
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
