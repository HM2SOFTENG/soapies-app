# UI Polish Notes — Soapies React Native App

**Branch:** react-native  
**Date:** 2026-04-13  
**Scope:** Bug fixes, skeleton loaders, empty states, micro-interactions, typography, card + input design system

---

## Phase 2: Bug Fixes

### `app/(auth)/register.tsx`
- **Fixed:** Removed stale `SecureStore.setItemAsync('session_token', data.token)` call that stored a token under the wrong key (`session_token` vs `app_session_cookie`). The app uses cookie-based auth, captured automatically by the tRPC fetch interceptor in `lib/trpc.ts`. The dead storage was cleaned up.
- Removed unused `expo-secure-store` import, replaced with no-op (server cookie flow handles auth state).

### `app/chat/[id].tsx`
- **Fixed:** `sendMutation` was missing `onError`. Added `Alert.alert('Could not send message', err.message)` handler.
- Added `Alert` import (was missing from react-native imports).

### `app/(tabs)/index.tsx`
- **Fixed:** `likeMutation` was missing `onError`. Added `Alert.alert('Could not like post', err.message)`.

### Notes on other reported bugs
- `ev.price` field — `EventCard` and `event/[id].tsx` already correctly use `priceSingleMale`, `priceSingleFemale`, `priceCouple`. No change needed.
- `imageUrl` vs `coverImageUrl` — `EventCard` already resolves both via `event.coverImageUrl ?? event.imageUrl`. No change needed.
- Hardcoded "Conversation" header — `chat/[id].tsx` already resolves the header from `conversation.participants`. No change needed.
- Deprecated Clipboard — no `import { Clipboard } from 'react-native'` found anywhere in the codebase.

---

## Phase 3: Skeleton Loading States

### `app/(tabs)/index.tsx` — `PostSkeleton`
- Replaced `ActivityIndicator` with 3× `PostSkeleton` components
- Skeleton shows: avatar circle (32px), 2 name/time placeholder lines, 3 content lines
- Animated with `Animated.loop(Animated.sequence([opacity 0.4→0.9→0.4]))` at 700ms per phase

### `app/(tabs)/events.tsx` — `EventSkeleton`
- Replaced `ActivityIndicator` with 3× `EventSkeleton` components
- Skeleton shows: 160px image placeholder, 2 text lines (title + meta)
- Same opacity pulse animation

### `app/(tabs)/messages.tsx` — `ConversationSkeleton`
- Replaced `ActivityIndicator` with 4× `ConversationSkeleton` components
- Skeleton shows: 44px avatar circle, name line (55%), preview line (80%)
- Same opacity pulse animation

### `app/(tabs)/notifications.tsx` — `NotificationSkeleton`
- Replaced `ActivityIndicator` with 4× `NotificationSkeleton` components
- Skeleton shows: 40px icon circle, 2 text lines (60% and 85% width)
- Same opacity pulse animation

---

## Phase 4: Empty States with Personality

### Feed (`app/(tabs)/index.tsx`)
- Emoji: 💫
- Headline: "It's quiet in here..."
- Subtext: "Be the first to share something with the community"
- CTA button: gradient "Create Post" button that opens the composer

### Events (`app/(tabs)/events.tsx`)
- Emoji: 🎉
- Headline: "No events yet"
- Subtext: "Check back soon — something exciting is always brewing"

### Messages (`app/(tabs)/messages.tsx`)
- Emoji: 💬
- Headline: "No conversations yet"
- Subtext: "Find a member and say hello"
- CTA button: outlined "Browse Members" button (TODO: wire up to members screen)

### Notifications (`app/(tabs)/notifications.tsx`)
- Emoji: 🔔
- Headline: "You're all caught up!"
- Subtext: "We'll let you know when something happens"

---

## Phase 5: Micro-interactions

### Like Button Spring Animation (`components/PostCard.tsx`)
- Added `useRef(new Animated.Value(1))` for like icon scale
- On press: `Animated.sequence([spring to 1.35, spring back to 1.0])` with natural bounce
- Like icon wrapped in `<Animated.View style={{ transform: [{ scale: likeScale }] }}>`
- Added `Haptics.impactAsync(ImpactFeedbackStyle.Light)` on every like

