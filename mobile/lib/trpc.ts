import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import * as SecureStore from 'expo-secure-store';
import type { AppRouter } from '../../server/routers';

export const trpc = createTRPCReact<AppRouter>();

export const SESSION_COOKIE_KEY = 'app_session_cookie';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://soapies-app-3uk2q.ondigitalocean.app';
console.log('[trpc] API_URL:', API_URL);

// In-memory token — PRIMARY source of truth for all requests
// SecureStore is ONLY used to persist across cold app restarts
let _memoryToken: string | null = null;

export function setMemoryToken(token: string | null) {
  _memoryToken = token;
}

export function getMemoryToken(): string | null {
  return _memoryToken;
}

export async function loadTokenFromStorage(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(SESSION_COOKIE_KEY);
    console.log('[loadToken] SecureStore read, length:', token?.length ?? 0, 'parts:', token?.split('.').length ?? 0);
    if (token) _memoryToken = token;
    return token;
  } catch (e) {
    console.warn('[trpc] SecureStore load failed:', e);
    return null;
  }
}

export async function saveToken(token: string): Promise<void> {
  console.log('[saveToken] length:', token.length, 'parts:', token.split('.').length);
  // Always update memory immediately
  _memoryToken = token;
  // Delete first, then write — avoids iOS Keychain update race
  try {
    await SecureStore.deleteItemAsync(SESSION_COOKIE_KEY);
    await SecureStore.setItemAsync(SESSION_COOKIE_KEY, token);
    const verify = await SecureStore.getItemAsync(SESSION_COOKIE_KEY);
    console.log('[saveToken] verify length:', verify?.length, 'ok:', verify === token);
  } catch (e) {
    console.warn('[trpc] SecureStore save failed:', e);
  }
}

export async function clearToken(): Promise<void> {
  console.log('[clearToken] clearing memory + SecureStore');
  _memoryToken = null;
  // Clear all known key variants
  for (const key of [SESSION_COOKIE_KEY, 'app_session_id', 'session_token', 'sessionToken']) {
    await SecureStore.deleteItemAsync(key).catch(() => {});
  }
}

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${API_URL}/api/trpc`,
        transformer: superjson,
        async headers() {
          // ALWAYS use in-memory token — never read SecureStore per-request
          // SecureStore is only read once at app startup via loadTokenFromStorage()
          if (_memoryToken) {
            return { Cookie: `app_session_id=${_memoryToken}` };
          }
          return {};
        },
        async fetch(url, options) {
          const path = String(url).split('/api/trpc/')[1]?.substring(0, 50) ?? '';
          const res = await global.fetch(url as string, options as any);
          if (res.status === 401) console.warn('[trpc] 401 on', path);
          return res;
        },
      }),
    ],
  });
}
