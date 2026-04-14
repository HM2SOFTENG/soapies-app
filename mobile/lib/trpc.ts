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

          // Try Set-Cookie header first (works in some environments)
          const setCookie = response.headers.get('set-cookie');
          if (setCookie) {
            const match = setCookie.match(/app_session_id=([^;]+)/);
            if (match?.[1]) {
              console.log('[trpc] captured session from Set-Cookie header');
              await SecureStore.setItemAsync(SESSION_COOKIE_KEY, match[1]);
              return response;
            }
          }

          // Fallback: read session token from response body (for httpOnly cookie environments)
          // We clone the response so we can read the body without consuming it
          try {
            const cloned = response.clone();
            const json = await cloned.json();
            // tRPC batch response is array, single is object
            const results = Array.isArray(json) ? json : [json];
            for (const item of results) {
              const token = item?.result?.data?.json?.sessionToken;
              if (token && typeof token === 'string') {
                console.log('[trpc] captured session from response body');
                await SecureStore.setItemAsync(SESSION_COOKIE_KEY, token);
                break;
              }
            }
          } catch {
            // not JSON or no token — that's fine
          }

          return response;
        },
      }),
    ],
  });
}
