import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import * as SecureStore from 'expo-secure-store';
import type { AppRouter } from '../../server/routers';

export const trpc = createTRPCReact<AppRouter>();

export const SESSION_COOKIE_KEY = 'app_session_cookie';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://soapies-app-3uk2q.ondigitalocean.app';
console.log('[trpc] API_URL:', API_URL);

// In-memory token cache — avoids SecureStore async read latency on every request
// SecureStore is still used for persistence across app restarts
let _memoryToken: string | null = null;

export function setMemoryToken(token: string | null) {
  _memoryToken = token;
  console.log('[trpc] memoryToken set, length:', token?.length ?? 0);
}

export function getMemoryToken(): string | null {
  return _memoryToken;
}

export async function loadTokenFromStorage(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(SESSION_COOKIE_KEY);
    if (token) {
      _memoryToken = token;
      console.log('[trpc] loaded token from SecureStore, length:', token.length);
    }
    return token;
  } catch (e) {
    console.warn('[trpc] SecureStore load failed:', e);
    return null;
  }
}

export async function saveToken(token: string): Promise<void> {
  // Set in memory FIRST (synchronous, immediate)
  _memoryToken = token;
  console.log('[trpc] token saved to memory, length:', token.length);
  // Then persist to SecureStore (async, for next app launch)
  try {
    await SecureStore.setItemAsync(SESSION_COOKIE_KEY, token);
    console.log('[trpc] token persisted to SecureStore');
  } catch (e) {
    console.warn('[trpc] SecureStore save failed:', e);
  }
}

export async function clearToken(): Promise<void> {
  _memoryToken = null;
  try {
    await SecureStore.deleteItemAsync(SESSION_COOKIE_KEY);
  } catch (e) {
    console.warn('[trpc] SecureStore delete failed:', e);
  }
}

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${API_URL}/api/trpc`,
        transformer: superjson,
        async headers() {
          // Use in-memory token first (instant), fall back to SecureStore
          const token = _memoryToken ?? await SecureStore.getItemAsync(SESSION_COOKIE_KEY).catch(() => null);
          if (token) {
            console.log('[trpc] headers() token length:', token.length, 'parts:', token.split('.').length);
            return { Cookie: `app_session_id=${token}` };
          }
          console.log('[trpc] headers() NO TOKEN');
          return {};
        },
        async fetch(url, options) {
          const path = String(url).split('/api/trpc/')[1]?.substring(0, 40) ?? String(url).substring(0, 40);
          const res = await global.fetch(url as string, options as any);
          if (res.status === 401) console.warn('[trpc] 401 on', path);
          if (res.status >= 400) console.log('[trpc] fetch', path, 'status:', res.status);
          return res;
        },
      }),
    ],
  });
}
