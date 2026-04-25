# Soapies Mobile CI Secrets

These secrets are required for release automation. Do not commit raw values.

## What we can already infer from repo-local credentials notes

The root `CREDENTIALS.md` indicates these GitHub Actions secrets already exist for the repo's server/deploy workflows:

- `DATABASE_URL`
- `DIGITALOCEAN_ACCESS_TOKEN`
- `DO_APP_ID`
- `DO_REGISTRY_NAME`
- `JWT_SECRET`
- `VAPID_EMAIL`
- `VAPID_PRIVATE_KEY`
- `VAPID_PUBLIC_KEY`

The same file also indicates `EXPO_TOKEN` is needed for mobile EAS builds but was not yet set at the time of that note.

## Common / optional

- `NODE_AUTH_TOKEN`
  - Use only if private npm packages are introduced.
- `SLACK_WEBHOOK_URL`
  - Optional notifications hook if release notifications are later enabled.
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
  - Required only if Sentry sourcemap upload is enabled.

## Expo / EAS

- `EXPO_TOKEN`
  - Used by GitHub Actions to authenticate `eas build` and `eas submit`.
  - Generate from Expo account settings.
- `EXPO_PUBLIC_PROJECT_ID`
  - Expo project identifier injected into config.
  - Current linked value: `e838de7c-c450-4eab-85a0-3e98440771fc`
- `EXPO_PUBLIC_API_URL`
  - Current repo default set in GitHub secrets: `https://soapies-app-3uk2q.ondigitalocean.app`
- `EXPO_PUBLIC_WEB_URL`
  - Current repo default set in GitHub secrets: `https://soapiesplaygrp.club`
- `EXPO_PUBLIC_ENVIRONMENT`
  - Release profile env values.
- `EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER`
  - Current repo default set in GitHub secrets: `com.soapies.app`
- `EXPO_PUBLIC_ANDROID_PACKAGE`
  - Current repo default set in GitHub secrets: `com.soapies.app`
  - Optional overrides until final identifiers are locked.

## iOS / App Store Connect

- `APP_STORE_CONNECT_API_KEY_ID`
- `APP_STORE_CONNECT_ISSUER_ID`
- `APP_STORE_CONNECT_API_KEY_BASE64`
  - Base64-encoded `.p8` App Store Connect API key.
- `APPLE_TEAM_ID`
  - Apple Developer team ID.
- `ASC_APP_ID`
  - App Store Connect app ID used by submit workflow.

## Android / Google Play

- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64`
  - Base64-encoded Google Play service account JSON.
  - In CI this is decoded to `credentials/google-play-service-account.json` during the job only.
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
  - Only required if you choose manual Android signing outside managed EAS credentials.

## Notes

- Prefer EAS-managed credentials where possible for iOS certificates/profiles and Android upload keys.
- The first-ever Google Play app upload may still require manual console setup before full automation works.
