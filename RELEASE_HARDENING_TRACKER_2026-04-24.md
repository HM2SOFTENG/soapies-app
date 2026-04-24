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
| P0-02 | Error-state completeness on major network screens | IN_PROGRESS | Engineering | Hardened messages, notifications, events, tickets, members, profile, event/member detail, and key admin list/dashboard routes; hosted/manual QA still required |
| P0-03 | Theme consistency closure | IN_PROGRESS | Engineering + Design QA | Active migration/stabilization |
| P0-04 | Hosted deployment parity workflow | TODO | Engineering | Repeated remote mismatch seen |
| P0-05 | End-to-end validation of transactional flows | TODO | QA + Engineering | Applications / reservations / tickets / messaging |
| P0-06 | Auth/session hardening validation | TODO | Engineering + QA | Cold start / expired session / reset |
| P0-07 | App Store compliance readiness review | TODO | Product + Ops | Privacy / moderation / policy / metadata |

---

# 3. P1 Tracker

| ID | Item | Status | Owner | Notes |
|---|---|---:|---|---|
| P1-01 | Break up oversized brittle screens | TODO | Engineering | Admin/event/member surfaces most at risk |
| P1-02 | Reduce `any` and improve route typing | TODO | Engineering | Important for safer iteration |
| P1-03 | Add automated tests for critical shared UI and flows | TODO | Engineering | PillTabs, admin members, tickets, navigation |
| P1-04 | Formalize persona-based QA matrix | TODO | QA | Applicant/member/admin/suspended |
| P1-05 | Deployment verification checklist | TODO | Engineering | Verify hosted backend after push |

---

# 4. Immediate Execution Queue

## In scope for direct repo work
1. Continue closing remaining network/error-state gaps on lower-traffic routes
2. Add missing mutation error handlers in chat
3. Create route-by-route QA checklist
4. Document hosted deployment verification workflow
5. Continue stabilizing high-risk screens discovered during QA

## Out of scope for code-only completion
1. App Store policy submission package
2. Hosted production validation itself
3. Manual device QA across every screen/persona
4. Final compliance/legal signoff

---

# 5. Exit Criteria Before Public Submission

All P0 items must be marked DONE with evidence.
