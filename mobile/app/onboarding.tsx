import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Dimensions,
  Alert,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { uploadPhoto } from '../lib/uploadPhoto';
import { trpc } from '../lib/trpc';
import { colors } from '../lib/colors';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { saveToken, setMemoryToken, SESSION_COOKIE_KEY } from '../lib/trpc';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://soapies-app-3uk2q.ondigitalocean.app';

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: 'Welcome', subtitle: 'Join the community' },
  { id: 2, title: 'Create Account', subtitle: 'Set up your login' },
  { id: 3, title: 'Verify Email', subtitle: 'Check your inbox' },
  { id: 4, title: 'About You', subtitle: 'Tell us about yourself' },
  { id: 5, title: 'Photos', subtitle: 'Show yourself off' },
  { id: 6, title: 'Preferences', subtitle: 'What are you into?' },
  { id: 7, title: 'Submit', subtitle: 'Almost there!' },
];

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Trans Male', 'Trans Female', 'Other', 'Prefer not to say'];
const ORIENTATION_OPTIONS = ['Straight', 'Gay', 'Lesbian', 'Bisexual', 'Pansexual', 'Queer', 'Asexual', 'Other', 'Prefer not to say'];
const RELATIONSHIP_OPTIONS = ['Single', 'In a Relationship', 'Married', 'Open Relationship', "It's Complicated", 'Prefer not to say'];
const COMMUNITY_OPTIONS = [
  { id: 'soapies', name: 'Soapies', desc: 'The original lifestyle community' },
  { id: 'groupies', name: 'Groupies', desc: 'For couples and groups' },
  { id: 'gaypeez', name: 'Gaypeez', desc: 'LGBTQ+ friendly community' },
];
const INTERESTS = ['House Parties', 'Raves', 'Beach Events', 'Pool Parties', 'Dance', 'Music', 'Socializing', 'Networking', 'Fitness', 'Travel', 'Art', 'Photography'];
const LOOKING_FOR = ['New Friends', 'Social Events', 'Couples Community', 'Dating', 'Networking', 'Adventure', 'Fun Nights Out', 'Like-minded People'];

