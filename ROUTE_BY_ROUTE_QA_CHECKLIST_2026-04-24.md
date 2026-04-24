# Soapies Route-by-Route QA Checklist

**Goal:** verify every major mobile route on hosted backend before public App Store release.

---

# Global checks for every route
- loads without runtime error
- has intentional loading state
- has intentional empty state where applicable
- has intentional error state where applicable
- dark mode verified
- light mode verified
- safe-area/header/back navigation verified
- hosted API contract verified

---

# Auth
- `/(auth)/login`
- `/(auth)/forgot-password`
- `/(auth)/reset-password`

Checks:
- invalid credentials
- successful login
- expired/incorrect reset code
- resend/reset behavior
- session persistence after relaunch

# Core Tabs
- `/(tabs)/index`
- `/(tabs)/events`
- `/(tabs)/messages`
- `/(tabs)/notifications`
- `/(tabs)/profile`
- `/(tabs)/pulse`

Checks:
- loading/error/empty states
- pull to refresh
- navigation into detail routes
- theme correctness

# Detail / Feature Screens
- `/chat/[id]`
- `/event/[id]`
- `/member/[id]`
- `/members`
- `/connections`
- `/edit-profile`
- `/settings`
- `/tickets`
- `/onboarding`
- `/profile-setup`
- `/pending-approval`

Checks:
- entry path from real userflow
- back/return path correctness
- action success/failure messaging
- role gating if applicable

# Admin
- `/admin/index`
- `/admin/applications`
- `/admin/events`
- `/admin/event-ops`
- `/admin/checkin`
- `/admin/interview-slots`
- `/admin/reservations`
- `/admin/push-notifications`
- `/admin/settings`
- `/admin/announcements`
- `/admin/members`

Checks:
- admin-only access
- destructive action confirmation
- list filtering/sorting/search
- direct actions update UI correctly
- hosted backend has matching procedures

---

# High-risk end-to-end scenarios
1. Register -> verify -> onboarding -> submit application
2. Admin application review -> approval/waitlist/reject
3. Browse event -> reserve -> pending payment -> payment confirmation -> ticket visible
4. Test result submission -> admin review -> reservation progression
5. DM creation -> send -> read -> reaction
6. Member browse -> profile -> poke/block/report
7. Admin members -> open modal -> execute actions -> view public profile -> return to modal
