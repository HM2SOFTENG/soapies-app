# Soapies App Comprehensive Product, QA, Engineering, and Release Audit

**Date:** 2026-04-24  
**Audit scope:** Mobile app + supporting backend surfaces used by mobile  
**Repo:** `HM2SOFTENG/soapies-app`  
**Primary mobile path:** `mobile/`  
**Backend path:** `server/`  
**Auditor stance:** QA Lead + PM + Dev Lead + Scrum Master combined

---

# 1. Executive Summary

Soapies is a feature-rich membership/social-events mobile product built on Expo Router + React Native with a shared TypeScript/tRPC backend. The app already contains meaningful product depth:
- auth and onboarding
- application/approval flow
- event discovery and reservations
- messaging
- social wall/feed
- member directory and member profiles
- notifications
- admin operations
- referrals/credits
- test-result and waiver-related event workflows

The app is **substantially built**, but it is **not yet in a clean app-store-ready state**.

## Overall readiness assessment

### Product readiness
- **Beta-capable:** yes
- **Private/internal release capable:** yes, with controlled rollout
- **Public App Store ready:** **not yet**

### Why it is not yet App Store ready
Top blocking themes:
1. **Incomplete consistency across screens and flows**
2. **Known UX regressions and theme inconsistencies still being discovered live**
3. **Too much runtime behavior depends on hosted/backend deployment alignment**
4. **Insufficient systematic screen-by-screen QA coverage**
5. **Architecture/documentation drift between current implementation and older docs**
6. **Mobile auth/session strategy needs clearer hardening and release validation**
7. **Operational/admin surfaces are improving quickly, but still need structured validation**
8. **No evidence in this audit of a complete release checklist for App Store policy, privacy, push, deep links, offline/error handling, or legal/compliance copy**

## Recommendation
Do **not** treat the app as public-store ready yet.  
Treat the next phase as a structured **release-hardening program** with:
- product/flow audit closure
- design consistency pass
- backend/mobile contract hardening
- error/empty/loading state completion
- release documentation and policy readiness
- end-to-end scenario QA matrix

---

# 2. System Overview

## Frontend stack
- Expo SDK 54
- Expo Router (file-based routing)
- React Native + TypeScript
- TanStack Query
- tRPC client
- Custom semantic theme system (`mobile/lib/theme.tsx`)
- Shared reusable components in `mobile/components`

## Backend stack
- Node/TypeScript
- tRPC router in `server/routers.ts`
- Drizzle ORM
- MySQL-compatible schema in `drizzle/schema.ts`
- Notification/auth/business logic integrated into server router/domain helpers

## Architectural model
The mobile app is not a thin toy client. It is a substantial app consuming a broad backend surface. The architecture is roughly:
- **mobile UI layer** → screens and shared components
- **domain/network layer** → tRPC procedures
- **server domain logic** → router procedures + db helpers
- **persistence layer** → Drizzle schema/db queries

This is a viable long-term architecture, but current execution quality varies screen to screen.

---

# 3. App Structure Inventory

## Major mobile route groups

### Auth
- `mobile/app/(auth)/login.tsx`
- `mobile/app/(auth)/forgot-password.tsx`
- `mobile/app/(auth)/reset-password.tsx`

### Main tabs
- `mobile/app/(tabs)/index.tsx` — feed/home
- `mobile/app/(tabs)/events.tsx`
- `mobile/app/(tabs)/messages.tsx`
- `mobile/app/(tabs)/notifications.tsx`
- `mobile/app/(tabs)/profile.tsx`
- `mobile/app/(tabs)/pulse.tsx`

### Feature/detail screens
- `mobile/app/chat/[id].tsx`
- `mobile/app/event/[id].tsx`
- `mobile/app/member/[id].tsx`
- `mobile/app/members.tsx`
- `mobile/app/connections.tsx`
- `mobile/app/edit-profile.tsx`
- `mobile/app/settings.tsx`
- `mobile/app/tickets.tsx`
- `mobile/app/onboarding.tsx`
- `mobile/app/profile-setup.tsx`
- `mobile/app/pending-approval.tsx`

