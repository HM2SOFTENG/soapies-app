# Soapies Mobile — Product Backlog

Last Updated: 2026-04-13
Branch: react-native
Auditor: ClawBot (Lead Scrum Master / PO)

---

## Feature Parity Matrix — Web vs Mobile

| Feature                | Web | Mobile Scaffold | Status          | Notes                                                                                               |
| ---------------------- | --- | --------------- | --------------- | --------------------------------------------------------------------------------------------------- |
| Login                  | ✅  | ✅              | ✅ Done         | `(auth)/login.tsx` — functional                                                                     |
| Register               | ✅  | ✅              | ✅ Done         | `(auth)/register.tsx` — functional                                                                  |
| Auth Guard / Session   | ✅  | ✅              | ✅ Done         | `AuthProvider` + `AuthGuard` in `_layout.tsx`                                                       |
| Feed / Wall            | ✅  | ✅              | 🟡 Partial      | `(tabs)/index.tsx` + `PostCard.tsx` functional. Composer state exists but modal is NOT implemented. |
| Post Composer          | ✅  | ❌              | 🔴 Missing      | FAB triggers `showComposer` state but no modal/component built                                      |
| Post Reactions         | ✅  | ✅              | 🟡 Partial      | Reaction picker in `PostCard.tsx` — functional                                                      |
| Comments Thread        | ✅  | ❌              | 🔴 Missing      | No comments UI on PostCard                                                                          |
| Events List            | ✅  | ✅              | 🟡 Partial      | `(tabs)/events.tsx` + `EventCard.tsx` exist. Community filter works. No infinite scroll.            |
| Event Detail + Reserve | ✅  | ✅              | 🟡 Partial      | `event/[id].tsx` functional. No ticket type selector (just single reserve mutation). No payment.    |
| DM Messaging — List    | ✅  | ✅              | 🟡 Partial      | `(tabs)/messages.tsx` + `ConversationItem.tsx` exist. Polling at 15s. No new-conversation flow.     |
| DM Messaging — Chat    | ✅  | ✅              | 🟡 Partial      | `chat/[id].tsx` works with polling. No WebSocket. No typing indicator. No new convo creation.       |
| Group Channels         | ✅  | ❌              | 🔴 Missing      | No UI for group/channel conversations                                                               |
| Member Profile (view)  | ✅  | ✅              | 🟡 Partial      | `member/[id].tsx` — displays profile. No message/connect CTA.                                       |
| My Profile             | ✅  | ✅              | 🟡 Partial      | `(tabs)/profile.tsx` — displays profile + referral code. No photo gallery.                          |
| Profile Edit           | ✅  | ❌              | 🔴 Missing      | No edit form in mobile                                                                              |
| Notifications          | ✅  | ✅              | 🟡 Partial      | `(tabs)/notifications.tsx` — list + mark-all-read functional. No push notifications wired.          |
| Referral System        | ✅  | 🟡              | 🟡 Partial      | Referral code displayed + clipboard copy in Profile. No share sheet. No tracking.                   |
| Tickets / My Tickets   | ✅  | ❌              | 🔴 Missing      | No `/tickets` route or tab. No QR code display.                                                     |
| Application Flow       | ✅  | ❌              | 🔴 Missing      | No onboarding/apply multi-step form in mobile                                                       |
| Member Discovery       | ✅  | ❌              | 🔴 Missing      | No members list or search                                                                           |
| Community Pages        | ✅  | ❌              | 🔴 Missing      | Community filter on Events tab only. No `/c/:slug` pages.                                           |
| Waiver                 | ✅  | ❌              | 🔴 Missing      | No waiver gate before event reservation                                                             |
| Admin Dashboard        | ✅  | ❌              | ⛔ Out of Scope | Admin flows stay on web                                                                             |
| Push Notifications     | N/A | ❌              | 🔴 Missing      | `expo-notifications` not in `package.json`. Plugin not in `app.json`.                               |
| Deep Linking           | N/A | 🟡              | 🟡 Partial      | `scheme: "soapies"` in `app.json`. `expo-linking` installed. No route handlers wired.               |
| Biometric Auth         | N/A | ❌              | 🔴 Missing      | `expo-local-authentication` not installed                                                           |
| Camera / Photo Upload  | N/A | ⚠️              | 🟡 Ready        | `expo-image-picker` installed. Not used anywhere yet.                                               |
| Share Sheet            | N/A | ❌              | 🔴 Missing      | `expo-sharing` not installed                                                                        |

