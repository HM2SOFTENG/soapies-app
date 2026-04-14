# Soapies App — Developer Handoff Guide

> **Last updated:** 2026-04-14  
> **Prepared for:** Incoming dev team  
> **Project:** Soapies — members-only social community platform

---

## 1. Project Overview

Soapies is a members-only social community platform for adults. It has two surfaces:

- **Web app** — Vite + React + tRPC (deployed on DO App Platform)
- **Native mobile app** — Expo (React Native) + tRPC, living in the `mobile/` directory

Both surfaces share the same backend server and database.

### Architecture at a glance

```
GitHub (HM2SOFTENG/soapies-app)
  └── push to main
        └── GitHub Actions CI/CD
              ├── Lint + Test
              ├── Docker build → DO Container Registry
              └── Deploy → DO App Platform
                    └── Node.js server (Express + tRPC)
                          ├── MySQL (DO Managed DB)
                          └── DO Spaces (file storage)
```

---

## 2. Repository

| Item | Value |
|---|---|
| GitHub | `https://github.com/HM2SOFTENG/soapies-app` (private) |
| Primary branch | `main` (auto-deploys to production) |
| Mobile branch | `react-native` (mobile-only changes, merge to main to deploy) |
| Clone | `git clone https://github.com/HM2SOFTENG/soapies-app.git` |

### Key directories

```
soapies-app/
├── client/          # Web frontend (Vite + React)
│   └── src/
│       ├── pages/       # All web pages
│       ├── components/  # Shared UI components
│       └── lib/trpc.ts  # tRPC client
├── server/          # Backend (Express + tRPC)
│   ├── _core/       # Auth, context, SDK, websocket
│   ├── db.ts        # All database queries
│   ├── routers.ts   # All tRPC routes (single file)
│   ├── auth.ts      # Password hashing, OTP, session
│   └── notifications.ts
├── drizzle/         # DB schema + migrations
│   └── schema.ts    # Source of truth for DB schema
├── shared/          # Shared types/constants
├── mobile/          # React Native Expo app
│   ├── app/         # expo-router screens
│   ├── components/  # RN components
│   └── lib/         # trpc.ts, auth.tsx, colors.ts
├── Dockerfile
├── docker-compose.yml
├── drizzle.config.ts
└── package.json
```

---

## 3. Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| Framework | Express.js |
| API | tRPC v11 (type-safe RPC — no REST, no GraphQL) |
| ORM | Drizzle ORM (MySQL dialect) |
| Database | MySQL 8 (DO Managed Database) |
| Auth | Custom JWT via `jose` library (HS256, cookie-based) |
| File storage | DigitalOcean Spaces (S3-compatible) |
| Email | SendGrid |
| SMS | Twilio |
| Payments | Stripe |
| Push notifications | Web Push (VAPID) |
| Real-time | WebSocket (ws library, path `/ws`) |

### Web Frontend
| Layer | Technology |
|---|---|
| Framework | Vite + React 19 |
| Routing | Wouter |
| Styling | Tailwind CSS v4 |
| State / Data | TanStack Query + tRPC React |
| UI Components | Radix UI + shadcn/ui |

### Mobile (React Native)
| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 |
| Routing | expo-router (file-based) |
| Styling | NativeWind (Tailwind for RN) |
| Data | TanStack Query + tRPC React |
| Auth storage | expo-secure-store |
| Build | EAS Build (Expo Application Services) |

---

## 4. DigitalOcean Infrastructure