### Admin screens
- `mobile/app/admin/index.tsx`
- `mobile/app/admin/applications.tsx`
- `mobile/app/admin/events.tsx`
- `mobile/app/admin/event-ops.tsx`
- `mobile/app/admin/checkin.tsx`
- `mobile/app/admin/interview-slots.tsx`
- `mobile/app/admin/reservations.tsx`
- `mobile/app/admin/push-notifications.tsx`
- `mobile/app/admin/settings.tsx`
- `mobile/app/admin/announcements.tsx`
- `mobile/app/admin/members.tsx`

## Shared component inventory
Key reusable UI building blocks:
- `Avatar.tsx`
- `EventCard.tsx`
- `PostCard.tsx`
- `ConversationItem.tsx`
- `NotificationItem.tsx`
- `GradientButton.tsx`
- `PillTabs.tsx`
- `ThemedScreen.tsx`
- `ErrorBoundary.tsx`
- `OfflineBanner.tsx`

Observation: there is a credible shared UI layer, but consistency still depends heavily on per-screen implementation discipline.

---

# 4. Backend Capability Inventory Relevant to Mobile

Primary server namespaces in `server/routers.ts`:
- `auth`
- `profile`
- `events`
- `reservations`
- `wall`
- `messages`
- `notifications`
- `groups`
- `announcements`
- `referrals`
- `settings`
- `credits`
- `partners`
- `blocking`
- `introCalls`
- `photoModeration`
- `changeRequests`
- `members`
- `communities`
- `testResults`
- `admin`

Observation: backend breadth is strong. The bigger issue is not missing domains overall; it is **cohesion, consistency, and QA depth across those domains**.

---

# 5. Product Flow Analysis

## 5.1 Authentication and account lifecycle
### Present
- login
- password reset request + reset
- registration and approval flow
- deactivation-related routes server-side
- email verification flows

### Risks / concerns
- older docs indicate prior auth/session uncertainty between cookie vs token strategy
- mobile release quality depends on a fully stable session contract across app restarts, deep links, expired sessions, and flaky network
- app-store readiness requires robust unhappy-path handling, not just happy-path login

### Assessment
**Functionally viable, release-hardening incomplete.**

---

## 5.2 Onboarding / profile setup / approval
### Present
- onboarding
- profile setup
- pending approval state
- application and change request infrastructure

### Risks / concerns
- change-request and approval flows are operationally complex and need end-to-end audit with admin tools
- approval-state transitions must be validated across all related screens and route guards
- profile setup completeness and waiver/resource/legal gating need explicit release verification

### Assessment
**Strategically important and likely fragile unless deeply QA’d.**

---

## 5.3 Feed / wall / social activity
### Present
- feed screen
- post cards
- likes/comments
- composer behavior exists with partial/iterative polish

### Risks / concerns
- prior notes flagged partial composer wiring concerns
- wall/engagement features need moderation, media, and failure-state review for public scale
- app-store readiness requires confidence that user-generated-content handling is robust enough

### Assessment
**Core product surface exists; moderation/polish/compliance review still needed.**

---

## 5.4 Events / reservations / tickets
### Present
- events list and detail
- reservations/ticketing
- test result and waiver related workflow
- admin reservation/event ops/check-in flows
- tickets screen and QR/check-in patterns

### Risks / concerns
- this is among the highest business-critical surfaces
- event pricing, payment state, reservation state, test-result approval, waiver status, and check-in must be logically consistent
- hosted deployment drift can break workflows even when local mobile UI is correct

### Assessment
**High-value, high-risk, demands scenario QA before public release.**

---

## 5.5 Messaging
### Present
- conversation list
- chat screen
- create conversation
- reactions
- read markers

### Risks / concerns
- older QA noted missing error handling on some messaging actions
- real-time experience appears polling-driven rather than truly real-time in mobile
- conversation naming/header consistency and reliability need review
- chat is a trust-sensitive surface; failures feel disproportionately bad to users

### Assessment
**Usable, but must be hardened before public launch.**

---

## 5.6 Member directory / member profiles / Pulse
### Present
- member browse/search/filter
- member detail/profile
- Pulse discovery surface
- poke/casual-meetup support added recently
- relationship/community context in profiles

### Risks / concerns
- repeated theme and routing regressions were found during recent work
- profile detail and Pulse are visually rich and therefore more regression-prone
- moderation/report/block flows must be fully verified for store readiness

