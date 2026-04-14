# QA Report — Soapies React Native App

**Date:** 2026-04-13  
**Branch:** react-native  
**QA Agent:** Lead QA (subagent)  
**Repo:** `/Users/bclaw/Documents/soapies-app`  

---

## 1. Test Suite Summary

### Web App (vitest)
| Metric | Value |
|--------|-------|
| Test Files | 3 passed |
| Total Tests | 60 passed |
| Status | ✅ PASS |

Note: `node_modules` was missing at audit start — required `pnpm install`. CI should ensure dependencies are pre-installed.

### Mobile App (vitest, newly added)
| Metric | Value |
|--------|-------|
| Test Files | 5 passed |
| Total Tests | 47 passed |
| Status | ✅ PASS |

#### Test Files Created

| File | Tests | Coverage Target |
|------|-------|-----------------|
| `__tests__/colors.test.ts` | 14 | All 11 brand colors + hex validation |
| `__tests__/auth.test.ts` | 11 | SecureStore token lifecycle, login/logout/checkSession |
| `__tests__/trpc.test.ts` | 7 | Client factory, URL config, endpoint path, header contracts |
| `__tests__/components/Avatar.test.ts` | 8 | Initials logic contract + component existence check |
| `__tests__/components/GradientButton.test.ts` | 7 | Press-guard logic, loading state display + existence check |

**Run command:**
```bash
cd mobile && npx vitest run --passWithNoTests
```

---

## 2. Code Quality Issues Found

### CRITICAL — Incomplete screens (for Dev to fix)

#### [C1] `app/chat/[id].tsx` — Missing `onError` on send mutation
- `sendMutation.useMutation` has no `onError` handler
- If send fails silently, user gets no feedback
- **Fix:** Add `onError: (e) => Alert.alert('Send Failed', e.message)`

#### [C2] `app/chat/[id].tsx` — Missing `onError` on `reactMutation` and `markRead`
- Emoji reactions and read-marking mutations lack error handlers
- Silent failures hurt UX
- **Fix:** At minimum log errors; show alert for reaction failures

#### [C3] `app/(tabs)/notifications.tsx` — No error state on failed list fetch
- `trpc.notifications.list.useQuery` has no `isError` branch
- If the request fails, user sees a blank screen with no explanation
- **Fix:** Add error state: `if (isError) return <ErrorView />`

#### [C4] `app/(tabs)/messages.tsx` — No error state on failed conversations fetch
- Same pattern: no `isError` branch
- **Fix:** Add error state

#### [C5] `app/(tabs)/events.tsx` — No error state
- `trpc.events.list.useQuery` has no `isError` branch
- **Fix:** Add error state with retry button

#### [C6] `app/(tabs)/profile.tsx` — `Clipboard` deprecated API
- Uses `import { Clipboard } from 'react-native'` — deprecated in RN 0.59+
- **Fix:** Use `@react-native-clipboard/clipboard` or `expo-clipboard`

### MEDIUM — Type safety & null guards

#### [M1] `as any` overuse across screens
Multiple screens cast data with `(data as any[]) ?? []` or `(data as any)?.field ?? data ?? []`. This silences TS and hides schema mismatches.
- **Affected:** `index.tsx`, `events.tsx`, `notifications.tsx`, `messages.tsx`, `_layout.tsx`
- **Fix:** Define proper TypeScript interfaces matching server return shapes, or use the inferred `AppRouter` types via `trpc.useUtils()`

#### [M2] `app/(tabs)/events.tsx` — Double-fallback data extraction
```tsx
const allEvents = (data as any)?.events ?? data ?? [];
```
The server route `events.list` returns an array directly (not `{ events: [...] }`). The `.events` fallback is stale defensive code that adds confusion.
- **Fix:** `const allEvents = (data as any[]) ?? [];`

#### [M3] `app/chat/[id].tsx` — Conversation name not shown in header
Header shows "Conversation" hardcoded. The screen fetches `conversations` to find the matching one but never uses `conversation.name`.
- **Fix:** Display `conversation?.name ?? 'Conversation'` in the header

