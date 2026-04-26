# Soapies Mobile — Infrastructure Report

_Generated: 2026-04-13_

---

## 1. Architecture Overview

```
┌─────────────────────┐         ┌──────────────────────────────────┐
│   Mobile App (RN)   │  HTTP   │   Soapies Backend                │
│   React Native      │ ──────► │   Node.js + Hono + tRPC          │
│   Expo SDK 54       │  tRPC   │   MySQL (Drizzle ORM)            │
└─────────────────────┘         └──────────────────────────────────┘
       EAS Builds                        DigitalOcean App Platform
   (iOS / Android)                       Container Registry + Managed DB
```

The mobile app is a standalone Expo/React Native application that communicates with the existing Soapies web backend via tRPC over HTTP. The backend runs as a Docker container on DigitalOcean App Platform.

### Key Points

- **Monorepo structure**: `mobile/` lives inside the main soapies-app repo, sharing the `shared/` directory for types
- **State management**: TanStack Query + tRPC client
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Navigation**: Expo Router (file-based)

---

## 2. Local Development Setup

### Prerequisites

- Node.js 20+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- iOS Simulator (Xcode) or Android Emulator (Android Studio)
- Expo Go app on physical device (optional)

### Steps

```bash
# 1. Clone the repo and switch to the mobile branch
git clone https://github.com/HM2SOFTENG/soapies-app.git
cd soapies-app
git checkout react-native

# 2. Install mobile dependencies
cd mobile
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env and set EXPO_PUBLIC_API_URL to your local backend

# 4. Start the backend (from repo root)
cd ..
docker-compose up -d   # starts MySQL + app on :3000

# 5. Start the Expo dev server
cd mobile
npm start
```

Press `i` for iOS simulator, `a` for Android, or scan QR code with Expo Go.

---

## 3. EAS Build Instructions

EAS (Expo Application Services) builds production-grade binaries in the cloud.

### First-time Setup

```bash
# Login to Expo account
eas login

# Link this project to your Expo account
eas init   # or eas build:configure
```

### Build Profiles

| Profile       | Distribution           | Platform        | API URL                   |
| ------------- | ---------------------- | --------------- | ------------------------- |
| `development` | Internal               | iOS + Android   | `localhost:3000`          |
| `preview`     | Internal               | iOS (Simulator) | `http://164.92.68.30`     |
| `production`  | App Store / Play Store | iOS + Android   | `https://api.soapies.app` |

### Running Builds

```bash
# Preview build (iOS simulator, for testing)
npm run build:preview
# or: eas build --platform ios --profile preview

# Production build
npm run build:production
# or: eas build --platform all --profile production
```

---

## 4. Environment Variables

| Variable                 | Description                     | Default                 |
| ------------------------ | ------------------------------- | ----------------------- |
| `EXPO_PUBLIC_API_URL`    | Backend API base URL            | `http://localhost:3000` |
| `EXPO_PUBLIC_PROJECT_ID` | Expo project ID (from app.json) | _(from eas.json)_       |

Environment files:

- `.env.example` — committed template, copy to `.env`
- `.env` — local dev only, **never commit** (gitignored)
- `eas.json` — build-time env vars per profile (committed)

---

## 5. CI/CD Pipeline

### Mobile CI (`.github/workflows/mobile-ci.yml`)

Triggers on pushes/PRs to `react-native` or `main` that touch `mobile/**`.

```
push to react-native
         │
         ▼
    [check] ─── npm ci ──► tsc --noEmit ──► vitest run
         │
         ▼ (react-native branch only)
  [eas-preview] ─── eas build --platform ios --profile preview
```

**Jobs:**

1. **check** — Type-checks TypeScript and runs tests (pass-with-no-tests)
2. **eas-preview** — Triggers an EAS cloud build for iOS simulator (non-blocking, `continue-on-error: true`)

### Web App CI (`.github/workflows/deploy.yml`)

Handles the backend/web app on pushes to `main`:

- Lint & type check → tests → Docker build → push to DO Registry → deploy to App Platform → DB migrations → cleanup old images

---

## 6. Server Infrastructure

### Backend (164.92.68.30 / DigitalOcean App Platform)

| Item     | Detail                                      |
| -------- | ------------------------------------------- |
| Host     | `164.92.68.30`                              |
| Platform | DigitalOcean App Platform                   |
| Runtime  | Node.js 22 in Docker                        |
| Port     | 3000 (internal), 80/443 (external)          |
| Database | MySQL 8.0                                   |
| Registry | DigitalOcean Container Registry             |
| Deploy   | Automated via GitHub Actions on `main` push |

**Status (2026-04-13):**

- ✅ HTTP 200 on `http://164.92.68.30/` — web app serving
- ✅ HTTP 200 on `/api/trpc/auth.me` — API reachable
- ❌ SSH not available (expected — App Platform manages the container)

### Docker Setup

The web app runs as a multi-stage Docker build:

- **Stage 1 (builder)**: pnpm install + `pnpm build` → outputs to `dist/`
- **Stage 2 (production)**: prod deps only, copies `dist/` and `drizzle/`
- Runs `node dist/index.js` on port 3000

Local development uses `docker-compose.yml` (MySQL + app container).

---

## 7. GitHub Secrets Required

### Existing (web app pipeline)

| Secret                      | Purpose                              |
| --------------------------- | ------------------------------------ |
| `DIGITALOCEAN_ACCESS_TOKEN` | doctl authentication                 |
| `DO_REGISTRY_NAME`          | DigitalOcean Container Registry name |
| `DO_APP_ID`                 | App Platform app ID for deployments  |
| `DATABASE_URL`              | Production DB connection string      |

### New (mobile pipeline)

| Secret       | Purpose                  | How to Get                                                                        |
| ------------ | ------------------------ | --------------------------------------------------------------------------------- |
| `EXPO_TOKEN` | EAS build authentication | [expo.dev/accounts/\[account\]/settings/access-tokens](https://expo.dev/accounts) |

### Setting `EXPO_TOKEN`

```bash
# Create a token at expo.dev, then add to GitHub:
gh secret set EXPO_TOKEN --repo HM2SOFTENG/soapies-app
```

Or via GitHub web UI: _Settings → Secrets → Actions → New repository secret_

---

## 8. Project ID (EAS Linking)

Before EAS builds will work, the project needs to be linked to an Expo account:

```bash
cd mobile
eas init
```

This adds an `extra.eas.projectId` to `app.json`. Commit that change alongside the EAS setup.

---

## Notes & Next Steps

- [ ] Run `eas init` to link project to Expo account — adds `projectId` to `app.json`
- [ ] Add `EXPO_TOKEN` secret to GitHub repo
- [ ] Fill in Apple credentials in `eas.json` `submit.production.ios` when ready to submit to App Store
- [ ] Set up push notifications (Expo Notifications + backend webhook)
- [ ] Consider a proper domain + SSL for the API (`https://api.soapies.app`)
- [ ] Add Android build profile once iOS pipeline is stable
