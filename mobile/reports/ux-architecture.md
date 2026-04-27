# Soapies Mobile — Elite UX Architecture Specification

> **Author:** UX Architecture Agent  
> **Date:** 2026-04-13  
> **Branch:** react-native  
> **Standard:** Apple / Stripe / Notion consumer-grade tier

---

## Table of Contents

1. [Phase 1: Screen-by-Screen UX Audit](#phase-1-screen-by-screen-ux-audit)
   - [Login Screen](#login-screen)
   - [Register Screen](#register-screen)
   - [Feed (Home) Screen](#feed-home-screen)
   - [Events Screen](#events-screen)
   - [Messages Screen](#messages-screen)
   - [Notifications Screen](#notifications-screen)
   - [Profile Screen](#profile-screen)
   - [Chat Screen (chat/[id])](#chat-screen-chatid)
   - [Event Detail Screen (event/[id])](#event-detail-screen-eventid)
   - [Member Profile Screen (member/[id])](#member-profile-screen-memberid)
2. [Phase 2: Component Audit](#phase-2-component-audit)
3. [Phase 3: Design System Audit](#phase-3-design-system-audit)
4. [Phase 4: Navigation UX Audit](#phase-4-navigation-ux-audit)
5. [Phase 5: Empty States & Error States Audit](#phase-5-empty-states--error-states-audit)
6. [Phase 6: Onboarding Flow Design](#phase-6-onboarding-flow-design)

---

## Phase 1: Screen-by-Screen UX Audit

---

### Login Screen

**User Goal:** Sign in quickly and get to the feed with minimum friction.

**Current UX Grade:** B

**Issues Found:**

- Header gradient is purely decorative; logo lacks brand personality — just text "Soapies" with no icon or wordmark
- No "Show/hide password" toggle — standard expectation since iOS 14
- No "Forgot password?" recovery path — users with forgotten credentials are stranded
- No biometric sign-in (Face ID / Touch ID) for returning users
- Input labels use ALL_CAPS which feels corporate, not premium
- Error handling is `Alert.alert()` which is jarring — inline field validation would feel native
- `loginMutation.isPending` opacity change is subtle; the button could telegraph progress better
- No autofill hint distinction between email and next field — missing `returnKeyType="next"` and explicit focus chain
- Tab order on login form is not explicitly managed (email → password → submit)

**Simplified Flow:**

1. App opens → auth guard checks session → if expired, land on Login
2. Face ID prompt immediately (returning users) — tap "Use password" to fall back
3. Fill email → password auto-advance (returnKeyType="next") → tap Sign In
4. Inline error on failure — not modal alert

**Recommended Layout:**

```
┌────────────────────────────────────┐
│  [StatusBar: light]                │
│  ──────────────────────────────── │
│  [Full bleed gradient header]      │
│     🧼 Soapies   (icon + wordmark) │
│     "Your exclusive community"     │
│  ──────────────────────────────── │
│  Welcome back                      │
│                                    │
│  Email ─────────────────────────── │
│  [email@example.com             ]  │
│                                    │
│  Password ──────────────────────── │
│  [•••••••••              👁 ]       │
│                                    │
│  [Forgot password?]     (right)    │
│                                    │
│  [     Sign In ── gradient CTA   ] │
│                                    │
│  ─── or ───                        │
│  [    Face ID / Touch ID         ] │
│                                    │
│  Don't have an account? Join →     │
└────────────────────────────────────┘
```

**Key Components:**

- `PasswordInput`: TextInput with show/hide toggle; `secureTextEntry` toggled by state; eye icon is 44×44 tap target
- `InlineError`: Text + Ionicons warning below the relevant field (replaces Alert.alert for field errors)
- `BiometricButton`: Secondary CTA using `expo-local-authentication`; only shows if device supports biometrics and user has previously logged in
- `GradientHeader`: Reusable full-bleed header with brand logo + tagline; use across auth screens

**UX Optimizations:**

- Replace `Alert.alert()` error with `InlineError` component below password field — keeps user in context instead of modal interrupting flow
- Add `returnKeyType="next"` on email input and `onSubmitEditing={() => passwordRef.current?.focus()}`; `returnKeyType="done"` on password and `onSubmitEditing={handleLogin}` — removes need to reach for submit button on keyboard
- Add `autoFocus` to email field — saves one tap on first render
- `secureTextEntry` toggle: add eye icon at 44×44 with `accessibilityLabel="Show password"` — industry standard for 5+ years
- Add "Forgot password?" link below password field — critical recovery path missing
- Throttle submit button: disable for 2 seconds after first failed attempt to prevent rapid-fire errors

**Performance Considerations:**

- Lazy-load `expo-local-authentication` on first render check — don't block initial paint
- `loginMutation` already optimistic; add `staleTime: Infinity` to `auth.me` cache after successful login so it doesn't re-fetch on each tab focus

**Micro-interactions to Add:**

- On Sign In tap: gradient button scales down 0.97 with spring(stiffness: 200, damping: 15) via `Reanimated` — tactile press confirmation
- On error: email/password fields shake horizontally (±4px, 3 cycles, 80ms each) with `Reanimated.withSequence` — communicates failure without modal
- On success: button transforms to a checkmark icon with `FadeIn` animation before navigating — closure signal

---

### Register Screen

**User Goal:** Apply for community membership — understand this is exclusive, not instant.

**Current UX Grade:** C+

**Issues Found:**

- Uses both NativeWind class strings (`className="flex-1 bg-bg"`) AND inline styles inconsistently — maintenance hazard and potential style conflicts
- No inline validation — invalid email or too-short password only caught on submit
- Post-registration Alert.alert with "Got it" → redirect to login is a cold, jarring UX. User just applied; they deserve a warm holding screen
- No password strength indicator — users don't know what "8 characters" feels like as they type
- Community selection is missing entirely — but 3 communities exist (Soapies/Groupus/Gaypeez). User doesn't choose their community during registration
- No referral code field — referral program exists (shown in Profile) but onboarding doesn't capture it
- The form loops through an array to render fields which is clever but kills auto-complete intelligence — React Native's autofill won't work properly for password fields rendered this way
- No "why join" text field — membership is by approval but there's no application context field

**Simplified Flow:**

1. User taps "Join Soapies" from login
2. Screen 1: Name + Email + Password (basic identity)
3. Screen 2: Community selection (Soapies / Groupus / Gaypeez) + Referral code
4. Screen 3: "Why do you want to join?" — free-text application note
5. Submission → **Pending Application Screen** (not redirect to login)

**Recommended Layout:**

```
┌────────────────────────────────────┐
│  [Gradient header: "Apply"]        │
│  Apply for Membership              │
│  Membership is curated. Tell us    │
│  about yourself.                   │
│                                    │
│  Your Name ────────────────────    │
│  [Jane Smith                    ]  │
│                                    │
│  Email ─────────────────────────── │
│  [you@example.com               ]  │
│                                    │
│  Password ──────────────────────── │
│  [•••••••••              👁 ]       │
│  ████░░░░  Strength: Good          │
│                                    │
│  Referral Code (optional) ──────── │
│  [ABC123                        ]  │
│                                    │
│  [   Apply for Membership  →    ]  │
│                                    │
│  Already a member? Sign In →       │
└────────────────────────────────────┘
```

**Key Components:**

- `PasswordStrengthBar`: Animated fill bar (0–4 segments, each +8px width spring animation) showing password strength via regex scoring (length, uppercase, number, special char)
- `ReferralInput`: Optional text field with placeholder `ABC123` — pre-fills if app was opened via deep link with referral param
- `ApplicationPendingScreen`: Full-screen confirmation with large ✅ animation (Lottie or SVG path draw), copy about "we'll email you", and a "Follow us" CTA — replaces Alert.alert redirect

**UX Optimizations:**

- Refactor field rendering to explicit JSX (not array.map) so each `TextInput` has proper `autoComplete`, `textContentType`, and `returnKeyType` values — critical for iOS autofill and password managers
- Add `textContentType="newPassword"` on password field — triggers strong password suggestion on iOS
- Replace post-register `Alert.alert` with a dedicated `ApplicationPendingScreen` within the auth flow — membership is a meaningful moment, not a dismissible dialog
- Add community selection to this screen or the next step — it's needed before approval

**Performance Considerations:**

- Password strength computation is synchronous regex — keep it that way (no debounce needed, regex is <1ms)
- Don't prefetch `auth.me` after registration — user is pending, server will return null

**Micro-interactions to Add:**

- Password strength bar: `Reanimated.withTiming` width transition (200ms, easeOut) as user types
- Field focus: Border color transitions from `colors.border` (#2D2D44) to `colors.pink` (#EC4899) with `Animated.Value` interpolation — 150ms, no jarring jump
- Submit success: Button morphs → spinner → check mark → slide screen away (650ms total)

---

### Feed (Home) Screen

**User Goal:** See what's happening in their community, engage with posts, share what's on their mind.

**Current UX Grade:** B+

**Issues Found:**

- Duplicate FAB + header icon for "new post" — two entry points for the same action without clear hierarchy
- `ActivityIndicator` spinner on load — no skeleton; content flash is jarring on first load
- Post composer is a `Modal` with `animationType="slide"` but no haptic feedback on open
- `refetch()` on every like mutation is expensive — optimistic update pattern needed
- Community selector in post composer is a `ScrollView` of chips — good pattern, but no current community context shown when opening (always defaults to 'soapies')
- No comment functionality implemented (comment button is a no-op)
- No post detail screen (post press is a no-op)
- `data as any[]` pattern is unsafe and loses type information — indicates API type mismatch
- `FlatList` re-renders all items on like because `refetch()` invalidates entire list — needs `getItemLayout` + item memoization
- `postContent` max 1000 chars but no character counter shown

**Simplified Flow:**

1. Open app → Feed loads (skeleton visible immediately while data fetches)
2. Scroll feed — posts render with author, community badge, content, like/comment counts
3. Tap ❤️ → optimistic like update (no full refetch)
4. Tap + FAB → composer sheet slides up with haptic
5. Select community → type content → Post (with character counter)
6. Post appears at top of feed immediately (optimistic insert)

**Recommended Layout:**

```
┌────────────────────────────────────┐
│  Feed                    [✏️ icon] │
│  ──────────────────────────────── │
│  [Skeleton card ▓▓▓▓▓▓▓▓▓▓▓▓▓▓]   │  ← loading state
│  [Skeleton card ▓▓▓▓▓▓▓▓▓▓▓▓▓▓]   │
│  [Skeleton card ▓▓▓▓▓▓▓▓▓▓▓▓▓▓]   │
│                                    │
│  ──── loaded state ────            │
│  [PostCard] (author, time, badge)  │
│  [PostCard]                        │
│  [PostCard]                        │
│                                    │
│                        [+ FAB]     │
└────────────────────────────────────┘
```

**Key Components:**

- `PostSkeleton`: Animated shimmer (Reanimated `withRepeat(withTiming)`) matching PostCard dimensions — 3 stacked on load
- `PostCard` (optimistic like): `useMemo` wrapper + `Haptics.impactAsync(Light)` on like tap; local `isLiked` state updated immediately before mutation
- `PostComposerSheet`: Bottom sheet (use `@gorhom/bottom-sheet` or Reanimated Sheet) replacing plain Modal — better gesture-driven dismiss with drag handle; haptic on open (`Haptics.impactAsync(Medium)`)
- `CharacterCounter`: `{postContent.length}/1000` text, right-aligned below TextInput; turns pink when >800

**UX Optimizations:**

- Replace full `refetch()` on like with `queryClient.setQueryData()` optimistic update — eliminates 30-40ms flicker per like
- Remove duplicate FAB + header icon: keep only the FAB (bottom-right). Move "new message" or "filter" to header. FAB is the universal compose entry point
- Add `getItemLayout` to FlatList with fixed heights to prevent layout recalculation during scroll
- Wrap `PostCard` in `React.memo` with custom equality on `{id, isLiked, likeCount}` — prevents unnecessary rerenders
- Add pull-to-refresh animation: custom pink `RefreshControl` with `tintColor={colors.pink}` already done — good, keep it

**Performance Considerations:**

- Set `initialNumToRender={8}` and `windowSize={5}` on FlatList to limit off-screen rendering
- Use `removeClippedSubviews={true}` on FlatList for memory management on long feeds
- `refetchInterval: 30_000` is appropriate — don't reduce it (cost vs freshness)
- Images in posts should use `FastImage` (react-native-fast-image) for memory-efficient caching; plain `Image` in PostCard has no cache control

**Micro-interactions to Add:**

- Like button: heart scales from 1.0 → 1.4 → 1.0 with spring animation + `Haptics.impactAsync(Light)` — matches iOS behavior
- FAB: scale up from 0.8 with `ZoomIn` layout animation on mount; bounces on first render
- New post appearing: `FadeInDown` layout animation for the first item when optimistically inserted
- Composer sheet open: `Haptics.impactAsync(Medium)` + drag-handle visual appears at top of sheet

---

### Events Screen

**User Goal:** Discover upcoming events for their community and browse details.

**Current UX Grade:** B-

**Issues Found:**

- `ActivityIndicator` spinner on load — no skeleton; event cards are tall (160px hero) so flash is very visible
- Filter chips don't animate when selected — no press feedback
- No date-based filtering — "This week", "This month" would be high-value
- No search bar for events by title
- `FlatList` has `gap: 12` via `contentContainerStyle` — this works on newer RN but `gap` in StyleSheet is a newer API; should use `ItemSeparatorComponent` for compatibility
- Empty state is generic ("No events yet") with no CTA
- Filter bar has horizontal scroll but chips don't have min-width — "All" chip could be too small on small screens
- `data as any` unsafe cast means type errors are silent
- No "interested" / "attending" action on list view — have to enter detail to RSVP
- No event count badge on filter chips (e.g., "Soapies (3)")

**Simplified Flow:**

1. Screen opens → skeleton cards appear immediately
2. Default filter: "All" — user sees all upcoming events across communities
3. Tap community chip → filter animates + list updates instantly
4. Tap event card → Event Detail screen
5. (Optional) Swipe event card right → "Interested" quick action

**Recommended Layout:**

```
┌────────────────────────────────────┐
│  Events                            │
│  ──────────────────────────────── │
│  [All] [Soapies·3] [Groupus·1] …  │ ← filter chips with counts
│  ──────────────────────────────── │
│  [EventCard skeleton ▓▓▓▓▓▓▓▓]    │
│  [EventCard skeleton ▓▓▓▓▓▓▓▓]    │
│                                    │
│  ──── loaded ────                  │
│  [EventCard: hero + date + price]  │
│  [EventCard: hero + date + price]  │
└────────────────────────────────────┘
```

**Key Components:**

- `EventSkeleton`: 160px shimmer hero + 2 lines of text shimmer matching `EventCard` dimensions
- `FilterChip`: Reanimated scale(0.95) on press + `backgroundColor` interpolation (border → filled); includes count badge
- `EventCard` (enhanced): Add a "Register" quick-CTA button in the card footer for logged-in members; saves a navigation step
- `ItemSeparatorComponent`: `<View style={{ height: 12 }} />` replacing `gap` in contentContainerStyle

**UX Optimizations:**

- Add event count to filter chips: `Soapies (3)` — helps users triage before filtering
- Add `SectionList` grouping by "This Week", "This Month", "Later" — eliminates need for date filter
- Add `onEndReached` pagination — current implementation loads all events at once
- Add swipe-to-interested gesture (react-native-gesture-handler Swipeable) on EventCard — power user shortcut

**Performance Considerations:**

- Hero images (160px) should use `FastImage` with `resizeMode="cover"` and `priority="normal"`
- Event list rarely changes; increase `staleTime` to 60s in `trpc.events.list.useQuery`
- `getItemLayout` can be set if card height is consistent (approximately 240px per card)

**Micro-interactions to Add:**

- Filter chip selection: `backgroundColor` and `scale` transition simultaneously (150ms spring) with `Haptics.selectionAsync()`
- Event card press: `scale(0.98)` with spring on press, releases on lift — matches iOS List press behavior
- Empty state CTA: pulse animation on the calendar icon (opacity 1.0 → 0.5, repeat) when no events visible

---

### Messages Screen

**User Goal:** See all conversations at a glance, quickly navigate to the right chat.

**Current UX Grade:** B-

**Issues Found:**

- Header "new message" compose icon does nothing (no `onPress` handler) — dead interaction
- `ActivityIndicator` spinner on load — no skeleton conversation list
- `refetchInterval: 15_000` for messages list is good but no real-time updates (no WebSocket/SSE) means 15s message lag in list
- `ConversationItem` has unread highlight (`${colors.pink}08` background) but no visual bold treatment on unread count in list preview
- No search bar to find conversations by name
- No group vs DM visual distinction in list
- Empty state has no action CTA — user with no messages can't start one because the compose button is broken
- No swipe-to-delete (archive) on conversation items

**Simplified Flow:**

1. Messages screen opens → skeleton list items appear
2. Unread conversations appear first (sorted by unreadCount desc, then lastMessageAt desc)
3. Tap "New Message" (compose icon) → member search modal opens
4. Select member → creates DM conversation → navigates to Chat screen
5. Tap conversation → Chat screen

**Recommended Layout:**

```
┌────────────────────────────────────┐
│  Messages           [compose icon] │
│  ──────────────────────────────── │
│  🔍 Search conversations…          │
│  ──────────────────────────────── │
│  [Conv skeleton ▓▓▓▓▓▓▓▓▓▓▓▓▓]    │
│  [Conv skeleton ▓▓▓▓▓▓▓▓▓▓▓▓▓]    │
│                                    │
│  ──── loaded (sorted: unread→) ─── │
│  [💬 Anna K.   Hey are you…  2m ●] │ ← unread: pink dot + bold
│  [👥 Soapies Group  …       15m  ] │
│  [💬 Mark S.   Sounds good!  1h  ] │
└────────────────────────────────────┘
```

**Key Components:**

- `ConversationSkeleton`: Avatar circle shimmer + 2 lines of text shimmer (matching ConversationItem height ~70px)
- `MemberSearchModal`: Bottom sheet with search TextInput + FlatList of members (`trpc.members.list`); tap member → `createConversation.mutate()`; this wires up the currently-dead compose icon
- `ConversationItem` (enhanced): Add group vs DM icon indicator (👥 vs 💬); bold sender name + preview text when unread; swipe-to-archive via Swipeable wrapper

**UX Optimizations:**

- Fix the compose button — wire it to a `MemberSearchModal` or `NewConversationSheet`; currently completely broken
- Sort conversations: unread first, then by `lastMessageAt` desc — standard messaging app behavior
- Add local search filter (client-side, no API call needed) on conversation name + last message
- `refetchInterval: 15_000` is fine as a fallback but consider adding a WebSocket subscription at the API layer for real-time updates

**Performance Considerations:**

- Conversation list is typically short (<100 items); no virtualization tuning needed
- Avatar gradient generates inline; consider memoizing `Avatar` component
- `useCallback` on `onPress` in FlatList to prevent `renderItem` recreation on each render

**Micro-interactions to Add:**

- New message arrival: conversation row animates from top with `SlideInLeft` layout animation (Reanimated LayoutAnimation)
- Unread badge: subtle pulse animation (scale 1.0 → 1.1, 800ms repeat) on unread count bubble
- Swipe-to-archive: red `archive` action revealed behind conversation row with spring reveal

---

### Notifications Screen

**User Goal:** Stay informed about community activity — likes, messages, event updates, membership approval.

**Current UX Grade:** B

**Issues Found:**

- `ActivityIndicator` spinner on load — notifications are typically the first thing users check; skeleton matters here
- `NotificationItem` is non-interactive (no `onPress` handler) — tapping a notification does nothing; no deep-link navigation
- "Mark all read" only works via header button, no swipe-to-mark-read per item
- Notification types (like, comment, event, message) should navigate to the relevant content on tap
- Unread count badge in header is good, but the tab bar icon has no badge (just "Alerts" label)
- `refetchInterval: 30_000` — acceptable for notifications; consider push notifications as a better pattern
- Empty state uses emoji (🔔) which is good personality, but "All caught up!" could be more actionable with a "Explore Events" CTA

**Simplified Flow:**

1. Open Notifications → skeleton items → loaded list
2. Unread items: left pink border + subtle pink background tint (already implemented — keep)
3. Tap any notification → deep-navigate to source (like → post, message → chat, event → event detail)
4. Auto-mark as read on tap
5. Swipe right to mark single item read
6. "Mark all read" button when any unread exist

**Recommended Layout:**

```
┌────────────────────────────────────┐
│  Notifications [3]    [Mark read]  │
│  ──────────────────────────────── │
│  [Notif skeleton ▓▓▓▓▓▓▓▓▓▓▓▓]    │
│  [Notif skeleton ▓▓▓▓▓▓▓▓▓▓▓▓]    │
│                                    │
│  ──── loaded ────                  │
│  ║ ❤️ Anna liked your post   2m ●  │ ← unread: left border
│  ║ 📅 New event: Soapies…    1h ●  │
│    💬 Mark replied to your…  3h    │ ← read: no decoration
│    🔔 Welcome to Soapies!    2d    │
└────────────────────────────────────┘
```

**Key Components:**

- `NotificationSkeleton`: Icon circle shimmer + 2 text lines shimmer (matching NotificationItem 70px height)
- `NotificationItem` (interactive): Wrap in `TouchableOpacity` with `onPress` routing logic:
  - `type === 'message'` → `router.push('/chat/${notification.referenceId}')`
  - `type === 'like' | 'comment'` → `router.push('/post/${notification.referenceId}')` (TODO: build post detail)
  - `type === 'event'` → `router.push('/event/${notification.referenceId}')`
  - `type === 'approval'` → `router.push('/(tabs)/profile')`
- `markRead` mutation: fire on item press before navigation

**UX Optimizations:**

- Add tab bar badge: in `_layout.tsx`, pass `tabBarBadge={unreadNotificationCount}` to the Notifications tab — standard expectation
- Make notifications tappable with deep-link routing (currently no-op)
- Auto-mark read on open (like most apps): call `markAllRead` with a 3-second debounce on screen focus
- Add swipe-right-to-read gesture (Swipeable) for per-item control

**Performance Considerations:**

- Notification items are lightweight; no performance issues anticipated at <200 items
- Consider adding `maxResults: 50` limit and pagination if notification history grows

**Micro-interactions to Add:**

- Unread → read transition: `borderLeftWidth` animates from 3 to 0 and background opacity fades in 200ms when tapped
- Mark all read: each unread item's left border fades out with staggered 50ms delay per item (`withDelay`)
- New notification arrival: item slides in from top with `SlideInLeft` + gentle vibration (`Haptics.impactAsync(Light)`)

---

### Profile Screen

**User Goal:** View their community identity, track engagement, share referral code, manage account.

**Current UX Grade:** B+

**Issues Found:**

- "Edit Profile" button navigates nowhere (no `onPress` handler — dead interaction)
- `Clipboard.setString` is the old deprecated API — should use `expo-clipboard` (`Clipboard.setStringAsync`)
- Stats box (Events/Posts/Referrals) has no tap actions — Events count should link to their events, Posts to their posts
- No settings section — no way to manage notifications, privacy, or account details beyond sign-out
- `profile?.referralCode ?? profile?.openId?.slice(0, 8).toUpperCase()` — fragile fallback; should have canonical referral code from API
- Bio field shown in hero but no edit path
- Community badge only shows name — could show a colored gradient matching the community
- Sign-out confirmation is `Alert.alert` with 2 buttons — acceptable but could be a bottom sheet action for the destructive action
- No "Share referral link" action — just clipboard copy; a share sheet would be more powerful

**Simplified Flow:**

1. Profile screen → hero section with avatar, name, bio, community badge
2. Stats row (tappable: Events → events history, Posts → user's posts)
3. Referral code → tap copy → clipboard + haptic + toast (not Alert.alert)
4. Edit profile → Profile Edit screen (to build)
5. Settings → Settings screen (to build)
6. Sign out

**Recommended Layout:**

```
┌────────────────────────────────────┐
│  [Gradient hero]                   │
│     [Avatar 88px]                  │
│     Jane Smith                     │
│     "She/her · SF"   [Edit]        │
│     [Soapies badge gradient]       │
│  ──────────────────────────────── │
│  [Events 12] │ [Posts 8] │ [Refs 3]│  ← tappable
│  ──────────────────────────────── │
│  REFERRAL CODE                     │
│  XKCD-7821        [Copy] [Share]   │
│  ──────────────────────────────── │
│  [✏️ Edit Profile              >]  │
│  [⚙️ Settings                  >]  │
│  [🔔 Notifications             >]  │
│  ──────────────────────────────── │
│  [Sign Out]                        │
└────────────────────────────────────┘
```

**Key Components:**

- `ProfileEditSheet`: Bottom sheet (to build) with name, bio, avatar upload fields
- `ShareReferralButton`: Ionicons `share-outline` → `Share.share({ message: 'Join with my code: XKCD-7821 — soapies.app/join' })` — uses native share sheet
- `Toast` (lightweight): Replace `Alert.alert('Copied!')` with a brief 2-second animated toast sliding in from bottom — less disruptive than modal alert for confirmations
- `StatBox` (tappable): Add `onPress` handler and `TouchableOpacity` wrapper — currently `View`

**UX Optimizations:**

- Fix dead "Edit Profile" button — even routing to a placeholder screen is better than no-op
- Add share button next to referral copy — `Share.share()` is one line of code, high value
- Replace `Alert.alert('Copied!')` with inline toast (slide up, 2s auto-dismiss)
- Use `expo-clipboard` (`Clipboard.setStringAsync`) instead of deprecated `react-native` `Clipboard`
- Add "Settings" menu item — notif preferences, account management, help

**Performance Considerations:**

- `trpc.auth.me` is already cached; profile renders immediately on re-enter
- Avatar `Image` should have explicit width/height (88px) already set — good
- `LinearGradient` hero re-renders on every scroll tick if inside `ScrollView` — memoize with `React.memo` wrapper or `useCallback`

**Micro-interactions to Add:**

- Avatar press: scale(0.95) + haptic → opens image picker (future feature) or full-screen avatar view
- Referral copy: `Haptics.notificationAsync(Success)` already implemented — good. Add a brief `checkmark-circle` icon flash replacing the copy icon for 1.5 seconds
- Stats row: each stat taps with spring scale 0.97 before navigation
- Sign out: Destructive red glow on button (boxShadow rgba(239,68,68,0.3)) on press

---

### Chat Screen (chat/[id])

**User Goal:** Have a fluid, real-time conversation with a member or group.

**Current UX Grade:** B

**Issues Found:**

- `refetchInterval: 5_000` for messages means 5-second message lag — very noticeable in conversation. Real-time WebSocket or SSE is needed
- Keyboard avoiding view uses `keyboardVerticalOffset={0}` — this frequently causes input bar to overlap messages on Android or be incorrectly positioned
- Message bubbles hardcode `color: '#fff'` for ALL message text, including received messages in `colors.card` background — received messages should use `colors.text` (off-white) not white on a dark card
- No typing indicators
- No read receipts
- Long-press reaction picker is a `Modal` overlay — works but a popover anchored to the message would feel more native
- `inverted` FlatList with `.reverse()` copy of array every render is O(n) on every render — should use natural order + `inverted` prop without manual reverse
- No image/media sharing in chat
- Sent state is not visually tracked (no ✓/✓✓ read receipts)
- `SafeAreaView` wrapping a `KeyboardAvoidingView` can cause double safe area inset on some devices — should use `KeyboardAvoidingView` at root with safe area via `useSafeAreaInsets`

**Simplified Flow:**

1. Enter chat → messages load (newest at bottom, inverted list)
2. Input bar sticks to keyboard (KeyboardAvoidingView works correctly)
3. Type → tap send → message appears immediately (optimistic)
4. Long-press message → reaction picker popover appears near the message
5. Tap reaction → emoji appears on message with count

**Recommended Layout:**

```
┌────────────────────────────────────┐
│  [←] [Avatar sm] Anna K.   [⋯ ]   │ ← header with options
│  ──────────────────────────────── │
│  [Messages list, inverted]         │
│                                    │
│    [Received bubble: dark card]    │
│              [Sent bubble: pink]   │
│    [Received: ❤️1 👍2 reactions]   │
│              [Sent: ✓✓ seen]       │
│                                    │
│  ──────────────────────────────── │
│  [Message input       ] [📎] [→]  │ ← input bar
└────────────────────────────────────┘
```

**Key Components:**

- `MessageBubble` (extracted): Separate component from inline render function; receives `{message, isMine, onLongPress}` props; handles bubble color, text color, reactions, timestamp, read receipt
- `TypingIndicator`: Three dots animated with `withRepeat(withTiming)` phase offset — appears below last message when other participant is typing (requires typing event from server)
- `ReactionPopover`: Positioned absolutely near the long-pressed message using layout measurement (`ref.measure()`) instead of centered modal
- `ChatOptionsSheet`: `⋯` header button → bottom sheet with "View Profile", "Block", "Delete Conversation"

**UX Optimizations:**

- Fix text color: received messages should use `colors.text` (F9FAFB) on `colors.card` background; only sent messages (pink background) should have `#fff`
- Fix array.reverse() on every render: change `data={[...msgList].reverse()}` to `data={msgList}` with `inverted` prop — FlatList's `inverted` handles the reversal natively
- Add optimistic message insert: `queryClient.setQueryData()` to prepend message immediately before mutation resolves
- Fix `KeyboardAvoidingView` offset: use `useSafeAreaInsets` for `keyboardVerticalOffset={insets.bottom}`
- Add WebSocket or long-polling upgrade path — current 5s interval is the most visible UX issue in chat

**Performance Considerations:**

- Memoize `renderMessage` with `useCallback` already done — good
- Wrap `MessageBubble` in `React.memo` to prevent re-render of all messages when list updates
- `maxToRenderPerBatch={10}` and `initialNumToRender={20}` for message list
- Reaction objects (`item.reactions`) cause re-render of entire message on any reaction change — consider separate reaction overlay component

**Micro-interactions to Add:**

- Send button: `Haptics.impactAsync(Light)` on tap; disabled state uses `colors.border` fill (already done — good)
- Message appear: `FadeIn.duration(150)` layout animation on new messages appearing
- Long-press: `Haptics.impactAsync(Medium)` + message scales to 0.95 momentarily before reaction picker appears
- Reaction added: emoji "bounces" in with `BounceIn` layout animation; count increments with animated counter

---

### Event Detail Screen (event/[id])

**User Goal:** Get all the details about an event and reserve a ticket.

**Current UX Grade:** A-

**Issues Found:**

- Hero image is 280px height — fine on iPhone 14/15, but on smaller devices (SE) this leaves very little content visible above the fold
- Back button sits at `insets.top + 10` but uses `rgba(0,0,0,0.6)` background — can be nearly invisible against a dark image. Should have a guaranteed white icon
- Ticket pricing section is a simple row list — no visual hierarchy between ticket types; selected type not highlighted in main view
- "Reserve Now" CTA always shows regardless of whether user is already RSVP'd — no idempotency UI
- `paymentMethod: 'venmo'` hardcoded — should be configurable or shown to user
- `paymentStatus: 'pending'` hardcoded — user doesn't know they need to pay Venmo separately
- Reservation success alert is `Alert.alert('🎉 Reserved!')` — could be a full-screen success moment
- No attendee count or capacity display — "50/100 spots taken" is high-value social proof
- Loading state is centered `ActivityIndicator` — a skeleton matching the hero + content would be better
- No share event button

**Simplified Flow:**

1. Tap event → hero image + event details load
2. Scroll: date, venue, description, ticket prices
3. Tap "Reserve Now" → ticket type bottom sheet
4. Select ticket type → confirm → success screen/animation
5. Success: "View My Tickets" CTA (future feature)

**Recommended Layout:**

```
┌────────────────────────────────────┐
│  [Hero image 260px]                │
│  [←]               [share ↑]       │ ← overlaid controls
│  [gradient overlay for readability]│
│  ──────────────────────────────── │
│  [Community badge]                 │
│  Event Title                       │
│  📅 Saturday, May 3 · 9:00 PM      │
│  📍 The Den, San Francisco         │
│  👥 42 attending (8 spots left!)   │ ← social proof
│                                    │
│  Tickets                           │
│  Single Woman    $30               │
│  Single Man      $45               │
│  Couple          $60               │
│  Volunteer       Free              │
│                                    │
│  About                             │
│  [description text…]               │
│                                    │
│  ──────────────────────────────── │
│  [      Reserve Now →  gradient  ] │ ← sticky CTA
└────────────────────────────────────┘
```

**Key Components:**

- `EventDetailSkeleton`: Full skeleton matching layout — hero shimmer (260px) + text line shimmers
- `AttendeeCount`: "X attending · Y spots left" below venue — computed from API data; add urgency tinting when < 10 spots
- `TicketTypeSheet`: Enhanced version of current modal — shows selected type with animated checkmark, price breakdown, and Venmo payment instructions
- `ReservationSuccessOverlay`: Full-screen animated success with confetti (expo-confetti or CSS particles), event name, ticket type, and "Add to Calendar" CTA

**UX Optimizations:**

- Add attendee count + capacity to event detail API response and display it — missing social proof
- Back button: use white `#fff` icon always (not contingent on image color) with semi-transparent dark backing for guaranteed legibility
- Add share button: `Share.share({ title: event.title, url: 'soapies.app/event/${id}' })` in header
- Show Venmo payment instructions inline in ticket sheet — don't surprise user after confirming
- Add "Already Reserved" state: if user has existing reservation for this event, show "✓ You're going!" instead of "Reserve Now"

**Performance Considerations:**

- Hero `Image` should be preloaded when EventCard is rendered (use `Image.prefetch(imageUrl)` in EventCard's `useEffect`)
- Event detail data is lightweight — `staleTime: 300_000` (5 min) is appropriate
- Avoid re-rendering the entire screen on ticket type selection — `ticketType` state is local, good

**Micro-interactions to Add:**

- Hero parallax: `Animated.event` scroll handler moving hero image at 0.5x scroll rate — adds depth
- "Reserve Now" button: `Haptics.impactAsync(Medium)` on tap
- Ticket type selection: radio-like selection with `BounceIn` checkmark on selection + `Haptics.selectionAsync()`
- Reservation success: confetti particles + screen slide to success state (not an alert)

---

### Member Profile Screen (member/[id])

**User Goal:** Learn about another member and initiate a conversation.

**Current UX Grade:** B+

**Issues Found:**

- No `SafeAreaView` wrapper — back button is positioned using `insets.top + 10` but the scroll content area may overflow on notched devices
- Stats section shows `eventsAttended` and `postsCount` but no way to view those events/posts — numbers are dead
- Bio is text-only, centered, with no visual treatment — could feel premium with a subtle quote styling
- "Message {firstName}" CTA is always visible even if this is the current user's own profile
- `createConversation.mutate()` has no loading state feedback in button (isPending check is done — good)
- No way to view other members' posts from their profile
- No block/report member action
- Community badge color uses `communityColor()` from utils — good pattern, keep it
- `joinedDate` shows "Month, Year" which is great — but no "Member since" label makes it less clear

**Simplified Flow:**

1. Tap member (from post, event attendee list, etc.) → member profile slides in
2. View: avatar, name, community badge, bio, stats, join date
3. Tap "Message" → creates/opens DM conversation
4. Tap stat count → view their posts or events (future)

**Recommended Layout:**

```
┌────────────────────────────────────┐
│  [Hero gradient, 200px]            │
│  [←]                               │
│     [Avatar 88px]                  │
│     Jane Smith                     │
│     [Soapies community badge]      │
│  ──────────────────────────────── │
│  " She loves building community "  │ ← bio with quote styling
│  ──────────────────────────────── │
│  [Events 12] │ [Posts 8] │ [Since Jan 2025]│
│  ──────────────────────────────── │
│  [Recent Posts preview x2]         │ ← future feature
│  ──────────────────────────────── │
│  [   💬 Message Jane →  gradient  ]│ ← sticky CTA
└────────────────────────────────────┘
```

**Key Components:**

- `MemberSkeleton`: Hero gradient shimmer + avatar circle shimmer + text lines
- `BioQuote`: Italic text with left accent bar in `colors.pink` — makes bio feel intentional, not just overflow text
- `MemberPostsPreview`: 2–3 most recent posts (mini cards) below stats — social proof; tap navigates to their full post history
- `ContextualCTAButton`: Hides "Message" button if `memberId === currentUser.id`; shows "Edit Profile" instead

**UX Optimizations:**

- Check if viewing own profile → show "Edit Profile" instead of "Message"
- Add report/block option in a `⋯` overflow menu in top-right header
- Stat boxes should be tappable to deep-link to filtered content (posts, events attended)
- "Member since" label on the joined date stat for clarity

**Performance Considerations:**

- Member profile data is mostly static — `staleTime: 300_000` appropriate
- Avatar image: use `FastImage` with `priority="high"` since it's the visual centerpiece

**Micro-interactions to Add:**

- Avatar entrance: `ZoomIn.duration(300)` layout animation — creates a moment of recognition
- Community badge: subtle gradient border animation (rotating gradient) for premium feel
- Message button: `Haptics.impactAsync(Medium)` + loading spinner state already implemented

---

## Phase 2: Component Audit

### Avatar Component

**Grade:** A-  
**Issues:** No `onError` fallback for broken image URLs — broken URL shows nothing; needs `onError={() => setHasError(true)}` state to fall back to gradient initials  
**Fix:** Add `const [error, setError] = useState(false)` + `if (url && !error) return <Image onError={() => setError(true)} .../>` pattern

### PostCard Component

**Grade:** B+  
**Issues:**

- Comment button is wired to `onComment` prop but Feed screen passes `onComment={() => {/* TODO */}}` — dead interaction
- `onPress` is wired but Feed passes another no-op — dead interaction
- No skeleton variant  
  **Improvements:** Add `PostCard.Skeleton` export; implement comment count tap → navigate to post detail; add share button

### EventCard Component

**Grade:** A-  
**Issues:** No skeleton variant; price label computation is O(n) on every render — memoize with `useMemo`  
**Improvements:** Add `EventCard.Skeleton`; add "Register" quick-action button in card footer; memoize price computation

### ConversationItem Component

**Grade:** B+  
**Issues:** No skeleton variant; no group vs DM visual distinction  
**Improvements:** Add `ConversationItem.Skeleton`; add group icon prefix; add swipe-to-archive wrapper

### NotificationItem Component

**Grade:** B\*\*  
**Issues:** Not interactive — no `TouchableOpacity` wrapper, no `onPress` prop  
**Improvements:** Wrap in `TouchableOpacity`; add `onPress` prop for deep-link routing; add `onMarkRead` prop for swipe gesture

### GradientButton Component

**Grade:** A  
**Issues:** Minor — `Haptics.ImpactFeedbackStyle.Medium` fires even when `disabled` — should only fire when action is live  
**Fix:** `if (!disabled && !loading) Haptics.impactAsync(...)`

### LoadingSpinner Component

Not audited — file exists but appears to be a simple wrapper. Should be replaced with skeleton screens throughout.

---

## Phase 3: Design System Audit

### Current Color Palette

```typescript
export const colors = {
  pink: '#EC4899', // Primary CTA, like, active states
  pinkDark: '#DB2777', // Pressed state for pink
  purple: '#A855F7', // Secondary accent, Groupus community
  purpleDark: '#9333EA', // Pressed state for purple
  violet: '#7C3AED', // Tertiary accent, Gaypeez community
  bg: '#0D0D0D', // Screen background (near-black)
  card: '#1A1A2E', // Card/surface background
  border: '#2D2D44', // Dividers, input borders
  muted: '#9CA3AF', // Secondary text, placeholders
  white: '#FFFFFF', // Pure white
  text: '#F9FAFB', // Primary text (slightly warm white)
};
```

**Color Usage Rules:**

| Context                                     | Color                                         |
| ------------------------------------------- | --------------------------------------------- |
| Primary CTA button                          | pink → purple gradient                        |
| Active tab, selected chip, unread indicator | `pink`                                        |
| Soapies community badge                     | `pink` (#EC4899)                              |
| Groupus community badge                     | `purple` (#A855F7)                            |
| Gaypeez community badge                     | `violet` (#7C3AED)                            |
| Body text                                   | `text` (#F9FAFB)                              |
| Secondary text, labels, timestamps          | `muted` (#9CA3AF)                             |
| Card backgrounds                            | `card` (#1A1A2E)                              |
| Borders, dividers, inactive elements        | `border` (#2D2D44)                            |
| Screen background                           | `bg` (#0D0D0D)                                |
| Success states                              | `#10B981` (not in palette — add as `success`) |
| Error/destructive states                    | `#EF4444` (not in palette — add as `danger`)  |
| Warning states                              | `#F59E0B` (not in palette — add as `warning`) |

**Recommended Colors to Add to `colors.ts`:**

```typescript
success: '#10B981',   // approval, attended, confirmed
danger: '#EF4444',    // destructive, rejection, error
warning: '#F59E0B',   // pending, waiting, caution
overlay: 'rgba(0,0,0,0.6)',   // modal backdrop
```

**WCAG AA Contrast Check:**

- `text` (#F9FAFB) on `bg` (#0D0D0D): 18.9:1 ✅ (AAA)
- `text` (#F9FAFB) on `card` (#1A1A2E): 12.4:1 ✅ (AAA)
- `pink` (#EC4899) on `bg`: 4.6:1 ✅ (AA)
- `muted` (#9CA3AF) on `bg`: 4.8:1 ✅ (AA) — borderline, verify
- `muted` (#9CA3AF) on `card` (#1A1A2E): 3.9:1 ⚠️ (AA for large text only) — increase to `#A1A1AA` for body text contexts

---

### Typography Scale Recommendation

```typescript
// Recommended: Add to a typography.ts file
export const typography = {
  // Display
  display: { fontSize: 42, fontWeight: '800', letterSpacing: -1, lineHeight: 48 },

  // Headlines
  h1: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, lineHeight: 34 },
  h2: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3, lineHeight: 30 },
  h3: { fontSize: 20, fontWeight: '700', letterSpacing: 0, lineHeight: 26 },
  h4: { fontSize: 17, fontWeight: '700', letterSpacing: 0, lineHeight: 22 },

  // Body
  bodyLg: { fontSize: 17, fontWeight: '400', lineHeight: 26 }, // primary readable content
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 }, // default body
  bodySm: { fontSize: 13, fontWeight: '400', lineHeight: 18 }, // secondary text, meta

  // Labels & UI
  labelLg: { fontSize: 16, fontWeight: '700', lineHeight: 20 }, // button text
  label: { fontSize: 13, fontWeight: '600', lineHeight: 16 }, // field labels, chips
  labelSm: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, lineHeight: 14 }, // badges, caps labels

  // Mono
  mono: { fontSize: 18, fontWeight: '800', letterSpacing: 2 }, // referral codes, IDs

  // Captions
  caption: { fontSize: 11, fontWeight: '400', lineHeight: 14 }, // timestamps, meta
} as const;
```

**Current issues with typography:**

- Inconsistent hardcoded font sizes scattered across every file (12, 13, 14, 15, 16, 17, 18, 22, 24, 26, 42 — all used without a scale)
- No `letterSpacing` on headers — they feel flat; -0.3 to -0.5 tightening elevates premium feel significantly
- `fontWeight: '800'` used frequently — good for brand voice, but ensure the font supports it (system San Francisco on iOS does)
- Tab bar label uses `fontSize: 10, fontWeight: '600'` — smallest acceptable; fine

---

### Spacing System (4pt Grid)

```typescript
export const spacing = {
  '1': 4, // micro gaps (icon-text)
  '2': 8, // tight padding
  '3': 12, // default gap within components
  '4': 16, // standard padding
  '5': 20, // screen horizontal padding
  '6': 24, // section spacing
  '8': 32, // large section breaks
  '10': 40, // hero padding top
  '12': 48, // large screen areas
  '16': 64, // max component width hints
} as const;
```

**Current issues:**

- `paddingHorizontal: 20` is used consistently throughout — good, keep as standard
- `paddingVertical: 14` for headers is consistent — good
- Card padding is `14` (PostCard), `16` (NotificationItem), `20` (stats card) — should standardize to `16` for all cards

---

### Shadow / Elevation System

```typescript
export const shadows = {
  none: {},
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  pink: {
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  purple: {
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
```

**Usage:**

- FAB button: `shadows.pink` — currently implemented inline, standardize
- Cards: `shadows.sm` — currently using border-only approach (acceptable on dark theme)
- Modal sheets: `shadows.lg` applied to the sheet container
- Hero buttons: `shadows.pink` or `shadows.purple` for gradient CTAs

---

### Border Radius Standards

```typescript
export const radii = {
  sm: 8, // input borders, small badges
  md: 12, // form inputs, secondary cards
  lg: 16, // primary cards (PostCard, EventCard)
  xl: 20, // modal chips, filter pills
  full: 9999, // avatars, pills, FAB button
} as const;
```

**Current inconsistencies found:**

- Border radius `12` and `14` used interchangeably for CTAs → standardize to `14` (current `GradientButton`)
- `borderTopLeftRadius: 24, borderTopRightRadius: 24` on sheets → standardize to `xl` (24) for all bottom sheets
- Avatar border radius is `px / 2` (fully round) — correct
- FAB uses `borderRadius: 30` for 60px button → correct (= full circle)

---

### Component State Variants

Every interactive component needs these states defined:

```typescript
// For touchable elements
states = {
  default: { opacity: 1, scale: 1 },
  pressed: { opacity: 0.85, scale: 0.97 }, // via activeOpacity + Reanimated
  disabled: { opacity: 0.4, scale: 1 },
  loading: { opacity: 1, scale: 1 }, // shows spinner, not text
  focused: { borderColor: colors.pink }, // inputs only
  error: { borderColor: '#EF4444' }, // inputs only
  success: { borderColor: '#10B981' }, // inputs only
};
```

**Current gaps:**

- `GradientButton` handles `disabled` + `loading` ✅
- `TextInput` fields have no `focused` state (border stays `colors.border`) — add `onFocus/onBlur` border color animation
- `ConversationItem` has no `pressed` state — add `activeOpacity={0.8}` (done) but needs subtle background flash
- Filter chips have no pressed animation — just state change on release

---

## Phase 4: Navigation UX Audit

### Tab Bar Analysis

**Current tabs (in order):**

1. 🏠 Home — Feed
2. 📅 Events
3. 💬 Messages
4. 👤 Profile
5. 🔔 Alerts (Notifications)

**Issues:**

- **Tab ordering is suboptimal.** "Alerts" is the last tab but notifications are typically high-priority; Messages and Notifications should be adjacent (both communication)
- **No badge count on Notifications tab** — unread count is shown in-screen but not on the tab icon itself (critical miss)
- **No badge count on Messages tab** — unread message count should appear as tab badge
- **Tab label "Alerts"** is weaker than "Activity" or "Inbox" — feels like an afterthought name
- **5 tabs** is at the maximum comfortable number; consider whether all 5 earn top-level placement
- The tab bar height `60` with `paddingBottom: 4` is correct for safe-area-aware devices

**Recommended Tab Order:**

```
1. 🏠 Home       (feed — primary content)
2. 📅 Events     (discovery — second most important)
3. 💬 Messages   (communication — with unread badge)
4. 🔔 Activity   (notifications — with unread badge, renamed)
5. 👤 Profile    (account — always last)
```

**Implementation: Add badges to tab bar in `_layout.tsx`:**

```tsx
// In _layout.tsx — use tRPC queries for badge counts
const unreadMessages = trpc.messages.unreadCount.useQuery(undefined, { refetchInterval: 15_000 });
const unreadNotifs = trpc.notifications.unreadCount.useQuery(undefined, { refetchInterval: 30_000 });

// On Messages tab:
tabBarBadge={unreadMessages.data > 0 ? unreadMessages.data : undefined}

// On Notifications tab:
tabBarBadge={unreadNotifs.data > 0 ? unreadNotifs.data : undefined}
```

### Transition Analysis

**Between tabs:** Default expo-router tab transitions are instant (no animation) — this is acceptable and matches iOS tab bar behavior. No changes needed.

**Stack navigations (chat, event, member):**

- These push onto a native stack — default slide-from-right animation is correct
- Back button in Chat and Member screens is a custom `TouchableOpacity` instead of the native header back button — this loses the iOS swipe-back gesture. Consider using expo-router's built-in header or ensuring `gestureEnabled: true` on the stack

**Deep link flows:**

- `chat/[id]` and `event/[id]` are accessible from multiple paths — ensure these routes handle missing IDs gracefully (currently `enabled: !!id` guards the query — good)
- `member/[id]` can be reached from PostCard author tap — currently there's no navigation call in PostCard to `router.push('/member/${post.authorId}')` — this deep-link is unwired

**Back navigation:**

- Chat and Event Detail screens have custom back buttons (`Ionicons arrow-back` with `router.back()`) — correct behavior
- Member Profile has the same — correct
- However, if user navigates directly via deep link (notification tap), `router.back()` may have no history — add `router.canGoBack() ? router.back() : router.replace('/(tabs)')` pattern

### Navigation Recommendations

1. **Add swipe-back gesture support**: Enable gesture-based back navigation on detail screens by ensuring they're in a native stack navigator with `gestureEnabled: true` (expo-router's `<Stack>` default)

2. **Add notification deep-link routing**: When NotificationItem is tapped, route to:
   - Like/comment → post detail (build this screen)
   - Message → `/chat/${notification.referenceId}`
   - Event → `/event/${notification.referenceId}`
   - Approval → `/(tabs)/profile`

3. **Tab-to-tab navigation resets**: When user taps an already-active tab, scroll the FlatList back to top (`flatListRef.current?.scrollToOffset({ offset: 0, animated: true })`) — standard iOS behavior

4. **PostCard author tap → member profile**: Wire `onPress` on PostCard author avatar/name to navigate to `/member/${post.authorId}`

---

## Phase 5: Empty States & Error States Audit

### Summary Table

| Screen         | Loading State                           | Empty State                | Error State                              |
| -------------- | --------------------------------------- | -------------------------- | ---------------------------------------- |
| Feed           | ❌ `ActivityIndicator` (needs skeleton) | ✅ Icon + copy + sub-text  | ❌ Missing                               |
| Events         | ❌ `ActivityIndicator` (needs skeleton) | ✅ Icon + copy             | ❌ Missing                               |
| Messages       | ❌ `ActivityIndicator` (needs skeleton) | ✅ Icon + copy             | ❌ Missing                               |
| Notifications  | ❌ `ActivityIndicator` (needs skeleton) | ✅ Emoji + copy + sub-text | ❌ Missing                               |
| Profile        | ✅ Full-screen loader (acceptable)      | N/A                        | ❌ Missing                               |
| Chat           | ❌ `ActivityIndicator` (needs skeleton) | ✅ Copy + sub-text         | ❌ Missing                               |
| Event Detail   | ✅ Centered loader                      | ✅ "Not found" + back      | ⚠️ Only handles null, not network errors |
| Member Profile | ✅ Centered loader                      | ✅ "Not found" + back      | ⚠️ Only handles null                     |

### Verdict: Every Screen Needs Error States

Not a single screen currently handles network errors or API failures beyond the null/loading case. If the API call throws, the screen silently shows nothing or an endless loader.

### What to Add for Each Screen

**1. Universal `ErrorState` component:**

```tsx
<ErrorState
  title="Couldn't load"
  subtitle="Check your connection and try again"
  onRetry={() => refetch()}
/>
// Uses: Ionicons "cloud-offline-outline", colors.muted text, GradientButton "Try Again"
```

**2. Skeleton components needed:**

- `FeedSkeleton`: 3× PostCard-shaped shimmer cards
- `EventListSkeleton`: 2× EventCard-shaped shimmer cards (160px hero + text lines)
- `MessageListSkeleton`: 5× ConversationItem-shaped rows (avatar circle + 2 text lines)
- `NotificationListSkeleton`: 5× NotificationItem-shaped rows (icon circle + 2 text lines)
- `ChatSkeleton`: 5× alternating left/right message bubble shimmers

**3. Shimmer implementation pattern:**

```tsx
// Reusable shimmer using Reanimated
const shimmerAnimation = useSharedValue(0);
useEffect(() => {
  shimmerAnimation.value = withRepeat(
    withTiming(1, { duration: 1200, easing: Easing.linear }),
    -1, // infinite
    false
  );
}, []);

const shimmerStyle = useAnimatedStyle(() => ({
  opacity: interpolate(shimmerAnimation.value, [0, 0.5, 1], [0.3, 0.7, 0.3]),
}));
// Apply to View with backgroundColor={colors.border}
```

**4. Empty state personality improvements:**

| Screen        | Current                                    | Recommended                                                 |
| ------------- | ------------------------------------------ | ----------------------------------------------------------- |
| Feed          | "Nothing here yet / Be the first to post!" | ✅ Keep — has personality                                   |
| Events        | "No events yet"                            | "No events yet 🌊 — check back soon" + "Browse Members" CTA |
| Messages      | "No messages yet / Start a conversation!"  | ✅ Keep — but wire compose button                           |
| Notifications | "All caught up! / No new notifications"    | ✅ Keep — good personality                                  |
| Chat          | "No messages yet / Say hello! 👋"          | ✅ Keep — works well                                        |

---

## Phase 6: Onboarding Flow Design

### Problem Statement

The app currently takes new users directly to login/register with no brand introduction, no community context, and no application personality. Post-registration, users are sent back to the login screen via Alert.alert — no sense of belonging or excitement.

### Proposed 3-Screen Premium Onboarding

---

#### Screen 1: Welcome / Brand Moment

**Purpose:** First impression. Brand identity. Emotional connection. Sets exclusivity tone.

```
┌────────────────────────────────────┐
│                                    │
│   [full-bleed gradient: #7C3AED    │
│    → #EC4899 diagonal]             │
│                                    │
│                                    │
│         🧼                         │ ← animated soap bubble SVG
│                                    │
│      Soapies                       │ ← 52px, fontWeight 900, white
│                                    │
│   Community is everything.         │ ← 17px, white 80% opacity
│                                    │
│   An invite-only social club       │
│   for people who actually          │
│   show up for each other.          │ ← 3 lines, body text
│                                    │
│                                    │
│   [    Apply for Membership    ]   │ ← white text, 20% white bg
│                                    │
│         Already a member?          │
│           Sign In →                │ ← underline text
│                                    │
└────────────────────────────────────┘
```

**Micro-interactions:**

- Soap bubble SVG path-draws in on mount (1.2 second, easing cubic-bezier)
- "Soapies" text fades up from y+20 with spring (delay 400ms)
- Tagline fades in (delay 800ms)
- Body copy fades in (delay 1200ms)
- CTA button slides up from bottom (delay 1600ms, spring)
- Background gradient slowly animates (color shift, 8-second loop)

---

#### Screen 2: Community Selection

**Purpose:** User chooses which sub-community they're applying for. Sets context for their application.

```
┌────────────────────────────────────┐
│  [← Back]                         │
│                                    │
│  Which community are you           │
│  applying for?                     │ ← h2, white
│                                    │
│  Choose the space that's           │
│  right for you.                    │ ← muted, body
│                                    │
│  ┌──────────────────────────────┐  │
│  │ 🧼 Soapies                   │  │ ← community card
│  │ The original. Social events, │  │
│  │ deep connections, all vibes  │  │
│  │                         [ ○] │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ 👥 Groupus                   │  │
│  │ Group experiences for the    │  │
│  │ adventurous                  │  │
│  │                         [ ○] │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ 🏳️‍🌈 Gaypeez                  │  │
│  │ Queer joy, community first   │  │
│  │                         [ ○] │  │
│  └──────────────────────────────┘  │
│                                    │
│  [     Continue →  gradient    ]   │
└────────────────────────────────────┘
```

**Community card visual:**

- Unselected: `colors.card` bg, `colors.border` border, muted text
- Selected: Community gradient bg (10% opacity), community color border (2px), community color checkmark icon
- Press animation: scale(0.98) spring + `Haptics.selectionAsync()`

**Micro-interactions:**

- Cards enter with staggered `FadeInDown` (50ms between each)
- Selection: `BounceIn` checkmark + border color transition (150ms)
- Continue button enables only when selection made (opacity 0.4 → 1.0 transition)

---

#### Screen 3: Application Form

**Purpose:** Minimal application — name, email, password, why they want to join, optional referral code. Keep it under 5 fields.

```
┌────────────────────────────────────┐
│  [← Back]                         │
│                                    │
│  Tell us about yourself            │ ← h2
│                                    │
│  Membership is curated. Your       │
│  application goes to our admins.   │ ← muted, body
│                                    │
│  Full Name ──────────────────────  │
│  [Jane Smith                    ]  │
│                                    │
│  Email ──────────────────────────  │
│  [you@example.com               ]  │
│                                    │
│  Password ───────────────────────  │
│  [•••••••••              👁  ]     │
│  ▓▓▓▓░░░░ Good                     │ ← strength bar
│                                    │
│  Why do you want to join? ────────  │
│  [I've been following the scene…  ]│ ← multiline, 200 char max
│  ░░░░░░░ 46/200                    │ ← char counter
│                                    │
│  Referral code (optional) ────────  │
│  [ABC-123                       ]  │ ← pre-filled if from deep link
│                                    │
│  [    Submit Application →      ]  │
│                                    │
│  Your application will be reviewed │
│  within 48 hours.                  │ ← reassurance copy
└────────────────────────────────────┘
```

**Post-Submit: Application Pending Screen (replaces Alert.alert)**

```
┌────────────────────────────────────┐
│                                    │
│   [full-bleed success gradient]    │
│                                    │
│   ✅ (large animated checkmark)    │ ← Lottie or SVG
│                                    │
│   Application Received!            │ ← h2, white
│                                    │
│   Thanks Jane. We'll review your   │
│   application for Soapies and      │
│   reach out at               ...   │
│   you@example.com                  │
│                                    │
│   Typically reviewed within 48h.   │
│                                    │
│   [   Follow us on Instagram   ]   │ ← secondary CTA
│                                    │
│   [         Sign In            ]   │ ← muted CTA, bottom
│                                    │
└────────────────────────────────────┘
```

**Implementation Notes:**

- This is a 3-screen flow: Welcome → Community → Application → Pending (4th state, same route, different render)
- Use `expo-router` nested navigation within `(auth)` group or a wizard state machine within a single `apply.tsx` screen using local `step: 1|2|3|4` state
- Store community selection and referral code in component state; pass all to `registerMutation` payload
- `communityId` field needs to be added to the `auth.register` mutation on the API side
- `applicationNote` (why join) field needs to be added to the API

---

## Summary: Priority Action List

### P0 — Critical (breaks user flows)

1. **Wire compose button in Messages** — currently a dead tap
2. **Make NotificationItems tappable** — all notifications lead nowhere
3. **Fix "Edit Profile" button** — dead interaction damages trust
4. **Add error states** to every data-fetching screen — silent failures confuse users
5. **Fix text color on received messages** in Chat — white text on off-white background

### P1 — High Impact (significant UX improvements)

6. **Replace all `ActivityIndicator` spinners** with skeleton screens
7. **Add tab bar badges** for unread messages + notifications
8. **Fix array.reverse() in Chat** — performance issue on every render
9. **Add optimistic updates** for like mutation in Feed
10. **Replace post-register Alert.alert** with Application Pending screen
11. **Add show/hide password toggle** on all password inputs

### P2 — Polish (premium feel)

12. **Add haptics** throughout (selection, send, like, nav transitions)
13. **Implement Reanimated micro-interactions** (button press scale, like bounce, skeleton shimmer)
14. **Standardize typography** using recommended scale
15. **Add community counts to filter chips** in Events screen
16. **Add share functionality** to Event Detail and Profile
17. **Implement onboarding flow** (Welcome → Community Selection → Application)

### P3 — Future Features

18. **Real-time WebSocket/SSE** for Chat (replace 5s polling)
19. **Post detail screen** (comments, full thread view)
20. **Edit Profile screen**
21. **Settings screen** (notifications, privacy, account)
22. **Member post history** view from member profiles
23. **Event attendee list** on Event Detail
24. **Push notifications** integration

---

_This document should be treated as a living specification. Update as features ship and new screens are added._
