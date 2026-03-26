# Soapies App — Active Backlog
*Last updated: 2026-03-25 by ClawBot*
*Based on: last 10 commits + full codebase audit*

---

## 🟣 PRINCIPLE: Auto-Invalidation on All CRUD

> Every mutation must invalidate or refetch the relevant query(ies) in `onSuccess`.
> No UI should require a manual page reload to see changes.

### Gaps found in current codebase:

| File | Mutation | Missing Invalidation |
|---|---|---|
| `AdminEventOps.tsx` (CheckInCard, line 44) | `updateStatus` | No invalidate — toast only |
| `AdminEventOps.tsx` (OperatorsTab, line 450) | `operators.remove` | No invalidate — toast only |
| `AdminEventOps.tsx` (OperatorsTab, line 453) | `checklist.update` | No invalidate — toast only |
| `AdminEventOps.tsx` (OperatorsTab) | `operators.*` mutations (add/remove) | No `operators.list.invalidate()` |
| `AdminReservations.tsx` | `confirm/reject` | Uses `refetch()` not `invalidate()` — acceptable but inconsistent |
| `Dashboard.tsx` | `referrals.generate` | No invalidate on referral query |
| `EventDetail.tsx` | `reservations.create` | No invalidate on `events.byId` (capacity counter) or user's reservations |
| `EventDetail.tsx` | `referrals.generate` | No invalidate |
| `Waiver.tsx` | `profile.signWaiver` | No invalidate on profile |
| `ScheduleInterview.tsx` | `introCalls.book` | No invalidate on slots list |
| `JoinFlow.tsx` | All mutations | No invalidations (ok — it's a wizard, not a live view) |
| `Apply.tsx` | All mutations | Same as JoinFlow |

**Fix strategy:** Add `utils.<router>.<procedure>.invalidate()` in every `onSuccess`. Use `trpc.useUtils()` at top of component.

---

## 🔴 P0 — Blocking Real Operations

### [BKL-001] Stripe / Payment Processing
**Status:** Schema ready, zero Stripe code written
- Current flow: reservation created → `paymentStatus: "pending"` → Venmo manually confirmed by admin
- Stripe columns (`stripeSessionId`, `stripePaymentIntentId`) exist but unused
- **Build:**
  - `POST /api/stripe/create-checkout` — creates Stripe Checkout session for reservation
  - `POST /api/stripe/webhook` — handles `checkout.session.completed`, marks `paid`, triggers QR generation
  - EventDetail: redirect to Stripe after reservation creation (replace Venmo-only flow)
  - AdminReservations: show Stripe vs Venmo reservations with status
- **Note:** Keep Venmo path for people who prefer it — just add Stripe as the default

### [BKL-002] QR Code Generation & Ticket Confirmation
**Status:** `tickets.qrCode` field exists, never populated
- Generate QR on reservation confirmation (payment confirmed OR volunteer accepted)
- Package: `qrcode` npm
- Ticket confirmation page at `/tickets/:reservationId` — shows QR, event details, seat type
- Admin/operator check-in scanner UI in EventOps (camera scan → mark `checked_in`)
- **Mobile UX:** This is used at the door on a phone — must be snappy

### [BKL-003] Real-time Messaging (WebSocket)
**Status:** Polling-based today (manual `refetch` in Messages.tsx)
- `server/_core/websocket.ts` exists and is partially implemented
- Wire it up: new message → push to connected clients via ws
- Typing indicators (schema exists)
- Online presence (schema exists)
- Also use for: notification push, check-in updates in EventOps

---

## 🟠 P1 — Core Feature Gaps

### [BKL-004] Community Landing Pages
- Routes `/c/soapies`, `/c/groupies`, `/c/gaypeez` missing
- Branded landing per community: hero, events, wall, join CTA
- Backend: `groups` table + `communityId` on events/posts already exist

### [BKL-005] Admin: Event Reservation Management View
- `AdminReservations.tsx` exists but only shows pending Venmo
- Need full view: all reservations by event, ticket type, payment status, check-in status
- Actions: manually confirm, cancel, refund, override wristband color

### [BKL-006] Analytics Dashboard
- Empty placeholder in AdminDashboard
- Data available: revenue by event, ticket type breakdown, member growth, check-in rates
- Use `recharts` (already installed)

### [BKL-007] Member Discovery / Browse Members
- No way to find other members
- Grid of approved members: avatar, display name, orientation, location
- Respects block list
- Links to member profile (public view, not full edit)

### [BKL-008] Waiver Signing UI
- `signedWaivers` table + `profile.signWaiver` mutation exist
- `Waiver.tsx` page exists but has no `invalidate` on success and isn't wired to event gate
- Show waiver gate on EventDetail when `event.requiresWaiver = true` and user hasn't signed

### [BKL-009] Web Push Notifications
- `pushSubscriptions` table + preferences UI + VAPID env exist
- Missing: service worker, VAPID key generation, push sends on approval/event reminder
- In-app + email + SMS already work

---

## 🟡 P2 — Quality & Completeness

### [BKL-010] Rich HTML Email Templates
- Currently plain text-ish in notification strings
- Build branded templates for: approval, ticket confirmation w/ QR, event reminder, partner invite, password reset

### [BKL-011] Pagination
- `getWallPosts`, `getAllUsers`, `getAuditLogs` fetch ALL records — will break at scale
- Add cursor-based pagination to all list endpoints

### [BKL-012] Rate Limiting + Input Validation
- No rate limiting on OTP, login, register routes
- Add `express-rate-limit` to auth routes
- Stricter Zod: phone format, email format, length limits
- Sanitize HTML in wall posts / messages

### [BKL-013] Event Waitlist
- `capacity` + `currentAttendees` on events table exist
- No enforcement: no "sold out" state, no waitlist join, no auto-promote on cancellation

### [BKL-014] Partner Invite Acceptance Flow
- Backend `partners.acceptInvitation` exists
- No `/invite/:token` route or UI — partner can't actually accept

### [BKL-015] Member: Cancellation Request UI
- Backend exists (`cancellationRequests` table + admin endpoints)
- No member-facing UI to request reservation cancellation

### [BKL-016] Expense Tracking Frontend (Admin)
- Backend CRUD exists
- Admin needs: list expenses per event, add, attach receipt URL, approve

### [BKL-017] Admin Audit Log Viewer
- Backend `admin.auditLogs` exists
- Need table with pagination + filters (action type, date, user)

### [BKL-018] Event Feedback UI (Member)
- `eventFeedback` table + tRPC endpoints exist
- Show rating widget on EventDetail after event end date has passed

### [BKL-019] iCal / Calendar Export
- "Add to Calendar" on EventDetail — iCal link + Google Calendar URL
- Package: `ics` npm

### [BKL-020] Dark Mode Toggle
- `ThemeProvider` from `next-themes` already wired
- Just need a toggle button in Navbar/settings

---

## 🟢 P3 — Nice to Have

| ID | Feature | Notes |
|---|---|---|
| BKL-021 | Social Login (Google/Apple) | OAuth env vars exist but not connected |
| BKL-022 | ToS / Privacy Policy pages | Legal requirement — static content |
| BKL-023 | Age Verification (18+) gate | DOB collected in application, not enforced |
| BKL-024 | PWA / installable app | `manifest.json` + service worker |
| BKL-025 | SEO + Open Graph tags | Home/Events pages |
| BKL-026 | Content Reporting | Report wall posts, messages, profiles |
| BKL-027 | Photo Privacy Controls | Face-blur / selective visibility |
| BKL-028 | Admin Mass Communication | Blast email/SMS to all members or filtered group |
| BKL-029 | Group Change Request UI (Member) | Backend exists |
| BKL-030 | Profile Change Request UI (Member) | Backend exists |

---

## ⚡ Quick Wins (< 2 hours each)

1. **Auto-invalidation fixes** — fix all the gaps in the table above (~1 hour)
2. **[BKL-019] iCal export** — pure frontend, `ics` package (~1h)
3. **[BKL-020] Dark mode toggle** — ThemeProvider already wired (~30m)
4. **[BKL-022] ToS/Privacy pages** — static content (~1h)
5. **[BKL-017] Audit log viewer** — backend done, table UI (~2h)
6. **[BKL-008] Waiver gate on EventDetail** — mutation + invalidate + conditional gate (~1h)

---

## 📋 Recommended Sprint Order

**Sprint 1 — Foundation (can be done in parallel with codex):**
1. Auto-invalidation sweep (all CRUD mutations)
2. BKL-002: QR code generation + ticket page
3. BKL-008: Waiver gate
4. BKL-013: Event capacity enforcement + waitlist

**Sprint 2 — Core Operations:**
5. BKL-001: Stripe (or extend Venmo flow + manual confirmation)
6. BKL-005: Full admin reservation view
7. BKL-003: WebSocket messaging

**Sprint 3 — Community Features:**
8. BKL-007: Member discovery
9. BKL-004: Community landing pages
10. BKL-006: Analytics dashboard

---

## 🧹 Tech Debt

| Item | Risk | Notes |
|---|---|---|
| No WebSocket | High | Messages not real-time |
| No Stripe | Critical | Can't monetize |
| No rate limiting | High | OTP/auth abuse |
| No pagination | Medium | DB blows up at scale |
| `refetch()` vs `invalidate()` inconsistency | Low | Should standardize on `invalidate()` |
| Dual-entry `server/index.ts` + `_core/index.ts` | Medium | Confusing structure |
| `db:push` in CI | High | Schema drift risk in prod |
| OAuth env vars unused | Low | Dead env config |
