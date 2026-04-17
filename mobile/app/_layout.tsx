import '../global.css';
import React, { useEffect, useRef } from 'react';
import { Slot, Stack, useRouter, useSegments } from 'expo-router';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { trpc, createTRPCClient, SESSION_COOKIE_KEY } from '../lib/trpc';
import { AuthProvider, useAuth } from '../lib/auth';
import { StatusBar } from 'expo-status-bar';
import { ToastProvider } from '../components/Toast';
import LoadingScreen from '../components/LoadingScreen';
import ErrorBoundary from '../components/ErrorBoundary';
import OfflineBanner from '../components/OfflineBanner';
import { parseDeepLink } from '../lib/deepLinks';

// Configure how notifications appear when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  } as any),
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
  }, [meQuery.data]);

  // Clear bad token — do NOT call queryClient.clear() here as it resets meQuery
  // and causes an infinite 401 loop when there's no token at all
  const clearedTokenRef = React.useRef(false);
  useEffect(() => {
    if (meQuery.error && !clearedTokenRef.current) {
      clearedTokenRef.current = true;
      ['app_session_cookie','app_session_id','session_token','sessionToken'].forEach(k =>
        SecureStore.deleteItemAsync(k).catch(() => {})
      );
      logout();
    }
  }, [meQuery.error]);

  const profileQuery = trpc.profile.me.useQuery(undefined, {
    enabled: !!user,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const savePushToken = trpc.profile.savePushToken.useMutation();

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
  }, [user?.id]);

  useEffect(() => {
    if (isLoading) return;

    const seg0 = segments[0] as string | undefined;
    const inAuthGroup   = seg0 === '(auth)';
    const inTabsGroup   = seg0 === '(tabs)';
    const inOnboarding  = seg0 === 'onboarding';
    const inPending     = seg0 === 'pending-approval';
    const inSetupScreen = seg0 === 'profile-setup';
    // Landing screen = root index (segments is empty or undefined first segment)
    const inLanding     = seg0 === undefined || seg0 === 'index';

    // ── Authenticated user routing ──────────────────────────────────────────
    if (user) {
      if (profileQuery.isLoading) return;

      const profile = profileQuery.data as any;

      if (!profile && !inOnboarding) {
        router.replace('/onboarding'); return;
      }
      if (profile && !profile.profileSetupComplete && !inSetupScreen && !inOnboarding) {
        router.replace('/onboarding'); return;
      }

      const pendingStatuses = ['submitted','under_review','waitlisted','interview_scheduled','interview_complete'];
      if (profile && pendingStatuses.includes(profile.applicationStatus) && !inPending) {
        router.replace('/pending-approval'); return;
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
    isLoading, user,
    meQuery.isLoading, meQuery.fetchStatus, meQuery.data,
    profileQuery.isLoading, profileQuery.data,
    segments,
  ]);

  if (isLoading) return <LoadingScreen />;

  return <>{children}</>;
}

function DeepLinkHandler({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      try {
        const parsed = parseDeepLink(url);
        if (!parsed) {
          if (__DEV__) console.warn('[deepLink] failed to parse:', url);
          return;
        }

        // Map parsed deep link to expo-router route
        const routeMap: Record<string, string> = {
          'event': `/event/${parsed.id}`,
          'chat': `/chat/${parsed.id}`,
          'member': `/member/${parsed.id}`,
          'ticket': `/tickets`, // tickets is a tab-accessible screen
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
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  return <>{children}</>;
}

export default function RootLayout() {
  // ErrorBoundary must be outermost so it catches errors from providers AND
  // the DeepLinkHandler itself. DeepLinkHandler needs to live inside the
  // router context but must NOT own the crash-fallback.
  return (
    <ErrorBoundary>
      <DeepLinkHandler>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <ToastProvider>
              <AuthProvider>
                <StatusBar style="light" translucent backgroundColor="transparent" />
                <OfflineBanner />
                <AuthGuard>
                  <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#0D0D0D' } }}>
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
    </ErrorBoundary>
  );
}
