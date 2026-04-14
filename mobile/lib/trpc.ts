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
              console.log('[trpc] headers() sending token, length:', token.length, 'parts:', token.split('.').length);
              return { Cookie: `app_session_id=${token}` };
            } else {
              console.log('[trpc] headers() NO TOKEN in SecureStore');
            }
          } catch (e) {
            console.warn('[trpc] SecureStore read failed:', e);
          }
          return {};
        },
        async fetch(url, options) {
          const urlStr = String(url);
          const path = urlStr.split('/api/trpc/')[1]?.substring(0, 40) ?? urlStr.substring(0, 40);
          console.log('[trpc] fetch ->', path);
          const res = await global.fetch(url as string, options as any);
          console.log('[trpc] fetch <-', path, 'status:', res.status);
          if (res.status === 401) {
            console.warn('[trpc] 401 UNAUTHORIZED on', path);
          }
          return res;
        },
      }),
    ],
  });
}
