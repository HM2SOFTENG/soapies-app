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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const requestReset = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      console.log('[ForgotPassword] OTP sent to:', email);
      Alert.alert(
        'Check Your Email',
        'If an account exists with that email, a reset code has been sent.',
        [
          {
            text: 'Enter Code',
            onPress: () =>
              router.push({
                pathname: '/(auth)/reset-password',
                params: { email: email.trim().toLowerCase() },
              } as any),
          },
        ],
      );
    },
    onError: (err: any) => {
      console.error('[ForgotPassword] error:', err.message);
      Alert.alert('Error', err.message ?? 'Failed to send reset code. Please try again.');
    },
  });

  function handleSubmit() {
    if (!email.trim()) {
      Alert.alert('Missing email', 'Please enter your email address.');
      return;
    }
    console.log('[ForgotPassword] requesting reset for:', email.trim());
    requestReset.mutate({ email: email.trim().toLowerCase() });
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
          style={{ paddingHorizontal: 32, paddingTop: 80, paddingBottom: 48, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 42, fontWeight: '800', color: '#fff', letterSpacing: -1 }}>
            Soapies
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4, fontSize: 15 }}>
            Password reset
          </Text>
        </LinearGradient>

        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 40 }}>
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, alignSelf: 'flex-start' }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.pink} />
            <Text style={{ color: colors.pink, marginLeft: 6, fontWeight: '600' }}>Back to Login</Text>
          </TouchableOpacity>

          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '700', marginBottom: 10 }}>
            Forgot Password?
          </Text>
          <Text style={{ color: colors.muted, fontSize: 15, marginBottom: 28, lineHeight: 22 }}>
            Enter the email address associated with your account and we'll send you a reset code.
          </Text>

          <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 6, fontWeight: '600' }}>
            EMAIL
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
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
            onPress={handleSubmit}
            disabled={requestReset.isPending}
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
                opacity: requestReset.isPending ? 0.7 : 1,
              }}
            >
              {requestReset.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Send Reset Code</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/reset-password' as any)}
            style={{ marginTop: 16, alignItems: 'center' }}
          >
            <Text style={{ color: colors.muted, fontSize: 14 }}>
              Already have a code?{' '}
              <Text style={{ color: colors.pink, fontWeight: '600' }}>Enter it here</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
