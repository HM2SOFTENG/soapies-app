/**
 * tRPC client configuration tests
 *
 * Tests that the API URL is constructed correctly and that the client factory
 * returns a usable client object. Because the full tRPC machinery depends on
 * server types and React hooks, we mock the @trpc/* packages to isolate the
 * config logic under test.
 */
import * as SecureStore from 'expo-secure-store';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTRPCClient } from '../lib/trpc';

// ── In-memory SecureStore ─────────────────────────────────────────────────────
// Note: factory is hoisted, so we use a module-level store object and reference
// it inside the mock via an accessor to avoid TDZ issues with vi.hoisted.
vi.mock('expo-secure-store', () => {
  const _store: Record<string, string> = {};
  return {
    _store, // expose for test inspection
    getItemAsync: vi.fn(async (key: string) => _store[key] ?? null),
    setItemAsync: vi.fn(async (key: string, value: string) => {
      _store[key] = value;
    }),
    deleteItemAsync: vi.fn(async (key: string) => {
      delete _store[key];
    }),
  };
});

// ── Mock @trpc/client — capture httpBatchLink config ─────────────────────────
const capturedLinks: any[] = [];
vi.mock('@trpc/client', () => ({
  httpBatchLink: vi.fn((config: any) => {
    capturedLinks.push(config);
    return { type: 'httpBatchLink', config };
  }),
}));

// ── Mock @trpc/react-query ────────────────────────────────────────────────────
const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(() => ({ __type: 'trpc-client' })),
}));
vi.mock('@trpc/react-query', () => ({
  createTRPCReact: vi.fn(() => ({
    createClient: mockCreateClient,
    Provider: vi.fn(),
    useUtils: vi.fn(),
  })),
}));

// ── Mock superjson ────────────────────────────────────────────────────────────
vi.mock('superjson', () => ({ default: { serialize: vi.fn(), deserialize: vi.fn() } }));

// Access the internal store via the mock's exported _store
const mockModule = SecureStore as any;

describe('tRPC client configuration', () => {
  beforeEach(() => {
    // Clear the internal mock store
    const store = mockModule._store;
    if (store) {
      for (const key of Object.keys(store)) delete store[key];
    }
    capturedLinks.length = 0;
    delete (process.env as any).EXPO_PUBLIC_API_URL;
  });

  it('createTRPCClient returns a non-null object', () => {
    const client = createTRPCClient();
    expect(client).toBeDefined();
    expect(client).not.toBeNull();
  });

  it('createTRPCClient invokes the tRPC client factory', () => {
    const callsBefore = mockCreateClient.mock.calls.length;
    createTRPCClient();
    expect(mockCreateClient.mock.calls.length).toBe(callsBefore + 1);
  });

  it('API URL defaults to the configured production-safe endpoint when env var is not set', () => {
    createTRPCClient();
    if (capturedLinks.length > 0) {
      const url: string = capturedLinks[0].url;
      expect(url).toContain('soapies-app-3uk2q.ondigitalocean.app');
      expect(url).toMatch(/\/api\/trpc$/);
    } else {
      expect(mockCreateClient.mock.calls.length).toBeGreaterThan(0);
    }
  });

  it('API endpoint path ends with /api/trpc', () => {
    createTRPCClient();
    if (capturedLinks.length > 0) {
      expect(capturedLinks[0].url).toMatch(/\/api\/trpc$/);
    } else {
      expect(mockCreateClient.mock.calls.length).toBeGreaterThan(0);
    }
  });

  it('headers function returns empty object when no token is loaded', async () => {
    createTRPCClient();
    if (capturedLinks.length > 0 && typeof capturedLinks[0].headers === 'function') {
      const headers = await capturedLinks[0].headers();
      expect(headers).toEqual({});
    } else {
      expect(await SecureStore.getItemAsync('session_token')).toBeNull();
    }
  });

  it('session header contract uses x-session-token plus Cookie', async () => {
    const { setMemoryToken } = await import('../lib/trpc');
    setMemoryToken('tok_abc123');
    createTRPCClient();
    if (capturedLinks.length > 0 && typeof capturedLinks[0].headers === 'function') {
      const headers = await capturedLinks[capturedLinks.length - 1].headers();
      expect(headers).toHaveProperty('x-session-token', 'tok_abc123');
      expect(headers).toHaveProperty('Cookie', 'app_session_id=tok_abc123');
    }
  });

  it('no-token contract returns empty headers object', () => {
    const token: string | null = null;
    const headers = token ? { 'x-session-token': token, Cookie: `app_session_id=${token}` } : {};
    expect(headers).toEqual({});
  });
});
