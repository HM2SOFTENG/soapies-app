// Storage helpers for Soapies Playgroup
// Supports DigitalOcean Spaces (S3-compatible) as primary storage
// Falls back to Forge API proxy if Spaces is not configured

import { ENV } from './_core/env';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ─── S3 CLIENT (DigitalOcean Spaces) ──────────────────────────────────────

let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (_s3Client) return _s3Client;

  _s3Client = new S3Client({
    endpoint: ENV.spacesEndpoint,
    region: ENV.spacesRegion,
    credentials: {
      accessKeyId: ENV.spacesKey,
      secretAccessKey: ENV.spacesSecret,
    },
    forcePathStyle: false, // DO Spaces uses virtual-hosted-style URLs
  });

  return _s3Client;
}

function isSpacesConfigured(): boolean {
  return !!(ENV.spacesKey && ENV.spacesSecret && ENV.spacesBucket);
}

// ─── FORGE API (legacy fallback) ──────────────────────────────────────────

type StorageConfig = { baseUrl: string; apiKey: string };

function getForgeConfig(): StorageConfig | null {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) return null;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  // Primary: DigitalOcean Spaces
  if (isSpacesConfigured()) {
    return spacesUpload(key, data, contentType);
  }

  // Fallback: Forge API proxy
  const forgeConfig = getForgeConfig();
  if (forgeConfig) {
    return forgeUpload(forgeConfig, key, data, contentType);
  }

  // Last resort fallback: convert to base64 data URL so uploads don't hard-fail
  // This works for small images but is not ideal for production
  console.warn("[Storage] No storage backend configured — storing as data URL. Configure DO_SPACES_* or S3_* env vars for production.");
  const buf = typeof data === "string" ? Buffer.from(data) : Buffer.from(data as any);
  const dataUrl = `data:${contentType};base64,${buf.toString("base64")}`;
  return { key, url: dataUrl };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  // Primary: DigitalOcean Spaces
  if (isSpacesConfigured()) {
    return spacesGetUrl(key);
  }

  // Fallback: Forge API proxy
  const forgeConfig = getForgeConfig();
  if (forgeConfig) {
    return forgeGetUrl(forgeConfig, key);
  }

  throw new Error("No storage backend configured.");
}

// ─── DIGITALOCEAN SPACES IMPLEMENTATION ───────────────────────────────────

async function spacesUpload(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const bucket = ENV.spacesBucket;

  const body = typeof data === "string" ? Buffer.from(data) : data;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: "public-read", // Photos need to be publicly accessible
    })
  );

  // Build the public CDN URL
  // DO Spaces CDN format: https://{bucket}.{region}.cdn.digitaloceanspaces.com/{key}
  const url = `https://${bucket}.${ENV.spacesRegion}.cdn.digitaloceanspaces.com/${key}`;

  return { key, url };
}

async function spacesGetUrl(key: string): Promise<{ key: string; url: string }> {
  // For public-read objects, return the CDN URL directly
  const bucket = ENV.spacesBucket;
  const url = `https://${bucket}.${ENV.spacesRegion}.cdn.digitaloceanspaces.com/${key}`;
  return { key, url };
}

// ─── FORGE API IMPLEMENTATION (legacy) ────────────────────────────────────

async function forgeUpload(
  config: StorageConfig,
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const uploadUrl = new URL("v1/storage/upload", ensureTrailingSlash(config.baseUrl));
  uploadUrl.searchParams.set("path", key);

  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, key.split("/").pop() ?? key);

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(config.apiKey),
    body: form,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }

  const url = (await response.json()).url;
  return { key, url };
}

async function forgeGetUrl(
  config: StorageConfig,
  key: string
): Promise<{ key: string; url: string }> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(config.baseUrl)
  );
  downloadApiUrl.searchParams.set("path", key);
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(config.apiKey),
  });
  const url = (await response.json()).url;
  return { key, url };
}
