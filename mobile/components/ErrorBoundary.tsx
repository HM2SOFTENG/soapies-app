import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../lib/colors';

type Props = {
  children: React.ReactNode;
  /** Optional hook for reporting errors to a remote service (Sentry, etc.). */
  onError?: (error: Error, info: React.ErrorInfo) => void;
};

type State = {
  error: Error | null;
  info: React.ErrorInfo | null;
};

/**
 * Root-level error boundary. Catches render/lifecycle errors anywhere below
 * it in the tree and renders a dark-themed fallback with "Try again" and
 * "Sign out" affordances.
 *
 * Wrap this AROUND AuthGuard in app/_layout.tsx — we want to recover from
 * auth-context and routing failures, not just tab-screen errors.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ info });
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
    this.props.onError?.(error, info);
  }

  reset = () => {
    this.setState({ error: null, info: null });
  };

  signOut = async () => {
    // Clear every known token key, then reset so the nav layer routes to landing.
    const keys = [
      'app_session_cookie',
      'app_session_id',
      'session_token',
      'sessionToken',
      'SESSION_COOKIE',
    ];
    await Promise.all(
      keys.map((k) => SecureStore.deleteItemAsync(k).catch(() => {}))
    );
    this.reset();
  };

  render() {
    const { error, info } = this.state;

    if (!error) return this.props.children;

    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0A0515', '#0D0820', '#050508']}
          style={StyleSheet.absoluteFill}
        />
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconWrap}>
            <LinearGradient
              colors={['#EC4899', '#A855F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconBubble}
            >
              <Text style={styles.iconText}>!</Text>
            </LinearGradient>
          </View>

          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            The app hit an unexpected error. You can try again, or sign out and start fresh.
          </Text>

          {__DEV__ && (
            <View style={styles.devBox}>
              <Text style={styles.devLabel}>DEV — error</Text>
              <Text style={styles.devText} selectable>
                {error.message || String(error)}
              </Text>
              {info?.componentStack ? (
                <>
                  <Text style={[styles.devLabel, { marginTop: 12 }]}>componentStack</Text>
                  <Text style={styles.devText} selectable>
                    {info.componentStack.trim()}
                  </Text>
                </>
              ) : null}
            </View>
          )}

          <TouchableOpacity onPress={this.reset} activeOpacity={0.85} style={styles.primaryWrap}>
            <LinearGradient
              colors={['#EC4899', '#A855F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primary}
            >
              <Text style={styles.primaryText}>Try again</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={this.signOut} activeOpacity={0.85} style={styles.secondary}>
            <Text style={styles.secondaryText}>Sign out</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
}

export default ErrorBoundary;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: 48,
    alignItems: 'center',
  },
  iconWrap: { marginBottom: 24 },
  iconBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EC4899',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  iconText: { color: '#fff', fontSize: 40, fontWeight: '900' },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    maxWidth: 340,
  },
  devBox: {
    width: '100%',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  devLabel: {
    color: colors.pink,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  devText: {
    color: colors.text,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  primaryWrap: { width: '100%', marginBottom: 12 },
  primary: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  secondary: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderColor: 'rgba(168,85,247,0.5)',
    borderWidth: 1.5,
    backgroundColor: 'rgba(168,85,247,0.08)',
  },
  secondaryText: { color: colors.purple, fontSize: 15, fontWeight: '700' },
});