### Assessment
**Differentiating product area, but needs disciplined end-to-end quality control.**

---

## 5.7 Notifications
### Present
- notifications list
- mark read / mark all read
- preference routes
- in-app/admin-triggered operational notifications

### Risks / concerns
- push integration readiness is not fully evidenced by this audit
- notification preference UX/compliance needs validation
- error/empty/loading states need consistent treatment

### Assessment
**Good foundation, release completeness uncertain.**

---

## 5.8 Admin operations
### Present
- broad admin area
- applications
- events
- event ops / check-in
- reservations
- interview slots
- settings / announcements / push notifications
- members operations console recently expanded heavily

### Risks / concerns
- admin area has moved fast; breadth is good but regression risk is high
- recent work indicates active stabilization rather than fully mature completion
- admin flows are now powerful enough that permission, audit, and destructive-action UX matter a lot

### Assessment
**Operationally promising, but not yet proven as stable enough for “done.”**

---

# 6. Recent Engineering Lessons / Repeated Failure Modes

Based on recent work history, several recurring engineering risk patterns are clear:

## 6.1 Theme migration regressions
Observed repeatedly:
- `theme` references at module scope or static `StyleSheet.create(...)`
- runtime `ReferenceError: Property 'theme' doesn't exist`
- stale theme values after light/dark switching
- inconsistent token adoption across screens

### Implication
The app’s theme migration is valuable but still fragile. This is a release blocker category until systematic verification is completed.

## 6.2 JSX syntax regressions in large screen files
Observed repeatedly in admin/event-ops/member-related edits.

### Implication
Some screens are too large and too brittle. This is a code-health concern and directly impacts regression frequency.

## 6.3 Hosted-backend mismatch vs local frontend
Observed repeatedly:
- frontend adds new route support
- mobile points to hosted API
- hosted backend deploy lags behind
- feature appears broken despite correct local code

### Implication
Release discipline is not just code discipline. It requires a deployment verification workflow and possibly feature gating/version awareness.

## 6.4 Shared component maturity gaps
Example: `PillTabs` needed multiple rounds to behave correctly.

### Implication
UI primitives need stronger contract-level testing and visual QA before broad reuse.

---

# 7. Documentation Quality Assessment

## Existing docs quality
Useful but partially stale/incomplete:
- `mobile/README.md`
- `mobile/reports/qa-report.md`
- `mobile/reports/ui-polish-notes.md`
- `mobile/reports/performance-notes.md`
- `mobile/reports/dev-notes.md`

## Doc drift identified
`mobile/README.md` still says:
- “dark mode throughout” — no longer accurate enough; active semantic theming migration is underway
- “What still needs wiring” appears partly stale relative to current implementation
- auth notes reflect prior uncertainty that may no longer be fully current

### Assessment
Documentation is helpful but **not authoritative enough** for release management yet.

---

# 8. Engineering Quality Assessment

## Strengths
- shared TS stack across mobile/server
- broad tRPC surface
- significant product breadth already implemented
- growing shared component system
- recent willingness to stabilize and QA after regressions
- admin tooling is becoming genuinely operationally useful

## Weaknesses
- route/screen files appear large and prone to breakage
- `as any` / weak typing historically overused
- incomplete consistency in error/loading/empty states
- visual consistency still being actively repaired
- release/deploy process can cause environment mismatch bugs
- product behavior documentation lags implementation

## Engineering maturity score (practical, not academic)
- **Architecture:** good
- **Implementation consistency:** medium
- **QA discipline:** improving, not yet sufficient for public store confidence
- **Release management maturity:** medium-low

---

# 9. Screen-by-Screen / Area-by-Area Risk Review

Below is a product-facing audit summary, not exhaustive code commentary.

## Auth screens
- login / forgot-password / reset-password exist
- need explicit release QA for failure cases, expired codes, resend loops, offline, and session restoration

**Risk:** medium-high

## Home / Feed
- active, central user surface
- needs validation of composer, likes, comments, empty states, moderation edge cases, media states

**Risk:** medium

## Events list + event detail
- high-revenue/high-trust surface
- validate event data consistency, pricing display, ticket type logic, waiver/testing gating, reserve flow, and failure states

