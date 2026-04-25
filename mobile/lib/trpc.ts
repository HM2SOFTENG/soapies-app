import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import * as SecureStore from 'expo-secure-store';

/**
 * Mobile should not typecheck against server implementation files.
 * Runtime behavior is defined by the HTTP tRPC endpoint; a shared contract package
 * can restore end-to-end inference later without coupling the mobile CI graph to backend deps.
 */
export const trpc = createTRPCReact() as unknown as any;

export const SESSION_COOKIE_KEY = 'app_session_cookie';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://soapies-app-3uk2q.ondigitalocean.app';

function devWarn(...args: unknown[]) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(...args);
  }
}

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
    if (token) _memoryToken = token;
    return token;
  } catch (e) {
    devWarn('[trpc] SecureStore load failed:', e);
    return null;
  }
}

export async function saveToken(token: string): Promise<void> {
  // Always update memory immediately
  _memoryToken = token;
  // Delete first, then write — avoids iOS Keychain update race
  try {
    await SecureStore.deleteItemAsync(SESSION_COOKIE_KEY);
    await SecureStore.setItemAsync(SESSION_COOKIE_KEY, token);
    // Note: removed post-write verify read (ITEM-043) — unnecessary SecureStore round-trip
  } catch (e) {
    devWarn('[trpc] SecureStore save failed:', e);
  }
}

export async function clearToken(): Promise<void> {
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
          if (_memoryToken) {
            // Use a custom header to avoid iOS native cookie jar doubling the Cookie header
            return {
              'x-session-token': _memoryToken,
              // Also send Cookie for web compatibility
              'Cookie': `app_session_id=${_memoryToken}`,
            };
          }
          return {};
        },
        async fetch(url, options) {
          const path = String(url).split('/api/trpc/')[1]?.substring(0, 50) ?? '';
          const res = await global.fetch(url as string, options as any);
          if (res.status === 401) devWarn('[trpc] 401 on', path);
          if (res.status >= 500) devWarn('[trpc] Server error on', path, res.status);
          return res;
        },
      }),
    ],
  });
}