#### [M4] `app/event/[id].tsx` — `ev.price` field used but doesn't exist in schema
```tsx
const price = ev.price ? `$${(ev.price / 100).toFixed(2)}` : 'Free';
```
The actual event schema has `priceSingleMale`, `priceSingleFemale`, `priceCouple` — no unified `price` field. The component always shows "Free".
- **Fix:** Compute display price from the three price fields (same logic as `EventCard.tsx`)

#### [M5] `app/event/[id].tsx` — `ev.imageUrl` vs `coverImageUrl`
Uses `ev.imageUrl` but the server returns `coverImageUrl`. EventCard.tsx already handles both with `event.coverImageUrl ?? event.imageUrl` — event detail screen should do the same.

### LOW — Minor issues

#### [L1] `app/(tabs)/index.tsx` — `showComposer` state declared but post composer modal not fully functional
Post content state exists; the modal opens but `createPost.mutate()` call doesn't pass `communityId` to backend. The server route requires it for community wall differentiation.

#### [L2] `app/(auth)/login.tsx` — Cookie session placeholder
When server returns cookie-based session (no `data.token`), stores literal string `'session'` as token:
```tsx
await SecureStore.setItemAsync('session_token', 'session');
```
This is a workaround that will cause auth confusion if the app later checks token validity. Needs a proper session handoff strategy.

#### [L3] `app/_layout.tsx` — No error boundary
If tRPC setup fails (e.g., server unreachable on launch), the app crashes silently. Add an `ErrorBoundary` wrapper around `<Slot />`.

---

## 3. Server Route Reference Map

> **Access levels:** `public` = no auth required | `protected` = requires valid session | `admin` = requires admin role

### 🔐 auth.*

| Route | Type | Access | Input | Returns |
|-------|------|--------|-------|---------|
| `auth.me` | query | public | — | User object or null |
| `auth.login` | mutation | public | `{ email: string, password: string }` | `{ success, user: { id, name, email, role, emailVerified } }` |
| `auth.register` | mutation | public | `{ email: string, password: string (min 8), name: string (min 1) }` | `{ success, userId, message }` |
| `auth.logout` | mutation | public | — | `{ success: true }` |
| `auth.sendPhoneOtp` | mutation | public | `{ phone: string (min 10) }` | `{ success, isNewUser }` |
| `auth.verifyPhoneOtp` | mutation | public | `{ phone, code (len 6), name? }` | `{ success, user }` |
| `auth.verifyEmail` | mutation | public | `{ email, code (len 6) }` | `{ success }` |
| `auth.resendEmailVerification` | mutation | public | `{ email }` | `{ success, message }` |
| `auth.requestPasswordReset` | mutation | public | `{ email }` | `{ success, message }` |
| `auth.resetPassword` | mutation | public | `{ email, code (len 6), newPassword (min 8) }` | `{ success }` |
| `auth.changePassword` | mutation | protected | `{ currentPassword, newPassword (min 8) }` | `{ success }` |
| `auth.requestDeactivation` | mutation | protected | — | `{ success }` |
| `auth.confirmDeactivation` | mutation | protected | `{ code (min 4) }` | `{ success }` |

### 👤 profile.*

| Route | Type | Access | Input | Returns |
|-------|------|--------|-------|---------|
| `profile.me` | query | protected | — | Profile object |
| `profile.upsert` | mutation | protected | `{ displayName?, bio?, avatarUrl?, gender?, orientation?, location?, phone?, communityId?, dateOfBirth?, referredByCode? }` | Profile object |
| `profile.submitApplication` | mutation | protected | — | `{ success }` |
| `profile.photos` | query | protected | — | Photo array |
| `profile.uploadPhoto` | mutation | protected | `{ photoUrl, sortOrder? }` | `{ photoId }` |
| `profile.deletePhoto` | mutation | protected | `{ photoId: number }` | `{ success }` |
| `profile.signWaiver` | mutation | protected | `{ signature, version }` | `{ success }` |
| `profile.completeProfileSetup` | mutation | protected | — | `{ success }` |
| `profile.search` | query | protected | `{ query: string }` | Profile array |

### 🎟️ events.*

