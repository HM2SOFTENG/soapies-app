import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import * as SecureStore from 'expo-secure-store';
import type { AppRouter } from '../../server/routers';

export const trpc = createTRPCReact<AppRouter>();

export const SESSION_COOKIE_KEY = 'app_session_cookie';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://soapies-app-3uk2q.ondigitalocean.app';

console.log('[trpc] API_URL:', API_URL);

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${API_URL}/api/trpc`,
        transformer: superjson,
        async headers() {
          try {
            const token = await SecureStore.getItemAsync(SESSION_COOKIE_KEY);
            if (token) {
              return { Cookie: `app_session_id=${token}` };
            }
          } catch (e) {
            console.warn('[trpc] SecureStore read failed:', e);
          }
          return {};
        },
      }),
    ],
  });
}
