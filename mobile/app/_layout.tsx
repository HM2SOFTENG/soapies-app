import '../global.css';
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import * as Linking from 'expo-linking';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { trpc, createTRPCClient } from '../lib/trpc';
import { AuthProvider, useAuth } from '../lib/auth';
import { StatusBar } from 'expo-status-bar';
import { ToastProvider } from '../components/Toast';
import LoadingScreen from '../components/LoadingScreen';
import AppErrorBoundary from '../components/ErrorBoundary';
import OfflineBanner from '../components/OfflineBanner';
import { parseDeepLink } from '../lib/deepLinks';
import { ThemeProvider, useTheme } from '../lib/theme';
import { useFonts } from 'expo-font';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';

// Configure how notifications appear when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }) as any,
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const trpcClient = createTRPCClient();

function getErrorCode(error: any): string | undefined {
  return error?.data?.code ?? error?.shape?.data?.code ?? error?.shape?.code;
}

function getErrorStatus(error: any): number | undefined {
  return error?.data?.httpStatus ?? error?.shape?.data?.httpStatus ?? error?.meta?.response?.status;
}

function isAuthFailure(error: any): boolean {
  const code = getErrorCode(error);
  const status = getErrorStatus(error);
  const message = String(error?.message ?? '').toLowerCase();

  return (
    code === 'UNAUTHORIZED' ||
    code === 'FORBIDDEN' ||
    status === 401 ||
    status === 403 ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('not logged in') ||
    message.includes('not authenticated')
  );
}

function ShellErrorScreen({
  title,
  message,
  onRetry,
  onLogout,
}: {
  title: string;
  message: string;
  onRetry: () => void;
  onLogout?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>
        {title}
      </Text>
      <Text
        style={{
          color: colors.textMuted,
          fontSize: 14,
          lineHeight: 21,
          textAlign: 'center',
          marginTop: 10,
        }}
      >
        {message}
      </Text>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
        <TouchableOpacity
          onPress={onRetry}
          style={{
            paddingHorizontal: 18,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '800' }}>Retry</Text>
        </TouchableOpacity>
        {onLogout && (
          <TouchableOpacity
            onPress={onLogout}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: colors.tintSoft,
              borderWidth: 1,
              borderColor: colors.focusRing,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '800' }}>Log out</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, user, hasToken, setUser, logout, setHasToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Cold-start session validation — only runs when no user yet AND there's a token
  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: !user && !isLoading && hasToken,
    retry: false,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Hydrate user from cold-start token
  useEffect(() => {
    if (meQuery.data && !user) {
      setUser(meQuery.data as any);
      setHasToken(true);
    }
  }, [meQuery.data, setHasToken, setUser, user]);

  // Only clear a stored token on real auth failures — not transient network issues.
  const clearedTokenRef = React.useRef(false);
  useEffect(() => {
    if (!meQuery.error || clearedTokenRef.current || !isAuthFailure(meQuery.error)) return;
    clearedTokenRef.current = true;
    logout();
  }, [meQuery.error, logout]);

  const profileQuery = trpc.profile.me.useQuery(undefined, {
    enabled: !!user,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const savePushToken = trpc.profile.savePushToken.useMutation();
  const profileAuthFailureRef = React.useRef(false);

  useEffect(() => {
    if (!profileQuery.error || profileAuthFailureRef.current || !isAuthFailure(profileQuery.error))
      return;
    profileAuthFailureRef.current = true;
    logout();
  }, [profileQuery.error, logout]);

  // Register for push notifications once user is logged in
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;
        const tokenData = await Notifications.getExpoPushTokenAsync();
        savePushToken.mutate({
          token: tokenData.data,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
        });
      } catch {
        // Non-fatal — push is best-effort
      }
    })();
  }, [savePushToken, user]);

  useEffect(() => {
    if (isLoading) return;

    const seg0 = segments[0] as string | undefined;
    const inAuthGroup = seg0 === '(auth)';
    const inTabsGroup = seg0 === '(tabs)';
    const inOnboarding = seg0 === 'onboarding';
    const inPending = seg0 === 'pending-approval';
    const inSetupScreen = seg0 === 'profile-setup';
    // Landing screen = root index (segments is empty or undefined first segment)
    const inLanding = seg0 === undefined || seg0 === 'index';

    // ── Authenticated user routing ──────────────────────────────────────────
    if (user) {
      if (profileQuery.isLoading) return;

      const profile = profileQuery.data as any;

      if (!profile && !inOnboarding) {
        router.replace('/onboarding');
        return;
      }
      if (profile && !profile.profileSetupComplete && !inSetupScreen && !inOnboarding) {
        router.replace('/onboarding');
        return;
      }

      const pendingStatuses = [
        'submitted',
        'under_review',
        'waitlisted',
        'interview_scheduled',
        'interview_complete',
        'rejected',
      ];
      if (profile && pendingStatuses.includes(profile.applicationStatus) && !inPending) {
        router.replace('/pending-approval');
        return;
      }

      if (profile && profile.applicationStatus === 'approved') {
        if (inAuthGroup || inSetupScreen || inOnboarding || inPending || inLanding) {
          router.replace('/(tabs)');
        }
        return;
      }

      if (inAuthGroup || inSetupScreen || inLanding) {
        router.replace('/(tabs)');
      }
      return;
    }

    // ── Unauthenticated user routing ────────────────────────────────────────
    // If no token: meQuery never fires (disabled), fetchStatus stays 'idle'
    // If token exists but invalid: meQuery fires, 401 error, clearedTokenRef prevents loop
    // Either way: if not hasToken OR meQuery is done → can make routing decisions
    const meQuerySettled = !hasToken || (!meQuery.isLoading && meQuery.fetchStatus !== 'fetching');
    // Don't redirect while meQuery is still validating a stored token — might be a fresh login
    if (!meQuerySettled) return;

    // Only bounce away from tabs if we're truly unauthenticated (no token at all)
    // This prevents a race where a fresh login sets hasToken but user context
    // hasn't propagated yet to this effect
    if (inTabsGroup && !hasToken) {
      router.replace('/');
    }
    // Let landing/auth/onboarding/pending render freely — no forced redirect needed
  }, [
    isLoading,
    user,
    meQuery.isLoading,
    meQuery.fetchStatus,
    meQuery.data,
    profileQuery.isLoading,
    profileQuery.data,
    router,
    segments,
    hasToken,
  ]);

  if (isLoading) return <LoadingScreen />;

  if (!user && hasToken && meQuery.isError && !isAuthFailure(meQuery.error)) {
    return (
      <ShellErrorScreen
        title="Could not restore your session"
        message={
          (meQuery.error as any)?.message ??
          'The app could not verify your session right now. Retry before logging out.'
        }
        onRetry={() => meQuery.refetch()}
        onLogout={() => logout()}
      />
    );
  }

  if (user && profileQuery.isError && !isAuthFailure(profileQuery.error)) {
    return (
      <ShellErrorScreen
        title="Could not load your account"
        message={
          (profileQuery.error as any)?.message ??
          'The app could not load your profile data right now.'
        }
        onRetry={() => profileQuery.refetch()}
        onLogout={() => logout()}
      />
    );
  }

  return <>{children}</>;
}

