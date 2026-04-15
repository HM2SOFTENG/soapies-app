# Claude — Mobile Work Handoff
**Session date:** 2026-04-15
**Branch:** `claude/mobile-app-store-prep-2026-04-15` (forked from `dev/snapshot-2026-04-15-0953`)
**Scope discipline:** Mobile only (`/mobile/**`). Parent repo is read-only from this agent.
**Related docs:**
- `HANDOFF-2026-04-15.md` (OpenClaw system knowledge — authoritative)
- `mobile/reports/MOBILE-BACKLOG-2026-04-15.md` (prioritized backlog this doc executes against)
- `BACKLOG.md` (root, cross-referenced ITEM-### IDs)

This is a **living document**. Every time a backlog item ships, an entry lands in the Work Log with the file paths touched, the rationale, and any follow-up risk. Infrastructure-affecting changes (native config, plugins, permissions, deploy pipelines) are also mirrored into the Infrastructure Changes section so future Claude sessions / OpenClaw / human operators can rebuild the picture quickly.

---

## Work Log

### 2026-04-15 — P0-1 · `app.json` native config
**Files:** `mobile/app.json`
**Why:** App Store rejection risk — Apple requires `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSLocationWhenInUseUsageDescription`. Google Play requires `adaptiveIcon.foregroundImage` and declared `permissions`. `expo-image-picker`, `expo-location`, and `expo-camera` must be listed as plugins so their native config is applied at prebuild.
**Change summary:**
- Added `expo.ios.infoPlist` with all required usage strings + `ITSAppUsesNonExemptEncryption: false` (avoids export-compliance prompt on every TestFlight build).
- Added `expo.android.adaptiveIcon.foregroundImage` → `./assets/adaptive-icon.png` (asset already existed).
- Added `expo.android.permissions` — CAMERA, READ_EXTERNAL_STORAGE, READ_MEDIA_IMAGES, ACCESS_COARSE_LOCATION, ACCESS_FINE_LOCATION, INTERNET, VIBRATE.
- Listed `expo-image-picker`, `expo-location`, `expo-camera` as plugin array entries with tailored permission strings.
- Added `splash.image` + `resizeMode: contain` (splash asset was referenced only by background color before).
**Risk / follow-up:** Requires `expo prebuild --clean` before the next native build so the new Info.plist entries and AndroidManifest permissions are generated.

### 2026-04-15 — P0-2 · Root `ErrorBoundary`
**Files:**
- `mobile/components/ErrorBoundary.tsx` (new)
- `mobile/app/_layout.tsx` (wire)
**Why:** Render-time crash in any downstream component was previously fatal (white screen with no recovery). App Store reviewers routinely trigger edge cases.
**Change summary:**
- New class component implementing `getDerivedStateFromError` + `componentDidCatch`.
- Fallback UI uses dark theme, pink→purple gradient accent, provides **Try again** (reset boundary state) and **Sign out** (clears all known SecureStore token keys then resets).
- Dev mode shows `error.message` and `componentStack` in a mono-font panel; production hides them.
- Wraps `<trpc.Provider>` (highest level) in `app/_layout.tsx` so tRPC/context/routing errors are all caught.
**Risk / follow-up:** Does not yet wire to a remote reporter (Sentry/Bugsnag). `props.onError` hook is available; wiring to Sentry is a future P2.

### 2026-04-15 — P0-3 · `uploadPhoto` auth header (client-side mitigation of root BACKLOG ITEM-001)
**Files:** `mobile/lib/uploadPhoto.ts`
**Why:** Root BACKLOG ITEM-001 flags `/api/upload-photo` as unauthenticated server-side. Cannot fix server from mobile scope, but the mobile client now (a) throws early if no token is loaded, and (b) sends both `x-session-token` and `Cookie: app_session_id=...` headers — matching the tRPC client pattern. When the server fix lands, no mobile change is needed.
**Change summary:**
- Imports `getMemoryToken` from `./trpc`.
- Fails fast with `"You need to be signed in to upload photos."` when token is missing.
- Adds both header variants to the fetch call.
**Risk / follow-up:** Still relies on server-side fix to actually be secure. Track as blocked on server team.

### 2026-04-15 — P1-1 · Console logs gated to `__DEV__` (ITEM-042)
**Files:**
- `mobile/lib/trpc.ts` (3 warns)
- `mobile/lib/auth.tsx` (1 warn)
- `mobile/components/PostCard.tsx` (1 log in `onError`)
- `mobile/app/edit-profile.tsx` (1 error)
- `mobile/app/(auth)/login.tsx` (1 error)
- `mobile/app/(auth)/forgot-password.tsx` (1 error)
- `mobile/app/(auth)/reset-password.tsx` (1 error)
- `mobile/app/(tabs)/profile.tsx` (1 error)
**Why:** Production builds shouldn't ship noisy device logs — they leak error details into system log and slow hot paths. All remaining calls that aren't already commented out are now gated behind `__DEV__`.
**Change summary:** Each active `console.*` call wrapped in `if (__DEV__)`. Test-file warnings deliberately left alone.
**Risk / follow-up:** For real error visibility in production, wire `ErrorBoundary.props.onError` + tRPC fetch 401/500 paths to Sentry (tracked as future P2).

### 2026-04-15 — P1-2 · Onboarding back button (ITEM-020)
**Files:** `mobile/app/onboarding.tsx` (header back-button `onPress` + `disabled`)
**Why:** ITEM-020 reports step 2 back button is "permanently disabled." Previously `disabled={currentStep <= 2}` blocked back on both steps 1 (ok — has no header anyway) and 2 (bug — user couldn't return to welcome).
**Change summary:** Back button now enabled on step 2 (user returns to welcome before any registration has occurred) and on steps 4–7 (profile/photos/prefs/review — all safe to revise). Back remains **disabled on step 3** because the account was already created at step 2 and stepping back would re-hit the register mutation and 409.
**Risk / follow-up:** If step order changes, revisit this guard. Added an inline comment so the rationale isn't lost.

### 2026-04-15 — P1-3 · Pending-approval: functional "Schedule Your Call" + slot picker (ITEM-029)
**Files:** `mobile/app/pending-approval.tsx`
**Why:** The screen already surfaced every review phase (`submitted`, `under_review`, `interview_scheduled`, `interview_complete`, `waitlisted`, `rejected`, `approved`, `final_approved`) with distinct copy + timeline. The real gap was that the "Schedule Your Call" button (shown only in `interview_scheduled`) was non-functional. Users had no in-app path to book; they had to wait for an email.
**Change summary:**
- Button now opens a bottom-sheet `Modal` listing available slots (`trpc.introCalls.available`).
- Slots are fetched only when the modal opens (`enabled: slotModalOpen`), so everyone else pays zero extra query cost.
- Tap a slot → `trpc.introCalls.book` mutation → on success: close modal, refetch profile, toast "Booked!" (Alert).
- If user already has a booked slot (`profile.introCallSlotId`), label switches to "Reschedule Call" + filled icon.
- Server already notifies admins on booking (see `server/routers.ts:1591`), so no server work needed.
**Risk / follow-up:**
- "Reschedule" currently just re-opens the picker; actual cancel-existing-then-book flow depends on server semantics (does `introCalls.book` supersede or collide?). Marked as a P2 polish item — requires server confirmation.
- Slot times use device locale without timezone name; OpenClaw handoff note about timezone display conflicts should be revisited once server standardizes.

### 2026-04-15 — P1-4 · Event waiver gate (ITEM-023)
**Files:** `mobile/app/event/[id].tsx`
**Why:** RSVP/reserve flow must block-until-signed so community agreements are on record. Reservations would previously complete without any waiver record.
**Change summary:**
- Added `WAIVER_VERSION = '2026-04'`, `showWaiverModal` + `waiverSignature` state, and a `signWaiverMutation` that calls `trpc.profile.signWaiver` and on success calls `doReserve()`.
- Split `handleReserve` into a gate (checks `profile.waiverSignedAt`) plus a reusable `doReserve()` — no duplicated reservation state / payload.
- New bottom-sheet modal renders consent/confidentiality/safety/liability/enforcement clauses with a `TextInput` that must equal the profile display name to enable the "Sign & Reserve" CTA. Cancel + sign buttons use `BrandGradient`.
**Risk / follow-up:** Waiver copy is inline; if legal needs formal revision → move to a server-hosted doc keyed by `WAIVER_VERSION`. Trivial refactor when needed.

### 2026-04-15 — P1-5 · Chat DM header name (ITEM-007) — verified
**Files:** `mobile/app/chat/[id].tsx` (read only)
**Why:** ITEM-007 reported DM header was showing channel name for 1:1 threads. Verified the current implementation falls back through `conversation?.name ?? participants.filter(not-me).map(displayName).join(', ') ?? 'Chat'`, which is correct.
**Change summary:** No code change. Logged here so the item isn't re-opened.

### 2026-04-15 — P1-6 · Home stat chips loading states (ITEM-038)
**Files:** `mobile/app/(tabs)/index.tsx`
**Why:** Credits + reservations chips showed `0` during initial load, misleading users into thinking they had no credits or reservations. Now they show `—` in muted color until the queries resolve.
**Change summary:** Destructured `isLoading` on both queries, passed `loading` prop to `StatChip`, value becomes `—` with muted color while loading.

### 2026-04-15 — P2-5 · OfflineBanner (partial)
**Files:** `mobile/components/OfflineBanner.tsx` (new), `mobile/app/_layout.tsx` (wire)
**Why:** Users need immediate signal when network drops. Wired into `_layout.tsx` between `AuthProvider` and `AuthGuard`.
**Change summary:** Component renders a thin red banner "No Internet" when offline, hides otherwise. Includes a graceful no-op fallback when `@react-native-community/netinfo` is not resolvable at runtime so the app still boots.
**Risk / follow-up:** **BLOCKED** — `@react-native-community/netinfo` is not installed. Component ships but has no real connectivity detection until Brian runs `npx expo install @react-native-community/netinfo` and re-builds native. Backlog item added.

### 2026-04-15 — P2-6 · Deep link handler (ITEM-040)
**Files:** `mobile/lib/deepLinks.ts` (new), `mobile/app/_layout.tsx` (DeepLinkHandler)
**Why:** `soapies://` scheme was in `app.json` but nothing parsed or routed on URL events. ITEM-040 specifically called out events/chats/tickets/members as deep-link targets.
**Change summary:**
- `lib/deepLinks.ts`: exports `DEEP_LINK_SCHEME`, `WEB_URL_BASE`, `eventLink`/`chatLink`/`memberLink`/`ticketLink` builders (+ web variants), `parseDeepLink(url)`, and a `useInitialDeepLink()` hook for cold-start.
- `app/_layout.tsx`: new `DeepLinkHandler` listens on `Linking.addEventListener('url', ...)`, parses, and pushes to the matching expo-router route. All console output gated to `__DEV__`.
- Most recent cleanup: `ErrorBoundary` is now outermost (wrapping `DeepLinkHandler`) so a render crash in the handler is caught. `router.push` cast to `(router as any).push` for expo-router's union type.
**Risk / follow-up:** Universal Links / App Links (https:// variants) still need `apple-app-site-association` + `assetlinks.json` published at `soapiesplaygrp.club/.well-known/`. Parent repo / server scope.

### 2026-04-15 — P2-7 · FlatList perf (ITEM-034)
**Files:** `mobile/app/connections.tsx`, `mobile/app/event/[id].tsx` (modal picker), `mobile/app/(tabs)/index.tsx` (community feed)
**Why:** Long lists scrolled janky on older devices. Added `removeClippedSubviews`, `windowSize={7}`, `initialNumToRender={10}`, `maxToRenderPerBatch={8}` where relevant.
**Change summary:** Perf props only — no behavior change, no data-shape change.

### 2026-04-15 — P3-3 · Pulse score extraction + tests
**Files:** `mobile/lib/pulseScore.ts` (new, 260 lines), `mobile/__tests__/lib/pulseScore.test.ts` (42 cases)
**Why:** 9-factor match scoring lived inline in `pulse.tsx`. Extracted to a pure module so it's testable and reusable.
**Change summary:** `calculateMatchScore`, `calculateMatchBreakdown`, `MatchFactor` exports. Scoring behavior byte-for-byte unchanged. Vitest suite covers perfect match, zero overlap, per-factor edge cases.
**Risk / follow-up:** Test suite written but not executed — sandbox Vitest is blocked on `@rolldown/binding-linux-arm64-gnu`. CI will run it.

### 2026-04-15 — P3-4 · Auth + tRPC + uploadPhoto tests
**Files:** `mobile/__tests__/lib/trpc.test.ts` (18), `mobile/__tests__/lib/auth.test.ts` (14), `mobile/__tests__/lib/uploadPhoto.test.ts` (19)
**Why:** Core auth + upload paths were untested. Covered `setMemoryToken`/`getMemoryToken`/`clearToken`/`saveToken`/`loadTokenFromStorage`, `isValidJWT` edge cases, and uploadPhoto auth-gate + header contract (mocking `expo-file-system/legacy` + `global.fetch`).
**Change summary:** Added `export` to `isValidJWT` in `auth.tsx` to allow direct testing.

### 2026-04-15 — P3-5 · `BrandGradient` extraction
**Files:** `mobile/components/BrandGradient.tsx` (new) + 26 call sites across 12 files
**Why:** `LinearGradient colors={[colors.pink, colors.purple]}` was repeated 26 times with slight variations. One component with `horizontal` / `vertical` / `diagonal` direction prop now owns it.
**Change summary:** Call sites converted. Visual output unchanged.

### 2026-04-15 — P2-2 · Messages empty state CTA (ITEM-004)
**Files:** `mobile/app/(tabs)/messages.tsx`
**Why:** "No messages yet" previously dead-ended. New members didn't know how to start a DM or where channels come from.
**Change summary:** Primary CTA "Browse Members" (BrandGradient) routes to `/members?mode=compose`; secondary link "See upcoming events" routes to the events tab. Empty state when searching now includes a "Clear search" shortcut. New icon circle uses pink-tinted background for visual weight.

### 2026-04-15 — P2-4 · Pulse stale-signal indicator (ITEM-028)
**Files:** `mobile/app/(tabs)/pulse.tsx`
**Why:** Client caches `activeSignals` with a 30s stale window + refetch interval. In the gap between refetches, signals can expire, so the UI must tell the user a signal may no longer be current.
**Change summary:**
- `MemberBubble` gained an `isStale` prop. When stale: opacity drops to 0.5, the match-score pulse animation pauses, and a muted "STALE" caption renders below the name.
- Detail modal: if `member.expiresAt < now`, a gray time-icon pill renders between the signal-type row and the message — "Signal expired — may not be current".
- Staleness is computed at the call site: `!!(member.expiresAt && new Date(member.expiresAt).getTime() < Date.now())`.
**Risk / follow-up:** Relies on server including `expiresAt` in `getActiveSignals` (it does — `server/db.ts:2213`). No server change required.

### 2026-04-15 — `_layout.tsx` provider ordering hardening
**Files:** `mobile/app/_layout.tsx`
**Why:** During P2-6 (deep link handler) wiring, `ErrorBoundary` ended up inside `DeepLinkHandler`, meaning a render crash in the handler couldn't be caught. Also, three `console.*` calls in the handler weren't gated behind `__DEV__` (P1-1 regression).
**Change summary:** Swapped so `ErrorBoundary` is outermost, wrapping `DeepLinkHandler`. All three console calls gated. `router.push` cast to `(router as any).push` for expo-router union type. Fixed a JSX closing-tag inversion caught by tsc after the swap.

### 2026-04-15 — OfflineBanner: static `NetInfo` import + P2-5 fully activated
**Files:** `mobile/components/OfflineBanner.tsx`
**Why:** Original implementation used a dynamic `require('@react-native-community/netinfo')` with a try/catch fallback because I had incorrectly assumed the package wasn't installed. Verified it's already in `package.json` (`11.4.1`) AND in `node_modules/`. Switched to a typed static import so tsc validates the API surface.
**Change summary:** `require()` path removed; now imports `NetInfo, { type NetInfoState }` directly. Runtime behavior identical. Initial-fetch `.catch()` silently ignores errors (stays in no-op null state) so a flaky first probe doesn't flash a stale banner.
**Risk / follow-up:** None. P2-5 is now fully active — next native build will have live connectivity detection.

### 2026-04-15 — P2-8 · `expo-image` migration (15 files)
**Files:** `app/(tabs)/{pulse,index,events,profile}.tsx`, `app/event/[id].tsx`, `app/edit-profile.tsx`, `app/profile-setup.tsx`, `app/admin/{applications,event-ops}.tsx`, `app/member/[id].tsx`, `app/onboarding.tsx`, `components/{PostCard,ConversationItem,EventCard,Avatar}.tsx`
**Why:** React Native's `Image` has no built-in cache — every re-mount re-downloads. `expo-image` ships with memory + disk cache and faster render path.
**Change summary:**
- Removed `Image` from `react-native` destructured imports across 15 files.
- Added `import { Image } from 'expo-image'`.
- Renamed `resizeMode` → `contentFit` (10 instances across 8 files).
- Fixed PostCard `onError` handler signature: `e.nativeEvent.error` → `e` (expo-image event shape differs).
- Kept behavior parity — no `transition`, no `cachePolicy` overrides. Those are a future polish item; caching is still on by default.
**Risk / follow-up:** If any screen flashes differently on image load, adding `transition={200}` smooths it. Not doing that preemptively to keep the diff behavioral-neutral.

### 2026-04-15 — Backlog file
**Files:** `mobile/reports/MOBILE-BACKLOG-2026-04-15.md`
**Why:** Mobile-scoped prioritized backlog. P0 → P3 bands with file paths, acceptance criteria, and effort estimates. Cross-references `BACKLOG.md` `ITEM-###` IDs.

---

## Infrastructure Changes

Anything here must be picked up by the build pipeline / human operators — these are NOT pure code changes.

| Area | Before | After | Action required |
|---|---|---|---|
| iOS `Info.plist` | No usage strings | Camera / Photos / Photos-Add / Location-When-In-Use / Microphone / `ITSAppUsesNonExemptEncryption=false` | `expo prebuild --clean` (or EAS Build will regenerate) before next iOS native build. Verify strings in App Store Connect privacy declaration. |
| Android manifest | No `permissions` array, no adaptive-icon foreground | Explicit permission list + `adaptiveIcon.foregroundImage` | Same prebuild step. Verify Play Console permissions listing matches. |
| Expo plugins | `expo-router`, `expo-secure-store` | Above + `expo-image-picker`, `expo-location`, `expo-camera` with inline permission copy | Handled by `expo prebuild`. |
| Splash | `backgroundColor` only | Also `image` + `resizeMode: contain` | Picked up by prebuild. |
| App behavior on render error | White screen | `ErrorBoundary` with Try-again / Sign-out fallback | None — pure code. |
| Console noise in prod | Leaking warnings/errors | Gated to `__DEV__` | None — pure code. |

### Still-pending infrastructure blockers
- **EAS submit credentials** — `mobile/eas.json` `submit.production.ios` has empty `appleId`, `ascAppId`, `appleTeamId`. Brian must supply before `eas submit -p ios`.
- **Apple export-compliance** — with `ITSAppUsesNonExemptEncryption: false` in the Info.plist, App Store Connect should stop prompting on each TestFlight. Verify on the next build.
- **Google signing key** — no explicit signing config in `eas.json` for Android. Will rely on EAS-managed keystore unless Brian has an existing Play Console upload key to migrate.

### Deployment notes (context from parent repo — unchanged)
- `main` push → DO App Platform auto-deploy (server only, ~3–5 min).
- Mobile ships via EAS build → TestFlight / Play Internal; OTA updates via `eas update` for JS-only changes.
- MySQL on DO, not changed from this session.

---

## Test / Verification Log

| Date | Command | Result |
|---|---|---|
| 2026-04-15 | `npx tsc --noEmit` (in `mobile/`) after P0-1/2/3 | clean exit 0 |
| 2026-04-15 | `npx tsc --noEmit` after P1-1 + P1-2 + P1-3 | clean exit 0 |
| 2026-04-15 | `npx tsc --noEmit` after P1-4/5/6 + P2-5/6/7 + P3-3/4/5 | clean exit 0 |
| 2026-04-15 | `npx tsc --noEmit` after `_layout.tsx` provider reordering (caught JSX inversion, fixed) | clean exit 0 |
| 2026-04-15 | `npx tsc --noEmit` after P2-2 Messages empty-state CTAs | clean exit 0 |
| 2026-04-15 | `npx tsc --noEmit` after P2-4 Pulse stale-signal indicator | clean exit 0 |
| 2026-04-15 | `npx tsc --noEmit` after OfflineBanner static-import rewrite | clean exit 0 |
| 2026-04-15 | `npx tsc --noEmit` after P2-8 expo-image migration (15 files) | clean exit 0 |

Vitest intentionally not run from this agent — environment has a missing rolldown native binding for Linux arm64. Flag for CI health check if/when that environment is the runner.

---

## How to use this doc

- **Every backlog item merged on this branch gets one Work Log entry.** File paths, reason, change summary, risk bullet.
- **Any change that touches app.json / EAS / workflows / native config / build tooling** also goes in Infrastructure Changes.
- **When Claude passes work off**, the next agent should read this doc → the backlog → `HANDOFF-2026-04-15.md` (in that order) to be productive in under 5 minutes.