### Critical Bugs / Missing Features Blocking Beta

1. **Post Composer not built** — FAB does nothing
2. **No profile edit** — users cannot update their info
3. **No Tickets screen** — users can reserve but never see their tickets
4. **No new-DM flow** — compose button in Messages has no handler
5. **No ticket type selector** — EventDetail reserve is single-type only

---

## Sprint 1 — Core Loop (Beta Target)

Goal: Auth → Feed → Events → Messages → Profile fully working end-to-end.

### AUTH-001 — Login Screen

- **Type:** Feature (existing)
- **User Story:** As a member, I can log in with email + password so I can access the app.
- **Priority:** P0
- **Effort:** XS
- **Status:** ✅ Done

### AUTH-002 — Register Screen

- **Type:** Feature (existing)
- **User Story:** As a new user, I can register an account so I can apply to join.
- **Priority:** P0
- **Effort:** XS
- **Status:** ✅ Done

### AUTH-003 — Auth Guard + Session Persistence

- **Type:** Feature (existing)
- **User Story:** As a returning user, I am auto-logged in when I reopen the app.
- **Priority:** P0
- **Effort:** S
- **Status:** ✅ Done

### FEED-001 — Wall / Feed Screen

- **Type:** Feature (existing)
- **User Story:** As a member, I can scroll the community wall and see posts from other members.
- **Priority:** P0
- **Effort:** S
- **Status:** ✅ Done (PostCard renders, likes work, reactions work)

### FEED-002 — Post Composer Modal

- **Type:** Bug / Missing Feature
- **User Story:** As a member, I can tap the compose button and write a new post to the wall.
- **Priority:** P0
- **Effort:** M
- **Status:** 🔴 Not Started — FAB exists, `showComposer` state exists, modal not built
- **Notes:** Wire to `trpc.wall.create`. Text input + optional image (expo-image-picker). Feature-flag: `POST_CREATION`.

### FEED-003 — Comments Thread

- **Type:** Feature
- **User Story:** As a member, I can tap a post to read and add comments.
- **Priority:** P1
- **Effort:** M
- **Status:** 🔴 Not Started
- **Notes:** Tap PostCard → push to `/post/[id]` detail screen with comments list + reply input.

### EVT-001 — EventCard Component

- **Type:** Feature (existing)
- **User Story:** As a member, I can see a list of upcoming events in the Events tab.
- **Priority:** P0
- **Effort:** S
- **Status:** ✅ Done — `EventCard.tsx` fully implemented with image, gradient fallback, community badge, price, tap navigation.

### EVT-002 — Event Detail + Reserve

- **Type:** Feature (existing)
- **User Story:** As a member, I can view an event's details and reserve a spot.
- **Priority:** P0
- **Effort:** S
- **Status:** 🟡 Partial — single reserve works. No ticket type selector (single woman / couple / single man). No payment. No waiver gate.

### EVT-003 — Ticket Type Selector on EventDetail

- **Type:** Feature
- **User Story:** As a member reserving an event, I can choose my ticket type and see the correct price.
- **Priority:** P1
- **Effort:** M
- **Status:** 🔴 Not Started
- **Notes:** Web has animated +/- quantity picker per type. Mobile needs simplified type-picker (segmented control or radio).

### EVT-004 — My Tickets Screen

- **Type:** Feature
- **User Story:** As a member, I can view my reservations and see my QR code ticket.
- **Priority:** P0
- **Effort:** M
- **Status:** 🔴 Not Started
- **Notes:** Add tab or profile section. Pull from `trpc.tickets.mine`. Show QR when `qrCode` field is populated. (QR generation is also missing on backend — see BACKLOG.md BKL-002.)

### MSG-001 — ConversationItem Component

- **Type:** Feature (existing)
- **User Story:** As a member, I can see my list of conversations in the Messages tab.
- **Priority:** P0
- **Effort:** S
- **Status:** ✅ Done — `ConversationItem.tsx` fully implemented with avatar, display name, last message preview, unread badge, timestamp.

### MSG-002 — Chat Screen

