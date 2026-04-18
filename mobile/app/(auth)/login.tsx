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
import { trpc, saveToken } from '../../lib/trpc';
import { queryClient } from '../_layout';
import { useAuth } from '../../lib/auth';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setUser, setHasToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data: any) => {
      if (!data?.sessionToken) {
        Alert.alert('Sign In Failed', 'No session token returned. Please try again.');
        return;
      }
      // 1. Persist token first — must complete before anything else reads it
      await saveToken(data.sessionToken);
      // 2. Hydrate user in context so AuthGuard sees an authenticated user immediately
      if (data?.user) setUser(data.user);
      // 3. Mark token available — triggers re-enables of guarded queries
      setHasToken(true);
      // 4. Clear any stale auth.me query so it re-fetches with new token
      utils.auth.me.reset();
      // 5. Navigate — AuthGuard will now see user !== null and stay put
      router.replace('/(tabs)');
    },
    onError: (err: any) => {
      if (__DEV__) console.error('[Login] onError:', JSON.stringify(err));
      const msg = err?.message || err?.data?.message || 'Please check your credentials and try again.';
      Alert.alert('Sign In Failed', msg);
    },
  });

  function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    loginMutation.mutate({ email: email.trim().toLowerCase(), password });
  }

  function handlePressIn() {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }

  function handlePressOut() {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
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
          style={{ position: 'absolute', top: -40, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: '#EC489912' }}
          pointerEvents="none"
        />
        <View
          style={{ position: 'absolute', bottom: 100, left: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: '#A855F710' }}
          pointerEvents="none"
        />

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ paddingHorizontal: 28 }}>
            {/* Logo / Brand */}
            <View style={{ alignItems: 'center', marginBottom: 36 }}>
              <LinearGradient
                colors={['#EC4899', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}
              >
                <Ionicons name="heart" size={36} color="#fff" />
              </LinearGradient>
              <Text style={{ fontSize: 34, fontWeight: '900', color: '#F1F0FF', letterSpacing: -0.5, textAlign: 'center' }}>
                Soapies
              </Text>
              <Text style={{ color: '#5A5575', fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 0 }}>
                Your community. Your vibe.
              </Text>
            </View>

            {/* Email input */}
            <View style={{
              backgroundColor: '#0C0C1A',
              borderColor: emailFocused ? '#EC489960' : '#1A1A30',
              borderWidth: emailFocused ? 1.5 : 1,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 12,
            }}>
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

            {/* Password input */}
            <View style={{
              backgroundColor: '#0C0C1A',
              borderColor: passwordFocused ? '#EC489960' : '#1A1A30',
              borderWidth: passwordFocused ? 1.5 : 1,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <Ionicons name="lock-closed" size={18} color="#5A5575" style={{ marginRight: 10 }} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#5A5575"
                secureTextEntry={!showPassword}
                autoComplete="password"
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                style={{ flex: 1, color: '#F1F0FF', fontSize: 15 }}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color="#5A5575" />
              </TouchableOpacity>
            </View>

            {/* Forgot password */}
            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password' as any)}
              style={{ alignSelf: 'flex-end', marginBottom: 20 }}
            >
              <Text style={{ color: '#A855F7', fontWeight: '600', fontSize: 14, textAlign: 'right' }}>
                Forgot password?
              </Text>
            </TouchableOpacity>

            {/* Sign In button */}
            <Animated.View style={{
              transform: [{ scale: scaleAnim }],
              shadowColor: '#EC4899',
              shadowOpacity: 0.4,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 4 },
            }}>
              <TouchableOpacity
                onPress={handleLogin}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={loginMutation.isPending}
                activeOpacity={1}
              >
                <LinearGradient
                  colors={['#EC4899', '#A855F7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 18, paddingVertical: 16, width: '100%', alignItems: 'center' }}
                >
                  {loginMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Sign up link */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
              <Text style={{ color: '#5A5575' }}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/onboarding' as any)}>
                <Text style={{ color: '#EC4899', fontWeight: '700' }}>Join now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
