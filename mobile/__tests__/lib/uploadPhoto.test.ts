/**
 * Photo upload tests for lib/uploadPhoto.ts
 *
 * Tests the uploadPhoto function's auth token handling, header construction,
 * and response processing. Mocks FileSystem and fetch.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock expo-file-system/legacy ──────────────────────────────────────────────
vi.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: vi.fn(async (uri: string) => {
    // Return a known base64 string (minimal JPEG header for testing)
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }),
  EncodingType: {
    Base64: 'base64',
  },
}));

// ── Mock lib/trpc for token management ────────────────────────────────────────
let memoryToken: string | null = null;
vi.mock('../../lib/trpc', () => ({
  getMemoryToken: vi.fn(() => memoryToken),
  setMemoryToken: vi.fn((token: string | null) => {
    memoryToken = token;
  }),
  SESSION_COOKIE_KEY: 'app_session_cookie',
}));

// ── Mock global.fetch ─────────────────────────────────────────────────────────
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as any;

import { uploadPhoto } from '../../lib/uploadPhoto';
import { setMemoryToken, getMemoryToken } from '../../lib/trpc';

describe('lib/uploadPhoto — authentication and headers', () => {
  beforeEach(() => {
    memoryToken = null;
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  it('throws error when no token is set', async () => {
    setMemoryToken(null);
    await expect(uploadPhoto('file:///test.jpg')).rejects.toThrow(
      'You need to be signed in to upload photos.'
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('throws before fetch when token is null', async () => {
    setMemoryToken(null);
    const error = new Error();
    await expect(uploadPhoto('file:///test.jpg')).rejects.toBeDefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('calls fetch when token is set', async () => {
    setMemoryToken('valid-token-123');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn(async () => ({ url: 'https://example.com/photo.jpg' })),
    });

    const result = await uploadPhoto('file:///test.jpg');
    expect(mockFetch).toHaveBeenCalled();
    expect(result).toBe('https://example.com/photo.jpg');
  });

  it('includes x-session-token header with memory token', async () => {
    setMemoryToken('test-token-456');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn(async () => ({ url: 'https://example.com/img.jpg' })),
    });

    await uploadPhoto('file:///test.jpg');

    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1]?.headers ?? {};
    expect(headers['x-session-token']).toBe('test-token-456');
  });

  it('includes Cookie header with app_session_id format', async () => {
    setMemoryToken('session-xyz');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn(async () => ({ url: 'https://example.com/photo.jpg' })),
    });

    await uploadPhoto('file:///test.jpg');

    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1]?.headers ?? {};
    expect(headers['Cookie']).toBe('app_session_id=session-xyz');
  });

  it('sends both x-session-token and Cookie headers in same request', async () => {
    setMemoryToken('dual-header-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn(async () => ({ url: 'https://example.com/test.jpg' })),
    });

    await uploadPhoto('file:///test.jpg');

    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1]?.headers ?? {};
    expect(headers['x-session-token']).toBe('dual-header-token');
    expect(headers['Cookie']).toContain('app_session_id=dual-header-token');
    expect(headers).toHaveProperty('x-session-token');
    expect(headers).toHaveProperty('Cookie');
  });
});

describe('lib/uploadPhoto — response handling', () => {
  beforeEach(() => {
    memoryToken = 'valid-token';
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  it('returns url from successful response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn(async () => ({ url: 'https://cdn.example.com/images/photo-123.jpg' })),
    });

    const result = await uploadPhoto('file:///test.jpg');
    expect(result).toBe('https://cdn.example.com/images/photo-123.jpg');
  });

  it('throws on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: vi.fn(async () => 'Invalid image format'),
    });

    await expect(uploadPhoto('file:///test.jpg')).rejects.toThrow('Upload failed');
  });

  it('includes status code in error message on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: vi.fn(async () => ''),
    });

    await expect(uploadPhoto('file:///test.jpg')).rejects.toThrow('500');
  });

  it('throws when response has no url field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn(async () => ({})), // missing url
    });

    await expect(uploadPhoto('file:///test.jpg')).rejects.toThrow('No URL returned');
  });

  it('throws when response url is null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn(async () => ({ url: null })),
    });

    await expect(uploadPhoto('file:///test.jpg')).rejects.toThrow('No URL returned');
  });

  it('throws when response url is empty string', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn(async () => ({ url: '' })),
    });

    await expect(uploadPhoto('file:///test.jpg')).rejects.toThrow('No URL returned');
  });
});

describe('lib/uploadPhoto — file handling', () => {
  beforeEach(() => {
    memoryToken = 'token-file-test';
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  it('extracts file extension from uri', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn(async () => ({ url: 'https://example.com/test.jpg' })),
    });

    await uploadPhoto('file:///path/to/image.png');

    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1]?.headers ?? {};
    // Should set X-Image-Type based on .png extension
    expect(headers['X-Image-Type']).toBe('image/png');
  });

  it('maps jpg extension to image/jpeg mime type', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn(async () => ({ url: 'https://example.com/test.jpg' })),
    });

    await uploadPhoto('file:///photo.jpg');

    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1]?.headers ?? {};
    expect(headers['X-Image-Type']).toBe('image/jpeg');
  });

  it('defaults to image/jpeg for unknown extensions', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn(async () => ({ url: 'https://example.com/test' })),
    });

    await uploadPhoto('file:///photo');

    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1]?.headers ?? {};
    expect(headers['X-Image-Type']).toBe('image/jpeg');
  });

  it('sets Content-Type to application/octet-stream', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn(async () => ({ url: 'https://example.com/test.jpg' })),
    });

    await uploadPhoto('file:///test.jpg');

    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1]?.headers ?? {};
    expect(headers['Content-Type']).toBe('application/octet-stream');
  });

  it('uses POST method for upload', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn(async () => ({ url: 'https://example.com/test.jpg' })),
    });

    await uploadPhoto('file:///test.jpg');

    const callArgs = mockFetch.mock.calls[0];
    const options = callArgs[1];
    expect(options?.method).toBe('POST');
  });

  it('constructs correct API endpoint URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn(async () => ({ url: 'https://example.com/test.jpg' })),
    });

    await uploadPhoto('file:///test.jpg');

    const callArgs = mockFetch.mock.calls[0];
    const url: string = callArgs[0];
    expect(url).toContain('/api/upload-photo');
  });
});

describe('lib/uploadPhoto — concurrent calls', () => {
  beforeEach(() => {
    memoryToken = 'token-concurrent';
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  it('handles multiple sequential uploads', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn(async () => ({ url: 'https://example.com/photo1.jpg' })),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn(async () => ({ url: 'https://example.com/photo2.jpg' })),
      });

    const url1 = await uploadPhoto('file:///test1.jpg');
    const url2 = await uploadPhoto('file:///test2.jpg');

    expect(url1).toBe('https://example.com/photo1.jpg');
    expect(url2).toBe('https://example.com/photo2.jpg');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
