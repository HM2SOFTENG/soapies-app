# Soapies Mobile — Sprint Status Dashboard
Last Updated: 2026-04-13
Branch: react-native
Auditor: ClawBot (Lead Scrum Master / PO)

---

## Sprint 1 Goal
Ship a working beta with core loop: **auth → feed → events → messages → profile**

---

## Overall Status: 🔴 NOT BETA-READY

Two tabs are currently broken due to missing components. Core flows are incomplete.

---

## Feature Status by Area

### 🔐 Auth — 85% Complete
| Item | Status | Notes |
|---|---|---|
| Login | ✅ Done | Working |
| Register | ✅ Done | Working |
| Session persistence (SecureStore) | ✅ Done | Cookie-based session wired |
| Auth guard / redirect | ✅ Done | Auto-redirect to login/tabs |
| Profile-required guard | ❌ Missing | Web has `RequireProfile` guard — not on mobile |
| Forgot password | ❌ Missing | Web has `ForgotPassword.tsx` — no mobile equivalent |

### 📰 Feed / Wall — 60% Complete
| Item | Status | Notes |
|---|---|---|
| Feed list (pull-to-refresh) | ✅ Done | Working with tRPC polling |
| PostCard with like | ✅ Done | Optimistic update + haptics |
| PostCard with emoji reactions | ✅ Done | 5 reactions, haptics |
| Post Composer | ❌ MISSING | FAB present, modal not built |
| Comments thread | ❌ MISSING | Not started |
| Post media (image) | ❌ MISSING | No image upload in composer |

### 📅 Events — 30% Complete (Tab Broken)
| Item | Status | Notes |
|---|---|---|
| Events list (tab) | 🔴 BROKEN | `EventCard` component does not exist — tab will crash |
| Community filter | ✅ Done | UI built in `events.tsx` |
| Event detail page | ✅ Done | Hero, date, venue, reserve button |
| Reserve CTA | 🟡 Partial | Single `reserve` mutation. No ticket type selector. |
| Ticket type selector | ❌ MISSING | Web has single woman / couple / single man |
| Waiver gate | ❌ MISSING | No waiver check before reservation |
| My Tickets / QR | ❌ MISSING | No tickets screen anywhere |

### 💬 Messages — 40% Complete (Tab Broken)
| Item | Status | Notes |
|---|---|---|
| Conversation list (tab) | 🔴 BROKEN | `ConversationItem` component does not exist — tab will crash |
| Chat screen | ✅ Done | Polling (5s), send works |
| New DM / start conversation | ❌ MISSING | Compose button present, no handler |
| Group channels | ❌ MISSING | Not started |
| WebSocket real-time | ❌ MISSING | Polling only — acceptable for beta |
| Typing indicators | ❌ MISSING | Backend schema exists |

### 👤 Profile — 50% Complete
| Item | Status | Notes |
|---|---|---|
| Profile view (my profile) | ✅ Done | Stats, avatar, referral code |
| Profile edit | ❌ MISSING | No edit screen |
| Avatar upload | ❌ MISSING | expo-image-picker installed but unused |
| Referral code + copy | ✅ Done | Clipboard copy + haptics |
| Referral share sheet | ❌ MISSING | expo-sharing not installed |
| Application status | ❌ MISSING | Web has multi-tab Profile with status stepper |
| Notification preferences | ❌ MISSING | Web has per-category toggles |

### 🔔 Notifications — 70% Complete
| Item | Status | Notes |
|---|---|---|
| In-app notification list | ✅ Done | Working with tRPC polling |
| Mark all read | ✅ Done | Mutation wired |
| Unread count badge | 🟡 Partial | Count computed but no tab badge shown |
| Push notifications | ❌ MISSING | expo-notifications not installed, not in app.json |

### 👥 Member Discovery — 0% Complete
| Item | Status | Notes |
|---|---|---|
| Members list | ❌ MISSING | No screen |
| Member profile view | ✅ Done | `member/[id].tsx` exists |
| Message CTA on profile | ❌ MISSING | No button to DM from member profile |

---

## 🔴 Immediate Blockers (Fix First)

These must be resolved before any QA or TestFlight build:

1. **Create `components/EventCard.tsx`** — Events tab crashes on import
2. **Create `components/ConversationItem.tsx`** — Messages tab crashes on import
3. **Build Post Composer modal** — Core social feature, FAB is dead
4. **Build Profile Edit screen** — Users can't update anything
5. **Build My Tickets screen** — Users can reserve but never see confirmation

---

## Feature Flag Recommendations

| Flag | Default | Rationale |
|---|---|---|
| `POST_CREATION` | OFF | Behind flag until text moderation is considered |
| `MESSAGING` | OFF | Behind flag until new-DM flow is complete and real-time is wired |
| `REFERRALS` | OFF | Behind flag until share tracking is verified end-to-end |
| `PUSH_NOTIFICATIONS` | OFF | Until expo-notifications is wired and APNs certs configured |
| `ONBOARDING_MOBILE` | OFF | Until multi-step application form is built in mobile |

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Missing components crash tabs on launch | 🔴 Critical | Fix EVT-001 and MSG-001 immediately |
| No real-time messaging | 🟡 Medium | Polling at 5s is acceptable for beta — defer WebSocket to Sprint 3 |
| Stripe / payment not in mobile | 🟡 Medium | Defer to web for v1 — show "Complete purchase on web" modal |
| No push notifications | 🟡 Medium | In-app polling is fallback — push required for good retention |
| App Store review: privacy policy required | 🔴 High | Must have URL before submission |
| App Store review: 17+ age rating | 🟡 Medium | Adult community content — select 17+ and enable appropriate content warnings |
| No onboarding/apply flow in mobile | 🟡 Medium | Can redirect new users to web for v1 |
| `expo-image-picker` installed but unused | 🟢 Low | Ready to use — just needs wiring |
| Cookie-based session with manual header injection | 🟡 Medium | Works but brittle — test on physical devices |

---

## Velocity Estimate (Sprint 1 Remaining)

Assuming 1 engineer:

| Item | Effort | Days |
|---|---|---|
| EventCard component | S | 0.5 |
| ConversationItem component | S | 0.5 |
| Post Composer modal | M | 1.5 |
| Profile Edit screen | M | 1.5 |
| My Tickets screen | M | 1.5 |
| Ticket type selector on EventDetail | M | 1 |
| New DM flow | M | 1 |
| Unread badge on Notifications tab | S | 0.5 |
| **Total Sprint 1 Remaining** | | **~8 days** |

Sprint 2 (Social Features): ~10-14 days
Sprint 3 (Polish + Launch): ~10 days
**Estimated to TestFlight beta: ~4 weeks**

---

## Sprint 2 Preview

After Sprint 1 blocker fixes:
- Member discovery / search
- Post media upload (camera roll)
- Group channels
- Referral share sheet
- Ticket cancellation request
- Community pages

## Sprint 3 Preview

- Push notifications (expo-notifications)
- Deep linking route handlers
- Onboarding/apply flow (or web redirect)
- App Store assets
- Performance + accessibility audit
- WebSocket real-time messaging
