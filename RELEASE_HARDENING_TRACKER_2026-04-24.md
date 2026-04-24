# Soapies Release Hardening Tracker

**Created:** 2026-04-24  
**Source:** `COMPREHENSIVE_APP_AUDIT_2026-04-24.md`

---

# 1. Release Decision

## Current recommendation
- **Do not submit to public App Store yet**
- Continue in structured release-hardening mode

---

# 2. P0 Tracker

| ID | Item | Status | Owner | Notes |
|---|---|---:|---|---|
| P0-01 | Full route-by-route regression audit | TODO | Engineering + QA | Needs hosted/manual validation |
| P0-02 | Error-state completeness on major network screens | IN_PROGRESS | Engineering | Hardened home feed, pulse, messages, notifications, events, tickets, members, profile, edit profile, chat, event ops, event/member detail, pending approval, connections, admin members, interview slots, announcements, push notifications, settings, and key admin list/dashboard routes; hosted/manual QA still required |
| P0-03 | Theme consistency closure | IN_PROGRESS | Engineering + Design QA | Active migration/stabilization |
| P0-04 | Hosted deployment parity workflow | IN_PROGRESS | Engineering | Checklist drafted in `DEPLOYMENT_VERIFICATION_CHECKLIST_2026-04-24.md`; hosted execution still required |
| P0-05 | End-to-end validation of transactional flows | TODO | QA + Engineering | Applications / reservations / tickets / messaging |
| P0-06 | Auth/session hardening validation | IN_PROGRESS | Engineering + QA | Checklist drafted in `AUTH_SESSION_VALIDATION_CHECKLIST_2026-04-24.md`; hosted/device execution still required |
| P0-07 | App Store compliance readiness review | TODO | Product + Ops | Privacy / moderation / policy / metadata |

---

# 3. P1 Tracker

| ID | Item | Status | Owner | Notes |
|---|---|---:|---|---|
| P1-01 | Break up oversized brittle screens | TODO | Engineering | Admin/event/member surfaces most at risk |
| P1-02 | Reduce `any` and improve route typing | TODO | Engineering | Important for safer iteration |
| P1-03 | Add automated tests for critical shared UI and flows | TODO | Engineering | PillTabs, admin members, tickets, navigation |
| P1-04 | Formalize persona-based QA matrix | TODO | QA | Applicant/member/admin/suspended |
| P1-05 | Deployment verification checklist | DONE | Engineering | Added `DEPLOYMENT_VERIFICATION_CHECKLIST_2026-04-24.md` |

---

# 4. Immediate Execution Queue

## In scope for direct repo work
1. Execute hosted/manual validation from `ROUTE_BY_ROUTE_QA_CHECKLIST_2026-04-24.md`
2. Execute `DEPLOYMENT_VERIFICATION_CHECKLIST_2026-04-24.md` after each ship
3. Execute `AUTH_SESSION_VALIDATION_CHECKLIST_2026-04-24.md` on hosted/device builds
4. Continue stabilizing high-risk screens discovered during QA
5. Patch auth/layout shell only if QA exposes a concrete issue

## Out of scope for code-only completion
1. App Store policy submission package
2. Hosted production validation itself
3. Manual device QA across every screen/persona
4. Final compliance/legal signoff

---

# 5. Exit Criteria Before Public Submission

All P0 items must be marked DONE with evidence.
