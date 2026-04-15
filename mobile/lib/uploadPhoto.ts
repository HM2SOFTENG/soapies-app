/**
 * Upload a local image URI to the Soapies photo storage API.
 *
 * Sends raw binary (application/octet-stream) with X-Image-Type header
 * instead of multipart/form-data, which avoids the multipart envelope
 * being stored as corrupted image data on the server.
 */

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://soapies-app-3uk2q.ondigitalocean.app';

export async function uploadPhoto(uri: string): Promise<string> {
  // Determine mime type from extension
  const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', webp: 'image/webp', heic: 'image/jpeg',
  };
  const mimeType = mimeMap[ext] ?? 'image/jpeg';

  // Read the file as a blob and send as raw binary
  const response = await fetch(uri);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const uploadRes = await fetch(`${API_URL}/api/upload-photo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-Image-Type': mimeType,
    },
    body: buffer,
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => uploadRes.statusText);
    throw new Error(`Upload failed (${uploadRes.status}): ${text}`);
  }

  const { url } = await uploadRes.json();
  if (!url) throw new Error('No URL returned from upload');
  return url;
}
