# Soapies Mobile Production Readiness Audit

## Audit summary

### What exists

- Expo SDK 54 app with EAS config
- TypeScript app structure with Expo Router
- Existing tests with Vitest
- Existing mobile CI workflows in the repo
- Privacy manifest and permission copy already present
- SecureStore-based auth token persistence

### What was missing before this pass

- Production-grade GitHub Actions release workflows
- Pinned Node version files
- Standardized preflight scripts
- CI secrets documentation
- Release process / environment / store-readiness docs
- Canonical Soapies branding pass for mobile display metadata
- Clear submit placeholders for App Store / Google Play

### Release path decision

- **Expo / EAS** is the correct path.
- Native iOS/Android directories are not checked in, so Fastlane on generated native projects would add churn and maintenance overhead.
- GitHub Actions now orchestrates EAS build/submit-ready flows.

## Current blockers requiring humans / external access

- App Store Connect API key + app setup
- Apple team/account configuration
- Google Play Console app bootstrap and service account
- Final production bundle/package identifier confirmation
- Final screenshots/store copy/privacy disclosures review
- Sensitive GitHub mobile release secrets still need to be added (`EXPO_TOKEN`, App Store Connect values, Play service-account value)

## GitHub / Expo connection status

- Expo account linked locally: `brianbarry2009`
- EAS project linked: `@brianbarry2009/soapies`
- EAS project ID: `e838de7c-c450-4eab-85a0-3e98440771fc`
- GitHub non-sensitive Expo/mobile secrets have been added:
  - `EXPO_PUBLIC_PROJECT_ID`
  - `EXPO_PUBLIC_API_URL`
  - `EXPO_PUBLIC_WEB_URL`
  - `EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER`
  - `EXPO_PUBLIC_ANDROID_PACKAGE`

## Repo-grounded identifier findings

- Canonical app name: `Soapies`
- Expo slug: `soapies`
- URL scheme: `soapies`
- iOS bundle identifier source: `mobile/app.json` → `expo.ios.bundleIdentifier`
- Android package/applicationId source: `mobile/app.json` → `expo.android.package`
- Current configured iOS bundle identifier: `com.soapies.app`
- Current configured Android package name: `com.soapies.app`

## Risks noted

- Repo/domain/backend naming is largely aligned on `Soapies`; final store identifiers still need explicit owner confirmation before first production submission.
- Production API URL currently points at the known DigitalOcean endpoint; verify that this is the intended long-term production backend.
- No crash-reporting vendor is wired today; placeholders/documentation exist, but actual DSN/provider setup is still external.
