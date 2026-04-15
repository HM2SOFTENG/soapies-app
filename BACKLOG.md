# Soapies Platform — Comprehensive Technical Backlog

> Generated: April 2026 by automated QA + security audit
> Scope: server (tRPC + Express), mobile (Expo/React Native), Drizzle DB schema, CI/infra

---

## Summary

- **Total items: 62**
- **Critical: 8 | High: 16 | Medium: 17 | Low: 13 | Features: 8**
- **Estimated total effort: ~38 dev-days**
- **Top 5 priorities (impact/effort ratio):**
  1. ITEM-001 — Unauthenticated photo upload endpoint (Critical, XS fix)
  2. ITEM-003 — Suspended users bypass auth (Critical, XS fix)
  3. ITEM-006 — Promo code race condition allows over-redemption (Critical, S fix)
  4. ITEM-022 — Attendee counter never decrements on cancellation (High, S fix)
  5. ITEM-021 — `deleteUser` orphans reservations/messages/posts (High, S fix)

---

## 🔴 CRITICAL — Security & Data Integrity

#### [ITEM-001] Unauthenticated photo upload endpoint
- **Area**: server
- **File(s)**: `server/_core/index.ts` (lines ~125–148)
- **Description**: The `/api/upload-photo` POST endpoint has zero authentication. Any unauthenticated caller can POST binary data and receive a CDN URL stored in DigitalOcean Spaces. The `apiLimiter` is applied but rate limiting alone is not access control.
- **Impact**: Arbitrary file storage abuse, CSAM/DMCA liability, storage cost explosion, potential to upload malicious content to the CDN domain.
- **Fix**: Add a session-token validation guard at the top of the handler — verify `req.headers['x-session-token']` or the `app_session_id` cookie using `createContext`-style logic before processing the upload. Also add MIME-type allowlisting (only `image/jpeg`, `image/png`, `image/webp`).
- **Effort**: XS

---

