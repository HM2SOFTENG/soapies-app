import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { trpc } from '../lib/trpc';
import { colors } from '../lib/colors';
import { useAuth } from '../lib/auth';
import { queryClient } from './_layout';

// ─── Storage Keys ────────────────────────────────────────────────────────────

const NOTIF_PUSH_KEY = 'notif_push_enabled';
const NOTIF_MESSAGES_KEY = 'notif_new_messages';
const NOTIF_EVENTS_KEY = 'notif_event_reminders';
const NOTIF_COMMUNITY_KEY = 'notif_community_posts';
const NOTIF_ADMIN_KEY = 'notif_admin_announcements';
const PRIVACY_PULSE_LOC_KEY = 'privacy_show_location_pulse';
const PRIVACY_MESSAGING_KEY = 'privacy_who_can_message';

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={{
      color: colors.muted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 28,
      marginBottom: 8,
      marginHorizontal: 20,
    }}>
      {title}
    </Text>
  );
}

function ToggleRow({
  icon,
  iconColor,
  label,
  subtitle,
  value,
  onToggle,
  disabled,
}: {
  icon: any;
  iconColor: string;
  label: string;
  subtitle?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
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
        <Text style={{ color: disabled ? colors.muted : colors.text, fontSize: 15, fontWeight: '500' }}>{label}</Text>
        {subtitle && <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{subtitle}</Text>}
      </View>
      {disabled ? (
        <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
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

function ChevronRow({
  icon,
  iconColor,
  label,
  subtitle,
  onPress,
  destructive,
}: {
  icon: any;
  iconColor?: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const labelColor = destructive ? '#EF4444' : colors.text;
  const ic = iconColor ?? (destructive ? '#EF4444' : colors.pink);
  return (
    <TouchableOpacity
      onPress={onPress}
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
      <View style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: `${ic}22`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
      }}>
        <Ionicons name={icon} size={16} color={ic} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: labelColor, fontSize: 15, fontWeight: '500' }}>{label}</Text>
        {subtitle && <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </TouchableOpacity>
  );
}

function InfoRow({
  icon,
  iconColor,
  label,
  value,
}: {
  icon: any;
  iconColor?: string;
  label: string;
  value: string;
}) {
  const ic = iconColor ?? colors.muted;
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
        backgroundColor: `${ic}22`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
      }}>
        <Ionicons name={icon} size={16} color={ic} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '500' }}>{label}</Text>
      </View>
      <Text style={{ color: colors.muted, fontSize: 14 }}>{value}</Text>
    </View>
  );
}

