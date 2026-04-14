import { SafeAreaView } from 'react-native-safe-area-context';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { trpc } from '../lib/trpc';
import { colors } from '../lib/colors';
import Avatar from '../components/Avatar';

export default function EditProfileScreen() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: profileData, isLoading } = trpc.profile.me.useQuery();
  const { data: meData } = trpc.auth.me.useQuery();

  const upsertMutation = trpc.profile.upsert.useMutation({
    onSuccess: async () => {
      console.log('[EditProfile] profile upserted successfully');
      await utils.profile.me.invalidate();
      await utils.auth.me.invalidate();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Profile Updated', 'Your profile has been saved.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    },
    onError: (err) => {
      console.error('[EditProfile] upsert error:', err.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', err.message ?? 'Failed to save profile. Please try again.');
    },
  });

  const profile = profileData as any;
  const me = meData as any;

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [gender, setGender] = useState('');
  const [orientation, setOrientation] = useState('');
  const [location, setLocation] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

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

      console.log('[EditProfile] saving:', JSON.stringify(payload));
      await upsertMutation.mutateAsync(payload);
    } catch (err: any) {
      // error handled in onError
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.pink} size="large" />
      </SafeAreaView>
    );
  }

  const fields = [
    { label: 'DISPLAY NAME', value: displayName, setter: setDisplayName, placeholder: 'Your display name', multiline: false },
    { label: 'BIO', value: bio, setter: setBio, placeholder: 'Tell the community about yourself...', multiline: true },
    { label: 'AVATAR URL', value: avatarUrl, setter: setAvatarUrl, placeholder: 'https://...', multiline: false },
    { label: 'GENDER', value: gender, setter: setGender, placeholder: 'e.g. Female, Male, Non-binary', multiline: false },
    { label: 'ORIENTATION', value: orientation, setter: setOrientation, placeholder: 'e.g. Bisexual, Straight, Queer', multiline: false },
    { label: 'LOCATION', value: location, setter: setLocation, placeholder: 'City, State', multiline: false },
    { label: 'DATE OF BIRTH (YYYY-MM-DD)', value: dateOfBirth, setter: setDateOfBirth, placeholder: '1990-01-15', multiline: false },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
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
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({ marginRight: 12, opacity: pressed ? 0.6 : 1 })}
          >
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', flex: 1 }}>
            Edit Profile
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => ({ opacity: saving || pressed ? 0.6 : 1 })}
          >
            {saving ? (
              <ActivityIndicator color={colors.pink} size="small" />
            ) : (
              <Text style={{ color: colors.pink, fontWeight: '700', fontSize: 16 }}>Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar section */}
          <View style={{ alignItems: 'center', paddingVertical: 28 }}>
            <Avatar
              name={(me as any)?.name ?? '?'}
              url={avatarUrl || (me as any)?.avatarUrl}
              size={80}
            />
          </View>

          {/* Fields */}
          <View style={{ paddingHorizontal: 20, gap: 20 }}>
            {fields.map((field) => (
              <View key={field.label}>
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                  {field.label}
                </Text>
                <TextInput
                  value={field.value}
                  onChangeText={field.setter}
                  placeholder={field.placeholder}
                  placeholderTextColor="#6B7280"
                  multiline={field.multiline}
                  numberOfLines={field.multiline ? 4 : 1}
                  style={{
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    color: colors.text,
                    fontSize: 15,
                    minHeight: field.multiline ? 100 : 48,
                    textAlignVertical: field.multiline ? 'top' : 'center',
                  }}
                />
              </View>
            ))}

            {/* Save button */}
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => ({
                marginTop: 8,
                borderRadius: 14,
                overflow: 'hidden',
                opacity: saving ? 0.7 : pressed ? 0.9 : 1,
              })}
            >
              <LinearGradient
                colors={[colors.pink, colors.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 16,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Save Profile</Text>
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
