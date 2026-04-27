import React, { useState, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { trpc } from '../../lib/trpc';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const requestReset = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
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
        ]
      );
    },
    onError: (err: any) => {
      if (__DEV__) console.error('[ForgotPassword] error:', err.message);
      Alert.alert('Error', err.message ?? 'Failed to send reset code. Please try again.');
    },
  });

  function handleSubmit() {
    if (!email.trim()) {
      Alert.alert('Missing email', 'Please enter your email address.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    requestReset.mutate({ email: email.trim().toLowerCase() });
  }

  function handlePressIn() {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#04040A', '#0D0520', '#080810']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ flex: 1 }}
      >
        {/* Ambient orbs */}
        <View
          style={{
            position: 'absolute',
            top: -40,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: '#EC489912',
          }}
          pointerEvents="none"
        />
        <View
          style={{
            position: 'absolute',
            bottom: 100,
            left: -40,
            width: 160,
            height: 160,
            borderRadius: 80,
            backgroundColor: '#A855F710',
          }}
          pointerEvents="none"
        />

        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View
            style={{
              paddingHorizontal: 28,
              paddingTop: insets.top + 24,
              paddingBottom: insets.bottom + 32,
            }}
          >
            {/* Back button */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.14)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.24)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 36,
              }}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Heading */}
            <Text
              style={{
                color: '#F1F0FF',
                fontSize: 28,
                fontWeight: '900',
                letterSpacing: -0.5,
                marginBottom: 8,
              }}
            >
              Forgot Password?
            </Text>
            <Text style={{ color: '#5A5575', fontSize: 14, marginBottom: 32, lineHeight: 22 }}>
              Enter the email address associated with your account and we&apos;ll send you a reset
              code.
            </Text>

            {/* Email input */}
            <View
              style={{
                backgroundColor: '#0C0C1A',
                borderColor: emailFocused ? '#EC489960' : '#1A1A30',
                borderWidth: emailFocused ? 1.5 : 1,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <Ionicons name="mail" size={18} color="#5A5575" style={{ marginRight: 10 }} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#5A5575"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                style={{ flex: 1, color: '#F1F0FF', fontSize: 15 }}
              />
            </View>

            {/* Submit button */}
            <Animated.View
              style={{
                transform: [{ scale: scaleAnim }],
                shadowColor: '#EC4899',
                shadowOpacity: 0.4,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 4 },
              }}
            >
              <TouchableOpacity
                onPress={handleSubmit}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={requestReset.isPending}
                activeOpacity={1}
              >
                <LinearGradient
                  colors={['#EC4899', '#A855F7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 18,
                    paddingVertical: 16,
                    width: '100%',
                    alignItems: 'center',
                  }}
                >
                  {requestReset.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                      Send Reset Code
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/reset-password' as any)}
              style={{ marginTop: 20, alignItems: 'center' }}
            >
              <Text style={{ color: '#5A5575', fontSize: 14 }}>
                Already have a code?{' '}
                <Text style={{ color: '#EC4899', fontWeight: '600' }}>Enter it here</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
