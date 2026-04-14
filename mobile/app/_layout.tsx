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
      retry: false,         // don't retry failed auth queries
      staleTime: 0,         // always re-fetch on mount — no stale data across logins
      gcTime: 0,            // don't cache after unmount
    },
  },
});

// Recreate the tRPC client fresh each time the layout mounts
// This ensures no stale headers/cookies persist
const trpcClient = createTRPCClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, user, setUser, logout } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const hasRedirected = useRef(false);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // When server returns valid user, sync into auth context
  useEffect(() => {
    if (meQuery.data) {
      setUser(meQuery.data as any);
    }
  }, [meQuery.data]);

  // When server returns an error (invalid/expired JWT), nuke the token
  useEffect(() => {
    if (meQuery.error) {
      console.log('[AuthGuard] meQuery error — clearing token:', meQuery.error.message);
      SecureStore.deleteItemAsync(SESSION_COOKIE_KEY).then(() => {
        queryClient.clear();
        logout();
      });
    }
  }, [meQuery.error]);

  useEffect(() => {
    if (isLoading) return;
    // Wait until meQuery is done loading before making routing decisions
    if (meQuery.isLoading || meQuery.isFetching) return;

    const navigate = async () => {
      const cookie = await SecureStore.getItemAsync(SESSION_COOKIE_KEY);
      const inAuthGroup = segments[0] === '(auth)';

      // Valid session — user data confirmed by server
      if (meQuery.data && !meQuery.error) {
        if (inAuthGroup) {
          router.replace('/(tabs)');
        }
        return;
      }

      // No cookie or invalid token — go to login
      if (!cookie || meQuery.error) {
        if (!inAuthGroup) {
          router.replace('/(auth)/login');
        }
        return;
      }
    };

    navigate();
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
