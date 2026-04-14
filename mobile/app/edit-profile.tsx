import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
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

// FIX: Profile edit screen — was a dead no-op button in profile.tsx
// Uses changeRequests.submitProfile to request field changes (server workflow)

interface EditField {
  key: string;
  label: string;
  value: string;
  original: string;
  multiline?: boolean;
  placeholder: string;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { data: me, isLoading } = trpc.auth.me.useQuery();
  const submitChange = trpc.changeRequests.submitProfile.useMutation();

  const profile = me as any;

  const [fields, setFields] = useState<EditField[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFields([
      {
        key: 'displayName',
        label: 'Display Name',
        value: profile.displayName ?? profile.name ?? '',
        original: profile.displayName ?? profile.name ?? '',
        placeholder: 'Your display name',
      },
      {
        key: 'bio',
        label: 'Bio',
        value: profile.bio ?? '',
        original: profile.bio ?? '',
        multiline: true,
        placeholder: 'Tell the community a little about yourself...',
      },
      {
        key: 'instagramHandle',
        label: 'Instagram',
        value: profile.instagramHandle ?? '',
        original: profile.instagramHandle ?? '',
        placeholder: '@yourhandle',
      },
      {
        key: 'location',
        label: 'Location',
        value: profile.city ?? '',
        original: profile.city ?? '',
        placeholder: 'City, State',
      },
    ]);
  }, [profile]);

  const changedFields = fields.filter((f) => f.value.trim() !== f.original.trim());

  async function handleSave() {
    if (changedFields.length === 0) {
      router.back();
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await Promise.all(
        changedFields.map((field) =>
          submitChange.mutateAsync({
            fieldName: field.key,
            currentValue: field.original,
            requestedValue: field.value.trim(),
          }),
        ),
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Changes Submitted',
        'Your profile update request has been submitted for review.',
        [{ text: 'Got it', onPress: () => router.back() }],
      );
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', err?.message ?? 'Failed to submit changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function updateField(key: string, value: string) {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, value } : f)));
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.pink} size="large" />
      </SafeAreaView>
    );
  }

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
            style={({ pressed }) => ({
              marginRight: 12,
              opacity: pressed ? 0.6 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
          >
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700', flex: 1 }}>
            Edit Profile
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => ({
              opacity: saving || pressed ? 0.6 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
          >
            {saving ? (
              <ActivityIndicator color={colors.pink} size="small" />
            ) : (
              <Text
                style={{
                  color: changedFields.length > 0 ? colors.pink : colors.muted,
                  fontWeight: '700',
                  fontSize: 16,
                }}
              >
                Save
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar section */}
          <View style={{ alignItems: 'center', paddingVertical: 28 }}>
            <Avatar name={profile?.name ?? '?'} url={profile?.avatarUrl} size={80} />
            <Pressable
              onPress={() => Alert.alert('Coming soon', 'Photo upload coming in the next update.')}
              style={({ pressed }) => ({
                marginTop: 10,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: colors.pink, fontWeight: '600', fontSize: 14 }}>
                Change Photo
              </Text>
            </Pressable>
          </View>

          {/* Fields */}
          <View style={{ paddingHorizontal: 20, gap: 20 }}>
            {fields.map((field) => {
              const isDirty = field.value.trim() !== field.original.trim();
              return (
                <View key={field.key}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', flex: 1 }}>
                      {field.label.toUpperCase()}
                    </Text>
                    {isDirty && (
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: colors.pink,
                        }}
                      />
                    )}
                  </View>
                  <TextInput
                    value={field.value}
                    onChangeText={(v) => updateField(field.key, v)}
                    placeholder={field.placeholder}
                    placeholderTextColor="#6B7280"
                    multiline={field.multiline}
                    numberOfLines={field.multiline ? 4 : 1}
                    style={{
                      backgroundColor: colors.card,
                      borderWidth: 1,
                      borderColor: isDirty ? colors.pink : colors.border,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      color: '#FFFFFF',
                      fontSize: 15,
                      minHeight: field.multiline ? 100 : 48,
                      textAlignVertical: field.multiline ? 'top' : 'center',
                    }}
                  />
                </View>
              );
            })}

            {/* Info note */}
            <View
              style={{
                backgroundColor: `${colors.purple}15`,
                borderRadius: 12,
                padding: 14,
                flexDirection: 'row',
                gap: 10,
                alignItems: 'flex-start',
                marginTop: 4,
              }}
            >
              <Ionicons name="information-circle" size={18} color={colors.purple} style={{ marginTop: 1 }} />
              <Text style={{ color: '#C4B5FD', fontSize: 13, flex: 1, lineHeight: 19 }}>
                Profile changes are reviewed before going live to maintain community standards.
              </Text>
            </View>

            {/* Save button */}
            {changedFields.length > 0 && (
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={({ pressed }) => ({
                  marginTop: 8,
                  borderRadius: 14,
                  overflow: 'hidden',
                  opacity: saving ? 0.7 : pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
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
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                        Submit {changedFields.length} Change{changedFields.length > 1 ? 's' : ''}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