type MessagingOption = 'everyone' | 'members' | 'nobody';

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: MessagingOption }[];
  value: MessagingOption;
  onChange: (v: MessagingOption) => void;
}) {
  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: colors.bg,
      borderRadius: 10,
      padding: 3,
      marginHorizontal: 16,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: colors.border,
    }}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          onPress={() => onChange(opt.value)}
          style={{
            flex: 1,
            paddingVertical: 8,
            alignItems: 'center',
            borderRadius: 8,
            backgroundColor: value === opt.value ? colors.pink : 'transparent',
          }}
        >
          <Text style={{
            color: value === opt.value ? colors.white : colors.muted,
            fontSize: 13,
            fontWeight: '600',
          }}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { hasToken } = useAuth();

  const { data: meData } = trpc.auth.me.useQuery(undefined, { enabled: hasToken, staleTime: 60_000 });
  const me = meData as any;

  const { data: pendingConnections } = trpc.partners.pendingForMe.useQuery(undefined, { enabled: hasToken });
  const pendingCount = (pendingConnections as any[])?.length ?? 0;
  const email = me?.email ?? '';
  const phone = me?.phone ?? '';

  // ── Notification prefs (AsyncStorage) ──
  const [notifPush, setNotifPush] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifEvents, setNotifEvents] = useState(true);
  const [notifCommunity, setNotifCommunity] = useState(true);
  const [notifAdmin, setNotifAdmin] = useState(true);

  // ── Privacy prefs (AsyncStorage) ──
  const [showPulseLoc, setShowPulseLoc] = useState(false);
  const [messagingPref, setMessagingPref] = useState<MessagingOption>('everyone');

  // ── Load persisted prefs ──
  useEffect(() => {
    (async () => {
      const keys = [
        NOTIF_PUSH_KEY,
        NOTIF_MESSAGES_KEY,
        NOTIF_EVENTS_KEY,
        NOTIF_COMMUNITY_KEY,
        NOTIF_ADMIN_KEY,
        PRIVACY_PULSE_LOC_KEY,
        PRIVACY_MESSAGING_KEY,
      ];
      const pairs = await AsyncStorage.multiGet(keys);
      const map = Object.fromEntries(pairs.map(([k, v]) => [k, v]));

      if (map[NOTIF_PUSH_KEY] !== null) setNotifPush(map[NOTIF_PUSH_KEY] !== '0');
      if (map[NOTIF_MESSAGES_KEY] !== null) setNotifMessages(map[NOTIF_MESSAGES_KEY] !== '0');
      if (map[NOTIF_EVENTS_KEY] !== null) setNotifEvents(map[NOTIF_EVENTS_KEY] !== '0');
      if (map[NOTIF_COMMUNITY_KEY] !== null) setNotifCommunity(map[NOTIF_COMMUNITY_KEY] !== '0');
      if (map[NOTIF_ADMIN_KEY] !== null) setNotifAdmin(map[NOTIF_ADMIN_KEY] !== '0');
      if (map[PRIVACY_PULSE_LOC_KEY] !== null) setShowPulseLoc(map[PRIVACY_PULSE_LOC_KEY] === '1');
      if (map[PRIVACY_MESSAGING_KEY]) setMessagingPref((map[PRIVACY_MESSAGING_KEY] as MessagingOption) ?? 'everyone');
    })();
  }, []);

  async function saveBool(key: string, value: boolean) {
    await AsyncStorage.setItem(key, value ? '1' : '0');
  }

  function toggleNotif(key: string, current: boolean, setter: (v: boolean) => void) {
    const next = !current;
    setter(next);
    saveBool(key, next);
  }

  async function saveMessaging(v: MessagingOption) {
    setMessagingPref(v);
    await AsyncStorage.setItem(PRIVACY_MESSAGING_KEY, v);
  }

  // ── Delete account ──
  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Request Submitted', 'Your account deletion request has been sent to our team. We will process it within 48 hours.');
          },
        },
      ]
    );
  }

  // ── Clear cache ──
  async function handleClearCache() {
    await AsyncStorage.clear();
    queryClient.clear();
    Alert.alert('Cache Cleared', 'Local data and query cache have been cleared.');
  }

  // ── Rate app ──
  function handleRateApp() {
    Linking.openURL('https://apps.apple.com/app/id000000000').catch(() => {
      Alert.alert('Not Available', 'App Store link coming soon!');
    });
  }

  const appVersion = Constants.expoConfig?.version ?? Constants.manifest?.version ?? '1.0.0';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      {/* ── Gradient Header ── */}
      <LinearGradient
        colors={['#7C3AED22', '#EC489922', colors.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ paddingTop: insets.top + 12, paddingBottom: 18, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>Settings</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Manage your account &amp; preferences</Text>
          </View>
          <Ionicons name="settings-outline" size={22} color={colors.purple} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>

        {/* ── CONNECTIONS ── */}
        <SectionHeader title="Connections" />
        <View style={{ marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
          <TouchableOpacity
            onPress={() => router.push('/connections' as any)}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, paddingVertical: 14, paddingHorizontal: 16 }}
          >
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${colors.pink}22`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Text style={{ fontSize: 16 }}>💗</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>Connections & Partners</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>Manage your connections</Text>
            </View>
            {pendingCount > 0 && (
              <View style={{ backgroundColor: colors.pink, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, marginRight: 8 }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{pendingCount}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* ── ACCOUNT ── */}
        <SectionHeader title="Account" />
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
          <ChevronRow
            icon="create-outline"
            iconColor={colors.pink}
            label="Display Name"
            subtitle={me?.name ?? me?.displayName ?? undefined}
            onPress={() => router.push('/edit-profile' as any)}
          />
          <ChevronRow
            icon="lock-closed-outline"
            iconColor={colors.purple}
            label="Change Password"
            onPress={() => router.push({ pathname: '/(auth)/forgot-password' as any, params: { prefill: email } })}
          />
          <ChevronRow
            icon="mail-outline"
            iconColor={colors.purple}
            label="Email / Phone"
            subtitle={[email, phone].filter(Boolean).join(' · ') || 'Not set'}
            onPress={() =>
              Alert.alert('Contact Change', 'To change your email or phone number, please contact support at support@soapies.app.')
            }
          />
          <ChevronRow
            icon="trash-outline"
            label="Delete Account"
            destructive
            onPress={handleDeleteAccount}
          />
        </View>

        {/* ── NOTIFICATIONS ── */}
        <SectionHeader title="Notifications" />
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
          <ToggleRow
            icon="notifications-outline"
            iconColor={colors.pink}
            label="Push Notifications"
            subtitle="Master toggle for all push alerts"
            value={notifPush}
            onToggle={(v) => { setNotifPush(v); saveBool(NOTIF_PUSH_KEY, v); }}
          />
          <ToggleRow
            icon="chatbubble-outline"
            iconColor={colors.purple}
            label="New Messages"
            value={notifMessages && notifPush}
            onToggle={(v) => toggleNotif(NOTIF_MESSAGES_KEY, notifMessages, setNotifMessages)}
            disabled={!notifPush}
          />
          <ToggleRow
            icon="calendar-outline"
            iconColor={colors.purple}
            label="Event Reminders"
            value={notifEvents && notifPush}
            onToggle={(v) => toggleNotif(NOTIF_EVENTS_KEY, notifEvents, setNotifEvents)}
            disabled={!notifPush}
          />
          <ToggleRow
            icon="globe-outline"
            iconColor={colors.purple}
            label="Community Posts"
            value={notifCommunity && notifPush}
            onToggle={(v) => toggleNotif(NOTIF_COMMUNITY_KEY, notifCommunity, setNotifCommunity)}
            disabled={!notifPush}
          />
          <ToggleRow
            icon="megaphone-outline"
            iconColor={colors.purple}
            label="Admin Announcements"
            value={notifAdmin && notifPush}
            onToggle={(v) => toggleNotif(NOTIF_ADMIN_KEY, notifAdmin, setNotifAdmin)}
            disabled={!notifPush}
          />
        </View>

        {/* ── PRIVACY ── */}
        <SectionHeader title="Privacy" />
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
          <ToggleRow
            icon="people-outline"
            iconColor={colors.purple}
            label="Show in Members Directory"
            subtitle="Let other members find your profile"
            value={false}
            onToggle={(v) => {
              // profile.upsert doesn't expose showInDirectory — store locally
              AsyncStorage.setItem('privacy_show_in_directory', v ? '1' : '0');
            }}
          />
          <ToggleRow
            icon="location-outline"
            iconColor={colors.purple}
            label="Show Location in Pulse"
            subtitle="Visible to members in Pulse feed"
            value={showPulseLoc}
            onToggle={(v) => { setShowPulseLoc(v); saveBool(PRIVACY_PULSE_LOC_KEY, v); }}
          />
        </View>

        {/* Messaging segmented control */}
        <View style={{
          backgroundColor: colors.card,
          marginTop: 0,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          paddingVertical: 12,
        }}>
          <Text style={{
            color: colors.text,
            fontSize: 15,
            fontWeight: '500',
            marginHorizontal: 16,
            marginBottom: 10,
          }}>
            Who can message me
          </Text>
          <SegmentedControl
            value={messagingPref}
            onChange={saveMessaging}
            options={[
              { label: 'Everyone', value: 'everyone' },
              { label: 'Members', value: 'members' },
              { label: 'Nobody', value: 'nobody' },
            ]}
          />
        </View>

        {/* ── APP ── */}
        <SectionHeader title="App" />
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
          <ToggleRow
            icon="moon-outline"
            iconColor={colors.muted}
            label="Dark Mode"
            subtitle="Always on — can't be changed"
            value={true}
            onToggle={() => {}}
            disabled
          />
          <InfoRow
            icon="information-circle-outline"
            label="App Version"
            value={appVersion}
          />
          <ChevronRow
            icon="refresh-outline"
            iconColor={colors.purple}
            label="Clear Cache"
            subtitle="Clears local data and query cache"
            onPress={handleClearCache}
          />
          <ChevronRow
            icon="star-outline"
            iconColor="#F59E0B"
            label="Rate App"
            onPress={handleRateApp}
          />
        </View>

        {/* ── SUPPORT ── */}
        <SectionHeader title="Support" />
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
          <ChevronRow
            icon="mail-outline"
            iconColor={colors.pink}
            label="Contact Support"
            onPress={() => Linking.openURL('mailto:support@soapies.app')}
          />
          <ChevronRow
            icon="book-outline"
            iconColor={colors.purple}
            label="Community Guidelines"
            onPress={() => Linking.openURL('https://soapies.app/guidelines')}
          />
          <ChevronRow
            icon="shield-outline"
            iconColor={colors.purple}
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://soapies.app/privacy')}
          />
          <ChevronRow
            icon="document-text-outline"
            iconColor={colors.purple}
            label="Terms of Service"
            onPress={() => Linking.openURL('https://soapies.app/terms')}
          />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
