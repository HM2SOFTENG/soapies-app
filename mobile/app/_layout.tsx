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

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Sync valid user into auth context
  useEffect(() => {
    if (meQuery.data) {
      setUser(meQuery.data as any);
    }
  }, [meQuery.data]);

  // On JWT error — clear token and kick to login
  useEffect(() => {
    if (meQuery.error) {
      console.log('[AuthGuard] invalid token, clearing...');
      SecureStore.deleteItemAsync(SESSION_COOKIE_KEY).catch(() => {});
      queryClient.clear();
      logout();
    }
  }, [meQuery.error]);

  useEffect(() => {
    if (isLoading) return;
    if (meQuery.isLoading || meQuery.isFetching) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (meQuery.data && !meQuery.error) {
      // Valid session — redirect away from login if needed
      if (inAuthGroup) router.replace('/(tabs)');
      return;
    }

    if (!meQuery.data || meQuery.error) {
      // No session — redirect to login if needed
      if (!inAuthGroup) router.replace('/(auth)/login');
    }
  }, [isLoading, meQuery.isLoading, meQuery.isFetching, meQuery.data, meQuery.error, segments]);

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