| Route | Type | Access | Input | Returns |
|-------|------|--------|-------|---------|
| `events.list` | query | public | `{ communityId? }?` | Event array |
| `events.byId` | query | public | `{ id: number }` | Event object |
| `events.all` | query | admin | — | All events |
| `events.create` | mutation | admin | `{ title, startDate, description?, coverImageUrl?, eventType?, communityId?, venue?, address?, endDate?, capacity?, priceSingleMale?, priceSingleFemale?, priceCouple?, status? }` | Event |
| `events.update` | mutation | admin | `{ id, ...optional fields }` | `{ success }` |
| `events.delete` | mutation | admin | `{ id: number }` | `{ success }` |
| `events.addons` | query | public | `{ eventId: number }` | Addon array |
| `events.submitFeedback` | mutation | protected | `{ eventId, rating (1-5), comment?, isAnonymous? }` | Feedback object |

> ⚠️ **No `events.detail` or `events.reserve` routes exist.** Use `events.byId` and `reservations.create`.

### 🎫 reservations.*

| Route | Type | Access | Input | Returns |
|-------|------|--------|-------|---------|
| `reservations.myReservations` | query | protected | — | Reservation array |
| `reservations.myTickets` | query | protected | — | Ticket array with QR codes |
| `reservations.create` | mutation | protected | `{ eventId, ticketType?, quantity?, totalAmount?, paymentMethod?, paymentStatus?, orientationSignal?, isQueerPlay?, partnerUserId?, testResultUrl? }` | Reservation ID |
| `reservations.updateStatus` | mutation | admin | `{ id, status, paymentStatus? }` | `{ success }` |
| `reservations.checkInByQR` | mutation | admin | `{ qrCode, eventId }` | `{ success, guestName }` |
| `reservations.joinWaitlist` | mutation | protected | `{ eventId: number }` | Waitlist entry |
| `reservations.getWaitlistPosition` | query | protected | `{ eventId: number }` | Position data |

### 💬 messages.*

| Route | Type | Access | Input | Returns |
|-------|------|--------|-------|---------|
| `messages.conversations` | query | protected | — | Conversation array (gender-filtered) |
| `messages.messages` | query | protected | `{ conversationId: number, limit? }` | Message array |
| `messages.send` | mutation | protected | `{ conversationId, content, attachmentUrl?, attachmentType?, replyToId? }` | Message ID |
| `messages.createConversation` | mutation | protected | `{ type?, name?, participantIds: number[] }` | Conversation ID |
| `messages.addReaction` | mutation | protected | `{ messageId, emoji }` | `{ added: boolean }` |
| `messages.markRead` | mutation | protected | `{ conversationId: number }` | `{ success }` |
| `messages.markAllConversationsRead` | mutation | protected | — | `{ success }` |
| `messages.deleteMessage` | mutation | protected | `{ messageId: number }` | `{ success }` |
| `messages.unreadCounts` | query | protected | — | Unread count map |

### 📋 wall.*

| Route | Type | Access | Input | Returns |
|-------|------|--------|-------|---------|
| `wall.posts` | query | protected | `{ communityId?, limit? }?` | Post array |
| `wall.create` | mutation | protected | `{ content, communityId?, mediaUrl?, mediaType?, visibility? }` | Post ID |
| `wall.like` | mutation | protected | `{ postId: number }` | `{ liked: boolean }` |
| `wall.myLikes` | query | protected | — | Liked post ID array |
| `wall.comments` | query | protected | `{ postId: number }` | Comment array |
| `wall.addComment` | mutation | protected | `{ postId, content }` | `{ success }` |

### 🔔 notifications.*

| Route | Type | Access | Input | Returns |
|-------|------|--------|-------|---------|
| `notifications.list` | query | protected | — | Notification array |
| `notifications.unreadCount` | query | protected | — | `{ count: number }` |
| `notifications.markRead` | mutation | protected | `{ id: number }` | `{ success }` |
| `notifications.markAllRead` | mutation | protected | — | `{ success }` |
| `notifications.channels` | query | public | — | `{ available, emailEnabled, smsEnabled }` |
| `notifications.preferences` | query | protected | — | Preference array |
| `notifications.upsertPreference` | mutation | protected | `{ category, inApp?, email?, sms?, push? }` | `{ success }` |

