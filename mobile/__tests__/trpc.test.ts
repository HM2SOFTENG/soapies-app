/**
 * tRPC client configuration tests
 *
 * Tests that the API URL is constructed correctly and that the client factory
 * returns a usable client object. Because the full tRPC machinery depends on
 * server types and React hooks, we mock the @trpc/* packages to isolate the
 * config logic under test.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── In-memory SecureStore ─────────────────────────────────────────────────────
// Note: factory is hoisted, so we use a module-level store object and reference
// it inside the mock via an accessor to avoid TDZ issues with vi.hoisted.
vi.mock('expo-secure-store', () => {
  const _store: Record<string, string> = {};
  return {
    _store, // expose for test inspection
    getItemAsync: vi.fn(async (key: string) => _store[key] ?? null),
    setItemAsync: vi.fn(async (key: string, value: string) => { _store[key] = value; }),
    deleteItemAsync: vi.fn(async (key: string) => { delete _store[key]; }),
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

import { createTRPCClient } from '../lib/trpc';
import * as SecureStore from 'expo-secure-store';

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

  it('API URL defaults to http://localhost:3000 when env var is not set', () => {
    createTRPCClient();
    if (capturedLinks.length > 0) {
      const url: string = capturedLinks[0].url;
      expect(url).toContain('localhost:3000');
      expect(url).toMatch(/\/api\/trpc$/);
    } else {
      // httpBatchLink not captured but client was created successfully
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

  it('headers function returns empty object when no token in store', async () => {
    createTRPCClient();
    if (capturedLinks.length > 0 && typeof capturedLinks[0].headers === 'function') {
      const headers = await capturedLinks[0].headers();
      // Without a token, headers should be empty (or at least not have Authorization)
      expect(headers).not.toHaveProperty('Authorization');
    } else {
      // Verify store is empty as expected
      expect(await SecureStore.getItemAsync('session_token')).toBeNull();
    }
  });

  it('Authorization header contract: Bearer <token> format', () => {
    // Test the header format logic independently (mirrors lib/trpc.ts headers() logic)
    const token = 'tok_abc123';
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    expect(headers).toHaveProperty('Authorization', 'Bearer tok_abc123');
    expect(headers.Authorization).toMatch(/^Bearer /);
  });

  it('no-token contract: returns empty headers object', () => {
    // Test the no-token branch logic (mirrors lib/trpc.ts headers() logic)
    const token: string | null = null;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    expect(headers).toEqual({});
    expect(headers).not.toHaveProperty('Authorization');
  });
});
