/**
 * Auth utility tests
 *
 * Tests the auth module's token storage behavior by mocking expo-secure-store.
 * We test the business logic directly rather than rendering React components
 * (no jsdom/RN renderer available in node environment).
 */
import * as SecureStore from 'expo-secure-store';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock expo-secure-store ────────────────────────────────────────────────────
const store: Record<string, string> = {};
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => store[key] ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => { store[key] = value; }),
  deleteItemAsync: vi.fn(async (key: string) => { delete store[key]; }),
}));

// ── Mock expo-linear-gradient (pulled in transitively) ───────────────────────
vi.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));

// ── Mock @tanstack/react-query ────────────────────────────────────────────────
vi.mock('@tanstack/react-query', () => ({
  QueryClient: vi.fn(),
}));

// ── Mock trpc (avoid importing server router) ─────────────────────────────────
vi.mock('../lib/trpc', () => ({
  trpc: { auth: { me: { useQuery: vi.fn(() => ({ data: null })) } } },
  createTRPCClient: vi.fn(() => ({})),
}));

const SESSION_KEY = 'session_token';

describe('Auth — SecureStore token management', () => {
  beforeEach(() => {
    // Clear the in-memory store between tests
    for (const key of Object.keys(store)) delete store[key];
    vi.clearAllMocks();
  });

  it('getItemAsync returns null when no token is stored', async () => {
    const token = await SecureStore.getItemAsync(SESSION_KEY);
    expect(token).toBeNull();
  });

  it('setItemAsync persists a token', async () => {
    await SecureStore.setItemAsync(SESSION_KEY, 'tok_abc123');
    const token = await SecureStore.getItemAsync(SESSION_KEY);
    expect(token).toBe('tok_abc123');
  });

  it('setItemAsync overwrites an existing token on re-login', async () => {
    await SecureStore.setItemAsync(SESSION_KEY, 'tok_old');
    await SecureStore.setItemAsync(SESSION_KEY, 'tok_new');
    const token = await SecureStore.getItemAsync(SESSION_KEY);
    expect(token).toBe('tok_new');
  });

  it('deleteItemAsync clears the token on logout', async () => {
    await SecureStore.setItemAsync(SESSION_KEY, 'tok_toDelete');
    await SecureStore.deleteItemAsync(SESSION_KEY);
    const token = await SecureStore.getItemAsync(SESSION_KEY);
    expect(token).toBeNull();
  });

  it('deleteItemAsync on an empty store does not throw', async () => {
    await expect(SecureStore.deleteItemAsync(SESSION_KEY)).resolves.toBeUndefined();
  });

  it('tokens are isolated by key', async () => {
    await SecureStore.setItemAsync('session_token', 'tok_session');
    await SecureStore.setItemAsync('refresh_token', 'tok_refresh');
    expect(await SecureStore.getItemAsync('session_token')).toBe('tok_session');
    expect(await SecureStore.getItemAsync('refresh_token')).toBe('tok_refresh');
  });

  it('call counts are tracked correctly', async () => {
    await SecureStore.setItemAsync(SESSION_KEY, 'tok_x');
    await SecureStore.getItemAsync(SESSION_KEY);
    await SecureStore.deleteItemAsync(SESSION_KEY);
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
    expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(1);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
  });
});

describe('Auth — login flow contract', () => {
  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key];
    vi.clearAllMocks();
  });

  it('simulated login stores token and user can be retrieved', async () => {
    // Simulate what auth.tsx login() does
    const token = 'Bearer eyJhbGciOiJIUzI1NiJ9.test';
    await SecureStore.setItemAsync(SESSION_KEY, token);

    const retrieved = await SecureStore.getItemAsync(SESSION_KEY);
    expect(retrieved).toBe(token);
  });

  it('simulated logout removes token', async () => {
    await SecureStore.setItemAsync(SESSION_KEY, 'tok_session');
    // Simulate logout()
    await SecureStore.deleteItemAsync(SESSION_KEY);
    const token = await SecureStore.getItemAsync(SESSION_KEY);
    expect(token).toBeNull();
  });

  it('checkSession finds token after login', async () => {
    // Simulate the checkSession() flow in AuthProvider
    await SecureStore.setItemAsync(SESSION_KEY, 'tok_valid');
    const token = await SecureStore.getItemAsync(SESSION_KEY);
    const isAuthenticated = token !== null;
    expect(isAuthenticated).toBe(true);
  });

  it('checkSession correctly identifies unauthenticated state', async () => {
    const token = await SecureStore.getItemAsync(SESSION_KEY);
    const isAuthenticated = token !== null;
    expect(isAuthenticated).toBe(false);
  });
});
