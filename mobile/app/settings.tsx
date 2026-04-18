import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
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
      color: '#5A5575',
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginTop: 20,
      marginBottom: 8,
      paddingHorizontal: 20,
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
      backgroundColor: '#10101C',
      borderWidth: 1,
      borderColor: '#1A1A30',
      borderRadius: 14,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 8,
    }}>
      <View style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: disabled ? '#5A557533' : `${iconColor}33`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
      }}>
        <Ionicons name={icon} size={18} color={disabled ? '#5A5575' : iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: disabled ? '#5A5575' : '#F1F0FF', fontSize: 15, fontWeight: '600' }}>{label}</Text>
        {subtitle && <Text style={{ color: '#5A5575', fontSize: 12, marginTop: 2 }}>{subtitle}</Text>}
      </View>
      {disabled ? (
        <Ionicons name="lock-closed-outline" size={18} color="#5A5575" />
      ) : (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#1A1A30', true: '#EC4899' }}
          thumbColor="#fff"
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
  const labelColor = destructive ? '#EF4444' : '#F1F0FF';
  const ic = iconColor ?? (destructive ? '#EF4444' : colors.pink);
  const bgColor = destructive ? '#EF444410' : '#10101C';
  const borderColor = destructive ? '#EF444420' : '#1A1A30';
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: bgColor,
        borderWidth: 1,
        borderColor: borderColor,
        borderRadius: 14,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 8,
      }}
    >
      <View style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: destructive ? '#EF444420' : `${ic}33`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
      }}>
        <Ionicons name={icon} size={18} color={ic} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: labelColor, fontSize: 15, fontWeight: '600' }}>{label}</Text>
        {subtitle && <Text style={{ color: '#5A5575', fontSize: 12, marginTop: 2 }}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#5A5575" />
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
  const ic = iconColor ?? '#5A5575';
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#10101C',
      borderWidth: 1,
      borderColor: '#1A1A30',
      borderRadius: 14,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 8,
    }}>
      <View style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: `${ic}33`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
      }}>
        <Ionicons name={icon} size={18} color={ic} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#F1F0FF', fontSize: 15, fontWeight: '600' }}>{label}</Text>
      </View>
      <Text style={{ color: '#5A5575', fontSize: 14 }}>{value}</Text>
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
      backgroundColor: '#0C0C1A',
      borderRadius: 10,
      padding: 3,
      marginHorizontal: 16,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: '#1A1A30',
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
            backgroundColor: value === opt.value ? '#EC4899' : 'transparent',
          }}
        >
          <Text style={{
            color: value === opt.value ? '#fff' : '#5A5575',
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
  const deleteMeMutation = trpc.auth.deleteMe.useMutation({
    onSuccess: async () => {
      await AsyncStorage.clear();
      queryClient.clear();
      logout();
      router.replace('/(auth)/login' as any);
    },
    onError: (e: any) => Alert.alert('Error', e.message ?? 'Could not delete account. Please contact support.'),
  });

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, profile, posts, and all associated data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Are you absolutely sure?',
              'Your account and all data will be deleted immediately.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Yes, Delete', style: 'destructive', onPress: () => deleteMeMutation.mutate() },
              ]
            );
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

  // ── Rate app (update APP_STORE_ID before App Store submission) ──
  const APP_STORE_ID = ''; // TODO: fill in after App Store Connect listing is created
  function handleRateApp() {
    if (!APP_STORE_ID) {
      Alert.alert('Coming Soon', 'Rating will be available when the app launches on the App Store.');
      return;
    }
    Linking.openURL(`https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`).catch(() => {
      Alert.alert('Could not open App Store', 'Please find Soapies on the App Store to leave a review.');
    });
  }

  const appVersion = Constants.expoConfig?.version ?? (Constants.manifest as any)?.version ?? '1.0.0';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080810' }} edges={['bottom']}>
      {/* ── Gradient Header ── */}
      <LinearGradient
        colors={['#12051E', '#080810']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ paddingTop: insets.top + 12, paddingBottom: 18, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#10101C',
              borderWidth: 1,
              borderColor: '#1A1A30',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#F1F0FF" />
          </TouchableOpacity>
          <Text style={{ color: '#F1F0FF', fontSize: 24, fontWeight: '900', flex: 1 }}>Settings ⚙️</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── CONNECTIONS ── */}
        <SectionHeader title="Connections" />
        <TouchableOpacity
          onPress={() => router.push('/connections' as any)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#10101C',
            borderWidth: 1,
            borderColor: '#1A1A30',
            borderRadius: 14,
            padding: 16,
            marginHorizontal: 16,
            marginBottom: 8,
          }}
        >
          <View style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: `${colors.pink}33`,
            alignItems: 'center', justifyContent: 'center', marginRight: 12,
          }}>
            <Text style={{ fontSize: 18 }}>💗</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#F1F0FF', fontWeight: '600', fontSize: 15 }}>Connections & Partners</Text>
            <Text style={{ color: '#5A5575', fontSize: 12, marginTop: 1 }}>Manage your connections</Text>
          </View>
          {pendingCount > 0 && (
            <View style={{
              backgroundColor: colors.pink, borderRadius: 10,
              minWidth: 20, height: 20,
              alignItems: 'center', justifyContent: 'center',
              paddingHorizontal: 5, marginRight: 8,
            }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{pendingCount}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color="#5A5575" />
        </TouchableOpacity>

        {/* ── ACCOUNT ── */}
        <SectionHeader title="Account" />
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

        {/* ── NOTIFICATIONS ── */}
        <SectionHeader title="Notifications" />
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
          onToggle={() => toggleNotif(NOTIF_MESSAGES_KEY, notifMessages, setNotifMessages)}
          disabled={!notifPush}
        />
        <ToggleRow
          icon="calendar-outline"
          iconColor={colors.purple}
          label="Event Reminders"
          value={notifEvents && notifPush}
          onToggle={() => toggleNotif(NOTIF_EVENTS_KEY, notifEvents, setNotifEvents)}
          disabled={!notifPush}
        />
        <ToggleRow
          icon="globe-outline"
          iconColor={colors.purple}
          label="Community Posts"
          value={notifCommunity && notifPush}
          onToggle={() => toggleNotif(NOTIF_COMMUNITY_KEY, notifCommunity, setNotifCommunity)}
          disabled={!notifPush}
        />
        <ToggleRow
          icon="megaphone-outline"
          iconColor={colors.purple}
          label="Admin Announcements"
          value={notifAdmin && notifPush}
          onToggle={() => toggleNotif(NOTIF_ADMIN_KEY, notifAdmin, setNotifAdmin)}
          disabled={!notifPush}
        />

        {/* ── PRIVACY ── */}
        <SectionHeader title="Privacy" />
        <ToggleRow
          icon="people-outline"
          iconColor={colors.purple}
          label="Show in Members Directory"
          subtitle="Let other members find your profile"
          value={false}
          onToggle={(v) => {
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

        {/* Messaging segmented control */}
        <View style={{
          backgroundColor: '#10101C',
          borderWidth: 1,
          borderColor: '#1A1A30',
          borderRadius: 14,
          paddingVertical: 14,
          marginHorizontal: 16,
          marginBottom: 8,
        }}>
          <Text style={{
            color: '#F1F0FF',
            fontSize: 15,
            fontWeight: '600',
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
        <ToggleRow
          icon="moon-outline"
          iconColor="#5A5575"
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
        {APP_STORE_ID ? (
          <ChevronRow
            icon="star-outline"
            iconColor="#F59E0B"
            label="Rate App"
            onPress={handleRateApp}
          />
        ) : null}

        {/* ── SUPPORT ── */}
        <SectionHeader title="Support" />
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

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
