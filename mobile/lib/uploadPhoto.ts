/**
 * Upload a local image URI to the Soapies photo storage API.
 *
 * Uses expo-file-system to read the file as base64, then decodes to binary
 * before sending as raw application/octet-stream. This is reliable on both
 * iOS and Android — unlike fetch(localUri) which can fail on iOS file:// URIs.
 *
 * Auth: sends `x-session-token` + `Cookie: app_session_id=...` headers to
 * match the tRPC client pattern in lib/trpc.ts. Root BACKLOG ITEM-001
 * tracks the server-side requirement that `/api/upload-photo` verify this
 * token — once that lands, no client change is needed.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { getMemoryToken } from './trpc';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://soapies-app-3uk2q.ondigitalocean.app';

export async function uploadPhoto(uri: string): Promise<string> {
  const token = getMemoryToken();
  if (!token) {
    throw new Error('You need to be signed in to upload photos.');
  }

  const ext = uri.split('.').pop()?.toLowerCase().split('?')[0] ?? 'jpg';
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/jpeg',
    heif: 'image/jpeg',
  };
  const mimeType = mimeMap[ext] ?? 'image/jpeg';

  // Read file as base64 using expo-file-system (works reliably on iOS/Android)
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Decode base64 to binary and convert to Uint8Array
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const uploadRes = await fetch(`${API_URL}/api/upload-photo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-Image-Type': mimeType,
      'x-session-token': token,
      Cookie: `app_session_id=${token}`,
    },
    body: bytes,
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => uploadRes.statusText);
    throw new Error(`Upload failed (${uploadRes.status}): ${text}`);
  }

  const { url } = await uploadRes.json();
  if (!url) throw new Error('No URL returned from upload');
  return url;
}
