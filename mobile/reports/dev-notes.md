# Soapies Mobile — Developer Notes

**Date:** 2026-04-13  
**Branch:** react-native  
**Agent:** Lead Developer Subagent

---

## What Was Built

### New Files Created

| File                              | Description                                                         |
| --------------------------------- | ------------------------------------------------------------------- |
| `lib/utils.ts`                    | `formatDistanceToNow`, `getInitials`, `communityColor` helpers      |
| `components/Avatar.tsx`           | Gradient initials circle, optional image URI, size prop             |
| `components/GradientButton.tsx`   | Pink→purple gradient button with haptics, loading state             |
| `components/PostCard.tsx`         | Wall post card with avatar, content, media, like/comment actions    |
| `components/EventCard.tsx`        | Event card with hero image/gradient, community badge, price         |
| `components/ConversationItem.tsx` | Conversation row with avatar, last message, unread badge            |
| `components/NotificationItem.tsx` | Notification row with type icon, pink left border if unread         |
| `app/chat/[id].tsx`               | Full chat screen: inverted FlatList, send bar, long-press reactions |
| `app/member/[id].tsx`             | Member profile: avatar, bio, stats, Message CTA                     |
| `.env.production`                 | Production API URL placeholder                                      |
| `reports/dev-notes.md`            | This file                                                           |

### Files Updated

| File                           | What Changed                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `lib/utils.ts`                 | Created with all utility exports                                                                                                |
| `lib/trpc.ts`                  | Cookie-based auth (captures `app_session_id` from Set-Cookie header)                                                            |
| `lib/auth.tsx`                 | Removed Bearer token approach; uses `setUser` instead of `login()`                                                              |
| `app/_layout.tsx`              | Uses `trpc.auth.me` to validate session on startup; improved auth guard                                                         |
| `app/(auth)/login.tsx`         | Removed className usage; uses `setUser` from auth context                                                                       |
| `app/(tabs)/index.tsx`         | Fixed route (`wall.posts` not `wall.list`); added composer modal; wired like mutation                                           |
| `app/(tabs)/messages.tsx`      | Added pull-to-refresh                                                                                                           |
| `app/(tabs)/notifications.tsx` | Fixed `markAllRead` (no arg); fixed `list` query (no arg); used `NotificationItem` component                                    |
| `app/event/[id].tsx`           | Fixed `events.byId` (was `events.detail`); fixed `reservations.create` (was `events.reserve`); added ticket type selector modal |
| `tsconfig.json`                | Added `@shared/*` path alias so server types resolve cleanly                                                                    |

---

## tRPC Routes Mapped to Screens

| Screen                 | Route                         | Notes                                                   |
| ---------------------- | ----------------------------- | ------------------------------------------------------- |
| Feed (`index.tsx`)     | `wall.posts`                  | Takes optional `{ communityId, limit }`                 |
| Feed — Like            | `wall.like`                   | `{ postId: number }`                                    |
| Feed — My likes        | `wall.myLikes`                | No args                                                 |
| Feed — Create post     | `wall.create`                 | `{ content, communityId, visibility }`                  |
| Events list            | `events.list`                 | Takes optional `{ communityId }`                        |
| Event detail           | `events.byId`                 | `{ id: number }` — **number, not string**               |
| Event reserve          | `reservations.create`         | `{ eventId, ticketType, paymentMethod, paymentStatus }` |
| Messages list          | `messages.conversations`      | No args; returns filtered conversations                 |
| Chat messages          | `messages.messages`           | `{ conversationId: number, limit?: number }`            |
| Chat send              | `messages.send`               | `{ conversationId, content }`                           |
| Chat reactions         | `messages.addReaction`        | `{ messageId, emoji }`                                  |
| Chat mark read         | `messages.markRead`           | `{ conversationId }`                                    |
| Profile                | `auth.me`                     | Returns `User \| null`                                  |
| Notifications list     | `notifications.list`          | No args                                                 |
| Notifications mark all | `notifications.markAllRead`   | No args (mutation)                                      |
| Member profile         | `members.byId`                | `{ userId: number }`                                    |
| DM creation            | `messages.createConversation` | `{ type: 'dm', participantIds: number[] }`              |

---

## Auth Architecture

The server uses **cookie-based auth** (`app_session_id` cookie). React Native does not automatically handle `Set-Cookie` headers like a browser does.

**Solution implemented:**

1. `trpc.ts` custom `fetch` interceptor captures `Set-Cookie` from every response
2. If `app_session_id=<value>` is found, stores it in `SecureStore`
3. On each request, reads from `SecureStore` and injects as `Cookie: app_session_id=<value>` header
4. Logout clears SecureStore and user context

**Key constant:** `SESSION_COOKIE_KEY = 'app_session_cookie'` (in `lib/trpc.ts`)

---

## Server-Side Gaps Found

| Gap                                                                                 | Impact                                                          | Recommendation                                                               |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `members.byId` returns minimal data                                                 | Member profile screen shows limited info                        | Add `eventsAttended`, `postsCount`, `bio` to `getPublicProfile()` in `db.ts` |
| `messages.conversations` returns no `lastMessage` / `lastMessageAt` / `unreadCount` | ConversationItem shows blank last message                       | Extend `getUserConversations()` to include these fields                      |
| No `wall.myLikes` query that returns post IDs                                       | Had to use `wall.myLikes` which exists but return shape unknown | Verify return shape is `number[]`                                            |
| `auth.me` returns `User` (db row) not full profile                                  | Profile screen limited to base user fields                      | Consider merging with `profile.me` for richer data                           |
| No dedicated `/chat` route in `app.json` deep link scheme                           | Chat deep links won't work without config                       | Add `intentFilters` / `universalLinks` if needed                             |

---

## Known Issues

1. **Cookie capture reliability**: If the API server sends the cookie in a non-standard header format (e.g. multiple Set-Cookie headers), the regex `app_session_id=([^;]+)` may miss it. Test with the actual backend and adjust if needed.

2. **`Clipboard` deprecated**: `profile.tsx` uses `Clipboard` from `react-native` which is deprecated. Should migrate to `@react-native-clipboard/clipboard` or `expo-clipboard`.

3. **`wall.myLikes` return shape**: The mutation assumes it returns `number[]` (array of liked post IDs). Verify this matches the server's actual return from `getUserLikedPosts()` in `db.ts`.

4. **Message sender name**: The chat screen reads `item.senderName` from messages, but the server's `getConversationMessages()` may not join sender profile data. Messages might not show sender names without a server-side join.

5. **Inverted FlatList on Android**: `inverted` FlatList can have layout glitches on some Android versions. May need `transform: [{ scaleY: -1 }]` approach as fallback.

6. **No WebSocket support yet**: The server has WebSocket support for real-time messages but the mobile client uses polling (5s interval). For production, implement a WebSocket connection using the server's WS endpoint.