### 4.1 Account Access
Contact the project owner (Brian) for DigitalOcean account credentials. The account is at [cloud.digitalocean.com](https://cloud.digitalocean.com).

To use the CLI:
```bash
# Install doctl
brew install doctl  # macOS

# Authenticate
doctl auth init
# Enter the DO API token when prompted
```

### 4.2 App Platform (Web Server)

| Item | Value |
|---|---|
| App name | `soapies-app` |
| App ID | `e9ee55ad-1927-4f13-bc18-4fb4058d7a17` |
| Live URL | `https://soapies-app-3uk2q.ondigitalocean.app` |
| Custom domain | `https://soapiesplaygrp.club` |
| Region | San Francisco (`sfo`) |
| Instance | `apps-s-1vcpu-0.5gb` (1 instance) |
| Port | `3000` |

**View in console:** [cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)

**CLI commands:**
```bash
# View app status
doctl apps get e9ee55ad-1927-4f13-bc18-4fb4058d7a17

# View live logs
doctl apps logs e9ee55ad-1927-4f13-bc18-4fb4058d7a17 --type=run

# View deployment history
doctl apps list-deployments e9ee55ad-1927-4f13-bc18-4fb4058d7a17

# Trigger manual deploy (uses latest container image)
doctl apps create-deployment e9ee55ad-1927-4f13-bc18-4fb4058d7a17

# View full app spec (env vars, config)
doctl apps spec get e9ee55ad-1927-4f13-bc18-4fb4058d7a17
```

### 4.3 Container Registry

The app deploys via Docker. Images are stored in the DO Container Registry.

| Item | Value |
|---|---|
| Registry name | `soapies-registry` |
| Registry URL | `registry.digitalocean.com/soapies-registry` |
| Repository | `soapies-app` |
| Deploy tag | `latest` |

**CLI commands:**
```bash
# List images
doctl registry repository list-tags soapies-app

# Login Docker to registry
doctl registry login
```

### 4.4 Database (MySQL)

| Item | Value |
|---|---|
| Cluster name | `db-mysql-sfo3-76699` |
| Cluster ID | `deaa7d28-d0dd-47cd-ae35-63f4c9dd0f97` |
| Engine | MySQL 8 |
| Region | San Francisco (sfo3) |
| Size | `db-s-1vcpu-1gb` |
| Database | `defaultdb` |
| Host | `db-mysql-sfo3-76699-do-user-34827953-0.h.db.ondigitalocean.com` |
| Port | `25060` |
| User | `doadmin` |
| SSL | Required (`ssl-mode=REQUIRED`) |

**Full connection string format:**
```
mysql://doadmin:<PASSWORD>@db-mysql-sfo3-76699-do-user-34827953-0.h.db.ondigitalocean.com:25060/defaultdb?ssl-mode=REQUIRED
```

> ⚠️ The actual password is stored as an encrypted secret in the DO App Platform and GitHub Actions. Contact the project owner to obtain it. Never commit it to version control.

**CLI commands:**
```bash
# Get connection details
doctl databases get deaa7d28-d0dd-47cd-ae35-63f4c9dd0f97

# Add your IP to the trusted sources firewall
doctl databases firewalls append deaa7d28-d0dd-47cd-ae35-63f4c9dd0f97 \
  --rule ip_addr:YOUR.IP.ADDRESS.HERE
```

> ⚠️ The database has a firewall. You **must** whitelist your IP before connecting directly. Go to the DO dashboard → Databases → `db-mysql-sfo3-76699` → Trusted Sources, and add your IP.

**Connect with a MySQL client:**
```bash
# Using mysql CLI (if installed)
mysql -h db-mysql-sfo3-76699-do-user-34827953-0.h.db.ondigitalocean.com \
  -P 25060 -u doadmin -p --ssl-mode=REQUIRED defaultdb

# Using TablePlus / DBeaver / DataGrip
# Host: db-mysql-sfo3-76699-do-user-34827953-0.h.db.ondigitalocean.com
# Port: 25060
# User: doadmin
# Database: defaultdb
# SSL: enabled (required)
```

### 4.5 Object Storage (Spaces)

| Item | Value |
|---|---|
| Bucket name | `soapies-uploads` |
| Region | `sfo3` |
| Endpoint | `https://sfo3.digitaloceanspaces.com` |
| CDN URL | `https://soapies-uploads.sfo3.digitaloceanspaces.com/<key>` |
| Access key env | `DO_SPACES_KEY` |
| Secret env | `DO_SPACES_SECRET` |

Used for: profile photo uploads, application photos.

**View in console:** DO Dashboard → Spaces → `soapies-uploads`

---

## 5. Environment Variables

### Required (must be set in production)

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string (see §4.4) |
| `JWT_SECRET` | 64+ char random string for signing session JWTs |
| `ADMIN_EMAIL` | Admin account email (`admin@soapiesplaygrp.club`) |
| `ADMIN_PASSWORD` | Admin account password (auto-seeded on startup) |

### Optional but recommended

| Variable | Description |
|---|---|
| `SENDGRID_API_KEY` | For transactional emails (OTP, verification) |
| `SENDGRID_FROM_EMAIL` | Sender address (`noreply@soapiesplaygrp.club`) |
| `DO_SPACES_KEY` | Spaces access key for file uploads |
| `DO_SPACES_SECRET` | Spaces secret key |
| `DO_SPACES_BUCKET` | Bucket name (`soapies-uploads`) |
| `DO_SPACES_REGION` | Region (`sfo3`) |
| `VAPID_PUBLIC_KEY` | Web push public key |
| `VAPID_PRIVATE_KEY` | Web push private key |
| `VAPID_EMAIL` | Web push contact email |
| `STRIPE_SECRET_KEY` | Stripe payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `TWILIO_ACCOUNT_SID` | SMS OTP via Twilio |
| `TWILIO_AUTH_TOKEN` | Twilio auth |
| `TWILIO_FROM_NUMBER` | Twilio phone number |

### Local development `.env` setup

```bash
cp .env.example .env
# Fill in DATABASE_URL and JWT_SECRET at minimum
# Use docker-compose for a local MySQL instance
```

---

## 6. Local Development Setup

### Prerequisites
- Node.js 22+
- pnpm 10.4.1 (`npm install -g pnpm@10.4.1`)
- Docker + Docker Compose (optional, for local DB)

### Steps

```bash
# 1. Clone
git clone https://github.com/HM2SOFTENG/soapies-app.git
cd soapies-app

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET at minimum

# 4a. Start local MySQL (Docker)
docker-compose up -d db

# 4b. Or point DATABASE_URL at the DO managed DB (add your IP to firewall first)

# 5. Push schema to database
pnpm db:push

# 6. Seed sample events (optional)
pnpm db:seed

# 7. Start dev server (API + web hot-reload)
pnpm dev
# Server: http://localhost:3000
# Web:    http://localhost:5173 (Vite dev server proxies to :3000)
```

### Mobile development

```bash
cd mobile

# Install dependencies
npm install --legacy-peer-deps

# Set API URL
echo "EXPO_PUBLIC_API_URL=https://soapiesplaygrp.club" > .env
# Or for local: EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000

# Start Expo dev server
npx expo start --lan --clear

# Scan QR code with Expo Go app on your phone
```

---

## 7. CI/CD Pipeline

Every push to `main` triggers the full pipeline automatically:

```
push to main
  ├── 1. Lint & Type Check (pnpm check)
  ├── 2. Run Tests (pnpm test / vitest)
  ├── 3. Build Docker image
  │      └── Push to registry.digitalocean.com/soapies-registry/soapies-app:latest
  ├── 4. Deploy to DO App Platform
  │      └── doctl apps create-deployment <APP_ID>
  ├── 5. Run DB Migrations
  │      └── pnpm db:push --force
  └── 6. Clean up old container images (keep last 3)
```

**Build time:** ~3–5 minutes end to end.

### GitHub Actions secrets (must be configured)

Go to: `github.com/HM2SOFTENG/soapies-app/settings/secrets/actions`

| Secret | Description |
|---|---|
| `DIGITALOCEAN_ACCESS_TOKEN` | DO API token with read/write access |
| `DO_REGISTRY_NAME` | Container registry name (`soapies-registry`) |
| `DO_APP_ID` | App Platform app ID (`e9ee55ad-...`) |
| `DATABASE_URL` | Full MySQL connection string |
| `VAPID_PUBLIC_KEY` | Web push public key |
| `VAPID_PRIVATE_KEY` | Web push private key |
| `VAPID_EMAIL` | Web push email |
| `EXPO_TOKEN` | Expo account token (for EAS mobile builds) |

---

## 8. Database Schema

Schema is defined in `drizzle/schema.ts` using Drizzle ORM. Key tables:

| Table | Purpose |
|---|---|
| `users` | Core user accounts (email, password hash, role, openId) |
| `profiles` | Member profiles (displayName, bio, gender, applicationStatus) |
| `events` | Community events with pricing and capacity |
| `reservations` | Event RSVPs with ticket type and payment status |
| `tickets` | QR codes for confirmed reservations |
| `wall_posts` | Community feed posts |
| `wall_post_comments` | Comments on posts |
| `wall_post_likes` | Post likes |
| `conversations` | DMs, group chats, channels |
| `conversation_participants` | Membership in conversations |
| `messages` | Chat messages |
| `notifications` | In-app notifications |
| `announcements` | Admin announcements shown in feed |
| `referral_codes` | Referral codes per member |
| `member_credits` | Credit balance ledger |
| `waitlist` | Event waitlist entries |
| `intro_call_slots` | Application interview time slots |
| `application_photos` | Photos uploaded during join flow |
| `signed_waivers` | Community waiver signatures |
| `profile_change_requests` | Member-requested profile changes awaiting admin approval |
| `admin_audit_logs` | Admin action log |
| `push_subscriptions` | Web push subscription endpoints |

### Running migrations

```bash
# Push schema changes to DB (dev / CI)
pnpm db:push

# Generate a migration file (for production-safe migrations)
pnpm dlx drizzle-kit generate
```

---

## 9. API Structure

All API routes are in `server/routers.ts`. The API uses **tRPC** — no REST endpoints. Every call goes through `/api/trpc`.

### Route namespaces

| Namespace | Procedures |
|---|---|
| `auth.*` | login, register, logout, me, verifyEmail, resetPassword, changePassword |
| `profile.*` | me, upsert, photos, uploadPhoto, signWaiver, search |
| `events.*` | list, byId, create, update, delete (admin) |
| `reservations.*` | create, myTickets, myReservations, joinWaitlist |
| `wall.*` | posts, create, like, comments, addComment, deletePost |
| `messages.*` | conversations, messages, send, createConversation |
| `notifications.*` | list, markRead, markAllRead |
| `announcements.*` | active, dismiss |
| `members.*` | browse, byId |
| `credits.*` | balance, history |
| `referrals.*` | myCode, generate |
| `admin.*` | All admin CRUD operations |

### Authentication

Sessions use **JWT cookies** (`app_session_id`):

- Cookie is `httpOnly`, `SameSite: none`, `Secure` in production
- Signed with `JWT_SECRET` using HS256
- For React Native: the login response also returns `sessionToken` in the body (since RN can't read httpOnly cookies), which the mobile app stores in `expo-secure-store`

---

## 10. Admin Panel

The admin panel is available at:
- **Production:** `https://soapiesplaygrp.club/cp`
- **Local:** `http://localhost:3000/cp`

> Route is obfuscated (`/cp` not `/admin`) for mild security through obscurity.

**Admin credentials:**
- Email: `admin@soapiesplaygrp.club`
- Password: Set via `ADMIN_PASSWORD` env var (synced on every server startup)

### Admin capabilities
- Dashboard analytics (revenue, member growth, check-in rates)
- Event management (create, edit, delete, bulk operations)
- Member management (view, suspend, update roles)
- Application review (approve/reject join applications)
- Reservation management (confirm Venmo payments, check-ins)
- Announcement creation
- Interview slot management
- Audit logs
- Test result review
- Referral pipeline view

---

## 11. Common Operations

### Deploy a change
```bash
git add -A
git commit -m "your message"
git push origin main
# CI/CD handles the rest — ~4 min to production
```

### View live server logs
```bash
doctl apps logs e9ee55ad-1927-4f13-bc18-4fb4058d7a17 --type=run --follow
```

### Run a DB query directly
```bash
# First whitelist your IP in DO Dashboard → Databases → Trusted Sources
mysql -h db-mysql-sfo3-76699-do-user-34827953-0.h.db.ondigitalocean.com \
  -P 25060 -u doadmin -p --ssl-mode=REQUIRED defaultdb
```

### Trigger a manual server redeploy (without code change)
```bash
doctl apps create-deployment e9ee55ad-1927-4f13-bc18-4fb4058d7a17 --wait
```

### Reset admin password
Update `ADMIN_PASSWORD` in DO App Platform env vars → redeploy. The server re-seeds on startup.

### Scale the server up
```bash
doctl apps update e9ee55ad-1927-4f13-bc18-4fb4058d7a17 \
  --spec <(doctl apps spec get e9ee55ad-1927-4f13-bc18-4fb4058d7a17 | \
  sed 's/apps-s-1vcpu-0.5gb/apps-s-1vcpu-1gb/')
```

---

## 12. Mobile App (Expo)

### Expo account
- Account: `brianbarry2009`
- EAS project ID: *(in `mobile/eas.json`)*

### Build and distribute
```bash
cd mobile

# Preview build (internal distribution, iOS simulator)
npx eas build --platform ios --profile preview

# Production build (App Store)
npx eas build --platform ios --profile production

# Submit to App Store
npx eas submit --platform ios
```

### Key mobile files

| File | Purpose |
|---|---|
| `mobile/lib/trpc.ts` | tRPC client — session cookie capture, API URL |
| `mobile/lib/auth.tsx` | Auth context (user state, login/logout) |
| `mobile/app/_layout.tsx` | Root layout + AuthGuard |
| `mobile/app/(tabs)/_layout.tsx` | Tab bar with unread badge |
| `mobile/lib/colors.ts` | Brand colors |
| `mobile/.env` | `EXPO_PUBLIC_API_URL` — must point at production server |

### API URL configuration
The mobile app connects to: `https://soapiesplaygrp.club`

Set in `mobile/.env`:
```
EXPO_PUBLIC_API_URL=https://soapiesplaygrp.club
```

---

## 13. Known Issues & Open Work

### Auth (in progress)
- Session token capture from `Set-Cookie` header works in Expo Go but the token is occasionally rejected by the server with `Invalid Compact JWS`. Debug logging was added in `mobile/lib/trpc.ts` — check Metro logs for `[trpc] captured session` and `[trpc] sending cookie` to trace the exact token being stored and sent.

### Sprint 1 — Planned next (not yet implemented in mobile)
1. Email verification screen after register
2. Member onboarding flow (profile setup → photos → waiver → pending → interview booking)
3. Dashboard screen (stats, reservations summary, referral hub)
4. Change password + account settings screen
5. DM button on member profiles / directory

### Known gaps (web features not in mobile)
- Application/join flow (photo upload, waiver signing, interview scheduling)
- Push notification preferences
- Partner invite flow (`/invite/:token`)
- Community landing pages (Soapies / Groupies / Gaypeez)
- Event feedback / ratings
- Message delete + pin

---

## 14. Contacts & Access

| Role | Contact |
|---|---|
| Project owner | Brian Barry (`brianplayonly@yahoo.com`) |
| GitHub org | `HM2SOFTENG` |
| DigitalOcean account | (contact Brian for access) |
| Expo account | `brianbarry2009` (contact Brian for access) |
| Domain registrar | (contact Brian — `soapiesplaygrp.club`) |

---

*This document reflects the state of the project as of 2026-04-14. Keep it updated as infrastructure changes.*