**Risk:** high

## Messages + chat
- validate creation, send, fail/retry, read-state, reactions, stale conversation names, long threads, and navigation loops

**Risk:** high

## Notifications
- likely functional, but must validate unread counts, mark all/read sync, empty state, and preference behavior

**Risk:** medium

## Members + member detail + Pulse
- rich/visual/social area with recent active changes
- validate light/dark, navigation, block/report, poke, profile access paths, and modal/return flows

**Risk:** high

## Tickets
- business-critical for active event customers
- validate QR lifecycle, paid/pending state, waiver/testing dependence, check-in compatibility

**Risk:** high

## Settings / profile / edit-profile
- validate all account editing flows, clipboard/share if present, privacy/prefs, and change request submission

**Risk:** medium-high

## Admin applications
- essential for membership ops
- must ensure state transitions do not orphan users in bad states

**Risk:** high

## Admin events / reservations / event ops / check-in
- deeply operational and high-consequence
- validate with realistic seeded data and edge cases

**Risk:** very high

## Admin members
- recently expanded significantly and now much more capable
- needs post-implementation scenario QA, especially after hosted deploys

**Risk:** high until validated

---

# 10. App Store Deployment Blocker Backlog

This section is the most important release-management artifact.

## P0 — Must fix before App Store submission

### P0.1 Full regression audit across all routes/screens
There is no evidence in this audit of a completed screen-by-screen manual QA pass after the recent large mobile/admin/theme changes.

**Why blocker:** public release without route coverage is too risky.

### P0.2 Error-state completeness on all major networked screens
Historically identified missing `isError` / mutation `onError` handling in multiple screens.

**Why blocker:** blank or silently failing screens are unacceptable in a public release.

### P0.3 Theme consistency and light/dark regression closure
Recent work shows theme bugs still emerge across screens.

**Why blocker:** visible quality and trust issue across core app.

### P0.4 Hosted deployment compatibility validation
Mobile uses hosted API by default. New procedures can fail if backend is not deployed yet.

**Why blocker:** release behavior must be deterministic and environment-verified.

### P0.5 End-to-end validation of high-risk transactional flows
At minimum:
- register → verify → onboarding → profile/application
- approval/admin review
- browse events → reserve → payment pending → payment confirmed
- ticket/QR/check-in
- message create/send/read
- member browse/profile/poke/block/report
- notifications read/unread
- admin member actions + group assignment

**Why blocker:** these are core product promises.

### P0.6 Release/auth/session hardening validation
Need verified behavior for:
- app relaunch with valid session
- expired session
- password reset lifecycle
- logout/login loops
- network loss during auth-sensitive screens

**Why blocker:** auth breakage destroys retention and store trust.

### P0.7 App Store compliance readiness review
Not evidenced in this audit:
- privacy policy integration
- terms/community rules presentation
- reporting and blocking adequacy for social UGC
- data deletion/deactivation clarity
- age-gating / adult-content policy positioning if applicable
- screenshot/metadata readiness

**Why blocker:** even a working app can fail review.

---

## P1 — Critical for stable production soon after submission

### P1.1 Remove or reduce oversized/brittle screen files
Large admin/member/event screens are regression hotspots.

### P1.2 Strengthen typing and reduce `any`
Weak typing hides API drift and slows safe iteration.

### P1.3 Add automated tests around shared UI primitives and high-risk screens
Especially:
- `PillTabs`
- navigation return flows
- admin member operations
- reservation/ticket state displays
- theme-dependent shared components

### P1.4 Formalize release QA matrix
By persona:
- applicant/member
- approved member
- admin/operator
- suspended/deactivated user

### P1.5 Improve deployment verification workflow
Need a clear step that verifies hosted backend includes newly added procedures before QA signoff.

---

## P2 — Important product polish / scale readiness

### P2.1 Consolidate design system for headers/back buttons/cards/filters/modals
Still too much one-off per-screen styling.

### P2.2 Improve admin workflow cohesion further
Admin Members is much stronger now, but other admin screens likely still vary in UX quality.

### P2.3 WebSocket / realtime improvements for messaging and notifications
Polling may be acceptable for beta but not ideal long-term.

