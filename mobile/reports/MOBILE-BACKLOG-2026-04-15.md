# Soapies Mobile — Prioritized Backlog
**Date:** 2026-04-15
**Scope:** Mobile-only (`/mobile/**`). Server/DB/client changes are **out of scope**.
**Cross-refs:** `HANDOFF-2026-04-15.md`, root `BACKLOG.md` (ITEM-###), handoff doc §4.

Priority bands: **P0** blocks App Store submission or is a live security/stability issue. **P1** is a bug or gap users will hit in the next release. **P2** is quality / polish. **P3** is tech debt.

---

## P0 — App Store Blockers & Critical Bugs

### P0-1 · Native config in `app.json` — iOS usage strings + Android permissions + plugin entries
- **Why:** Apple will reject the build without `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, and `NSLocationWhenInUseUsageDescription`. Google Play requires an `adaptiveIcon.foregroundImage` and explicit permission declarations matching runtime prompts. `expo-image-picker` and `expo-location` must be listed as plugins for their native config to be applied at prebuild.
- **Files:** `mobile/app.json`
- **Acceptance:**
  - `expo.ios.infoPlist` contains the three usage strings with human-readable copy.
  - `expo.android.adaptiveIcon.foregroundImage` points to an existing asset.
  - `expo.android.permissions` lists only what the app actually uses.
  - `expo.plugins` includes `expo-image-picker`, `expo-location`, `expo-secure-store`, `expo-router` (+ any others already wired).
- **Effort:** S (20–30 min)

### P0-2 · Root `ErrorBoundary` wrapping `AuthGuard`
- **Why:** A render-time crash anywhere in the tree today whites out the app. Apple review routinely triggers edge cases (landscape rotate, offline cold-start). We need a visible fallback and a path back to `/`.
- **Files:** `mobile/components/ErrorBoundary.tsx` (new), `mobile/app/_layout.tsx`
- **Acceptance:**
  - Class component implementing `componentDidCatch` + `getDerivedStateFromError`.
  - Fallback UI matches dark theme, offers "Try again" (reset state) and "Sign out" (clears token, routes `/`).
  - Logs `componentStack` to console in `__DEV__` only.
- **Effort:** S (30 min)

### P0-3 · Auth header on `lib/uploadPhoto.ts` (client-side mitigation of ITEM-001)
- **Why:** Root BACKLOG ITEM-001 is that `/api/upload-photo` is unauthenticated server-side. We cannot fix server from mobile scope, but we can at minimum send the session token so when the server fix lands it "just works" — and we remove the trivial anonymous upload path from our own client.
- **Files:** `mobile/lib/uploadPhoto.ts`
- **Acceptance:**
  - Request includes `x-session-token: <token>` and `Cookie: app_session_id=<token>` headers, matching the pattern in `mobile/lib/trpc.ts`.
  - Fails fast with a user-friendly error if no token is loaded.
- **Effort:** XS (10 min)

### P0-4 · EAS submit credentials in `eas.json`
- **Why:** `submit.production.ios` has empty `appleId`, `ascAppId`, `appleTeamId`. Submit won't work.
- **Files:** `mobile/eas.json`
- **Action:** Requires Brian's Apple Developer + ASC info — track as a data-blocker, not a code fix.
- **Effort:** Blocked on Brian

---

## P1 — Bugs Users Hit Soon

### P1-1 · Console logs in production builds (ITEM-042)
- **Why:** Production builds leak tokens/PII into device logs and slow hot paths. Gate behind `__DEV__`.
- **Files:** `mobile/lib/trpc.ts`, `mobile/lib/auth.tsx`, any `.tsx` with bare `console.log`.
- **Acceptance:** `grep -rn "console\.\(log\|warn\|error\)" mobile/` only appears inside `if (__DEV__)` blocks or is an intentional error rethrow.
- **Effort:** S (45 min)

### P1-2 · Onboarding step 2 back button (ITEM-020)
- **Files:** `mobile/app/onboarding/...`
- **Acceptance:** Back button on step 2 returns to step 1 with state preserved.
- **Effort:** XS–S

### P1-3 · Pending-approval screen shows review stage (ITEM-029)
- **Why:** Users who finished applying don't know if they're in queue, scheduled for interview, or post-interview. We have `applicationPhase` on the profile — display it.
- **Files:** `mobile/app/pending-approval.tsx` (or similar)
- **Acceptance:** Screen renders distinct copy for `submitted`, `under_review`, `interview_scheduled`, `interview_complete`, `waitlisted`.
- **Effort:** S

### P1-4 · Event waiver gate before reservation (ITEM-025 client side)
- **Files:** `mobile/app/event/[id].tsx`
- **Acceptance:** If `profile.waiverSignedAt` is null, tapping "Reserve" routes to waiver screen before invoking `reservations.create`.
- **Effort:** S

### P1-5 · Chat screen: show real conversation-partner name, not "Direct Message" (already noted fixed in handoff §9 — verify)
- **Files:** `mobile/app/chat/[id].tsx`
- **Acceptance:** DMs show the other participant's display name in the header.
- **Effort:** XS (verify only)

### P1-6 · Home stat chips always show 0 (ITEM-010)
- **Why:** Root backlog flags this as a broken query on the server side, but verify the mobile-side query is pointed at the right procedure and handles undefined.
- **Files:** `mobile/app/(tabs)/index.tsx`
- **Acceptance:** Chips show a loading skeleton, then the real value or `0` explicitly.
- **Effort:** XS–S

---

## P2 — Quality, UX, Polish

- **P2-1** · Tab bar crowding on small devices (ITEM-032): consider combining `pulse` + `members` or hiding `notifications` behind the profile screen on `<375pt` widths.
- **P2-2** · Empty state for Messages tab (ITEM-036).
- **P2-3** · Chat image attachments (ITEM-030) — blocked by upload endpoint being authenticated; defer until P0-3 lands plus server fix.
- **P2-4** · Pulse stale-signal indicator (ITEM-028): if `signalExpiresAt < now`, render with 50% opacity + "stale" caption.
- **P2-5** · Offline banner — wire `@react-native-community/netinfo` (already installed?) to show a top banner when `!isConnected`.
- **P2-6** · Deep links: `soapies://event/123`, `soapies://chat/456`. Register handlers in `_layout.tsx`.
- **P2-7** · FlatList perf pass: `removeClippedSubviews`, `windowSize={7}`, `getItemLayout` on fixed-height rows (members, messages, events).
- **P2-8** · Swap `Image` → `expo-image` for built-in caching + placeholder fade-in.

---

## P3 — Tech Debt

- **P3-1** · Replace `as any` route casts with typed router. ~120 instances of `router.push('/foo' as any)`.
- **P3-2** · Replace tRPC response `as any` with `inferRouterOutputs<AppRouter>` — requires importing `AppRouter` type from server (already works via mounted parent repo path in tsconfig).
- **P3-3** · Extract Pulse match-score calculator into `mobile/lib/pulseScore.ts` and add Vitest unit tests. Currently inline in `(tabs)/pulse.tsx` (~1350 LOC file).
- **P3-4** · Extract auth/token lifecycle tests for `lib/trpc.ts` (`isValidJWT`, cold-start hydration).
- **P3-5** · Pull repeated `LinearGradient colors={['#EC4899', '#A855F7']}` into a `<BrandGradient>` component.

---

## Notes / Hard Constraints

- **Server changes forbidden** from this agent. Any item requiring `server/`, `drizzle/`, `client/`, or `.github/workflows/` changes goes into a "needs-dev agent" queue — we flag it but do not touch it.
- **DB password discipline:** never inline `DATABASE_URL` in a committed file. (Applies to any seed/scratch we might write under `mobile/scripts/`.)
- **Deployment:** push to `main` triggers DO App Platform deploy for the server. Mobile changes ship via EAS build + OTA update, not DO.
- **Test users:** `user1@testuser.soapies` … `user180@testuser.soapies`, password `TestPass123!`. Admin: `admin@soapiesplaygrp.club`.
