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
import { useRouter, Link } from 'expo-router';
import { trpc, saveToken } from '../../lib/trpc';
import { queryClient } from '../_layout';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';

export default function LoginScreen() {
  const router = useRouter();
  const { setUser, setHasToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data: any) => {
      if (!data?.sessionToken) {
        Alert.alert('Sign In Failed', 'No session token returned. Please try again.');
        return;
      }

      // 1. Save token to memory + SecureStore
      await saveToken(data.sessionToken);

      // 2. Mark token as available — this triggers re-render of all enabled:hasToken queries
      setHasToken(true);

      // 3. Set user in auth context
      if (data?.user) setUser(data.user);

      // 4. Navigate
      router.replace('/(tabs)');
    },
    onError: (err: any) => {
      console.error('[Login] onError:', JSON.stringify(err));
      const msg = err?.message || err?.data?.message || 'Please check your credentials and try again.';
      Alert.alert('Sign In Failed', msg);
    },
  });

  function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    console.log('[Login] attempting:', email.trim().toLowerCase());
    loginMutation.mutate({ email: email.trim().toLowerCase(), password });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
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
            Your exclusive community
          </Text>
        </LinearGradient>

        {/* Form */}
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 40 }}>
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '700', marginBottom: 24 }}>
            Welcome back
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
              marginBottom: 16,
            }}
          />

          <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 6, fontWeight: '600' }}>
            PASSWORD
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
            secureTextEntry
            autoComplete="password"
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

          {/* Forgot password */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password' as any)}
            style={{ alignSelf: 'flex-end', marginTop: -20, marginBottom: 24 }}
          >
            <Text style={{ color: colors.pink, fontWeight: '600', fontSize: 14 }}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loginMutation.isPending}
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
                opacity: loginMutation.isPending ? 0.7 : 1,
              }}
            >
              {loginMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Sign In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
            <Text style={{ color: colors.muted }}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={{ color: colors.pink, fontWeight: '600' }}>Join Soapies</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