### P2.4 Stronger offline and retry UX
Need consistent network interruption behavior.

### P2.5 Analytics / observability / crash monitoring
Not evidenced in this audit; essential for public release learning loops.

---

# 11. Product Backlog by Workstream

## Workstream A — Release hardening
1. Build master QA checklist per route
2. Run manual end-to-end scenarios with seeded personas
3. Log/fix every runtime/navigation/theme issue found
4. Verify hosted deployment behavior after each ship
5. Produce release signoff checklist

## Workstream B — Theme and UI consistency
1. Complete semantic theme migration
2. Replace ad hoc back buttons with shared primitive
3. Standardize card/layout spacing
4. Audit all modals/sheets in light and dark mode
5. Validate iPhone safe-area and Android status-bar behavior

## Workstream C — Transactional trust surfaces
1. Reservation/payment lifecycle validation
2. Ticket/QR/check-in lifecycle validation
3. Test-result and waiver gating validation
4. Pending/approved/rejected application state validation

## Workstream D — Admin excellence
1. Finish admin members stabilization after latest expansion
2. Validate all admin screens with realistic datasets
3. Add clearer audit indicators for destructive actions
4. Standardize admin search/filter/sort patterns

## Workstream E — Architecture and maintainability
1. Break up oversized screen files
2. Reduce `any` and derive route return types
3. Move repeated UI logic to primitives/hooks
4. Create screen contract docs for important routes

## Workstream F — App Store readiness
1. Privacy/compliance audit
2. content policy and moderation audit
3. metadata/screenshot/store-copy prep
4. notification permission strategy review
5. crash analytics + release monitoring setup

---

# 12. Recommended Sprint Structure

## Sprint 1 — Release blockers and QA framework
- build QA matrix
- close major error/loading/theme regressions
- verify auth/session reliability
- validate hosted deploy process

## Sprint 2 — High-risk transactional flow hardening
- applications
- events/reservations/tickets/check-in
- messaging trust flows
- member moderation/report/block

## Sprint 3 — App-store readiness and documentation
- compliance/policy readiness
- release checklist
- analytics/crash reporting
- final regression pass

---

# 13. Recommended Definition of Done for Public Release

A feature area is only “done” when all are true:
1. Happy path works on hosted environment
2. Error state exists and is understandable
3. Empty state is intentional
4. Loading state is intentional
5. Light and dark mode both verified
6. Navigation in and out is clean
7. Permissions/role gating verified
8. No known runtime warnings/errors in normal flow
9. Backend deployment parity verified
10. Included in release QA checklist

The app as a whole is only public-release ready when all P0 items are closed and signed off.

---

# 14. Final Judgment

## What this app is today
A serious, ambitious, already-valuable product with strong breadth and a viable architecture.

## What it is not yet
A fully hardened, public App Store-ready app.

## Best framing
This is in **late beta / pre-release hardening phase**.

## Highest-value next move
Do not keep building breadth first.  
Shift into **structured release-hardening mode** until the P0 list is closed.

---

# 15. Immediate Action List

## This week
1. Freeze major net-new feature expansion unless it directly reduces release risk
2. Create a master route-by-route QA checklist from this audit
3. Run hosted-environment regression on every major user/admin flow
4. Capture blockers with severity and owner
5. Fix all P0 issues before discussing public App Store submission timing

## Suggested leadership posture
- **PM:** prioritize release hardening over feature expansion
- **QA lead:** build and run scenario matrix with screenshots/evidence
- **Dev lead:** reduce regression hotspots, improve typing, standardize primitives
- **Scrum master:** track P0/P1 closure visibly and prevent scope drift

---

# Appendix A — Key Existing Evidence Used
- `mobile/README.md`
- `mobile/reports/qa-report.md`
- `mobile/reports/ui-polish-notes.md`
- `mobile/reports/performance-notes.md`
- `mobile/reports/dev-notes.md`
- current route inventory under `mobile/app`
- current component inventory under `mobile/components`
- current router namespaces in `server/routers.ts`

---

# Appendix B — Important Caveat
This audit is thorough from a codebase/reports/architecture perspective, but it is **not a substitute for a full manual device QA pass on every screen and scenario**.  
That manual hosted-environment validation is still required before claiming store readiness.
