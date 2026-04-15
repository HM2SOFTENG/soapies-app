import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { trpc } from '../lib/trpc';
import { colors } from '../lib/colors';
import { useAuth } from '../lib/auth';

const STEPS = ['Photo', 'About', 'Identity', 'Location'];

const GENDER_OPTIONS = ['Male', 'Female', 'Non-Binary', 'Trans Male', 'Trans Female', 'Other'];
const ORIENTATION_OPTIONS = ['Straight', 'Gay', 'Lesbian', 'Bisexual', 'Pansexual', 'Queer', 'Other'];

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://soapies-app-3uk2q.ondigitalocean.app';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState(0);

  // Step 1 — Photo
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Step 2 — About
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Step 3 — Identity
  const [gender, setGender] = useState('');
  const [orientation, setOrientation] = useState('');

  // Step 4 — Location
  const [location, setLocation] = useState('');

  const upsertMutation = trpc.profile.upsert.useMutation({
    onSuccess: async () => {
      try {
        await completeSetupMutation.mutateAsync({});
      } catch {
        // Even if this fails, proceed to tabs
      }
      router.replace('/(tabs)');
    },
    onError: (e) => Alert.alert('Error', e.message),
  });

  const completeSetupMutation = trpc.profile.completeProfileSetup.useMutation();

  async function handlePickPhoto() {
    Alert.alert('Profile Photo', 'Choose a photo', [
      { text: 'Camera', onPress: () => pickPhoto('camera') },
      { text: 'Library', onPress: () => pickPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function pickPhoto(source: 'camera' | 'library') {
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });

    if (result.canceled) return;

    setIsUploading(true);
    const asset = result.assets[0];
    const formData = new FormData();
    formData.append('photo', { uri: asset.uri, type: 'image/jpeg', name: 'avatar.jpg' } as any);

    try {
      const res = await fetch(`${API_URL}/api/upload-photo`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      setAvatarUrl(url);
    } catch (e) {
      Alert.alert('Upload Failed', 'Could not upload photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }

  function validateCurrentStep(): boolean {
    if (step === 0) {
      if (!avatarUrl) {
        Alert.alert('Photo Required', 'Please add a profile photo to continue.');
        return false;
      }
    } else if (step === 1) {
      if (!displayName.trim()) {
        Alert.alert('Name Required', 'Please enter your display name.');
        return false;
      }
    } else if (step === 2) {
      if (!gender) {
        Alert.alert('Gender Required', 'Please select your gender.');
        return false;
      }
      if (!orientation) {
        Alert.alert('Orientation Required', 'Please select your orientation.');
        return false;
      }
    }
    return true;
  }

  function handleNext() {
    if (!validateCurrentStep()) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  }

  function handleFinish() {
    if (!avatarUrl) { Alert.alert('Photo Required', 'Please add a profile photo.'); return; }
    if (!displayName.trim()) { Alert.alert('Name Required', 'Please add your display name.'); return; }
    if (!gender) { Alert.alert('Gender Required', 'Please select your gender.'); return; }
    if (!orientation) { Alert.alert('Orientation Required', 'Please select your orientation.'); return; }

    upsertMutation.mutate({
      displayName: displayName.trim(),
      bio: bio.trim() || undefined,
      avatarUrl,
      gender: gender.toLowerCase(),
      orientation: orientation.toLowerCase(),
      location: location.trim() || undefined,
      dateOfBirth: dateOfBirth || undefined,
    });
  }

  const isLastStep = step === STEPS.length - 1;
  const isBusy = isUploading || upsertMutation.isPending;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => step > 0 ? setStep(step - 1) : undefined}
          disabled={step === 0}
          style={{ width: 36, alignItems: 'flex-start' }}
        >
          {step > 0 && <Ionicons name="chevron-back" size={26} color={colors.text} />}
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.stepTitle}>{STEPS[step]}</Text>
          <View style={styles.dotsRow}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === step ? styles.dotActive : i < step ? styles.dotDone : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        </View>

        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {step === 0 && <StepPhoto avatarUrl={avatarUrl} isUploading={isUploading} onPickPhoto={handlePickPhoto} />}
        {step === 1 && (
          <StepAbout
            displayName={displayName} setDisplayName={setDisplayName}
            bio={bio} setBio={setBio}
            dateOfBirth={dateOfBirth} setDateOfBirth={setDateOfBirth}
          />
        )}
        {step === 2 && (
          <StepIdentity
            gender={gender} setGender={setGender}
            orientation={orientation} setOrientation={setOrientation}
          />
        )}
        {step === 3 && <StepLocation location={location} setLocation={setLocation} />}
      </ScrollView>

      {/* Footer button */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleNext}
          disabled={isBusy || (step === 0 && !avatarUrl)}
          activeOpacity={0.85}
          style={{ borderRadius: 14, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={[colors.pink, colors.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.nextBtn,
              (isBusy || (step === 0 && !avatarUrl)) && { opacity: 0.5 },
            ]}
          >
            {isBusy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.nextBtnText}>{isLastStep ? 'Finish' : 'Next'}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {isLastStep && (
          <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={{ color: colors.muted, fontSize: 14 }}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Step Components ──────────────────────────────────────────────────────────

function StepPhoto({
  avatarUrl,
  isUploading,
  onPickPhoto,
}: {
  avatarUrl: string;
  isUploading: boolean;
  onPickPhoto: () => void;
}) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeading}>Add a profile photo</Text>
      <Text style={styles.stepSubheading}>Help the community recognise you</Text>

      <TouchableOpacity onPress={onPickPhoto} style={{ alignSelf: 'center', marginTop: 32 }}>
        <View style={styles.avatarCircle}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={52} color={colors.muted} />
            </View>
          )}
        </View>
        <View style={styles.cameraOverlay}>
          {isUploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="camera" size={16} color="#fff" />
          )}
        </View>
      </TouchableOpacity>

      {!avatarUrl && (
        <Text style={{ color: colors.muted, marginTop: 16, textAlign: 'center', fontSize: 13 }}>
          Tap to upload a photo
        </Text>
      )}
      {avatarUrl && !isUploading && (
        <Text style={{ color: '#34D399', marginTop: 16, textAlign: 'center', fontSize: 13 }}>
          ✓ Photo uploaded successfully
        </Text>
      )}
    </View>
  );
}

function StepAbout({
  displayName, setDisplayName,
  bio, setBio,
  dateOfBirth, setDateOfBirth,
}: {
  displayName: string; setDisplayName: (v: string) => void;
  bio: string; setBio: (v: string) => void;
  dateOfBirth: string; setDateOfBirth: (v: string) => void;
}) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeading}>About You</Text>
      <Text style={styles.stepSubheading}>Tell the community a little about yourself</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>DISPLAY NAME *</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your display name"
          placeholderTextColor="#6B7280"
          style={styles.input}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>BIO <Text style={{ color: colors.muted }}>{bio.length}/200</Text></Text>
        <TextInput
          value={bio}
          onChangeText={(v) => setBio(v.slice(0, 200))}
          placeholder="Tell the community about yourself..."
          placeholderTextColor="#6B7280"
          multiline
          numberOfLines={3}
          maxLength={200}
          style={[styles.input, { minHeight: 88, textAlignVertical: 'top' }]}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>DATE OF BIRTH</Text>
        <TextInput
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          placeholder="MM/DD/YYYY"
          placeholderTextColor="#6B7280"
          keyboardType="numbers-and-punctuation"
          style={styles.input}
        />
      </View>
    </View>
  );
}

