import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { trpc } from '../lib/trpc';
import { colors } from '../lib/colors';
import { uploadPhoto } from '../lib/uploadPhoto';
import { useToast } from '../components/Toast';
import { useTheme } from '../lib/theme';

// ── Locked field for sensitive profile data ──────────────────────────────────
function LockedField({ label, value, onRequestChange }: { label: string; value: string; onRequestChange: () => void }) {
  const theme = useTheme();
  const t = { muted: theme.colors.textMuted, input: theme.colors.input, border: theme.colors.border };
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{
        color: t.muted,
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 6,
      }}>
        {label}
      </Text>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: t.input,
        borderRadius: 14,
        borderColor: t.border,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 13,
      }}>
        <Text style={{ flex: 1, color: t.muted, fontSize: 15 }}>{value || 'Not set'}</Text>
        <Ionicons name="lock-closed" size={16} color={t.muted} style={{ marginRight: 10 }} />
        <TouchableOpacity onPress={onRequestChange}>
          <Text style={{ color: colors.pink, fontSize: 12, fontWeight: '600' }}>Request Change</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const utils = trpc.useUtils();
  const theme = useTheme();
  const t = {
    page: theme.colors.background,
    elevated: theme.colors.floating,
    surface: theme.colors.card,
    border: theme.colors.border,
    text: theme.colors.text,
    subtext: theme.colors.textSecondary,
    muted: theme.colors.textMuted,
    headerGradient: theme.gradients.screen,
    input: theme.colors.input,
    focus: theme.colors.focusRing,
  };

  const { data: profileData, isLoading, isError: profileIsError, error: profileError, refetch: refetchProfile } = trpc.profile.me.useQuery();
  const { data: meData, isError: meIsError, error: meError, refetch: refetchMe } = trpc.auth.me.useQuery();

  const toast = useToast();

  const upsertMutation = trpc.profile.upsert.useMutation({
    onSuccess: async () => {
      await utils.profile.me.invalidate();
      await utils.auth.me.invalidate();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success('Profile updated!');
      router.back();
    },
    onError: (err: any) => {
      if (__DEV__) console.error('[EditProfile] upsert error:', err.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error('Failed to save profile');
    },
  });

  const profile = profileData as any;
  const me = meData as any;
  const loadError = profileIsError || meIsError;
  const loadErrorMessage = (profileError as any)?.message ?? (meError as any)?.message;

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [gender, setGender] = useState('');
  const [orientation, setOrientation] = useState('');
  const [location, setLocation] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (!profile && !me) return;
    const p = profile ?? {};
    const m = me ?? {};
    setDisplayName(p.displayName ?? m.displayName ?? m.name ?? '');
    setBio(p.bio ?? m.bio ?? '');
    setAvatarUrl(p.avatarUrl ?? m.avatarUrl ?? '');
    setGender(p.gender ?? '');
    setOrientation(p.orientation ?? '');
    setLocation(p.location ?? p.city ?? '');
    if (p.dateOfBirth) {
      try {
        setDateOfBirth(new Date(p.dateOfBirth).toISOString().split('T')[0]);
      } catch {
        setDateOfBirth('');
      }
    }
  }, [profile, me]);

  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  async function handlePickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    setIsUploading(true);
    try {
      const url = await uploadPhoto(result.assets[0].uri);
      setAvatarUrl(url);
      toast.success('Photo updated!');
    } catch {
      toast.error('Photo upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const payload: any = {};
      if (displayName.trim()) payload.displayName = displayName.trim();
      if (bio.trim() !== undefined) payload.bio = bio.trim();
      if (avatarUrl.trim()) payload.avatarUrl = avatarUrl.trim();
      if (gender.trim()) payload.gender = gender.trim();
      if (orientation.trim()) payload.orientation = orientation.trim();
      if (location.trim()) payload.location = location.trim();
      if (dateOfBirth.trim()) payload.dateOfBirth = dateOfBirth.trim();
      await upsertMutation.mutateAsync(payload);
    } catch (err: any) {
      // error handled in onError
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.page, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.pink} size="large" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.page, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }}>
        <Ionicons name="cloud-offline-outline" size={42} color={t.muted} />
        <Text style={{ color: t.text, fontSize: 20, fontWeight: '800', textAlign: 'center', marginTop: 14 }}>Could not load your profile</Text>
        <Text style={{ color: t.subtext, fontSize: 14, textAlign: 'center', lineHeight: 21, marginTop: 8 }}>{loadErrorMessage ?? 'Please try again in a moment.'}</Text>
        <TouchableOpacity onPress={() => { refetchProfile(); refetchMe(); }} style={{ marginTop: 18, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }}>
          <Text style={{ color: t.text, fontWeight: '800' }}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  function handleRequestChange(field: string) {
    Alert.alert(
      'Request Change',
      `To change your ${field}, please contact an admin. Changes to sensitive profile fields require admin approval to maintain community integrity.`,
      [
        { text: 'OK' },
        { text: 'Message Admin', onPress: () => router.push('/messages' as any) },
      ]
    );
  }

  const editableFields = [
    { label: 'DISPLAY NAME', value: displayName, setter: setDisplayName, placeholder: 'Your display name', multiline: false, maxLen: 50 },
    { label: 'BIO', value: bio, setter: setBio, placeholder: 'Tell the community about yourself...', multiline: true, maxLen: 200 },
    { label: 'LOCATION', value: location, setter: setLocation, placeholder: 'City, State', multiline: false, maxLen: 80 },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.page }} edges={['bottom']}>
      {/* ── Gradient Header ── */}
      <LinearGradient
        colors={t.headerGradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ paddingTop: insets.top + 12, paddingBottom: 16, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: t.surface,
              borderWidth: 1,
              borderColor: t.border,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="chevron-back" size={22} color={t.text} />
          </Pressable>
          <Text style={{ color: t.text, fontSize: 24, fontWeight: '900', flex: 1 }}>Edit Profile ✏️</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Avatar section ── */}
          <View style={{ alignItems: 'center', paddingVertical: 28 }}>
            <View style={{ position: 'relative' }}>
              {/* Glow ring */}
              <View style={{
                width: 106,
                height: 106,
                borderRadius: 53,
                borderWidth: 3,
                borderColor: '#EC4899',
                shadowColor: '#EC4899',
                shadowOpacity: 0.4,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 0 },
                overflow: 'hidden',
              }}>
                <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.85} style={{ flex: 1 }}>
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={{ width: 100, height: 100 }}
                      onError={() => {}}
                    />
                  ) : (
                    <View style={{ flex: 1, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="person" size={40} color={t.muted} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              {/* Edit overlay button */}
              <TouchableOpacity
                onPress={handlePickAvatar}
                style={{ position: 'absolute', bottom: 0, right: 0 }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#EC4899', '#A855F7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isUploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={18} color="#fff" />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Personal Info Section Card ── */}
          <View style={{
            backgroundColor: t.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: t.border,
            padding: 16,
            marginHorizontal: 16,
            marginBottom: 12,
          }}>
            {editableFields.map((field, idx) => (
              <View key={field.label} style={{ marginBottom: idx === editableFields.length - 1 ? 0 : 18 }}>
                <Text style={{
                  color: t.muted,
                  fontSize: 11,
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  marginBottom: 6,
                }}>
                  {field.label}
                </Text>
                <TextInput
                  value={field.value}
                  onChangeText={(v) => field.setter(field.multiline ? v.slice(0, field.maxLen) : v)}
                  placeholder={field.placeholder}
                  placeholderTextColor={t.muted}
                  multiline={field.multiline}
                  numberOfLines={field.multiline ? 4 : 1}
                  onFocus={() => setFocusedField(field.label)}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    backgroundColor: t.input,
                    borderWidth: 1,
                    borderColor: focusedField === field.label ? t.focus : t.border,
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 13,
                    color: t.text,
                    fontSize: 15,
                    minHeight: field.multiline ? 100 : undefined,
                    textAlignVertical: field.multiline ? 'top' : 'center',
                  }}
                />
                {field.multiline && (
                  <Text style={{ color: t.muted, fontSize: 11, textAlign: 'right', marginTop: 4 }}>
                    {field.value.length}/{field.maxLen}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* ── Sensitive Fields Section Card ── */}
          <View style={{
            backgroundColor: t.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: t.border,
            padding: 16,
            marginHorizontal: 16,
            marginBottom: 20,
          }}>
            <LockedField
              label="Date of Birth"
              value={dateOfBirth}
              onRequestChange={() => handleRequestChange('date of birth')}
            />
            <LockedField
              label="Gender"
              value={gender}
              onRequestChange={() => handleRequestChange('gender')}
            />
            <View style={{ marginBottom: 0 }}>
              <LockedField
                label="Orientation / Sexuality"
                value={orientation}
                onRequestChange={() => handleRequestChange('orientation')}
              />
            </View>
          </View>

          {/* ── Save button ── */}
          <View style={{ marginHorizontal: 16 }}>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => ({
                borderRadius: 18,
                overflow: 'hidden',
                opacity: saving ? 0.7 : pressed ? 0.9 : 1,
                shadowColor: '#EC4899',
                shadowOpacity: 0.35,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
              })}
            >
              <LinearGradient
                colors={['#EC4899', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 16,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                  borderRadius: 18,
                }}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Save Profile</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
