# Soapies Deployment Verification Checklist

**Purpose:** reduce local-vs-hosted drift after pushes and catch missing backend deploys before mobile QA is misread as app breakage.

---

# 1. Pre-push

- confirm working tree is clean except intended changes
- run mobile typecheck:
  - `cd mobile && npx tsc --noEmit --pretty false`
- if server/router/db changed, note impacted procedures/routes in the ship summary
- record local commit SHA that should appear on hosted

---

# 2. Push + deploy trigger

- push to `main`
- confirm GitHub remote accepted the new SHA
- confirm DigitalOcean/App Platform (or current host) starts a deploy for that SHA
- do **not** assume hosted API is updated just because GitHub is updated

---

# 3. Hosted parity checks

Run these after the deploy reports healthy:

## Backend/API parity
- verify the hosted backend is serving the expected commit/build
- spot-check any newly added or renamed tRPC procedures from this ship
- verify env-dependent paths still point at hosted services, not local URLs
- confirm no stale procedure-name mismatch remains

## Mobile critical smoke checks
- open the exact routes touched in the ship
- verify new loading/error/empty states render instead of blank/frozen screens
- verify at least one success path for each changed mutation
- verify one failure path where practical

---

# 4. Required canary flows after backend-affecting ships

## Member canaries
- login / session restore
- home feed load
- pulse load
- members browse -> member detail
- event detail -> reservation/ticket path if touched
- chat open if messaging touched

## Admin canaries
- admin dashboard load
- admin members load
- any admin surface changed in the ship
- one representative mutation on the changed admin screen

---

# 5. If hosted is broken

Treat these as different failure classes:

## A. GitHub updated, hosted deploy missing
- deployment pipeline issue
- do not debug mobile UI first

## B. Hosted deploy finished, procedure missing
- stale build / wrong service / partial deploy / server artifact mismatch
- confirm router/server files were included in the shipped SHA

## C. Hosted deploy finished, route loads but behavior differs
- env/config/data parity issue
- compare feature flags, env vars, seeded data, and auth/session assumptions

---

# 6. Evidence to capture per ship

- pushed SHA
- hosted SHA/build id
- routes smoke-tested
- procedures smoke-tested
- pass/fail notes
- blockers needing manual follow-up

---

# 7. Exit condition

A ship is not considered fully verified until:
- GitHub SHA matches intended code
- hosted deploy completed
- changed procedures exist on hosted
- changed mobile routes passed canary QA on hosted backend
