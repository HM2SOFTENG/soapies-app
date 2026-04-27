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
import { useAuth } from '../../lib/auth';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setUser, setHasToken } = useAuth();
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [otpFocused, setOtpFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const utils = trpc.useUtils();

  async function finishAuth(data: any) {
    if (!data?.sessionToken) {
      Alert.alert('Sign In Failed', 'No session token returned. Please try again.');
      return;
    }
    await saveToken(data.sessionToken);
    if (data?.user) setUser(data.user);
    setHasToken(true);
    utils.auth.me.reset();
    router.replace('/(tabs)');
  }

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: finishAuth,
    onError: (err: any) => {
      if (__DEV__) console.error('[Login] onError:', JSON.stringify(err));
      const msg =
        err?.message || err?.data?.message || 'Please check your credentials and try again.';
      Alert.alert('Sign In Failed', msg);
    },
  });

  const sendPhoneOtpMutation = trpc.auth.sendPhoneOtp.useMutation({
    onSuccess: (data: any) => {
      setIsNewUser(!!data?.isNewUser);
      setShowOtpInput(true);
      Alert.alert('Code Sent', 'We sent a verification code to your phone.');
    },
    onError: (err: any) => {
      const msg = err?.message || err?.data?.message || 'Could not send a verification code.';
      Alert.alert('SMS Failed', msg);
    },
  });

  const verifyPhoneOtpMutation = trpc.auth.verifyPhoneOtp.useMutation({
    onSuccess: finishAuth,
    onError: (err: any) => {
      const msg =
        err?.message || err?.data?.message || 'The verification code is invalid or expired.';
      Alert.alert('Verification Failed', msg);
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

  function handleSendPhoneOtp() {
    const normalizedPhone = phone.trim();
    if (normalizedPhone.length < 10) {
      Alert.alert('Missing phone', 'Please enter a valid phone number.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    sendPhoneOtpMutation.mutate({ phone: normalizedPhone });
  }

  function handleVerifyPhoneOtp() {
    const normalizedPhone = phone.trim();
    if (otpCode.trim().length !== 6) {
      Alert.alert('Invalid code', 'Please enter the 6-digit verification code.');
      return;
    }
    if (isNewUser && !newUserName.trim()) {
      Alert.alert('Name required', 'Please enter your name to finish creating your account.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    verifyPhoneOtpMutation.mutate({
      phone: normalizedPhone,
      code: otpCode.trim(),
      name: isNewUser ? newUserName.trim() : undefined,
    });
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

        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 48,
            paddingBottom: insets.bottom + 32,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ paddingHorizontal: 28 }}>
            {/* Logo / Brand */}
            <View style={{ alignItems: 'center', marginBottom: 36 }}>
              <LinearGradient
                colors={['#EC4899', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Ionicons name="heart" size={36} color="#fff" />
              </LinearGradient>
              <Text
                style={{
                  fontSize: 34,
                  fontWeight: '900',
                  color: '#F1F0FF',
                  letterSpacing: -0.5,
                  textAlign: 'center',
                }}
              >
                Soapies
              </Text>
              <Text
                style={{
                  color: '#5A5575',
                  fontSize: 14,
                  textAlign: 'center',
                  marginTop: 6,
                  marginBottom: 0,
                }}
              >
                Your community. Your vibe.
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                backgroundColor: '#0C0C1A',
                borderRadius: 18,
                borderWidth: 1,
                borderColor: '#1A1A30',
                padding: 4,
                marginBottom: 18,
              }}
            >
              {[
                { key: 'email', label: 'Email' },
                { key: 'phone', label: 'Phone OTP' },
              ].map((option) => {
                const active = mode === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    onPress={() => {
                      setMode(option.key as 'email' | 'phone');
                      setShowOtpInput(false);
                      setOtpCode('');
                      setNewUserName('');
                    }}
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      paddingVertical: 12,
                      alignItems: 'center',
                      backgroundColor: active ? '#1A1A30' : 'transparent',
                    }}
                  >
                    <Text style={{ color: active ? '#F1F0FF' : '#817B99', fontWeight: '700' }}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {mode === 'email' ? (
              <>
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
                    marginBottom: 12,
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

                <View
                  style={{
                    backgroundColor: '#0C0C1A',
                    borderColor: passwordFocused ? '#EC489960' : '#1A1A30',
                    borderWidth: passwordFocused ? 1.5 : 1,
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Ionicons
                    name="lock-closed"
                    size={18}
                    color="#5A5575"
                    style={{ marginRight: 10 }}
                  />
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
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color="#5A5575" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => router.push('/(auth)/forgot-password' as any)}
                  style={{ alignSelf: 'flex-end', marginBottom: 20 }}
                >
                  <Text
                    style={{
                      color: '#A855F7',
                      fontWeight: '600',
                      fontSize: 14,
                      textAlign: 'right',
                    }}
                  >
                    Forgot password?
                  </Text>
                </TouchableOpacity>

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
                      style={{
                        borderRadius: 18,
                        paddingVertical: 16,
                        width: '100%',
                        alignItems: 'center',
                      }}
                    >
                      {loginMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                          Sign In
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </>
            ) : (
              <>
                <View
                  style={{
                    backgroundColor: '#0C0C1A',
                    borderColor: phoneFocused ? '#EC489960' : '#1A1A30',
                    borderWidth: phoneFocused ? 1.5 : 1,
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Ionicons name="call" size={18} color="#5A5575" style={{ marginRight: 10 }} />
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Phone number"
                    placeholderTextColor="#5A5575"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    onFocus={() => setPhoneFocused(true)}
                    onBlur={() => setPhoneFocused(false)}
                    editable={!showOtpInput}
                    style={{ flex: 1, color: '#F1F0FF', fontSize: 15 }}
                  />
                </View>

                {showOtpInput && isNewUser ? (
                  <View
                    style={{
                      backgroundColor: '#0C0C1A',
                      borderColor: nameFocused ? '#EC489960' : '#1A1A30',
                      borderWidth: nameFocused ? 1.5 : 1,
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <Ionicons name="person" size={18} color="#5A5575" style={{ marginRight: 10 }} />
                    <TextInput
                      value={newUserName}
                      onChangeText={setNewUserName}
                      placeholder="Your name"
                      placeholderTextColor="#5A5575"
                      onFocus={() => setNameFocused(true)}
                      onBlur={() => setNameFocused(false)}
                      style={{ flex: 1, color: '#F1F0FF', fontSize: 15 }}
                    />
                  </View>
                ) : null}

                {showOtpInput ? (
                  <View
                    style={{
                      backgroundColor: '#0C0C1A',
                      borderColor: otpFocused ? '#EC489960' : '#1A1A30',
                      borderWidth: otpFocused ? 1.5 : 1,
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <Ionicons name="keypad" size={18} color="#5A5575" style={{ marginRight: 10 }} />
                    <TextInput
                      value={otpCode}
                      onChangeText={setOtpCode}
                      placeholder="6-digit code"
                      placeholderTextColor="#5A5575"
                      keyboardType="number-pad"
                      maxLength={6}
                      onFocus={() => setOtpFocused(true)}
                      onBlur={() => setOtpFocused(false)}
                      style={{ flex: 1, color: '#F1F0FF', fontSize: 15, letterSpacing: 4 }}
                    />
                  </View>
                ) : null}

                <Text style={{ color: '#817B99', fontSize: 13, lineHeight: 20, marginBottom: 20 }}>
                  {showOtpInput
                    ? isNewUser
                      ? 'Enter the SMS code and your name to create your account.'
                      : 'Enter the SMS code we just sent to your phone.'
                    : 'Use a one-time SMS code to sign in, or create a new account if your number is new.'}
                </Text>

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
                    onPress={showOtpInput ? handleVerifyPhoneOtp : handleSendPhoneOtp}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={sendPhoneOtpMutation.isPending || verifyPhoneOtpMutation.isPending}
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
                      {sendPhoneOtpMutation.isPending || verifyPhoneOtpMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                          {showOtpInput ? 'Verify Code' : 'Send Code'}
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                {showOtpInput ? (
                  <TouchableOpacity
                    onPress={() => {
                      setShowOtpInput(false);
                      setOtpCode('');
                      setNewUserName('');
                    }}
                    style={{ alignSelf: 'center', marginTop: 14 }}
                  >
                    <Text style={{ color: '#A855F7', fontWeight: '600', fontSize: 14 }}>
                      Use a different number
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}

            {/* Sign up link */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
              <Text style={{ color: '#5A5575' }}>Don&apos;t have an account? </Text>
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
