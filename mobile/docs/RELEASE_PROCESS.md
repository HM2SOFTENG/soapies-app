# Soapies Mobile Release Process

## Release path

This app is an **Expo SDK 54 / EAS** project. Production release path:

1. Merge to `main` with green CI
2. Run preview/internal builds for final QA
3. Trigger iOS TestFlight workflow
4. Trigger Android internal-track workflow
5. Validate on devices + store dashboards
6. Promote manually to production after approvals

## Versioning

- Marketing version: `expo.version`
- iOS build number: `ios.buildNumber` / EAS auto increment
- Android versionCode: `android.versionCode` / EAS auto increment
- Tag format: `vMAJOR.MINOR.PATCH`

## Local commands

```bash
cd mobile
npm install
npm run preflight
npm run build:preview
npm run build:ios:production
npm run build:android:production
```

## GitHub Actions release entry points

- `mobile-ci.yml` — PR quality gates
- `mobile-release-ios.yml` — build/upload iOS artifacts via EAS
- `mobile-release-android.yml` — build/upload Android artifacts via EAS

## Manual promotion model

- Production submission is intentionally `workflow_dispatch` / tag driven
- Internal/preview distribution is allowed without production rollout
- Do not submit to App Store / Play production until store metadata, compliance, and QA are complete

## Rollback / hotfix

- Create `hotfix/*` branch from latest production tag
- Patch issue
- Re-run `npm run preflight`
- Build replacement release
- Use staged rollout / phased release where supported

## External account-only tasks

- Link Expo project and set project ID
- Configure Apple Developer + App Store Connect app
- Configure Google Play listing + internal track
- Upload screenshots, descriptions, policy URLs, contact info