- **Type:** Feature (existing)
- **User Story:** As a member, I can open a conversation and send/receive messages.
- **Priority:** P0
- **Effort:** S
- **Status:** ✅ Functional (polling at 5s). Needs WebSocket upgrade later.

### MSG-003 — New Conversation / Start DM

- **Type:** Feature
- **User Story:** As a member, I can start a new DM conversation with another member.
- **Priority:** P1
- **Effort:** M
- **Status:** 🔴 Not Started — compose button in Messages header has no handler
- **Notes:** Needs member picker → `trpc.messages.createConversation`. Feature-flag: `MESSAGING`.

### PROF-001 — My Profile Screen

- **Type:** Feature (existing)
- **User Story:** As a member, I can view my profile, stats, and referral code.
- **Priority:** P0
- **Effort:** S
- **Status:** ✅ Done

### PROF-002 — Profile Edit

- **Type:** Feature
- **User Story:** As a member, I can update my display name, bio, and avatar.
- **Priority:** P0
- **Effort:** M
- **Status:** 🔴 Not Started
- **Notes:** New screen `/profile-edit`. Wire to `trpc.profile.update`. Avatar upload via `expo-image-picker`.

### NOTIF-001 — Notifications Screen

- **Type:** Feature (existing)
- **User Story:** As a member, I can see my in-app notifications and mark them read.
- **Priority:** P1
- **Effort:** S
- **Status:** ✅ Done (polling)

---

## Sprint 2 — Social Features

### SOCIAL-001 — Member Discovery / Search

- **Type:** Feature
- **User Story:** As a member, I can browse other members and view their profiles.
- **Priority:** P1
- **Effort:** M
- **Status:** 🔴 Not Started
- **Notes:** New tab or profile section. `trpc.members.list` with search. Tap → `member/[id]`.

### SOCIAL-002 — Member Profile — Message CTA

- **Type:** Feature
- **User Story:** As a member viewing another member's profile, I can tap a button to DM them.
- **Priority:** P1
- **Effort:** S
- **Status:** 🔴 Not Started (`member/[id].tsx` has no message button)

### SOCIAL-003 — Referral Share Sheet

- **Type:** Feature
- **User Story:** As a member, I can share my referral code via iMessage/WhatsApp/etc.
- **Priority:** P2
- **Effort:** S
- **Status:** 🔴 Not Started
- **Notes:** Install `expo-sharing`. Share referral link: `https://soapies.app/join?ref=CODE`. Feature-flag: `REFERRALS`.

### SOCIAL-004 — Community Pages

- **Type:** Feature
- **User Story:** As a member, I can navigate to a community's landing page and see its description.
- **Priority:** P2
- **Effort:** M
- **Status:** 🔴 Not Started

### SOCIAL-005 — Group Channels / Messaging

- **Type:** Feature
- **User Story:** As a member, I can participate in group chat channels for my community.
- **Priority:** P2
- **Effort:** L
- **Status:** 🔴 Not Started — backend schema supports it, mobile has no UI

### SOCIAL-006 — Ticket Management (Cancel Request)

- **Type:** Feature
- **User Story:** As a member, I can request a cancellation for a reservation.
- **Priority:** P2
- **Effort:** S
- **Status:** 🔴 Not Started — backend `cancellationRequests` table exists

### SOCIAL-007 — Post Media Upload

- **Type:** Feature
- **User Story:** As a member composing a post, I can attach a photo from my camera roll.
- **Priority:** P2
- **Effort:** M
- **Status:** 🔴 Not Started — `expo-image-picker` installed but unused

### SOCIAL-008 — Event Feedback (Rating)

- **Type:** Feature
- **User Story:** As a member, I can rate an event after it has ended.
- **Priority:** P2
- **Effort:** S
- **Status:** 🔴 Not Started — backend `eventFeedback` exists

---

## Sprint 3 — Polish + Launch

### LAUNCH-001 — Push Notifications

- **Type:** Mobile-Specific
- **User Story:** As a member, I receive a push notification when someone messages me or likes my post.
- **Priority:** P1
- **Effort:** L
- **Status:** 🔴 Not Started
- **Notes:** Install `expo-notifications`. Add plugin to `app.json`. Register token via `trpc.notifications.registerPush`. Server already has push notification schema.

### LAUNCH-002 — Deep Linking

