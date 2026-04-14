import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import * as SecureStore from 'expo-secure-store';
import type { AppRouter } from '../../server/routers';

export const trpc = createTRPCReact<AppRouter>();

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// The server uses cookie-based auth (app_session_id).
// On React Native, cookies are not handled automatically, so we store the
// cookie value in SecureStore and manually inject it as a Cookie header.
export const SESSION_COOKIE_KEY = 'app_session_cookie';

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${API_URL}/api/trpc`,
        transformer: superjson,
        async headers() {
          const cookie = await SecureStore.getItemAsync(SESSION_COOKIE_KEY);
          if (cookie) {
            return { Cookie: `app_session_id=${cookie}` };
          }
          return {};
        },
        async fetch(url, options) {
          const response = await global.fetch(url as string, {
            ...options,
            credentials: 'include',
          });
          // Capture Set-Cookie from login/register responses and persist it
          const setCookie = response.headers.get('set-cookie');
          if (setCookie) {
            const match = setCookie.match(/app_session_id=([^;]+)/);
            if (match?.[1]) {
              await SecureStore.setItemAsync(SESSION_COOKIE_KEY, match[1]);
            }
          }
          return response;
        },
      }),
    ],
  });
}
