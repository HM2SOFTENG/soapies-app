# Platform Ops Implementation Plan

## Phase 1 — MVP (implemented)

### Backend

- Add `server/services/platformOps.ts`
- Aggregate:
  - GitHub Actions status
  - DigitalOcean app/deployment state
  - Expo/EAS local config summary
  - service/provider readiness
  - operational queue metrics
  - recent admin audit logs
- Add tRPC procedures:
  - `admin.platformOpsSummary`
  - `admin.platformOpsRunAction`
- Audit-log all actions

### Mobile

- Add `mobile/app/admin/platform-ops.tsx`
- Add admin dashboard quick action entry
- Render sections for:
  - environment
  - alerts
  - integrations
  - CI
  - deployment
  - mobile release
  - service health
  - queue health
  - safe actions
  - audit trail

### Safe actions in MVP

- test push to current admin device
- test in-app notification
- rerun failed GitHub workflow run

## Phase 2 — Recommended next enhancements

1. **Expo/EAS remote status**
   - latest iOS build
   - latest Android build
   - submission status
   - OTA/update metadata

2. **DigitalOcean control actions**
   - trigger redeploy
   - restart app components
   - fetch deployment logs

3. **Queue/workflow expansion**
   - intro call backlog
   - failed push deliveries
   - failed webhooks/jobs
   - event-day alerts

4. **Permission model**
   - split general admin from ops-admin
   - add action-level capability checks

5. **Observability**
   - persist platform snapshots
   - add trend/history views
   - add explicit incident cards

## QA checklist

- admin-only access verified
- non-admin denied state verified
- screen loads with missing external tokens
- screen loads with configured integrations
- GitHub rerun action audited
- test push graceful failure when token missing
- test in-app notification works
- mobile lint/typecheck/tests pass
- server typecheck/tests pass

## Deployment notes

- For production-grade external monitoring, set:
  - `GITHUB_TOKEN`
  - `GITHUB_REPOSITORY`
  - `GITHUB_WORKFLOW_BRANCH`
  - `GITHUB_PR_NUMBER`
  - `DIGITALOCEAN_TOKEN`
  - `DIGITALOCEAN_APP_ID`
- Expo remote monitoring can be expanded later with:
  - `EXPO_TOKEN`
  - `EXPO_PROJECT_ID`
