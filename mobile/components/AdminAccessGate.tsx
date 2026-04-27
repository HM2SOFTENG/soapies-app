import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';

type AdminAccessGateProps =
  | { mode: 'loading'; onBack?: never }
  | { mode: 'denied'; onBack: () => void };

export default function AdminAccessGate(props: AdminAccessGateProps) {
  const theme = useTheme();

  if (props.mode === 'loading') {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 18,
            fontWeight: '700',
            marginTop: 16,
          }}
        >
          Verifying admin access…
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: 14,
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          Hang tight while we confirm your permissions.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
      }}
    >
      <Ionicons name="lock-closed" size={48} color={theme.colors.textMuted} />
      <Text
        style={{
          color: theme.colors.text,
          fontSize: 18,
          fontWeight: '700',
          marginTop: 16,
          marginBottom: 8,
        }}
      >
        Access Denied
      </Text>
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: 14,
          textAlign: 'center',
          marginBottom: 24,
        }}
      >
        You need admin privileges to access this area.
      </Text>
      <TouchableOpacity
        onPress={props.onBack}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 24,
          backgroundColor: theme.colors.surface,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Go Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
