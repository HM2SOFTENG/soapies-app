export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // DigitalOcean Spaces / S3-compatible storage
  // Accepts both DO_SPACES_* and generic S3_* env var names
  spacesKey: process.env.DO_SPACES_KEY ?? process.env.S3_ACCESS_KEY_ID ?? "",
  spacesSecret:
    process.env.DO_SPACES_SECRET ?? process.env.S3_SECRET_ACCESS_KEY ?? "",
  spacesBucket:
    process.env.DO_SPACES_BUCKET ?? process.env.S3_BUCKET ?? "soapies-uploads",
  spacesRegion: process.env.DO_SPACES_REGION ?? process.env.S3_REGION ?? "sfo3",
  spacesEndpoint:
    process.env.DO_SPACES_ENDPOINT ??
    process.env.S3_ENDPOINT ??
    "https://sfo3.digitaloceanspaces.com",
  sendgridApiKey: process.env.SENDGRID_API_KEY ?? "",
  sendgridFromEmail:
    process.env.SENDGRID_FROM_EMAIL ?? "noreply@soapiesplaygrp.club",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER ?? "",
  // Admin seed account (auto-created on first startup)
  adminEmail: process.env.ADMIN_EMAIL ?? "admin@soapiesplaygrp.club",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "",
  // Web Push (VAPID)
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  vapidEmail: process.env.VAPID_EMAIL ?? "admin@soapiesplaygrp.club",
  // Platform Ops integrations
  githubToken: process.env.GITHUB_TOKEN ?? "",
  githubRepo: process.env.GITHUB_REPOSITORY ?? "",
  githubBranch: process.env.GITHUB_WORKFLOW_BRANCH ?? "",
  githubPrNumber: process.env.GITHUB_PR_NUMBER ?? "",
  digitalOceanToken:
    process.env.DIGITALOCEAN_TOKEN ?? process.env.DO_API_TOKEN ?? "",
  digitalOceanAppId:
    process.env.DIGITALOCEAN_APP_ID ?? process.env.DO_APP_ID ?? "",
  expoToken: process.env.EXPO_TOKEN ?? "",
  expoProjectId: process.env.EXPO_PROJECT_ID ?? "",
};
