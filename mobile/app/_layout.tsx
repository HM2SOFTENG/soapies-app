import '../global.css';
import React, { useEffect } from 'react';
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
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const trpcClient = createTRPCClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, user, setUser } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Fetch current user from server to validate session
  // Only runs when a session cookie exists — avoids spurious null on first load
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
    // Don't treat a null response as an error that kicks the user out
    // The guard below handles the redirect logic
  });

  useEffect(() => {
    if (meQuery.data) {
      setUser(meQuery.data as any);
    }
  }, [meQuery.data]);

  useEffect(() => {
    if (isLoading) return;

    const checkAuth = async () => {
      const cookie = await SecureStore.getItemAsync(SESSION_COOKIE_KEY);
      const inAuthGroup = segments[0] === '(auth)';

      // If we have a user in local state, never redirect to login
      if (user) {
        if (inAuthGroup) router.replace('/(tabs)');
        return;
      }

      // No cookie → not logged in
      if (!cookie) {
        if (!inAuthGroup) router.replace('/(auth)/login');
        return;
      }

      // Has cookie — wait for meQuery to finish before deciding
      if (meQuery.isLoading || meQuery.isFetching) return;

      // Cookie exists but server says no valid session (expired/invalid)
      if (meQuery.data === null && meQuery.fetchStatus === 'idle') {
        await SecureStore.deleteItemAsync(SESSION_COOKIE_KEY);
        if (!inAuthGroup) router.replace('/(auth)/login');
        return;
      }

      // Cookie + valid server session on auth screen → redirect to app
      if (meQuery.data && inAuthGroup) {
        router.replace('/(tabs)');
      }
    };

    checkAuth();
  }, [isLoading, user, meQuery.isLoading, meQuery.isFetching, meQuery.fetchStatus, meQuery.data, segments]);

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
