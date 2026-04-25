# Soapies Mobile Environment

## Runtime model
Soapies mobile is an Expo SDK 54 app using EAS Build/Submit. Public runtime variables must be prefixed with `EXPO_PUBLIC_` and are embedded into the build.

## Required variables

- `EXPO_PUBLIC_API_URL` — production-safe API base URL for the mobile app
- `EXPO_PUBLIC_WEB_URL` — canonical web URL used for deep links and shared links
- `EXPO_PUBLIC_PROJECT_ID` — Expo project ID after linking the app to an Expo account/project
- `EXPO_PUBLIC_ENVIRONMENT` — `development`, `preview`, or `production`

## Optional variables

- `EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER` — override for iOS bundle id during production setup
- `EXPO_PUBLIC_ANDROID_PACKAGE` — override for Android package name during production setup
- `EXPO_PUBLIC_ASSOCIATED_DOMAINS` — comma-separated `applinks:` domains for universal links
- `EXPO_PUBLIC_EAS_UPDATES_URL` — EAS Updates URL if OTA updates are enabled later
- `EXPO_PUBLIC_SENTRY_DSN` — placeholder for future crash reporting setup
- `IOS_BUILD_NUMBER` — override iOS build number in CI if needed
- `ANDROID_VERSION_CODE` — override Android versionCode in CI if needed

## Local development

1. Copy `.env.example` to `.env.local`.
2. Set `EXPO_PUBLIC_API_URL` to a reachable backend URL.
3. Run `npm install` and `npm run start` from `mobile/`.

## Preview / production

Do not commit `.env.production` with real secrets. Use EAS environment variables or GitHub Actions secrets for release workflows.

Recommended EAS environment separation:

- `development` → local/dev backend
- `preview` → staging or pre-prod backend
- `production` → production backend only

## Security notes

- Never place private tokens, keystores, service-account JSON, or App Store keys in `EXPO_PUBLIC_*` vars.
- Session/auth tokens are stored with `expo-secure-store`; only non-sensitive view preferences remain in AsyncStorage.
- If you add crash reporting, keep auth/session payloads redacted and avoid sending PII by default.