function DeepLinkHandler({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleDeepLink = React.useCallback(
    (url: string) => {
      try {
        const parsed = parseDeepLink(url);
        if (!parsed) {
          if (__DEV__) console.warn('[deepLink] failed to parse:', url);
          return;
        }

        // Map parsed deep link to expo-router route
        const routeMap: Record<string, string> = {
          event: `/event/${parsed.id}`,
          chat: `/chat/${parsed.id}`,
          member: `/member/${parsed.id}`,
          ticket: `/tickets`, // tickets is a tab-accessible screen
        };

        const route = routeMap[parsed.type];
        if (route) {
          (router as any).push(route);
        } else {
          if (__DEV__) console.warn('[deepLink] unknown type:', parsed.type);
        }
      } catch (error) {
        if (__DEV__) console.error('[deepLink] error handling url:', error);
      }
    },
    [router]
  );

  // Handle cold-start deep links (app launched from a push notification tap)
  React.useEffect(() => {
    Linking.getInitialURL()
      .then((url) => {
        if (url) handleDeepLink(url);
      })
      .catch(() => {});
  }, [handleDeepLink]);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, [router, handleDeepLink]);

  return <>{children}</>;
}

function AppShell() {
  const { colors } = useTheme();

  return (
    <DeepLinkHandler>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <ToastProvider>
              <AuthProvider>
                <StatusBar style={colors.statusBar} translucent backgroundColor="transparent" />
                <OfflineBanner />
                <AuthGuard>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      animation: 'slide_from_right',
                      contentStyle: { backgroundColor: colors.background },
                    }}
                  >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="onboarding" />
                    <Stack.Screen name="pending-approval" />
                    <Stack.Screen name="profile-setup" />
                    <Stack.Screen name="edit-profile" />
                    <Stack.Screen name="members" />
                    <Stack.Screen name="tickets" />
                    <Stack.Screen name="event/[id]" />
                    <Stack.Screen name="chat/[id]" />
                    <Stack.Screen name="member/[id]" />
                    <Stack.Screen name="admin/index" />
                    <Stack.Screen name="admin/events" />
                    <Stack.Screen name="admin/event-ops" />
                    <Stack.Screen name="admin/announcements" />
                    <Stack.Screen name="admin/applications" />
                    <Stack.Screen name="admin/reservations" />
                    <Stack.Screen name="admin/checkin" />
                    <Stack.Screen name="settings" />
                    <Stack.Screen name="admin/settings" />
                  </Stack>
                </AuthGuard>
              </AuthProvider>
            </ToastProvider>
          </SafeAreaProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </DeepLinkHandler>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  if (!fontsLoaded) {
    return <LoadingScreen />;
  }

  // ErrorBoundary must be outermost so it catches errors from providers AND
  // the DeepLinkHandler itself. DeepLinkHandler needs to live inside the
  // router context but must NOT own the crash-fallback.
  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
