/**
 * Auth token memory and storage tests for lib/trpc.ts
 *
 * Tests the in-memory token buffer and persistent SecureStore integration.
 * Validates round-trip behavior, memory clearing, and SecureStore mocking.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock expo-secure-store ────────────────────────────────────────────────────
const store: Record<string, string> = {};
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => store[key] ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => { store[key] = value; }),
  deleteItemAsync: vi.fn(async (key: string) => { delete store[key]; }),
}));

// ── Mock @trpc/react-query ────────────────────────────────────────────────────
vi.mock('@trpc/react-query', () => ({
  createTRPCReact: vi.fn(() => ({
    createClient: vi.fn(() => ({ __type: 'trpc-client' })),
  })),
}));

// ── Mock @trpc/client ─────────────────────────────────────────────────────────
vi.mock('@trpc/client', () => ({
  httpBatchLink: vi.fn(() => ({ type: 'httpBatchLink' })),
}));

// ── Mock superjson ────────────────────────────────────────────────────────────
vi.mock('superjson', () => ({ default: {} }));

// ── Mock console.warn to verify __DEV__ gating ────────────────────────────────
const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

import {
  setMemoryToken,
  getMemoryToken,
  clearToken,
  saveToken,
  loadTokenFromStorage,
  SESSION_COOKIE_KEY,
} from '../../lib/trpc';
import * as SecureStore from 'expo-secure-store';

describe('lib/trpc — token memory buffer', () => {
  beforeEach(() => {
    // Clear memory token and storage mock
    setMemoryToken(null);
    for (const key of Object.keys(store)) delete store[key];
    vi.clearAllMocks();
    warnSpy.mockClear();
  });

  it('setMemoryToken + getMemoryToken round-trip', () => {
    setMemoryToken('test-token-123');
    expect(getMemoryToken()).toBe('test-token-123');
  });

  it('getMemoryToken returns null initially', () => {
    expect(getMemoryToken()).toBeNull();
  });

  it('setMemoryToken(null) clears the token', () => {
    setMemoryToken('token-abc');
    setMemoryToken(null);
    expect(getMemoryToken()).toBeNull();
  });

  it('memory token updates overwrite previous value', () => {
    setMemoryToken('token-1');
    expect(getMemoryToken()).toBe('token-1');
    setMemoryToken('token-2');
    expect(getMemoryToken()).toBe('token-2');
  });
});

describe('lib/trpc — clearToken', () => {
  beforeEach(() => {
    setMemoryToken(null);
    for (const key of Object.keys(store)) delete store[key];
    vi.clearAllMocks();
  });

  it('clearToken empties memory token', async () => {
    setMemoryToken('token-to-clear');
    await clearToken();
    expect(getMemoryToken()).toBeNull();
  });

  it('clearToken deletes SESSION_COOKIE_KEY from SecureStore', async () => {
    await SecureStore.setItemAsync(SESSION_COOKIE_KEY, 'some-token');
    await clearToken();
    const retrieved = await SecureStore.getItemAsync(SESSION_COOKIE_KEY);
    expect(retrieved).toBeNull();
  });

  it('clearToken removes all legacy token keys', async () => {
    const keys = [SESSION_COOKIE_KEY, 'app_session_id', 'session_token', 'sessionToken'];
    for (const key of keys) {
      await SecureStore.setItemAsync(key, 'dummy');
    }
    await clearToken();
    for (const key of keys) {
      const val = await SecureStore.getItemAsync(key);
      expect(val).toBeNull();
    }
  });
});

describe('lib/trpc — saveToken', () => {
  beforeEach(() => {
    setMemoryToken(null);
    for (const key of Object.keys(store)) delete store[key];
    vi.clearAllMocks();
    warnSpy.mockClear();
  });

  it('saveToken updates memory token immediately', async () => {
    await saveToken('new-token');
    expect(getMemoryToken()).toBe('new-token');
  });

  it('saveToken calls SecureStore.deleteItemAsync then setItemAsync', async () => {
    await saveToken('test-token');
    const deleteCall = (SecureStore.deleteItemAsync as any).mock.calls[0];
    const setCall = (SecureStore.setItemAsync as any).mock.calls[0];
    expect(deleteCall[0]).toBe(SESSION_COOKIE_KEY);
    expect(setCall[0]).toBe(SESSION_COOKIE_KEY);
    expect(setCall[1]).toBe('test-token');
  });

  it('saveToken persists token in SecureStore', async () => {
    await saveToken('persistent-token');
    const stored = await SecureStore.getItemAsync(SESSION_COOKIE_KEY);
    expect(stored).toBe('persistent-token');
  });

  it('saveToken does not throw on SecureStore errors in __DEV__', async () => {
    (SecureStore.setItemAsync as any).mockRejectedValueOnce(new Error('Mock error'));
    // Should not throw
    await expect(saveToken('token')).resolves.toBeUndefined();
    // In __DEV__, console.warn should be called
    // Note: the actual __DEV__ check depends on build; we just verify no throw
  });
});

describe('lib/trpc — loadTokenFromStorage', () => {
  beforeEach(() => {
    setMemoryToken(null);
    for (const key of Object.keys(store)) delete store[key];
    vi.clearAllMocks();
    warnSpy.mockClear();
  });

  it('loadTokenFromStorage returns null when no token stored', async () => {
    const token = await loadTokenFromStorage();
    expect(token).toBeNull();
  });

  it('loadTokenFromStorage loads token from SecureStore into memory', async () => {
    await SecureStore.setItemAsync(SESSION_COOKIE_KEY, 'stored-token');
    const token = await loadTokenFromStorage();
    expect(token).toBe('stored-token');
    expect(getMemoryToken()).toBe('stored-token');
  });

  it('loadTokenFromStorage returns previously stored token', async () => {
    await SecureStore.setItemAsync(SESSION_COOKIE_KEY, 'existing-token');
    const result = await loadTokenFromStorage();
    expect(result).toBe('existing-token');
  });

  it('loadTokenFromStorage does not throw on SecureStore errors', async () => {
    (SecureStore.getItemAsync as any).mockRejectedValueOnce(new Error('Load error'));
    const token = await loadTokenFromStorage();
    expect(token).toBeNull();
  });

  it('loadTokenFromStorage returns null and does not update memory on error', async () => {
    setMemoryToken('existing-token');
    (SecureStore.getItemAsync as any).mockRejectedValueOnce(new Error('Lookup failed'));
    const token = await loadTokenFromStorage();
    expect(token).toBeNull();
    expect(getMemoryToken()).toBe('existing-token'); // unchanged
  });
});

describe('lib/trpc — SESSION_COOKIE_KEY constant', () => {
  it('SESSION_COOKIE_KEY is defined', () => {
    expect(SESSION_COOKIE_KEY).toBeDefined();
  });

  it('SESSION_COOKIE_KEY is a non-empty string', () => {
    expect(typeof SESSION_COOKIE_KEY).toBe('string');
    expect(SESSION_COOKIE_KEY.length).toBeGreaterThan(0);
  });
});