function StepIdentity({
  gender, setGender,
  orientation, setOrientation,
}: {
  gender: string; setGender: (v: string) => void;
  orientation: string; setOrientation: (v: string) => void;
}) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeading}>Identity</Text>
      <Text style={styles.stepSubheading}>Help us personalise your experience</Text>

      <Text style={[styles.fieldLabel, { marginTop: 24, marginBottom: 10 }]}>GENDER *</Text>
      <PillGrid options={GENDER_OPTIONS} selected={gender} onSelect={setGender} />

      <Text style={[styles.fieldLabel, { marginTop: 24, marginBottom: 10 }]}>ORIENTATION *</Text>
      <PillGrid options={ORIENTATION_OPTIONS} selected={orientation} onSelect={setOrientation} />
    </View>
  );
}

function StepLocation({
  location,
  setLocation,
}: {
  location: string;
  setLocation: (v: string) => void;
}) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeading}>Location</Text>
      <Text style={styles.stepSubheading}>Optional — helps you find nearby members</Text>

      <View style={[styles.fieldGroup, { marginTop: 32 }]}>
        <Text style={styles.fieldLabel}>CITY, STATE</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Los Angeles, CA"
          placeholderTextColor="#6B7280"
          style={styles.input}
        />
      </View>
    </View>
  );
}

function PillGrid({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={styles.pillGrid}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          onPress={() => onSelect(opt)}
          activeOpacity={0.75}
          style={[
            styles.pill,
            selected === opt && styles.pillSelected,
          ]}
        >
          <Text style={[styles.pillText, selected === opt && styles.pillTextSelected]}>
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: colors.pink,
    width: 20,
  },
  dotDone: {
    backgroundColor: colors.purple,
  },
  dotInactive: {
    backgroundColor: colors.border,
  },
  body: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nextBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  nextBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  stepContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  stepHeading: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  stepSubheading: {
    color: colors.muted,
    fontSize: 15,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.pink,
  },
  avatarImage: {
    width: 120,
    height: 120,
  },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: colors.pink,
    borderRadius: 16,
    padding: 7,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    minHeight: 48,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    minWidth: '30%',
    alignItems: 'center',
  },
  pillSelected: {
    borderColor: colors.pink,
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
  },
  pillText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '500',
  },
  pillTextSelected: {
    color: colors.pink,
    fontWeight: '700',
  },
});