### Button Press Scale Feedback
- All `TouchableOpacity` → `Pressable` where press feedback needed
- Pattern: `style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}`
- Applied in: Feed composer toggle, community chips, post submit, FAB, chat send, filter chips, header buttons

### FAB Entrance Animation (`app/(tabs)/index.tsx`)
- `Animated.spring(fabAnim, { toValue: 1, tension: 60, friction: 7 })`
- FAB wrapped in `<Animated.View style={{ transform: [{ scale: fabAnim }] }}>`
- Springs in on first render with natural bounce

### Haptics System-wide
- `PostCard`: `Haptics.impactAsync(Light)` on like, `Haptics.selectionAsync()` on comment
- `EventCard`: `Haptics.impactAsync(Light)` on card press
- `ConversationItem`: `Haptics.selectionAsync()` on press
- `MessagesScreen`: `Haptics.selectionAsync()` on compose button
- `NotificationsScreen`: `Haptics.selectionAsync()` on "Mark all read"
- `FeedScreen`: `Haptics.impactAsync(Medium)` on FAB + compose, `Haptics.selectionAsync()` on community chip

---

## Phase 6: Typography Consistency

Enforced across all modified screens:

| Element | Before | After |
|---------|--------|-------|
| Screen titles | fontSize 22, fontWeight '800' | fontSize 28, fontWeight '700' |
| Card names/authors | fontSize 14, fontWeight '700' | fontSize 15, fontWeight '700' |
| Body text | `colors.text` (F9FAFB) | `#E5E7EB` (slightly softer) |
| Metadata/timestamps | `colors.muted` (9CA3AF) | `#9CA3AF` explicit |
| Badge labels | fontSize 11, fontWeight '700' | fontSize 11, fontWeight '600' |

Screens updated: `index.tsx`, `events.tsx`, `messages.tsx`, `notifications.tsx`, `PostCard.tsx`, `EventCard.tsx`, `ConversationItem.tsx`

---

## Phase 7: Card Polish

### `components/PostCard.tsx`
- **Before:** `borderRadius: 16`, no shadow
- **After:** Added `shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4`
- Padding normalized to 16px throughout (was 14px in places)
- Outer container converted to `Pressable` for press scale feedback

### `components/EventCard.tsx`
- Added `shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4`
- Added subtle gradient overlay at bottom of hero image (`transparent → rgba(26,26,46,0.6)`)
- Converted to `Pressable` for press scale feedback

### `components/ConversationItem.tsx`
- Unread highlight: `${colors.pink}0A` (was `${colors.pink}08`, slightly more visible)
- Added pressed state background for visual feedback
- Converted to `Pressable`
- Bold unread preview text (was only bold on name)

---

## Phase 8: Input Styling

### `app/chat/[id].tsx`
- `placeholderTextColor`: was `colors.muted` → explicit `#6B7280`
- `color`: was `colors.text` → explicit `#FFFFFF`
- **Focus indicator:** border switches to `colors.pink` when text input has content

### `app/(tabs)/index.tsx` (Composer)
- `placeholderTextColor`: explicit `#6B7280`
- `paddingVertical: 12` (was 14, 12 is spec)
- `color`: explicit `#FFFFFF`

---

## TypeScript

Ran `npx tsc --noEmit` — zero errors after all changes.

---

## Files Changed

| File | Changes |
|------|---------|
| `components/PostCard.tsx` | Like spring animation, haptics, press scale, card shadow, typography, Pressable |
| `components/EventCard.tsx` | Card shadow, gradient overlay, haptics, press scale, typography, Pressable |
| `components/ConversationItem.tsx` | Haptics, press scale, Pressable, unread preview bold |
| `app/(tabs)/index.tsx` | Skeleton loader, empty state CTA, FAB spring entrance, like onError, typography, haptics |
| `app/(tabs)/events.tsx` | Skeleton loader, empty state, typography, filter press scale |
| `app/(tabs)/messages.tsx` | Skeleton loader, empty state CTA, typography, haptics |
| `app/(tabs)/notifications.tsx` | Skeleton loader, empty state, typography, haptics |
| `app/chat/[id].tsx` | `onError` on sendMutation, input styling (pink border on active) |
| `app/(auth)/register.tsx` | Removed stale `session_token` storage, import cleanup |
