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
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { trpc } from '../lib/trpc';
import { colors } from '../lib/colors';
import { uploadPhoto } from '../lib/uploadPhoto';
import Avatar from '../components/Avatar';
import { useToast } from '../components/Toast';

// ── Locked field for sensitive profile data ──────────────────────────────────
function LockedField({ label, value, onRequestChange }: { label: string; value: string; onRequestChange: () => void }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, borderColor: colors.border, borderWidth: 1, padding: 14 }}>
        <Text style={{ flex: 1, color: colors.text, fontSize: 15 }}>{value || 'Not set'}</Text>
        <Ionicons name="lock-closed" size={16} color={colors.muted} style={{ marginRight: 8 }} />
        <TouchableOpacity onPress={onRequestChange}>
          <Text style={{ color: colors.pink, fontSize: 12, fontWeight: '600' }}>Request Change</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function EditProfileScreen() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: profileData, isLoading } = trpc.profile.me.useQuery();
  const { data: meData } = trpc.auth.me.useQuery();

  const toast = useToast();

  const upsertMutation = trpc.profile.upsert.useMutation({
    onSuccess: async () => {
      // console.log('[EditProfile] profile upserted successfully');
      await utils.profile.me.invalidate();
      await utils.auth.me.invalidate();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success('Profile updated!');
      router.back();
    },
    onError: (err: any) => {
      console.error('[EditProfile] upsert error:', err.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error('Failed to save profile');
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
  const [isUploading, setIsUploading] = useState(false);

  async function handlePickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('photo', {
      uri: result.assets[0].uri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    } as any);
    try {
      const url = await uploadPhoto(result.assets[0].uri);
      // console.log('[EditProfile] uploaded URL:', url);
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

      // console.log('[EditProfile] saving:', JSON.stringify(payload));
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
    { label: 'DISPLAY NAME', value: displayName, setter: setDisplayName, placeholder: 'Your display name', multiline: false },
    { label: 'BIO', value: bio, setter: setBio, placeholder: 'Tell the community about yourself...', multiline: true },
    { label: 'LOCATION', value: location, setter: setLocation, placeholder: 'City, State', multiline: false },
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
            <TouchableOpacity onPress={handlePickAvatar} style={{ alignSelf: 'center' }}>
              <View style={{ width: 100, height: 100, borderRadius: 50, overflow: 'hidden', borderWidth: 2, borderColor: colors.pink }}>
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={{ width: 100, height: 100 }}
                    onError={() => {}}
                  />
                ) : (
                  <View style={{ flex: 1, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="person" size={40} color={colors.muted} />
                  </View>
                )}
              </View>
              <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.pink, borderRadius: 14, padding: 6 }}>
                {isUploading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={14} color="#fff" />}
              </View>
            </TouchableOpacity>
          </View>

          {/* Fields */}
          <View style={{ paddingHorizontal: 20, gap: 20 }}>
            {editableFields.map((field) => (
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

            {/* Locked sensitive fields */}
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
            <LockedField
              label="Orientation / Sexuality"
              value={orientation}
              onRequestChange={() => handleRequestChange('orientation')}
            />

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
