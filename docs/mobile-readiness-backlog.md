# Soapies Mobile Readiness Backlog

_Last updated: 2026-04-26_
_Branch: `production-readiness/spoapies-app-store-ci-cd`_

## Goal
Harden Soapies mobile for production/App Store readiness by closing security gaps, finishing theme/system consistency work, reducing giant-screen maintenance risk, consolidating duplicate workflows, and tightening operational/admin UX.

## Execution policy
- Fix highest-risk issues first.
- Prefer changes that improve security, reliability, and maintainability without changing product behavior.
- Validate each tranche with mobile lint, typecheck, tests, and config checks.

---

## Phase 0 — Completed in this tranche

### Security / access hardening
- [x] Add a shared admin access hook: `mobile/lib/useAdminAccess.ts`
- [x] Add shared admin gate fallback UI: `mobile/components/AdminAccessGate.tsx`
- [x] Standardize admin-access verification/loading handling across admin screens
- [x] Close missing admin-guard gaps on:
  - [x] `mobile/app/admin/checkin.tsx`
  - [x] `mobile/app/admin/event-ops.tsx`
  - [x] `mobile/app/admin/push-notifications.tsx`

### Admin workflow hardening
- [x] Switch admin push recipient picker to admin-scoped member lookup
- [x] Add searchable member lookup in push notifications
- [x] Remove hard cap/first-page-only recipient picker behavior in push notifications UI

---

## Phase 1 — Immediate next hardening items

### P0 security / correctness
- [ ] Audit every admin route for guard consistency and navigation escape hatches
- [ ] Confirm server-side authorization matches new client guards for all admin mutations
- [ ] Add stronger destructive-action confirmation affordances where missing (`members`, `applications`, `event-ops`)
- [ ] Verify `admin/members.tsx` helper formatting bug around label rendering / regex behavior

### P0 UX / operational correctness
- [ ] Choose one canonical QR/manual check-in experience:
  - [ ] keep standalone `admin/checkin.tsx`
  - [ ] or merge fully into `admin/event-ops.tsx`
- [ ] Choose one canonical Venmo confirmation queue:
  - [ ] dashboard quick queue only as preview
  - [ ] `admin/reservations.tsx` as source of truth
- [ ] Replace fake “export attendee list” behavior in `admin/event-ops.tsx` with a real export or relabel as preview

---

## Phase 2 — Theme/system completion

### Highest-priority theme migration targets
- [ ] `mobile/app/chat/[id].tsx`
- [ ] `mobile/app/event/[id].tsx`
- [ ] `mobile/app/member/[id].tsx`
- [ ] `mobile/app/profile-setup.tsx`

### Shared-system adoption
- [ ] Expand `ThemedScreen` usage beyond `mobile/app/settings.tsx`
- [ ] Replace remaining `lib/colors.ts` dependencies with semantic theme tokens where practical
- [ ] Expand `PressableScale` reuse for repeated press animation patterns
- [ ] Expand `EventCard` reuse for event preview consistency
- [ ] Normalize to shared form/input primitives where repeated across admin and auth flows

---

## Phase 3 — Structural refactors for giant screens

### Consumer app
- [ ] Break `mobile/app/(tabs)/index.tsx` into:
  - [ ] announcement rail
  - [ ] reservation summary
  - [ ] post composer
  - [ ] post feed/list container
- [ ] Break `mobile/app/(tabs)/pulse.tsx` into:
  - [ ] signal composer/status
  - [ ] discovery card stack/list
  - [ ] score/match explanation helpers
  - [ ] action/footer controls
- [ ] Break `mobile/app/event/[id].tsx` into:
  - [ ] hero/details header
  - [ ] reservation state panel
  - [ ] partner picker
  - [ ] waiver/test/payment subflows
- [ ] Break `mobile/app/member/[id].tsx` into:
  - [ ] profile hero
  - [ ] social context / wall
  - [ ] actions (message/poke/connect/report/block)

### Admin app
- [ ] Break `mobile/app/admin/event-ops.tsx` into section components:
  - [ ] volunteers
  - [ ] duties
  - [ ] stats
  - [ ] actions
  - [ ] check-in
- [ ] Break `mobile/app/admin/members.tsx` into:
  - [ ] filters/search toolbar
  - [ ] member list
  - [ ] alert summaries
  - [ ] detail modal sections
- [ ] Reduce single-screen mutation density by extracting action handlers/hooks

---

## Phase 4 — Product readiness / App Store completion

### App settings and metadata
- [ ] Fill `APP_STORE_ID` placeholder in `mobile/app/settings.tsx`
- [ ] Verify production deep links, notification handling, and app metadata flows on device
- [ ] Validate EAS profiles, runtime config, icons/splash, and submission metadata

### Reliability and polish
- [ ] Add tests around `lib/pulseScore.ts`
- [ ] Add tests around deep-link parsing / routing expectations
- [ ] Centralize duplicated formatting helpers (`timeAgo`, date labels, status labels)
- [ ] Review long-poll / refetch intervals in messaging and notifications for battery/network tradeoffs
- [ ] Review upload/photo failure states, retry UX, and large-file handling

---

## Screen-specific follow-ups

### Strong but should be cleaned up next
- [ ] `mobile/app/tickets.tsx`
- [ ] `mobile/app/connections.tsx`
- [ ] `mobile/app/onboarding.tsx`
- [ ] `mobile/app/admin/interview-slots.tsx`

### Strong and lower urgency
- [ ] `mobile/app/(tabs)/notifications.tsx`
- [ ] `mobile/app/(tabs)/messages.tsx`
- [ ] `mobile/app/(tabs)/profile.tsx`
- [ ] `mobile/app/admin/announcements.tsx`
- [ ] `mobile/app/admin/settings.tsx`
- [ ] `mobile/app/admin/applications.tsx`

---

## Suggested execution order
1. Security hardening and admin guard consistency
2. Theme migration on the 4 highest-value screens
3. Canonical workflow decisions for check-in and Venmo queue
4. Giant-screen refactors in descending business criticality
5. App Store readiness metadata + final polish/testing

## Notes
- The app is already feature-rich enough for serious use.
- The main readiness gap is no longer missing capability; it is consistency, hardening, and maintainability.
- This backlog should be treated as the execution source of truth until the remaining items are closed.