function getPasswordStrength(password: string): { label: string; color: string; pct: number } {
  if (password.length < 8) return { label: 'Weak', color: '#EF4444', pct: 20 };
  if (password.length < 12) return { label: 'Medium', color: '#F59E0B', pct: 60 };
  if (/[A-Z]/.test(password) && /[0-9!@#$%^&*]/.test(password)) return { label: 'Strong', color: '#10B981', pct: 100 };
  return { label: 'Medium', color: '#F59E0B', pct: 60 };
}

function calculateAge(year: string, month: string, day: string): number | null {
  if (!year || !month || !day || year.length < 4) return null;
  const dob = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return isNaN(age) || age < 0 ? null : age;
}

// ─── Step Indicators ────────────────────────────────────────────────────────

function StepIndicators({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingVertical: 10 }}>
      {Array.from({ length: totalSteps }).map((_, i) => {
        const stepNum = i + 1;
        const isFilled = stepNum <= currentStep;
        if (isFilled) {
          return (
            <LinearGradient
              key={i}
              colors={['#EC4899', '#A855F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ height: 6, flex: 1, borderRadius: 3 }}
            />
          );
        }
        return (
          <View
            key={i}
            style={{ height: 6, flex: 1, borderRadius: 3, backgroundColor: '#1A1A30' }}
          />
        );
      })}
    </View>
  );
}

// ─── Photo upload ─────────────────────────────────────────────────────────────
// uploadPhoto moved to lib/uploadPhoto.ts

// ─── Types ────────────────────────────────────────────────────────────────────

interface PhotoItem {
  localUri: string;
  remoteUrl?: string;
  uploading: boolean;
}

// ─── Pill Selector ────────────────────────────────────────────────────────────

function PillSelector({
  options,
  selected,
  onSelect,
  multi = false,
}: {
  options: string[];
  selected: string | string[];
  onSelect: (v: string) => void;
  multi?: boolean;
}) {
  const isSelected = (opt: string) =>
    multi ? (selected as string[]).includes(opt) : selected === opt;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16, gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          onPress={() => onSelect(opt)}
          activeOpacity={0.75}
          style={[
            styles.pill,
            isSelected(opt) && styles.pillSelected,
          ]}
        >
          <Text style={[styles.pillText, isSelected(opt) && styles.pillTextSelected]}>
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── Chip Grid ────────────────────────────────────────────────────────────────

function ChipGrid({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <View style={styles.chipGrid}>
      {options.map((opt) => {
        const sel = selected.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onToggle(opt)}
            activeOpacity={0.75}
            style={[styles.chip, sel && styles.chipSelected]}
          >
            <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const { setUser, setHasToken } = useAuth();
  const toast = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Step 2
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 3
  const [otpCode, setOtpCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Temp session token — stored in memory only during onboarding, NOT saved to SecureStore
  // Only saved to SecureStore after admin approves the application
  const pendingSessionToken = useRef<string | null>(null);

  // Step 4
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState('');
  const [orientation, setOrientation] = useState('');
  const [relationshipStatus, setRelationshipStatus] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [communityId, setCommunityId] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralVerified, setReferralVerified] = useState(false);
  const [referrerName, setReferrerName] = useState('');
  const [referralError, setReferralError] = useState('');
  const [referralVerifying, setReferralVerifying] = useState(false);

  // Step 5
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  // Step 6
  const [interests, setInterests] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);

  // Step 7
  const [waiverAccepted, setWaiverAccepted] = useState(false);

  // tRPC mutations
  const registerMutation = trpc.auth.register.useMutation();
  const verifyEmailMutation = trpc.auth.verifyEmail.useMutation();
  const resendMutation = trpc.auth.resendEmailVerification.useMutation();
  const upsertMutation = trpc.profile.upsert.useMutation();
  const submitMutation = trpc.profile.submitApplication.useMutation();
  const uploadPhotoMutation = trpc.profile.uploadPhoto.useMutation();

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (currentStep / 7) * 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      resendTimerRef.current = setInterval(() => {
        setResendTimer((t) => {
          if (t <= 1) {
            if (resendTimerRef.current) clearInterval(resendTimerRef.current);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    };
  }, [resendTimer]);

  const goTo = (step: number) => setCurrentStep(step);

  // ─── Step 2: Register ──────────────────────────────────────────────────────

  const handleRegister = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!agreedToTerms) {
      toast.error('Please agree to the terms and community guidelines');
      return;
    }

    try {
      const dobForServer = dobYear && dobMonth && dobDay
        ? `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`
        : undefined;
      const result = await registerMutation.mutateAsync({
        email: email.trim().toLowerCase(),
        password,
        name: email.split('@')[0],
        dateOfBirth: dobForServer,
      }) as any;

      // Store token in memory ONLY (for making authenticated API calls during onboarding)
      // NOT saved to SecureStore — user is NOT logged in until admin approves
      if (result?.sessionToken) {
        pendingSessionToken.current = result.sessionToken;
        setMemoryToken(result.sessionToken); // allows tRPC calls to auth during onboarding steps
      }

      goTo(3);
      setResendTimer(60);
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg.toLowerCase().includes('already exists') || e?.data?.code === 'CONFLICT') {
        Alert.alert(
          'Account Already Exists',
          'An account with this email already exists. Please sign in to continue your application.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => router.replace('/(auth)/login') },
          ]
        );
      } else {
        Alert.alert('Error', msg || 'Registration failed. Please try again.');
      }
    }
  };

  // ─── Step 3: Verify Email ─────────────────────────────────────────────────

  const handleVerifyEmail = async () => {
    if (otpCode.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    try {
      const result = await verifyEmailMutation.mutateAsync({
        email: email.trim().toLowerCase(),
        code: otpCode,
      }) as any;

      // Update memory token from verify (do NOT save to SecureStore or log in)
      if (result?.sessionToken) {
        pendingSessionToken.current = result.sessionToken;
        setMemoryToken(result.sessionToken);
      }

      goTo(4);
    } catch (e: any) {
      toast.error(e.message || 'Invalid or expired code');
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    try {
      await resendMutation.mutateAsync({ email: email.trim().toLowerCase() });
      setResendTimer(60);
      toast.success('Code resent to your email');
    } catch (e: any) {
      toast.error(e.message || 'Failed to resend code');
    }
  };

  // ─── Referral code verify ─────────────────────────────────────────────────

  const trpcUtils = trpc.useUtils();

  const handleVerifyReferralCode = async () => {
    if (!referralCode.trim()) return;
    setReferralVerifying(true);
    setReferralError('');
    setReferralVerified(false);
    setReferrerName('');
    try {
      const result = await trpcUtils.referrals.validate.fetch({ code: referralCode.trim().toUpperCase() });
      if (result.valid) {
        setReferralVerified(true);
        setReferrerName(result.referrerName || '');
      } else {
        setReferralError('Invalid or inactive referral code');
      }
    } catch {
      setReferralError('Failed to verify code. Please try again.');
    } finally {
      setReferralVerifying(false);
    }
  };

  // ─── Step 4: About You ────────────────────────────────────────────────────

  const handleAboutYouNext = async () => {
    if (!displayName.trim()) { toast.error('Display name is required'); return; }
    if (!gender) { toast.error('Please select your gender'); return; }
    if (!communityId) { toast.error('Please select a community'); return; }
    if (!bio.trim()) { toast.error('Please write a short bio'); return; }

    if (!dobDay || !dobMonth || !dobYear) {
      toast.error('Please enter your date of birth.');
      return;
    }
    const age = calculateAge(dobYear, dobMonth, dobDay);
    if (age === null || age < 21) {
      toast.error('You must be 21 or older to join Soapies.');
      return;
    }

    const dateOfBirth = dobYear && dobMonth && dobDay
      ? `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`
      : undefined;

    try {
      await upsertMutation.mutateAsync({
        displayName: displayName.trim(),
        gender: gender.toLowerCase(),
        orientation: orientation.toLowerCase() || undefined,
        dateOfBirth,
        bio: bio.trim(),
        location: location.trim() || undefined,
        communityId,
        phone: phone.trim() || undefined,
        referredByCode: referralVerified && referralCode ? referralCode.trim().toUpperCase() : undefined,
        preferences: { relationshipStatus },
      } as any);
      goTo(5);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save profile');
    }
  };

  // ─── Step 5: Photos ───────────────────────────────────────────────────────

  const handlePickPhoto = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });
    if (result.canceled) return;
    const asset = result.assets[0];

    const newPhoto: PhotoItem = { localUri: asset.uri, uploading: true };
    setPhotos((prev) => {
      const updated = [...prev];
      if (index < updated.length) {
        updated[index] = newPhoto;
      } else {
        updated.push(newPhoto);
      }
      return updated;
    });

    try {
      const remoteUrl = await uploadPhoto(asset.uri);
      await uploadPhotoMutation.mutateAsync({ photoUrl: remoteUrl, sortOrder: index });
      setPhotos((prev) => {
        const updated = [...prev];
        const idx = index < updated.length ? index : updated.length - 1;
        updated[idx] = { localUri: asset.uri, remoteUrl, uploading: false };
        return updated;
      });
    } catch (e: any) {
      toast.error('Photo upload failed');
      setPhotos((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleDeletePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePhotosNext = () => {
    const uploaded = photos.filter((p) => p.remoteUrl && !p.uploading);
    if (uploaded.length < 3) {
      toast.error('Please upload at least 3 photos');
      return;
    }
    goTo(6);
  };

  // ─── Step 6: Preferences ──────────────────────────────────────────────────

  const toggleInterest = (v: string) =>
    setInterests((prev) => prev.includes(v) ? prev.filter((i) => i !== v) : [...prev, v]);

  const toggleLookingFor = (v: string) =>
    setLookingFor((prev) => prev.includes(v) ? prev.filter((i) => i !== v) : [...prev, v]);

  const handlePreferencesNext = async () => {
    if (interests.length === 0) { toast.error('Please select at least one interest'); return; }
    if (lookingFor.length === 0) { toast.error('Please select what you\'re looking for'); return; }

    // Save preferences to profile
    try {
      await upsertMutation.mutateAsync({
        preferences: { relationshipStatus, interests, lookingFor },
      } as any);
    } catch {
      // Non-fatal — still continue
    }
    goTo(7);
  };

  // ─── Step 7: Submit ───────────────────────────────────────────────────────

  const handleSubmit = async () => {
    try {
      await submitMutation.mutateAsync();
      // Clear memory token — user is NOT logged in, awaiting approval
      setMemoryToken(null);
      pendingSessionToken.current = null;
      router.replace('/pending-approval');
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit application');
    }
  };

  // ─── Age display ──────────────────────────────────────────────────────────

  const currentAge = calculateAge(dobYear, dobMonth, dobDay);
  const isAdult = currentAge !== null && currentAge >= 21;
  const pwStrength = password ? getPasswordStrength(password) : null;

  const uploadedCount = photos.filter((p) => p.remoteUrl && !p.uploading).length;
  const firstPhoto = photos.find((p) => p.remoteUrl);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <LinearGradient
      colors={['#04040A', '#0D0520', '#080810']}
      locations={[0, 0.4, 1]}
      style={{ flex: 1 }}
    >
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
      {/* Step indicators */}
      {currentStep > 1 && (
        <StepIndicators currentStep={currentStep} totalSteps={STEPS.length} />
      )}

      {/* Header (step > 1) */}
      {currentStep > 1 && (
        <View style={styles.header}>
          {/*
            Back button is disabled on step 3 (email OTP verification) because
            the account has already been created at step 2 — going back would
            silently re-hit the register mutation and 409. On every other step
            (2, 4–7) the user can safely step back to revise input.
            Fixes ITEM-020.
          */}
          <TouchableOpacity
            onPress={() => {
              if (currentStep === 3) return;
              goTo(currentStep - 1);
            }}
            style={styles.backBtn}
            disabled={currentStep === 3}
          >
            {currentStep !== 3 && <Ionicons name="chevron-back" size={24} color={colors.text} />}
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>{STEPS[currentStep - 1]?.title}</Text>
            <Text style={styles.headerSub}>{STEPS[currentStep - 1]?.subtitle}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      )}

      {/* ─── Step 1: Welcome ──────────────────────────────────────────── */}
      {currentStep === 1 && (
        <LinearGradient
          colors={['#0D0D1A', '#1A0830', '#0D0D1A']}
          style={StyleSheet.absoluteFillObject}
        />
      )}

      {currentStep === 1 && (
        <View style={styles.welcomeContainer}>
          {/* Glow blobs */}
          <View style={[styles.blob, { top: -60, left: -60, backgroundColor: 'rgba(168,85,247,0.25)' }]} />
          <View style={[styles.blob, { bottom: -60, right: -60, backgroundColor: 'rgba(236,72,153,0.2)' }]} />

          <View style={styles.welcomeContent}>
            <LinearGradient
              colors={['#EC4899', '#A855F7', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoCircle}
            >
              <Text style={styles.logoLetter}>S</Text>
            </LinearGradient>

            <Text style={styles.welcomeTitle}>Welcome to{'\n'}Soapies</Text>
            <Text style={styles.welcomeSubtitle}>Join the hottest lifestyle community</Text>

            <TouchableOpacity
              onPress={() => goTo(2)}
              activeOpacity={0.85}
              style={{ borderRadius: 18, overflow: 'hidden', marginTop: 40, width: '100%' }}
            >
              <LinearGradient
                colors={['#EC4899', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtn}
              >
                <Ionicons name="sparkles" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>Begin Your Journey</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              style={{ marginTop: 20 }}
            >
              <Text style={{ color: colors.muted, fontSize: 14 }}>
                Already have an account?{' '}
                <Text style={{ color: colors.pink, fontWeight: '700' }}>Log In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── Step 2: Create Account ────────────────────────────────────── */}
      {currentStep === 2 && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.stepBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.stepHeading}>Create Account</Text>
            <Text style={styles.stepSubheading}>Membership is by approval. We'll review your application.</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>EMAIL *</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={styles.input}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>PASSWORD *</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.muted}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  style={[styles.input, { flex: 1, paddingRight: 48 }]}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>
              {pwStrength && (
                <View style={{ marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>Password Strength</Text>
                    <Text style={{ color: pwStrength.color, fontSize: 12, fontWeight: '700' }}>{pwStrength.label}</Text>
                  </View>
                  <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 2 }}>
                    <View style={{ height: 4, width: `${pwStrength.pct}%`, backgroundColor: pwStrength.color, borderRadius: 2 }} />
                  </View>
                </View>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>CONFIRM PASSWORD *</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.muted}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="new-password"
                  style={[styles.input, { flex: 1, paddingRight: 48 }]}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>Passwords don't match</Text>
              )}
            </View>

            {/* Terms checkbox */}
            <TouchableOpacity
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              style={styles.checkboxRow}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                {agreedToTerms && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={{ color: colors.muted, fontSize: 13, flex: 1, marginLeft: 10 }}>
                I agree to the{' '}
                <Text
                  style={{ color: colors.pink, textDecorationLine: 'underline' }}
                  onPress={() => Linking.openURL('https://soapiesplaygrp.club/terms')}
                >community guidelines</Text>
                {' '}and{' '}
                <Text
                  style={{ color: colors.pink, textDecorationLine: 'underline' }}
                  onPress={() => Linking.openURL('https://soapiesplaygrp.club/terms')}
                >terms of service</Text>
              </Text>
            </TouchableOpacity>

            <View style={{ height: 24 }} />

            <TouchableOpacity
              onPress={handleRegister}
              disabled={registerMutation.isPending}
              activeOpacity={0.85}
              style={{ borderRadius: 14, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#EC4899', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.primaryBtn, registerMutation.isPending && { opacity: 0.6 }]}
              >
                {registerMutation.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Create Account</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={{ marginTop: 20, alignItems: 'center' }}>
              <Text style={{ color: '#5A5575', fontSize: 14, textDecorationLine: 'underline' }}>
                Already a member? Sign In
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ─── Step 3: Verify Email ──────────────────────────────────────── */}
      {currentStep === 3 && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.stepBody} keyboardShouldPersistTaps="handled">
            <View style={styles.otpIconContainer}>
              <Ionicons name="mail-outline" size={48} color={colors.pink} />
            </View>
            <Text style={styles.stepHeading}>Check Your Email</Text>
            <Text style={[styles.stepSubheading, { textAlign: 'center' }]}>
              We sent a 6-digit code to
            </Text>
            <Text style={{ color: colors.pink, fontWeight: '700', textAlign: 'center', marginBottom: 32 }}>
              {email}
            </Text>

            <Text style={styles.fieldLabel}>VERIFICATION CODE</Text>
            <TextInput
              value={otpCode}
              onChangeText={(v) => setOtpCode(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              maxLength={6}
              style={[styles.input, { textAlign: 'center', fontSize: 28, letterSpacing: 12, fontWeight: '700' }]}
            />

            <View style={{ height: 24 }} />

            <TouchableOpacity
              onPress={handleVerifyEmail}
              disabled={verifyEmailMutation.isPending || otpCode.length !== 6}
              activeOpacity={0.85}
              style={{ borderRadius: 14, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#EC4899', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.primaryBtn, (verifyEmailMutation.isPending || otpCode.length !== 6) && { opacity: 0.5 }]}
              >
                {verifyEmailMutation.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Verify Code</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleResendCode}
              disabled={resendTimer > 0 || resendMutation.isPending}
              style={{ marginTop: 20, alignItems: 'center' }}
            >
              {resendTimer > 0
                ? <Text style={{ color: colors.muted, fontSize: 14 }}>Resend in {resendTimer}s</Text>
                : <Text style={{ color: colors.pink, fontSize: 14, fontWeight: '600' }}>
                    {resendMutation.isPending ? 'Sending...' : 'Resend Code'}
                  </Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ─── Step 4: About You ─────────────────────────────────────────── */}
      {currentStep === 4 && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.stepBody} keyboardShouldPersistTaps="handled">

            {/* Display Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>DISPLAY NAME *</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your display name"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </View>

            {/* Date of Birth */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>DATE OF BIRTH</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={dobMonth}
                  onChangeText={(v) => setDobMonth(v.replace(/\D/g, '').slice(0, 2))}
                  placeholder="MM"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  maxLength={2}
                  style={[styles.input, { flex: 1, textAlign: 'center' }]}
                />
                <TextInput
                  value={dobDay}
                  onChangeText={(v) => setDobDay(v.replace(/\D/g, '').slice(0, 2))}
                  placeholder="DD"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  maxLength={2}
                  style={[styles.input, { flex: 1, textAlign: 'center' }]}
                />
                <TextInput
                  value={dobYear}
                  onChangeText={(v) => setDobYear(v.replace(/\D/g, '').slice(0, 4))}
                  placeholder="YYYY"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  maxLength={4}
                  style={[styles.input, { flex: 2, textAlign: 'center' }]}
                />
              </View>
              {currentAge !== null && (
                <View style={{ marginTop: 8 }}>
                  {isAdult
                    ? (
                      <View style={styles.ageBadgeGood}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={{ color: '#10B981', fontWeight: '700', marginLeft: 4, fontSize: 13 }}>{currentAge} years old ✓</Text>
                      </View>
                    ) : (
                      <View style={styles.ageBadgeBad}>
                        <Ionicons name="close-circle" size={14} color="#EF4444" />
                        <Text style={{ color: '#EF4444', fontWeight: '700', marginLeft: 4, fontSize: 13 }}>Must be 21+ to join</Text>
                      </View>
                    )
                  }
                </View>
              )}
            </View>

            {/* Community */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>COMMUNITY *</Text>
              {COMMUNITY_OPTIONS.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setCommunityId(c.id)}
                  activeOpacity={0.8}
                  style={[styles.communityCard, communityId === c.id && styles.communityCardSelected]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.communityCardName, communityId === c.id && { color: colors.pink }]}>{c.name}</Text>
                    <Text style={styles.communityCardDesc}>{c.desc}</Text>
                  </View>
                  {communityId === c.id && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.pink} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Gender */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>GENDER *</Text>
              <PillSelector
                options={GENDER_OPTIONS}
                selected={gender}
                onSelect={setGender}
              />
            </View>

            {/* Orientation */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>ORIENTATION</Text>
              <PillSelector
                options={ORIENTATION_OPTIONS}
                selected={orientation}
                onSelect={setOrientation}
              />
            </View>

            {/* Relationship Status */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>RELATIONSHIP STATUS</Text>
              <PillSelector
                options={RELATIONSHIP_OPTIONS}
                selected={relationshipStatus}
                onSelect={setRelationshipStatus}
              />
            </View>

            {/* Bio */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                BIO *{' '}
                <Text style={{ color: colors.muted, fontWeight: '400' }}>{bio.length}/200</Text>
              </Text>
              <TextInput
                value={bio}
                onChangeText={(v) => setBio(v.slice(0, 200))}
                placeholder="Tell the community about yourself..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={4}
                maxLength={200}
                style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
              />
            </View>

            {/* Location */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>LOCATION</Text>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="City, State"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </View>

            {/* Phone */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>PHONE <Text style={{ fontWeight: '400', color: colors.muted }}>(optional)</Text></Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 (555) 000-0000"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>

            {/* Referral Code */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>REFERRAL CODE <Text style={{ fontWeight: '400', color: colors.muted }}>(optional)</Text></Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={referralCode}
                  onChangeText={(v) => {
                    setReferralCode(v.toUpperCase());
                    setReferralVerified(false);
                    setReferralError('');
                    setReferrerName('');
                  }}
                  placeholder="SOAP12345"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="characters"
                  style={[styles.input, { flex: 1 }]}
                />
                <TouchableOpacity
                  onPress={handleVerifyReferralCode}
                  disabled={!referralCode.trim() || referralVerifying}
                  style={[styles.verifyBtn, (!referralCode.trim() || referralVerifying) && { opacity: 0.5 }]}
                >
                  {referralVerifying
                    ? <ActivityIndicator size="small" color={colors.pink} />
                    : <Text style={{ color: colors.pink, fontWeight: '700', fontSize: 13 }}>Verify</Text>
                  }
                </TouchableOpacity>
              </View>
              {referralVerified && (
                <Text style={{ color: '#10B981', fontSize: 13, marginTop: 6 }}>
                  ✓ Referred by {referrerName || 'a member'}
                </Text>
              )}
              {referralError ? (
                <Text style={{ color: '#EF4444', fontSize: 13, marginTop: 6 }}>{referralError}</Text>
              ) : null}
            </View>

            <View style={{ height: 24 }} />

            <TouchableOpacity
              onPress={handleAboutYouNext}
              disabled={upsertMutation.isPending}
              activeOpacity={0.85}
              style={{ borderRadius: 14, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#EC4899', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.primaryBtn, upsertMutation.isPending && { opacity: 0.6 }]}
              >
                {upsertMutation.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Next →</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ─── Step 5: Photos ────────────────────────────────────────────── */}
      {currentStep === 5 && (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.stepBody}>
            <Text style={styles.stepHeading}>Your Photos</Text>
            <Text style={styles.stepSubheading}>Show the community who you are — minimum 3 photos required.</Text>

            <View style={[styles.fieldGroup, { alignItems: 'flex-end' }]}>
              <Text style={{ color: uploadedCount >= 3 ? '#10B981' : colors.muted, fontSize: 13, fontWeight: '600' }}>
                {uploadedCount}/6 photos {uploadedCount >= 3 ? '✓' : ''}
              </Text>
            </View>

            {/* Photo grid */}
            <View style={styles.photoGrid}>
              {Array.from({ length: 6 }).map((_, i) => {
                const photo = photos[i];
                return (
                  <View key={i} style={styles.photoSlot}>
                    {photo ? (
                      <>
                        <Image source={{ uri: photo.localUri }} style={styles.photoPreview} />
                        {photo.uploading && (
                          <View style={styles.photoOverlay}>
                            <ActivityIndicator color="#fff" />
                          </View>
                        )}
                        {!photo.uploading && (
                          <TouchableOpacity
                            onPress={() => handleDeletePhoto(i)}
                            style={styles.deletePhotoBtn}
                          >
                            <Ionicons name="close" size={14} color="#fff" />
                          </TouchableOpacity>
                        )}
                        {photo.remoteUrl && (
                          <View style={styles.photoCheck}>
                            <Ionicons name="checkmark" size={12} color="#fff" />
                          </View>
                        )}
                      </>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handlePickPhoto(i)}
                        style={styles.photoAddBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add" size={28} color={colors.muted} />
                        {i === 0 && <Text style={{ color: colors.muted, fontSize: 10, marginTop: 4 }}>Main</Text>}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>

            {uploadedCount < 3 && (
              <View style={styles.warnBanner}>
                <Ionicons name="information-circle-outline" size={16} color="#F59E0B" />
                <Text style={{ color: '#F59E0B', fontSize: 13, marginLeft: 6 }}>
                  Need at least 3 photos to continue
                </Text>
              </View>
            )}

            <View style={{ height: 24 }} />

            <TouchableOpacity
              onPress={handlePhotosNext}
              activeOpacity={0.85}
              style={{ borderRadius: 14, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#EC4899', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.primaryBtn, uploadedCount < 3 && { opacity: 0.5 }]}
              >
                <Text style={styles.primaryBtnText}>Next →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* ─── Step 6: Preferences ───────────────────────────────────────── */}
      {currentStep === 6 && (
        <ScrollView contentContainerStyle={styles.stepBody}>
          <Text style={styles.stepHeading}>Your Preferences</Text>
          <Text style={styles.stepSubheading}>Help us connect you with the right people and events.</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              INTERESTS *{' '}
              <Text style={{ fontWeight: '400', color: interests.length > 0 ? '#10B981' : colors.muted }}>
                {interests.length} selected
              </Text>
            </Text>
            <ChipGrid options={INTERESTS} selected={interests} onToggle={toggleInterest} />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              LOOKING FOR *{' '}
              <Text style={{ fontWeight: '400', color: lookingFor.length > 0 ? '#10B981' : colors.muted }}>
                {lookingFor.length} selected
              </Text>
            </Text>
            <ChipGrid options={LOOKING_FOR} selected={lookingFor} onToggle={toggleLookingFor} />
          </View>

          <View style={{ height: 24 }} />

          <TouchableOpacity
            onPress={handlePreferencesNext}
            activeOpacity={0.85}
            style={{ borderRadius: 14, overflow: 'hidden' }}
          >
            <LinearGradient
              colors={['#EC4899', '#A855F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Review Application →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ─── Step 7: Review & Submit ───────────────────────────────────── */}
      {currentStep === 7 && (
        <ScrollView contentContainerStyle={styles.stepBody}>
          <Text style={styles.stepHeading}>Almost There!</Text>
          <Text style={styles.stepSubheading}>Review your application before submitting.</Text>

          {/* Summary card */}
          <View style={styles.summaryCard}>
            {/* Avatar */}
            {firstPhoto ? (
              <Image source={{ uri: firstPhoto.localUri }} style={styles.summaryAvatar} />
            ) : (
              <View style={[styles.summaryAvatar, { backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="person" size={36} color={colors.muted} />
              </View>
            )}

            <Text style={styles.summaryName}>{displayName || 'Your Name'}</Text>
            {communityId && (
              <Text style={{ color: colors.purple, fontSize: 13, fontWeight: '600', marginBottom: 4 }}>
                {COMMUNITY_OPTIONS.find((c) => c.id === communityId)?.name ?? communityId}
              </Text>
            )}
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              {gender}{currentAge ? `, ${currentAge}` : ''}{location ? ` · ${location}` : ''}
            </Text>

            {bio ? (
              <Text style={styles.summaryBio} numberOfLines={3}>{bio}</Text>
            ) : null}

            {interests.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.fieldLabel, { marginBottom: 8 }]}>INTERESTS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {interests.map((i) => (
                    <View key={i} style={styles.summaryChip}>
                      <Text style={{ color: colors.pink, fontSize: 12 }}>{i}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.summaryRow}>
              <Ionicons name="images-outline" size={16} color={colors.muted} />
              <Text style={{ color: colors.muted, fontSize: 13, marginLeft: 6 }}>
                {uploadedCount} photos uploaded
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 8, marginBottom: 16, padding: 14, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' }}>
              Our team reviews all applications within 24-48 hours. You'll receive an email notification with the decision.
            </Text>
          </View>

          {/* Waiver acknowledgment */}
          <TouchableOpacity
            onPress={() => setWaiverAccepted(!waiverAccepted)}
            style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}
            activeOpacity={0.8}
          >
            <View style={{
              width: 22, height: 22, borderRadius: 6, borderWidth: 2,
              borderColor: waiverAccepted ? colors.pink : colors.border,
              backgroundColor: waiverAccepted ? colors.pink : 'transparent',
              alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: 1,
            }}>
              {waiverAccepted && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={{ color: colors.muted, flex: 1, lineHeight: 20, fontSize: 13 }}>
              I am 18+ years old, agree to the{' '}
              <Text style={{ color: colors.pink }} onPress={() => Linking.openURL('https://soapiesplaygrp.club/terms')}>
                Community Guidelines &amp; Terms
              </Text>
              , and understand this is an adult members-only platform.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitMutation.isPending || !waiverAccepted}
            activeOpacity={0.85}
            style={{ borderRadius: 14, overflow: 'hidden', opacity: waiverAccepted ? 1 : 0.4 }}
          >
            <LinearGradient
              colors={['#EC4899', '#A855F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.primaryBtn, submitMutation.isPending && { opacity: 0.6 }]}
            >
              {submitMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : (
                  <>
                    <Ionicons name="send" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryBtnText}>Submit Application</Text>
                  </>
                )
              }
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#1A1A30',
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.pink,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  headerSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  // Welcome
  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  blob: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.6,
    filter: undefined,
  } as any,
  welcomeContent: {
    width: '100%',
    alignItems: 'center',
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: '#EC4899',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  logoLetter: {
    color: '#fff',
    fontSize: 44,
    fontWeight: '900',
  },
  welcomeTitle: {
    color: '#F1F0FF',
    fontSize: 38,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 44,
    letterSpacing: -1,
  },
  welcomeSubtitle: {
    color: '#A09CB8',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },

  // Common
  stepBody: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
  },
  stepHeading: {
    color: '#F1F0FF',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  stepSubheading: {
    color: '#A09CB8',
    fontSize: 15,
    marginBottom: 28,
    lineHeight: 23,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0C0C1A',
    borderWidth: 1,
    borderColor: '#1A1A30',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: '#F1F0FF',
    fontSize: 15,
    minHeight: 48,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  primaryBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    flexDirection: 'row',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.pink,
    borderColor: colors.pink,
  },

  // OTP
  otpIconContainer: {
    alignSelf: 'center',
    marginBottom: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(236,72,153,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Age badges
  ageBadgeGood: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  ageBadgeBad: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },

  // Community cards
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginBottom: 10,
  },
  communityCardSelected: {
    borderColor: colors.pink,
    backgroundColor: 'rgba(236,72,153,0.08)',
  },
  communityCardName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  communityCardDesc: {
    color: colors.muted,
    fontSize: 13,
  },

  // Pills
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginRight: 8,
    marginBottom: 8,
  },
  pillSelected: {
    borderColor: colors.pink,
    backgroundColor: 'rgba(236,72,153,0.15)',
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

  // Verify btn
  verifyBtn: {
    backgroundColor: 'rgba(236,72,153,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(236,72,153,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Photos
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoSlot: {
    width: (SCREEN_WIDTH - 48 - 20) / 3,
    height: (SCREEN_WIDTH - 48 - 20) / 3 * 1.2,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCheck: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#10B981',
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },

  // Chips
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipSelected: {
    borderColor: colors.pink,
    backgroundColor: 'rgba(236,72,153,0.15)',
  },
  chipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: colors.pink,
    fontWeight: '700',
  },

  // Summary
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.pink,
  },
  summaryName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  summaryBio: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  summaryChip: {
    backgroundColor: 'rgba(236,72,153,0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.3)',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
});