#### [ITEM-002] No file-type or size validation on photo upload
- **Area**: server
- **File(s)**: `server/_core/index.ts`
- **Description**: The upload handler accepts any `Content-Type` and stores whatever binary data it receives. An attacker can upload executable files, PDFs, or multi-GB payloads (the 50 MB `express.json` limit doesn't protect streaming raw binary here, since body is read via `req.on('data')`).
- **Impact**: Storage of malicious content on CDN, no size cap means bandwidth/storage abuse.
- **Fix**: Validate `X-Image-Type` header against an allowlist. Add a streaming byte counter that rejects payloads > 10 MB. Optionally use `sharp` to re-encode images server-side, stripping metadata and confirming they are valid images.
- **Effort**: S

---

#### [ITEM-003] Suspended users can still authenticate and access protected procedures
- **Area**: server
- **File(s)**: `server/_core/context.ts`, `server/db.ts`
- **Description**: `createContext` resolves the user from the session token but never checks `user.isSuspended`. A suspended user's session remains valid indefinitely. They can call all `protectedProcedure` endpoints including messaging, reservations, and profile updates.
- **Impact**: Suspended accounts retain full platform access, bypassing admin enforcement.
- **Fix**: In `createContext`, after `getUserByOpenId`, check `if (user?.isSuspended) return { req, res, user: null }`. Alternatively add a middleware guard in `protectedProcedure` that throws `FORBIDDEN` if `ctx.user.isSuspended`.
- **Effort**: XS

---

#### [ITEM-004] Account deactivation reuses `password_reset` OTP type
- **Area**: server
- **File(s)**: `server/routers.ts` — `auth.requestDeactivation`, `auth.confirmDeactivation`
- **Description**: The deactivation flow saves an OTP with `type: 'password_reset'`. A valid password-reset OTP can therefore be used to confirm account deactivation (and vice versa). The `verifyOtp` function matches on target + code + type; since both use the same type, a code sent for one purpose can satisfy the other.
- **Impact**: User receives a password reset email and inadvertently (or maliciously via social engineering) uses that code to deactivate their account instead.
- **Fix**: Add `deactivation` to the `otpCodes.type` enum in the schema, and use it exclusively for the deactivation flow.
- **Effort**: S

---

#### [ITEM-005] OTP codes are never invalidated on reuse attempt or re-send
- **Area**: server
- **File(s)**: `server/auth.ts` — `saveOtp`
- **Description**: When a new OTP is requested (e.g. resend), a new row is inserted but old, unexpired OTPs for the same target+type are not invalidated. Multiple valid OTPs can exist simultaneously. An attacker who intercepts an older OTP (e.g. from email logs) can still use it.
- **Impact**: Reduces effectiveness of OTP-based auth; old codes remain valid up to 10 minutes.
- **Fix**: In `saveOtp`, before inserting, `UPDATE otp_codes SET usedAt = NOW() WHERE target = ? AND type = ? AND usedAt IS NULL AND expiresAt > NOW()` to invalidate existing valid codes first.
- **Effort**: XS

---

#### [ITEM-006] Promo code redemption has a TOCTOU race condition
- **Area**: server
- **File(s)**: `server/routers.ts` — `promoCodes.redeem`, `server/db.ts` — `incrementPromoCodeUsage`
- **Description**: The `redeem` procedure reads `currentUses` and checks against `maxUses`, then calls `incrementPromoCodeUsage` in two separate, non-transactional operations. Concurrent requests can pass the check simultaneously before either has incremented the counter.
- **Impact**: Promo codes can be redeemed more than `maxUses` times under load (e.g. during an event sale rush).
- **Fix**: Use a single atomic `UPDATE event_promotional_pricing SET currentUses = currentUses + 1 WHERE id = ? AND (maxUses IS NULL OR currentUses < maxUses)` and check `affectedRows === 0` to detect exhaustion. Or wrap in a DB transaction.
- **Effort**: S

---

#### [ITEM-007] Couple ticket creates an unsolicited reservation for a partner without consent
- **Area**: server
- **File(s)**: `server/routers.ts` — `reservations.create`
- **Description**: When a user selects a couple ticket and provides a `partnerUserId`, the server silently creates a reservation on that partner's account with `paymentStatus: 'pending'`. The partner receives a notification and DM, but the reservation is binding on their account without their explicit consent. An attacker could create reservations for arbitrary approved users.
- **Impact**: Any approved member can create unauthorized pending reservations on another member's account, inflating their reservation count and potentially preventing them from reserving separately.
- **Fix**: Replace with an invitation-based flow: create a `partner_reservation_invitations` record and only confirm the partner's reservation when they explicitly accept. Alternatively, validate that `partnerUserId` belongs to a member with an existing accepted partner invitation.
- **Effort**: M

---

#### [ITEM-008] `deleteUser` leaves orphaned sensitive data across many tables
- **Area**: server / DB
- **File(s)**: `server/db.ts` — `deleteUser`
- **Description**: `deleteUser` only deletes from `profiles` and `users`. It does not delete: `reservations`, `messages`, `wallPosts`, `wallPostLikes`, `wallPostComments`, `notifications`, `memberCredits`, `referralCodes`, `signedWaivers`, `otpCodes`, `conversationParticipants`, `blockedUsers`, `pushSubscriptions`, `applicationPhotos`, `applicationLogs`.
- **Impact**: GDPR/privacy right-to-erasure violations; deleted users' personal data (messages, posts, signed waivers) persist indefinitely. Also leaves FK orphans that may cause query errors.
- **Fix**: Implement a cascading delete that removes all user-related records across all tables. For messages, soft-delete the content but keep the row for conversation integrity. Add a `deleted_at` timestamp to users instead of hard-deleting for audit trail purposes.
- **Effort**: M

---

## 🟠 HIGH — Bugs & Broken Flows

#### [ITEM-009] Chat screen polls the server every 5 seconds — WebSocket events are ignored
- **Area**: mobile
- **File(s)**: `mobile/app/chat/[id].tsx`
- **Description**: Messages are fetched with `refetchInterval: 5_000`. The server already has a WebSocket server and sends `notifyMessageCreated` events on every new message, but the mobile app never connects to the WebSocket. Real-time messages arrive with up to 5 seconds delay and generate constant polling load.
- **Impact**: Laggy chat UX; excessive server load; WebSocket infrastructure is wasted.
- **Fix**: Integrate the existing WebSocket server into the mobile tRPC client using `useEffect` + native WebSocket. On receiving a `message_created` event, call `utils.messages.messages.invalidate({ conversationId })` to trigger an immediate refresh.
- **Effort**: M

---

#### [ITEM-010] Home screen stat chips (Events Attended, Credits) always show 0
- **Area**: mobile
- **File(s)**: `mobile/app/(tabs)/index.tsx` — `AnimatedHeader`
- **Description**: `const credits = me?.credits ?? profile?.credits ?? 0` and `const attended = me?.eventsAttended ?? profile?.eventsAttended ?? 0` — neither `credits` nor `eventsAttended` exist on the `User` or `Profile` types returned by `auth.me` or `profile.me`. These fields are always `undefined`, so the stats always render as `0`.
- **Impact**: Misleading UX; users see 0 credits even when they have a balance; erodes trust in the platform stats.
- **Fix**: Wire `credits` to `trpc.credits.balance` query (already used in profile screen). Wire `attended` to a count of confirmed reservations from `trpc.reservations.myReservations`.
- **Effort**: S

---

#### [ITEM-011] Event attendee counter never decrements on cancellation
- **Area**: server / DB
- **File(s)**: `server/routers.ts` — `reservations.updateStatus`, `server/db.ts` — `updateReservation`
- **Description**: `incrementEventAttendees` is called when a reservation is created. When a reservation is cancelled (status set to `cancelled`), `currentAttendees` is never decremented. Over time the count drifts above actual attendance, blocking new reservations for events that have available capacity.
- **Impact**: Events appear sold out when they aren't; users are pushed to the waitlist unnecessarily.
- **Fix**: In `updateReservation` (or a dedicated `cancelReservation` helper), when `status` transitions to `cancelled`, run `UPDATE events SET currentAttendees = GREATEST(currentAttendees - 1, 0) WHERE id = ?`. Also add the same logic in `admin.processCancellation`.
- **Effort**: S

---

#### [ITEM-012] Event capacity check is not atomic — race condition allows overbooking
- **Area**: server
- **File(s)**: `server/routers.ts` — `reservations.create`
- **Description**: The capacity check reads `getEventCapacity` and then calls `createReservation` in two separate operations. Under concurrent load, multiple users can pass the capacity check simultaneously before any reservation is inserted.
- **Impact**: Events can be overbooked in high-demand scenarios.
- **Fix**: Use a DB-level atomic check: `INSERT INTO reservations (...) SELECT ... WHERE (SELECT currentAttendees FROM events WHERE id = ?) < capacity` and check `affectedRows`. Or wrap the check + insert in a transaction with `SELECT ... FOR UPDATE` on the event row.
- **Effort**: M

---

#### [ITEM-013] `deactivateUser` does not invalidate the user's active sessions
- **Area**: server
- **File(s)**: `server/db.ts` — `deactivateUser`, `server/routers.ts` — `auth.confirmDeactivation`
- **Description**: `deactivateUser` sets `isSuspended = true` but does not revoke session tokens. Since `isSuspended` is also not checked in `createContext` (see ITEM-003), the deactivated user can continue to use the platform with their existing session.
- **Impact**: Account deactivation has no immediate effect; user remains active.
- **Fix**: Fix ITEM-003 first (check isSuspended in context). Additionally, consider storing a `sessionRevokedAt` timestamp on the user that the session validator checks against.
- **Effort**: S (depends on ITEM-003)

---

#### [ITEM-014] Wall post `deletePost` mutation can only be called by the post author — admins cannot delete posts from mobile
- **Area**: server / mobile
- **File(s)**: `server/db.ts` — `deleteWallPost`, `server/routers.ts` — `wall.deletePost`
- **Description**: `deleteWallPost` adds `AND authorId = userId` to the WHERE clause, meaning only the original author can delete. Admins have no override path. System posts (where `authorId IS NULL`) can never be deleted by anyone via this mutation.
- **Impact**: Admins cannot moderate posts from the mobile app; inappropriate content requires direct DB intervention.
- **Fix**: Add `wall.adminDeletePost: adminProcedure` that deletes by post ID without the author check. Expose this in the admin dashboard.
- **Effort**: S

---

#### [ITEM-015] `messages.send` does not verify the sender is a conversation participant
- **Area**: server
- **File(s)**: `server/routers.ts` — `messages.send`
- **Description**: The `send` mutation accepts a `conversationId` and sends a message without verifying that `ctx.user.id` is an actual participant of that conversation. Any authenticated user who knows a conversation ID can inject messages into it.
- **Impact**: Privacy breach; users can send messages into DMs and channels they aren't part of.
- **Fix**: Add a check: `const participant = await db.getConversationParticipants(conversationId).then(p => p.find(p => p.userId === ctx.user.id)); if (!participant) throw new TRPCError({ code: 'FORBIDDEN' })`.
- **Effort**: S

---

#### [ITEM-016] `admin.confirmReservation` contains dead unused code
- **Area**: server
- **File(s)**: `server/routers.ts` — `admin.confirmReservation` (line ~`const resRows = await db.getReservationsByUser(0)`)
- **Description**: `const resRows = await db.getReservationsByUser(0);` is called but `resRows` is never used. This makes a DB query on every reservation confirmation for no reason.
- **Impact**: Unnecessary DB query on every admin confirmation; code confusion.
- **Fix**: Remove the dead line.
- **Effort**: XS

---

#### [ITEM-017] Partner couple reservation silently fails with no user feedback
- **Area**: server / mobile
- **File(s)**: `server/routers.ts` — `reservations.create`
- **Description**: The partner reservation creation, DM creation, and notification sending are all wrapped in separate `try/catch` blocks that only `console.error`. If partner reservation creation fails (e.g. partner already has a reservation, DB error), the primary user gets no feedback and the partner is not notified.
- **Impact**: Couple ticket purchases can silently fail to create the partner's reservation; event is effectively single-entry.
- **Fix**: Surface partner reservation failure to the primary user. If the partner already has a reservation, throw a `CONFLICT` error with a descriptive message before the mutation completes.
- **Effort**: S

---

#### [ITEM-018] `auth.me` strips `passwordHash` with an unsafe `as any` cast
- **Area**: server
- **File(s)**: `server/routers.ts` — `auth.me`
- **Description**: `const { passwordHash, ...safe } = u as any` — this strips `passwordHash` correctly today, but the `as any` cast means TypeScript will not warn if other sensitive fields are added to the `User` type in the future (e.g. a future `twoFactorSecret` or `ssnLast4`).
- **Impact**: Future sensitive fields may be inadvertently exposed via the `auth.me` endpoint.
- **Fix**: Use a proper `pick`/`omit` typed utility or define an explicit safe user type and cast to it: `const { passwordHash, ...safe }: User = u; return safe;`.
- **Effort**: XS

---

#### [ITEM-019] Credit balance calculation is inconsistent between `getCreditBalance` and `addCredit`
- **Area**: server / DB
- **File(s)**: `server/db.ts` — `getCreditBalance`, `addCredit`
- **Description**: `getCreditBalance` reads `balance` from the most recent credit row. But `addCredit` computes the new balance by summing the `amount` column (`SUM(amount)`), not by reading `balance` from the last row. If a debit entry has a negative `amount`, `SUM(amount)` would give a correct result, but if debits are stored as positive amounts with a different convention, these two methods will diverge.
- **Impact**: Displayed credit balance and computed balance for new credit entries can differ, leading to wrong balances.
- **Fix**: Standardize on one approach. Best practice: always read the last row's `balance` (as `getCreditBalance` does) and use it as the base for `addCredit`. Remove the `SUM(amount)` approach.
- **Effort**: S

---

#### [ITEM-020] Onboarding step 2 back button is permanently disabled
- **Area**: mobile
- **File(s)**: `mobile/app/onboarding.tsx`
- **Description**: Back button renders only `if (currentStep > 2)`, meaning from step 2 users have no back navigation. They cannot return to step 1 (Welcome screen) after beginning account creation.
- **Impact**: Users who land on step 2 by mistake or who want to go back to the welcome screen are stuck. They must kill the app.
- **Fix**: Change condition to `currentStep > 1` and add navigation from step 2 back to step 1, or add a close/cancel button that clears state and returns to the landing screen.
- **Effort**: XS

---

#### [ITEM-021] `getUnreadCounts` uses N+1 queries
- **Area**: server
- **File(s)**: `server/db.ts` — `getUnreadCounts`
- **Description**: For each conversation the user participates in, a separate `SELECT COUNT(*) FROM messages WHERE ...` is executed. A user in 20 conversations generates 21 queries on every poll (which happens every 30 seconds from the tab bar).
- **Impact**: Significant DB load; scales poorly as message volume grows.
- **Fix**: Replace with a single aggregation query using `GROUP BY conversationId` or a window function to count unread messages across all conversations in one shot.
- **Effort**: S

---

#### [ITEM-022] `bulkDeleteUsers` leaves orphaned data (same as ITEM-008 for bulk path)
- **Area**: server
- **File(s)**: `server/db.ts` — `bulkDeleteUsers`
- **Description**: Same issue as ITEM-008 but for the bulk path. Only `profiles` and `users` rows are deleted in the loop.
- **Impact**: Same as ITEM-008; amplified because bulk delete affects many users at once.
- **Fix**: Reuse the comprehensive delete logic from ITEM-008's fix, applied per user ID in the bulk loop. Consider adding DB-level cascades on FK relationships.
- **Effort**: S (after ITEM-008 fix)

---

#### [ITEM-023] Stripe webhook doesn't verify `userId` belongs to the reservation
- **Area**: server
- **File(s)**: `server/_core/index.ts` — Stripe webhook handler
- **Description**: The webhook reads `reservationId` and `userId` directly from `session.metadata` without verifying that the userId actually owns the reservation before marking it paid. Stripe metadata is set server-side so this is low-risk, but if metadata were tampered with in a hypothetical MitM or Stripe misconfiguration, one user's payment could confirm another's reservation.
- **Impact**: Low probability but high impact if exploited.
- **Fix**: After reading `reservationId` from metadata, query the reservation and verify `reservation.userId === userId` before updating status.
- **Effort**: XS

---

#### [ITEM-024] `announcements.active` is a `publicProcedure` — exposes content to unauthenticated users
- **Area**: server
- **File(s)**: `server/routers.ts` — `announcements.active`
- **Description**: Active announcements (which may contain member-only event details, private community info, etc.) can be fetched without authentication.
- **Impact**: Community information visible to the public internet.
- **Fix**: Change to `protectedProcedure`. The mobile client already sends a session token; unauthenticated users don't need announcements.
- **Effort**: XS

---

## 🟡 MEDIUM — UX/Feature Gaps

#### [ITEM-025] No waiver signing UI in onboarding
- **Area**: mobile
- **File(s)**: `mobile/app/onboarding.tsx`, `server/routers.ts` — `profile.signWaiver`
- **Description**: The schema has `signedWaivers` table, `profiles.waiverSignedAt`, and a `profile.signWaiver` tRPC mutation. The onboarding steps (1–7) have no waiver step. Waivers are never presented or collected during onboarding.
- **Impact**: Legal exposure — members join without signing the community waiver. `waiverSignedAt` is always null for all members.
- **Fix**: Add an onboarding step between "About You" and "Photos" that presents the waiver text with a signature input and calls `profile.signWaiver`. Gate the next step on successful waiver submission.
- **Effort**: M

---

#### [ITEM-026] No age validation server-side — under-18 users can join
- **Area**: server
- **File(s)**: `server/routers.ts` — `profile.upsert`
- **Description**: Age validation (18+) is only performed client-side in the onboarding screen. The `profile.upsert` mutation accepts any `dateOfBirth` string without validating the resulting age.
- **Impact**: Minors can bypass client-side check and register.
- **Fix**: In `profile.upsert`, if `dateOfBirth` is provided, compute the age and throw `BAD_REQUEST` if age < 18.
- **Effort**: XS

---

#### [ITEM-027] Partner invitation acceptance has no UI in the mobile app
- **Area**: mobile
- **File(s)**: `server/routers.ts` — `partners.acceptInvitation`
- **Description**: The backend has complete partner invitation CRUD (`invite`, `getInvitation`, `acceptInvitation`, `cancelInvitation`). The mobile app has no screen to view or accept incoming partner invitations.
- **Impact**: The partner linking feature is effectively unusable end-to-end from mobile.
- **Fix**: Add a notification-driven deep link flow. When a partner invitation is created, send a push/in-app notification to the invitee with a deep link to an `accept-invitation/[token]` screen that calls `partners.acceptInvitation`.
- **Effort**: L

---

#### [ITEM-028] Pulse/Zone signals expire after 4 hours but UI shows stale signals
- **Area**: mobile / server
- **File(s)**: `server/db.ts` — `getActiveSignals`, `mobile/app/(tabs)/pulse.tsx`
- **Description**: `getActiveSignals` correctly filters by `expiresAt > NOW()`, but the mobile UI uses `staleTime: 60_000` and `refetchInterval: 5 * 60_000` (5 minutes). A signal that expires in the next 5 minutes will continue to show for up to 5 more minutes after expiry.
- **Impact**: Users see ghost signals of members who have already gone offline.
- **Fix**: Reduce `refetchInterval` to 60 seconds for the signals query. Alternatively, the WebSocket server can push signal expiry events.
- **Effort**: XS

---

#### [ITEM-029] `pending-approval` screen doesn't reflect which review stage the user is in
- **Area**: mobile
- **File(s)**: `mobile/app/pending-approval.tsx`
- **Description**: The pending-approval screen is shown for all statuses: `submitted`, `under_review`, `waitlisted`, `interview_scheduled`, `interview_complete`. The screen shows a generic "Your application is under review" message regardless of which stage. Users who have been invited for an interview see no call to action.
- **Impact**: Users don't know they need to book an interview; admin has to manually contact them.
- **Fix**: Use `profile.applicationPhase` to show stage-specific messaging and CTAs. For `interview_scheduled`, show an "Book Your Interview" button that links to `trpc.introCalls.available`.
- **Effort**: M

---

#### [ITEM-030] Chat screen has no image attachment support
- **Area**: mobile
- **File(s)**: `mobile/app/chat/[id].tsx`, `server/routers.ts` — `messages.send`
- **Description**: The DB schema, server mutation, and message rendering all support `attachmentUrl` and `attachmentType`. The mobile chat UI has no image picker or file attachment button.
- **Impact**: Feature is partially built server-side but completely inaccessible to users.
- **Fix**: Add an image picker button in the chat input bar. Use the existing `/api/upload-photo` endpoint (after fixing ITEM-001) to upload the image and pass the URL as `attachmentUrl` + `attachmentType: 'image'` in the `messages.send` mutation.
- **Effort**: M

---

#### [ITEM-031] Event date submitted as unvalidated string — `Invalid Date` stored silently
- **Area**: server
- **File(s)**: `server/routers.ts` — `events.create`, `events.update`
- **Description**: `new Date(input.startDate)` is called without validating the string. If the client sends an invalid date string, `new Date('bad-date')` returns an `Invalid Date` object which Drizzle stores as `NULL` in MySQL (or throws at runtime). No error is surfaced to the client.
- **Impact**: Events created with malformed dates have `NULL` startDate, breaking sort and display.
- **Fix**: Use Zod to parse dates: `startDate: z.string().datetime()` (ISO 8601) or `z.coerce.date()` in the input schema. This validates at the tRPC layer before any DB call.
- **Effort**: XS

---

#### [ITEM-032] Tab bar has 6 tabs — too crowded on small screens
- **Area**: mobile
- **File(s)**: `mobile/app/(tabs)/_layout.tsx`
- **Description**: The tab bar renders 6 tabs: Home, Events, Messages, Pulse, Profile, Alerts (Notifications). On a 375px-wide screen, 6 tabs at ~62px each is 372px total — barely fitting. The "Alerts" tab duplicates notification functionality that could be accessed from Profile.
- **Impact**: Poor UX on standard iPhone sizes; tab labels may be cut off on smaller devices.
- **Fix**: Merge Alerts into Profile tab (add a badge on the profile icon for unread notifications). Reduce to 5 tabs: Home, Events, Messages, Pulse, Profile.
- **Effort**: S

---

#### [ITEM-033] No loading state for stats in Home screen header
- **Area**: mobile
- **File(s)**: `mobile/app/(tabs)/index.tsx` — `AnimatedHeader`
- **Description**: While `auth.me` and `profile.me` are loading, the stat chips render 0 for Events, 0 for Credits, and the current year for "Since". No skeleton or loading indicator is shown.
- **Impact**: Jarring flash of incorrect values on app load.
- **Fix**: Show a shimmer/skeleton in the stat chips while data is loading.
- **Effort**: XS

---

#### [ITEM-034] `admin/checkin` and `admin/announcements` screens registered in layout but likely missing
- **Area**: mobile
- **File(s)**: `mobile/app/_layout.tsx`
- **Description**: `Stack.Screen name="admin/checkin"` and `Stack.Screen name="admin/announcements"` are registered in the root layout, implying screens at those paths exist. Need to verify — if the files don't exist, navigating to these routes crashes the app.
- **Impact**: Admin navigation crashes if these screens are missing.
- **Fix**: Verify files exist at `mobile/app/admin/checkin.tsx` and `mobile/app/admin/announcements.tsx`. If not, either create them or remove the Stack.Screen entries.
- **Effort**: XS

---

#### [ITEM-035] Notification preferences UI is not implemented in mobile
- **Area**: mobile
- **File(s)**: `server/routers.ts` — `notifications.preferences`, `notifications.upsertPreference`
- **Description**: The server has full notification preferences CRUD. The mobile app has no settings screen for notification preferences.
- **Impact**: Users cannot control which notifications they receive.
- **Fix**: Add a "Notification Settings" section in the Profile screen that lists notification categories and allows toggling `inApp`, `push`, `email`, `sms` for each.
- **Effort**: M

---

#### [ITEM-036] No empty state for Messages tab when user has no conversations
- **Area**: mobile
- **File(s)**: `mobile/app/(tabs)/messages.tsx`
- **Description**: When `conversations` is an empty array, the messages list renders blank with no explanation or CTA.
- **Impact**: New users see a blank screen and don't know how to start a conversation.
- **Fix**: Add a `ListEmptyComponent` with "No conversations yet" copy and a "Find Members" CTA button.
- **Effort**: XS

---

#### [ITEM-037] Profile `upsert` accepts `preferences: z.any()` — no validation
- **Area**: server
- **File(s)**: `server/routers.ts` — `profile.upsert`
- **Description**: The `preferences` field accepts any JSON via `z.any()`. Malicious or malformed preference objects are stored directly in the JSON column with no schema enforcement.
- **Impact**: Corrupt preference data can break the mobile app when it tries to read/display preferences.
- **Fix**: Define a Zod schema for the preferences object: `z.object({ relationshipStatus: z.string().optional(), interests: z.array(z.string()).optional(), lookingFor: z.array(z.string()).optional() }).optional()`.
- **Effort**: XS

---

#### [ITEM-038] Waitlist auto-promotion is not implemented
- **Area**: server
- **File(s)**: `server/db.ts`, `server/routers.ts`
- **Description**: The `waitlist` table has a `promoted` status, but there is no code that automatically promotes waitlisted users when a reservation is cancelled. Waitlist exists as a data store only.
- **Impact**: Cancelled spots go empty even when people are waiting.
- **Fix**: In the cancellation flow (when reservation status transitions to `cancelled`), check the waitlist for the event. If there are waiting users, update the first in queue to `promoted` and send a notification with a time-limited reservation link.
- **Effort**: M

---

#### [ITEM-039] `member_signals` table created via raw SQL migration at startup — not in Drizzle schema
- **Area**: DB / infra
- **File(s)**: `server/_core/index.ts`, `drizzle/schema.ts`
- **Description**: The `member_signals` table is created with a raw `CREATE TABLE IF NOT EXISTS` SQL block inside `startServer()`. It does not exist in the Drizzle schema file. This makes it invisible to `drizzle-kit push/diff`, breaks schema migrations, and makes the table definition scattered across the codebase.
- **Impact**: Schema drift; running `drizzle-kit push` will not manage this table; developers may be unaware of its columns.
- **Fix**: Add `member_signals` to `drizzle/schema.ts` as a proper Drizzle table definition. Remove the raw SQL block from startup. Run a migration.
- **Effort**: S

---

#### [ITEM-040] `profile.search` query is vulnerable to LIKE pattern injection
- **Area**: server
- **File(s)**: `server/db.ts` — `searchProfiles`
- **Description**: `sql`${profiles.displayName} LIKE ${`%${query}%`}`` — the `query` string is interpolated directly into the LIKE pattern. Characters like `%` and `_` in the user's query are interpreted as SQL LIKE wildcards, potentially returning unintended results or causing performance issues (e.g. query `%` returns all users).
- **Impact**: Wildcard characters in search input return unexpected results; `%` alone returns every approved profile.
- **Fix**: Escape `%` and `_` in the query string before use: `const escaped = query.replace(/[%_\\]/g, c => `\\${c}`)`.
- **Effort**: XS

---

#### [ITEM-041] `profile.upsert` with `referredByCode` applies referral even if code was not verified client-side
- **Area**: server
- **File(s)**: `server/routers.ts` — `profile.upsert`
- **Description**: The router calls `db.applyReferralToProfile` whenever `input.referredByCode` is present, but does not itself validate that the code exists and is active. The validation is done via `db.applyReferralToProfile → validateReferralCode` which silently returns without error if the code is invalid. However, a user could spam arbitrary codes and the profile would store the invalid code string.
- **Impact**: Invalid referral codes stored in `profiles.referredByCode`; minor but inconsistent data.
- **Fix**: In `profile.upsert`, validate the referral code before storing it and return a validation error to the client if it's invalid.
- **Effort**: XS

---

## 🟢 LOW — Polish & Tech Debt

#### [ITEM-042] Extensive `console.log` / `console.warn` / `console.error` in production
- **Area**: server / mobile
- **File(s)**: `server/routers.ts`, `server/db.ts`, `server/_core/index.ts`, `mobile/lib/trpc.ts`, `mobile/lib/auth.tsx`
- **Description**: Production code contains dozens of `console.log` statements including: `[trpc] API_URL: https://soapies-app-...`, `[Auth] Valid token on mount, length: X`, `[Login] attempting: email@...`. These appear in app logs and could reveal infrastructure details or user info.
- **Impact**: Information leakage in production logs; verbose logging for end users.
- **Fix**: Replace with a structured logger (e.g. `pino` on server, a custom `logger.ts` on mobile) with log-level gating so `DEBUG` logs are silent in production.
- **Effort**: S

---

#### [ITEM-043] `mobile/lib/trpc.ts` has unused variable after token save
- **Area**: mobile
- **File(s)**: `mobile/lib/trpc.ts` — `saveToken`
- **Description**: `const verify = await SecureStore.getItemAsync(SESSION_COOKIE_KEY);` is called after saving the token but the result is never used.
- **Impact**: Unnecessary SecureStore read on every login.
- **Fix**: Remove the `verify` line.
- **Effort**: XS

---

#### [ITEM-044] `db.ts` functions use `data: any` throughout — no type safety
- **Area**: server
- **File(s)**: `server/db.ts`
- **Description**: Functions like `upsertProfile(data: any)`, `createReservation(data: any)`, `createWallPost(data: any)`, `createAuditLog(data: any)`, etc. accept untyped `any` inputs. TypeScript cannot catch invalid field names or missing required fields at compile time.
- **Impact**: Type errors surface at runtime instead of compile time; data integrity relies entirely on caller discipline.
- **Fix**: Define typed input interfaces for each DB function. Use Drizzle's `InsertX` types where available.
- **Effort**: L

---

#### [ITEM-045] OTP codes are never cleaned up from the database
- **Area**: server / DB
- **File(s)**: `server/auth.ts` — `saveOtp`, `server/db.ts`
- **Description**: Used and expired OTP codes accumulate indefinitely in the `otp_codes` table. There is no scheduled cleanup.
- **Impact**: Table grows unboundedly over time; could affect query performance.
- **Fix**: Add a cron job or a purge step in `saveOtp` that deletes records where `expiresAt < NOW() - INTERVAL 24 HOUR`. Alternatively, use a DB event scheduler.
- **Effort**: XS

---

#### [ITEM-046] `typingIndicators` and `messageReads` tables are defined but never used
- **Area**: DB
- **File(s)**: `drizzle/schema.ts`
- **Description**: `typingIndicators` table has no server procedures. `messageReads` table is defined but the app uses `conversationParticipants.lastReadAt` for read tracking. Both tables accumulate no data but occupy schema space.
- **Impact**: Schema confusion; developers may implement duplicate features against these tables.
- **Fix**: Either implement typing indicators using the `typingIndicators` table + WebSocket broadcast, or document clearly that these are reserved-for-future-use and add a `TODO` comment. Remove `messageReads` if `lastReadAt` on participants is the canonical approach.
- **Effort**: XS

---

#### [ITEM-047] `notificationBatches`, `notificationDeliveryRules`, `notificationAnalytics`, `smsNotifications` tables are schema-only
- **Area**: DB
- **File(s)**: `drizzle/schema.ts`, `server/db.ts`
- **Description**: These four tables are defined in the schema but have no corresponding DB functions or router procedures. `smsNotifications` is particularly notable — SMS is sent via Twilio inline but never recorded in this table.
- **Impact**: Notification delivery analytics are non-functional; SMS audit trail is missing.
- **Fix**: Either implement the notification pipeline these tables represent (queue-based delivery with analytics), or remove the tables and document the simpler direct-send approach.
- **Effort**: M

---

#### [ITEM-048] Missing database indexes on high-traffic lookup columns
- **Area**: DB
- **File(s)**: `drizzle/schema.ts`
- **Description**: The following columns are frequently queried but have no index:
  - `otp_codes(target, type)` — queried on every OTP verification
  - `reservations(userId)` — queried on every reservation list
  - `reservations(eventId)` — queried on every event dashboard load
  - `messages(conversationId)` — queried on every chat open
  - `wall_posts(authorId)` — queried on member profile
  - `conversation_participants(userId)` — queried to find all user's conversations
  - `notifications(userId)` — queried on every notification poll
  - `profiles(applicationStatus)` — queried for pending applications
- **Impact**: Full table scans on these frequent queries; slow response times as data grows.
- **Fix**: Add composite indexes for each of these columns in the Drizzle schema using `.index()` and run a migration.
- **Effort**: S

---

#### [ITEM-049] `userGroups` table defined in schema but has no code using it
- **Area**: DB
- **File(s)**: `drizzle/schema.ts`
- **Description**: The `user_groups` table is defined but never imported in `db.ts` and has no associated procedures.
- **Impact**: Dead schema; creates confusion about group membership model.
- **Fix**: Either implement user group functionality or remove the table from the schema.
- **Effort**: XS

---

#### [ITEM-050] `getAllReservations` paginates to 20 items but returns no total count
- **Area**: server
- **File(s)**: `server/db.ts` — `getAllReservations`
- **Description**: The function returns up to 20 reservations per page but does not return the total count. Admin cannot know how many pages exist.
- **Impact**: Admin reservation list has no pagination controls; shows only the first 20.
- **Fix**: Return `{ data: [...], total: count }` by adding a `COUNT(*)` subquery. Update the admin screen to show page controls.
- **Effort**: S

---

#### [ITEM-051] `auth.login` stores lowercase email from client but `getUserByEmail` is case-sensitive
- **Area**: server
- **File(s)**: `server/routers.ts` — `auth.login`, `server/auth.ts` — `getUserByEmail`
- **Description**: The login screen calls `email.trim().toLowerCase()` before sending. But `getUserByEmail` does `eq(users.email, email)` which in MySQL is case-insensitive on most collations but not guaranteed with `utf8mb4_bin` collations. If the registration stored a mixed-case email, lookups could fail.
- **Impact**: Edge case: users registered with mixed-case emails may fail login.
- **Fix**: Normalize email to lowercase on both registration and login at the server level.
- **Effort**: XS

---

#### [ITEM-052] `admin.auditLogs` ignores the `page` and `action` filter inputs
- **Area**: server
- **File(s)**: `server/routers.ts` — `admin.auditLogs`
- **Description**: The procedure accepts `page` and `action` as optional inputs but `db.getAuditLogs(100)` ignores both. The audit log always returns the latest 100 records regardless of filters.
- **Impact**: Admin cannot filter audit logs by action type or paginate beyond 100 entries.
- **Fix**: Pass `page` and `action` to `getAuditLogs`. Add WHERE clause filtering and OFFSET pagination.
- **Effort**: S

---

#### [ITEM-053] `ContentSecurityPolicy` is disabled entirely with `contentSecurityPolicy: false`
- **Area**: server / infra
- **File(s)**: `server/_core/index.ts`
- **Description**: Helmet is configured with `contentSecurityPolicy: false` because Vite inline scripts conflict with CSP. This completely disables CSP headers on the production web app.
- **Impact**: No XSS protection for the web admin panel; script injection attacks are unmitigated.
- **Fix**: Configure a proper CSP that allows Vite's hash-based inline scripts. Use `helmet.contentSecurityPolicy({ directives: { scriptSrc: ["'self'", "'sha256-...'"] } })` with specific hashes for inline scripts rather than disabling entirely.
- **Effort**: M

---

#### [ITEM-054] `"Other"` gender is included in the male gender list for ticket enforcement
- **Area**: server
- **File(s)**: `server/routers.ts` — `reservations.create`
- **Description**: `const maleGenders = ["male", "man", ..., "non-binary", "nonbinary", "non binary", "enby"]`. This list classifies `non-binary` as male for ticket type enforcement, preventing non-binary members from buying a single woman ticket. This may not match the intended policy and is confusing.
- **Impact**: Non-binary members are restricted to male ticket types, which may not be appropriate.
- **Fix**: Consult with the community admins about the correct policy for non-binary, then implement accordingly. Consider a separate `non_binary` ticket type or allow non-binary members to choose from all types.
- **Effort**: S

---

## ✨ FEATURE IDEAS — Product Backlog

#### [ITEM-055] WebSocket-based real-time chat for mobile
- **Area**: mobile / server
- **File(s)**: `server/_core/websocket.ts`, `mobile/app/chat/[id].tsx`
- **Description**: Replace the 5-second polling interval in the chat screen with a native WebSocket connection to the existing `/ws` endpoint. The server already sends `message_created` events; the mobile client just needs to listen.
- **Impact**: Instant message delivery; dramatically reduced server load; better UX.
- **Effort**: M

---

#### [ITEM-056] Event RSVP reminders via push notification
- **Area**: server / infra
- **File(s)**: `server/routers.ts`, notification system
- **Description**: Add a scheduled job (or cron-triggered endpoint) that sends push notifications to confirmed reservation holders 24 hours and 1 hour before an event's `startDate`. Include venue, time, and ticket details.
- **Impact**: Reduces no-shows; improves member experience; drives event engagement.
- **Effort**: M

---

#### [ITEM-057] In-app Stripe payment (native SDK) instead of browser redirect
- **Area**: mobile
- **File(s)**: `mobile/app/event/[id].tsx` — `checkoutMutation`
- **Description**: Stripe payment currently opens in `WebBrowser.openBrowserAsync()`, which leaves the app context and requires the user to return manually. The Stripe React Native SDK supports native payment sheets with Apple Pay / Google Pay.
- **Impact**: Dramatically better payment UX; higher conversion rates.
- **Effort**: L

---

#### [ITEM-058] Read receipts and typing indicators in chat
- **Area**: mobile / server
- **File(s)**: `drizzle/schema.ts` (typingIndicators table exists), `server/routers.ts`
- **Description**: The DB schema has `typingIndicators` and `messageReads` tables. The WebSocket server exists. Implement typing indicator broadcasts (user starts typing → WebSocket event → other participants see "..." indicator) and per-message read receipts (shown as avatar icons under the last read message).
- **Impact**: Richer chat experience; standard for modern messaging apps.
- **Effort**: M

---

#### [ITEM-059] Admin analytics dashboard with charts
- **Area**: mobile
- **File(s)**: `mobile/app/admin/index.tsx`, `server/routers.ts` — `admin.analytics`
- **Description**: The server already returns `revenueByEvent`, `ticketTypeBreakdown`, `memberGrowthByMonth`, and `checkinRates` from `admin.analytics`. The mobile admin dashboard doesn't render this data as charts.
- **Impact**: Admins have no revenue/growth visibility from mobile.
- **Effort**: M

---

#### [ITEM-060] Waitlist auto-promotion with time-limited reservation link
- **Area**: server
- **File(s)**: `server/db.ts`, `server/routers.ts`
- **Description**: When a reservation is cancelled, automatically check the event's waitlist. Promote the first `waiting` user, send them a push + email notification with a 24-hour window to complete their reservation. If they don't reserve within the window, promote the next person.
- **Impact**: Maximizes event capacity utilization; great for high-demand events.
- **Effort**: M

---

#### [ITEM-061] Search improvements — full-text member search with filters
- **Area**: server / mobile
- **File(s)**: `server/db.ts` — `searchProfiles`, `mobile/app/members.tsx`
- **Description**: Current member search only supports LIKE on `displayName`. Add filters for orientation, community, age range, and location radius. Consider MySQL FULLTEXT index on `displayName + bio` for better search relevance.
- **Impact**: Members can discover each other more effectively.
- **Effort**: M

---

#### [ITEM-062] Add-to-calendar button for confirmed events
- **Area**: mobile
- **File(s)**: `mobile/app/event/[id].tsx`
- **Description**: When a user has a confirmed reservation, show an "Add to Calendar" button that uses `expo-calendar` to create a calendar event with the event name, date, venue, and address. The root `package.json` already has `ics` for calendar file generation.
- **Impact**: Reduces no-shows; convenience feature members expect.
- **Effort**: S

---

*End of backlog — 62 items across all severity levels.*
