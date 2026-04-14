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
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import * as SecureStore from 'expo-secure-store';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async (data: any) => {
      // After register, user may be pending approval
      if (data?.token) {
        await SecureStore.setItemAsync('session_token', data.token);
      }
      Alert.alert(
        'Welcome to Soapies! 🎉',
        'Your application is under review. We\'ll notify you once you\'re approved.',
        [{ text: 'Got it', onPress: () => router.replace('/(auth)/login') }],
      );
    },
    onError: (err) => {
      Alert.alert('Registration Failed', err.message || 'Something went wrong.');
    },
  });

  function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please fill out all fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Password too short', 'Password must be at least 8 characters.');
      return;
    }
    registerMutation.mutate({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    });
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
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
          className="px-8 pt-20 pb-10 items-center"
        >
          <Text style={{ fontSize: 42, fontWeight: '800', color: '#fff', letterSpacing: -1 }}>
            Soapies
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4, fontSize: 15 }}>
            Apply for membership
          </Text>
        </LinearGradient>

        <View className="flex-1 px-6 pt-10">
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '700', marginBottom: 8 }}>
            Create Account
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14, marginBottom: 28 }}>
            Membership is by approval. We'll review your application.
          </Text>

          {[
            { label: 'YOUR NAME', value: name, setter: setName, placeholder: 'Jane Smith', keyboard: 'default' as const, secure: false, auto: 'name' as const },
            { label: 'EMAIL', value: email, setter: setEmail, placeholder: 'you@example.com', keyboard: 'email-address' as const, secure: false, auto: 'email' as const },
            { label: 'PASSWORD', value: password, setter: setPassword, placeholder: '••••••••', keyboard: 'default' as const, secure: true, auto: 'password' as const },
          ].map(({ label, value, setter, placeholder, keyboard, secure, auto }) => (
            <View key={label} style={{ marginBottom: 16 }}>
              <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 6, fontWeight: '600' }}>
                {label}
              </Text>
              <TextInput
                value={value}
                onChangeText={setter}
                placeholder={placeholder}
                placeholderTextColor={colors.muted}
                keyboardType={keyboard}
                autoCapitalize={label === 'YOUR NAME' ? 'words' : 'none'}
                autoComplete={auto}
                secureTextEntry={secure}
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  color: colors.text,
                  fontSize: 16,
                }}
              />
            </View>
          ))}

          <View style={{ height: 12 }} />

          <TouchableOpacity
            onPress={handleRegister}
            disabled={registerMutation.isPending}
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
                opacity: registerMutation.isPending ? 0.7 : 1,
              }}
            >
              {registerMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                  Apply for Membership
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24, marginBottom: 40 }}>
            <Text style={{ color: colors.muted }}>Already a member? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={{ color: colors.pink, fontWeight: '600' }}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
