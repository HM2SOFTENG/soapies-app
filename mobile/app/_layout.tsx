import '../global.css';
import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { trpc, createTRPCClient, SESSION_COOKIE_KEY } from '../lib/trpc';
import { AuthProvider, useAuth } from '../lib/auth';
import { StatusBar } from 'expo-status-bar';

const queryClient = new QueryClient({
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
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (meQuery.data !== undefined) {
      setUser(meQuery.data as any);
    }
  }, [meQuery.data]);

  useEffect(() => {
    if (isLoading || meQuery.isLoading) return;

    const checkAuth = async () => {
      const cookie = await SecureStore.getItemAsync(SESSION_COOKIE_KEY);
      const inAuthGroup = segments[0] === '(auth)';

      // No cookie and no user → go to login
      if (!cookie && !inAuthGroup) {
        router.replace('/(auth)/login');
        return;
      }

      // Has cookie but server returned null user (expired/invalid session) → go to login
      if (cookie && meQuery.data === null && !meQuery.isLoading) {
        await SecureStore.deleteItemAsync(SESSION_COOKIE_KEY);
        if (!inAuthGroup) router.replace('/(auth)/login');
        return;
      }

      // Authenticated user on auth screen → redirect to app
      if (cookie && meQuery.data && inAuthGroup) {
        router.replace('/(tabs)');
      }
    };

    checkAuth();
  }, [isLoading, meQuery.isLoading, meQuery.data, segments]);

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
