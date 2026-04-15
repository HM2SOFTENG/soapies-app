import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      console.log('[ResetPassword] password reset successfully');
      Alert.alert(
        'Password Reset!',
        'Your password has been updated. Please sign in with your new password.',
        [{ text: 'Sign In', onPress: () => router.replace('/(auth)/login') }],
      );
    },
    onError: (err: any) => {
      console.error('[ResetPassword] error:', err.message);
      Alert.alert('Reset Failed', err.message ?? 'Invalid or expired code. Please try again.');
    },
  });

  function handleReset() {
    if (!email.trim()) {
      Alert.alert('Missing email', 'Please enter your email address.');
      return;
    }
    if (code.length !== 6) {
      Alert.alert('Invalid code', 'Please enter the 6-digit code from your email.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please make sure both passwords are the same.');
      return;
    }

    console.log('[ResetPassword] resetting for:', email.trim());
    resetMutation.mutate({
      email: email.trim().toLowerCase(),
      code: code.trim(),
      newPassword,
    });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <LinearGradient
          colors={['#7C3AED', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 32, paddingTop: insets.top + 40, paddingBottom: 48, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 42, fontWeight: '800', color: '#fff', letterSpacing: -1 }}>
            Soapies
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4, fontSize: 15 }}>
            Set new password
          </Text>
        </LinearGradient>

        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 40 }}>
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, alignSelf: 'flex-start' }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.pink} />
            <Text style={{ color: colors.pink, marginLeft: 6, fontWeight: '600' }}>Back</Text>
          </TouchableOpacity>

          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '700', marginBottom: 10 }}>
            Reset Password
          </Text>
          <Text style={{ color: colors.muted, fontSize: 15, marginBottom: 28, lineHeight: 22 }}>
            Enter the 6-digit code sent to your email and your new password.
          </Text>

          {/* Email */}
          <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 6, fontWeight: '600' }}>EMAIL</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              color: colors.text,
              fontSize: 16,
              marginBottom: 16,
            }}
          />

          {/* Code */}
          <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 6, fontWeight: '600' }}>RESET CODE</Text>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            maxLength={6}
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              color: colors.text,
              fontSize: 24,
              letterSpacing: 8,
              marginBottom: 16,
              textAlign: 'center',
            }}
          />

          {/* New password */}
          <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 6, fontWeight: '600' }}>NEW PASSWORD</Text>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              color: colors.text,
              fontSize: 16,
              marginBottom: 16,
            }}
          />

          {/* Confirm password */}
          <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 6, fontWeight: '600' }}>CONFIRM PASSWORD</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              color: colors.text,
              fontSize: 16,
              marginBottom: 28,
            }}
          />

          <TouchableOpacity
            onPress={handleReset}
            disabled={resetMutation.isPending}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#EC4899', '#A855F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
                opacity: resetMutation.isPending ? 0.7 : 1,
              }}
            >
              {resetMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Reset Password</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
