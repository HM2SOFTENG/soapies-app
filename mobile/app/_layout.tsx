import '../global.css';
import React, { useEffect, useRef } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { trpc, createTRPCClient, SESSION_COOKIE_KEY } from '../lib/trpc';
import { AuthProvider, useAuth } from '../lib/auth';
import { StatusBar } from 'expo-status-bar';

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
  const { isLoading, user, setUser, logout } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const didValidateRef = useRef(false);

  // Only validate session once on cold start (when there's no user in context yet)
  // After login, user is set via setUser() and we don't need to re-validate
  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: !user && !isLoading, // only query when no user in context
    retry: false,
    staleTime: Infinity,          // once validated, never re-fetch automatically
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Sync server-validated user into context (cold start)
  useEffect(() => {
    if (meQuery.data && !user) {
      console.log('[AuthGuard] cold start user:', (meQuery.data as any).email);
      setUser(meQuery.data as any);
    }
  }, [meQuery.data]);

  // Clear token on JWT error
  useEffect(() => {
    if (meQuery.error) {
      console.log('[AuthGuard] session invalid, clearing token');
      SecureStore.deleteItemAsync(SESSION_COOKIE_KEY).catch(() => {});
      queryClient.clear();
      logout();
    }
  }, [meQuery.error]);

  // Routing logic
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    // User is set (either from login or cold-start validation)
    if (user) {
      if (inAuthGroup) router.replace('/(tabs)');
      return;
    }

    // No user + meQuery done + no error = server confirmed no session
    if (!meQuery.isLoading && meQuery.fetchStatus === 'idle' && !meQuery.data) {
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }
  }, [isLoading, user, meQuery.isLoading, meQuery.fetchStatus, meQuery.data, segments]);

  if (isLoading) return null;

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <AuthProvider>
            <StatusBar style="light" />
            <AuthGuard>
              <Slot />
            </AuthGuard>
          </AuthProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