- **Type:** Mobile-Specific
- **User Story:** As a member, tapping a `soapies://event/123` link opens the app to that event.
- **Priority:** P2
- **Effort:** M
- **Status:** 🟡 Partial — scheme `soapies://` registered. No route handlers mapped.
- **Notes:** Wire `expo-linking` → Expo Router URL handling. Key routes: `/event/[id]`, `/chat/[id]`, referral join.

### LAUNCH-003 — Onboarding / Application Flow

- **Type:** Feature
- **User Story:** As a new user, I can complete the multi-step application form in-app.
- **Priority:** P1
- **Effort:** XL
- **Status:** 🔴 Not Started
- **Notes:** Web has 5-step wizard. Mobile needs adapted version. Steps: basic info → bio → photos → preferences → submit. This may be deferred to web redirect in v1.

### LAUNCH-004 — Waiver Gate

- **Type:** Feature
- **User Story:** As a member, I must sign the community waiver before reserving an event ticket.
- **Priority:** P1
- **Effort:** S
- **Status:** 🔴 Not Started — backend `profile.signWaiver` mutation exists

### LAUNCH-005 — Biometric Auth

- **Type:** Mobile-Specific
- **User Story:** As a returning user, I can use Face ID / fingerprint instead of re-entering my password.
- **Priority:** P3
- **Effort:** S
- **Status:** 🔴 Not Started
- **Notes:** Install `expo-local-authentication`. Optional — nice for v1.1.

### LAUNCH-006 — Offline Graceful Degradation

- **Type:** Mobile-Specific
- **User Story:** As a user with no internet, I see a friendly offline message instead of a crash.
- **Priority:** P2
- **Effort:** S
- **Status:** 🔴 Not Started
- **Notes:** NetInfo check in root layout. Show "You're offline" banner.

### LAUNCH-007 — Performance: Pagination

- **Type:** Tech Debt
- **User Story:** As a member with a large feed, the app doesn't slow down or fetch too much data.
- **Priority:** P2
- **Effort:** M
- **Status:** 🔴 Not Started — all queries use `limit: 20` but no `cursor` / infinite scroll

### LAUNCH-008 — Accessibility Audit

- **Type:** Quality
- **User Story:** As a user with accessibility needs, the app is navigable with screen readers.
- **Priority:** P2
- **Effort:** M
- **Status:** 🔴 Not Started

### LAUNCH-009 — App Store Assets

- **Type:** Launch
- **User Story:** App is approved by Apple App Store and Google Play Store.
- **Priority:** P0 (for launch)
- **Effort:** M
- **Status:** 🔴 Not Started — see app-store-checklist.md

### LAUNCH-010 — Privacy Policy + ToS Pages (Web / In-App Link)

- **Type:** Compliance
- **User Story:** The app links to a privacy policy and terms of service (required by app stores).
- **Priority:** P0 (for launch)
- **Effort:** S
- **Status:** 🔴 Not Started — web has Privacy.tsx and ToS.tsx but no mobile link

### LAUNCH-011 — WebSocket Real-Time Messaging

- **Type:** Tech Upgrade
- **User Story:** As a member in a chat, I see new messages instantly without refresh.
- **Priority:** P1
- **Effort:** L
- **Status:** 🔴 Not Started
- **Notes:** Server has `_core/websocket.ts` partially implemented. Mobile currently polls at 5s. Feature-flag: `MESSAGING`.

---

## Mobile-Specific Considerations (v1 vs Later)

| Feature                   | v1 (Beta)                      | Later            |
| ------------------------- | ------------------------------ | ---------------- |
| Push Notifications        | ❌ Later                       | Sprint 3         |
| Deep Linking              | 🟡 Basic (event link)          | Sprint 3         |
| Offline Banner            | ✅ Should be in v1             | Sprint 3         |
| Biometric Auth            | ❌ Later                       | v1.1             |
| Share Sheet (referrals)   | ❌ Later                       | Sprint 2         |
| Camera (profile/posts)    | 🟡 Profile avatar in v1        | Sprint 2 (posts) |
| Location (events near me) | ❌ Later                       | v2               |
| WebSocket Messaging       | ❌ Later (polling ok for beta) | Sprint 3         |
| App Store Assets          | ✅ Required for launch         | Sprint 3         |
| Privacy Policy URL        | ✅ Required for launch         | Sprint 3         |
