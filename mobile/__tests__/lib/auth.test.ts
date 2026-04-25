/**
 * JWT validation tests for lib/auth.tsx
 *
 * Tests the isValidJWT utility function which validates JWT structure
 * (3-part format) and length constraints (100–300 chars).
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../lib/trpc', () => ({
  loadTokenFromStorage: vi.fn(),
  clearToken: vi.fn(),
  SESSION_COOKIE_KEY: 'app_session_cookie',
}));

import { isValidJWT } from '../../lib/auth';

describe('lib/auth — isValidJWT validation', () => {
  it('returns true for valid 3-part JWT at ~150 chars', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    expect(token.length).toBeGreaterThanOrEqual(100);
    expect(token.length).toBeLessThan(300);
    expect(isValidJWT(token)).toBe(true);
  });

  it('returns false for 2-part token (missing signature)', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0';
    expect(isValidJWT(token)).toBe(false);
  });

  it('returns false for 4-part token (extra segment)', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.extra.parts';
    expect(isValidJWT(token)).toBe(false);
  });

  it('returns false for null token', () => {
    expect(isValidJWT(null)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidJWT('')).toBe(false);
  });

  it('returns false for 1-part token', () => {
    const token = 'onlyonepart';
    expect(isValidJWT(token)).toBe(false);
  });

  it('returns false for 3-part token too short (under 100 chars)', () => {
    const token = 'a.b.c'; // 5 chars, 3 parts
    expect(token.length).toBeLessThan(100);
    expect(isValidJWT(token)).toBe(false);
  });

  it('returns false for 3-part token at exactly 100 chars boundary because current validation is strictly greater than 100', () => {
    const token = 'a'.repeat(33) + '.' + 'b'.repeat(33) + '.' + 'c'.repeat(32);
    expect(token.length).toBe(100);
    expect(isValidJWT(token)).toBe(false);
  });

  it('returns false for 3-part token just under 100 chars (99 chars)', () => {
    const token = 'a'.repeat(33) + '.' + 'b'.repeat(32) + '.' + 'c'.repeat(32);
    expect(token.length).toBe(99);
    expect(isValidJWT(token)).toBe(false);
  });

  it('returns true for 3-part token near 300 char upper boundary (295 chars)', () => {
    // Create token with 295 chars
    const part1 = 'a'.repeat(100);
    const part2 = 'b'.repeat(100);
    const part3 = 'c'.repeat(93);
    const token = part1 + '.' + part2 + '.' + part3;
    expect(token.length).toBe(295);
    expect(isValidJWT(token)).toBe(true);
  });

  it('returns false for 3-part token at exactly 300 chars (not < 300)', () => {
    // Create exactly 300 chars: 100 + 1 + 100 + 1 + 98
    const token = 'a'.repeat(100) + '.' + 'b'.repeat(100) + '.' + 'c'.repeat(98);
    expect(token.length).toBe(300);
    expect(isValidJWT(token)).toBe(false);
  });

  it('returns false for 3-part token over 300 chars', () => {
    const token = 'a'.repeat(150) + '.' + 'b'.repeat(150) + '.' + 'c'.repeat(50);
    expect(token.length).toBeGreaterThanOrEqual(300);
    expect(isValidJWT(token)).toBe(false);
  });

  it('accepts typical JWT structure (header.payload.signature)', () => {
    // Standard JWT structure example
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({ sub: '123', name: 'Test User' })).toString('base64');
    const signature = 'test_signature_' + 'x'.repeat(20);
    const token = header + '.' + payload + '.' + signature;
    expect(token.split('.').length).toBe(3);
    if (token.length >= 100 && token.length < 300) {
      expect(isValidJWT(token)).toBe(true);
    }
  });

  it('handles tokens with special characters in parts', () => {
    const token = 'header-abc_123.payload-def_456.sig-789_xyz';
    const parts = token.split('.');
    expect(parts.length).toBe(3);
    // Verify it's valid if length is in range
    if (token.length >= 100 && token.length < 300) {
      expect(isValidJWT(token)).toBe(true);
    } else {
      expect(isValidJWT(token)).toBe(false);
    }
  });
});
