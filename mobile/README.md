# Soapies Mobile

React Native Expo app for the Soapies platform.

## Stack

- Expo SDK 54
- Expo Router
- React Native 0.81
- TypeScript
- TanStack Query + tRPC
- Expo SecureStore for auth persistence
- EAS Build / Submit for release automation

## Local development

```bash
cd mobile
npm install
cp .env.example .env.local
npm run start
```

## Quality gates

```bash
npm run lint
npm run typecheck
npm run test:ci
npm run doctor:config
npm run preflight
```

## Release path

Soapies uses **Expo EAS** rather than committed native iOS/Android projects.

Key commands:

```bash
npm run build:preview
npm run build:ios:production
npm run build:android:production
npm run submit:ios:production
npm run submit:android:production
```

GitHub Actions workflows in `.github/workflows/` provide CI plus manual release entry points for iOS TestFlight and Android internal-track builds.

## Environment

See `docs/ENVIRONMENT.md`.

## Release & store docs

- `docs/RELEASE_PROCESS.md`
- `docs/CI_SECRETS.md`
- `docs/APP_STORE_READINESS.md`
- `docs/QA_CHECKLIST.md`
- `docs/PRODUCTION_READINESS_AUDIT.md`

## Notes

- User-facing branding is standardized to **Soapies** in mobile config.
- Bundle/package identifiers currently resolve to `com.soapies.app` from Expo config unless explicitly overridden.
