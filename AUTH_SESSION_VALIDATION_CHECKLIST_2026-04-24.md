# Soapies Auth & Session Validation Checklist

**Purpose:** verify that login, reset, session persistence, expiry handling, and protected-route behavior are stable enough for release.

---

# 1. Core login/session scenarios

## Fresh login
- open `/(auth)/login`
- invalid credentials show intentional error copy
- valid login succeeds
- user lands on correct post-login route
- app relaunch preserves valid session

## Cold start with valid session
- fully kill app
- reopen app
- confirm no auth flicker loop or broken redirect
- protected tabs load correctly

## Manual logout
- logout clears protected data
- back navigation does not reveal authenticated screens
- relaunch stays logged out

---

# 2. Password recovery

## Forgot password
- submit valid email
- submit invalid/unknown email
- confirm success/failure messaging is intentional
- verify resend/retry behavior

## Reset password
- valid reset flow succeeds
- expired code shows clear recovery path
- incorrect code shows clear error state
- post-reset login works with new password

---

# 3. Expiry and invalid-session handling

- simulate expired/invalid token
- open app on a protected route
- verify redirect or recovery path is intentional
- confirm queries do not leave blank screens/spinners forever
- confirm user can recover by logging in again

---

# 4. Protected-route behavior

Check at minimum:
- `/(tabs)/index`
- `/(tabs)/profile`
- `/(tabs)/messages`
- `/settings`
- `/tickets`
- `/admin/index` as non-admin
- `/admin/index` as admin

Expected:
- non-authenticated users do not access protected member routes
- non-admin users do not access admin routes
- denied states are clear and non-broken

---

# 5. Auth-adjacent failure cases

- network loss during login
- network loss during password reset
- network loss while app restores session
- hosted backend unavailable during cold start
- stale cached UI after logout/login user switch

Expected:
- explicit error UI
- retry path where appropriate
- no infinite loading loop
- no accidental access to prior user data

---

# 6. Persona coverage

Run the checklist against:
- applicant / pending approval
- approved member
- admin
- suspended or restricted account if available

---

# 7. Evidence to capture

- device/os
- build or commit SHA
- hosted environment used
- exact scenario tested
- result
- screenshot/video for failures
- blocker severity

---

# 8. Exit condition

Auth/session hardening is not complete until:
- login/logout/reset flows pass on hosted backend
- session restore survives app relaunch
- expired/invalid sessions fail gracefully
- role gating works for member vs admin
- no auth-sensitive route is left in a blank/error-loop state