### 👥 members.*

| Route | Type | Access | Input | Returns |
|-------|------|--------|-------|---------|
| `members.browse` | query | protected | `{ page?, search?, orientation?, community? }` | Member array |
| `members.byId` | query | protected | `{ userId: number }` | Public profile |
| `members.wall` | query | protected | `{ userId, limit? }` | Post array |

### 🤝 partners.*, referrals.*, credits.*, groups.*, settings.*

| Route | Type | Access | Notes |
|-------|------|--------|-------|
| `referrals.myCode` | query | protected | User's referral code |
| `referrals.generate` | mutation | protected | Creates new unique code |
| `referrals.validate` | query | public | `{ code }` → `{ valid, referrerName? }` |
| `credits.balance` | query | protected | Credit balance |
| `credits.history` | query | protected | Credit transaction history |
| `groups.list` | query | public | All community groups |
| `groups.bySlug` | query | public | `{ slug }` → Group |
| `settings.get` | query | public | App settings map |

---

## 4. QA Recommendations

### Immediate (before merge to main)

1. **Fix C1–C5**: Add `onError` handlers and `isError` render states to all screens
2. **Fix M4**: Correct `ev.price` → compute from `priceSingleFemale/Male/priceCouple` in event detail
3. **Fix M5**: Use `coverImageUrl ?? imageUrl` in event detail screen
4. **Fix L2**: Replace Clipboard deprecated import in profile screen

### Short-term

5. **Typed data**: Replace `as any` casts with proper types derived from `AppRouter` router types
6. **Error boundary**: Add root-level error boundary in `_layout.tsx`
7. **Session strategy**: Define clear contract for cookie vs token auth in mobile context
8. **Add `utils.test.ts`**: The new `lib/utils.ts` (`formatDistanceToNow`, `getInitials`, `communityColor`) has zero test coverage — easy wins

### Ongoing QA Strategy

9. **Run tests in CI**: The `.github/workflows/mobile-check.yml` workflow runs TypeScript check + vitest on every push to `react-native` branch
10. **Expand component tests**: Now that Avatar, GradientButton etc. exist, add `@testing-library/react-native` render tests when `jsdom`/RNTL environment is set up
11. **E2E tests**: Consider Detox for critical user flows: login → browse events → reserve → view ticket
12. **Test naming convention**: All test files follow `__tests__/<feature>.test.ts` — maintain this pattern

### CI Coverage Gaps

| What's not tested | Risk | Mitigation |
|-------------------|------|------------|
| Component rendering (Avatar, PostCard, etc.) | Medium | Add RNTL tests |
| Auth flow end-to-end | Medium | Mock API + test full login sequence |
| Route name correctness | Low–Medium | tRPC types will catch at TS compile time |
| Navigation flows | Medium | Add Detox E2E for critical paths |

---

## Appendix: Files Audited

**App screens:**
- `app/_layout.tsx` — Root layout with AuthGuard
- `app/(auth)/login.tsx` — Login screen
- `app/(auth)/register.tsx` — Registration screen
- `app/(tabs)/index.tsx` — Feed/wall screen
- `app/(tabs)/events.tsx` — Events list
- `app/(tabs)/messages.tsx` — Conversations list
- `app/(tabs)/notifications.tsx` — Notifications
- `app/(tabs)/profile.tsx` — User profile
- `app/chat/[id].tsx` — Chat room
- `app/event/[id].tsx` — Event detail + reserve
- `app/member/[id].tsx` — Member profile

**Lib files:**
- `lib/auth.tsx` — AuthContext + SecureStore integration
- `lib/trpc.ts` — tRPC client factory
- `lib/colors.ts` — Brand color tokens
- `lib/utils.ts` — `formatDistanceToNow`, `getInitials`, `communityColor`

**Components:**
- `components/Avatar.tsx` — Initials/image avatar
- `components/GradientButton.tsx` — Branded CTA button
- `components/EventCard.tsx` — Event list card
- `components/ConversationItem.tsx` — Message list item
- `components/PostCard.tsx` — Wall post card
