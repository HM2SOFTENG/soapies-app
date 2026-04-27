# Platform Ops Admin Screen Spec

## Goal

Expose a secure admin-only operations dashboard inside the Soapies mobile app so privileged admins can monitor deployment/platform health and execute a small set of approved operational actions without leaving the app.

## Product principles

- Read-heavy, action-light
- Server-mediated platform access only
- Explicit audit logging for every action
- No raw secrets or direct provider credentials on mobile
- Safe, allowlisted operations only

## User

- Admin / ops admin
- Primary use cases:
  - check if releases/builds/deployments are healthy
  - see if critical providers are configured and healthy
  - inspect operational queue backlog
  - trigger safe diagnostics / recovery actions

## Screen location

- New admin route: `mobile/app/admin/platform-ops.tsx`
- Entry point from admin dashboard quick actions

## Sections

1. **Environment**
   - environment
   - API version
   - mobile version
   - tracked release branch
   - PR number

2. **Alerts**
   - critical/warning items derived from provider health, CI failures, deploy failures, and queue thresholds

3. **Integrations**
   - GitHub / CI
   - DigitalOcean App Platform
   - Expo / EAS
   - Upload storage
   - Notifications

4. **GitHub / CI**
   - tracked PR metadata
   - recent workflow runs
   - rerun action for failed runs

5. **Deployment**
   - current DigitalOcean app/deployment status
   - latest deployment phase
   - app URL shortcut

6. **Mobile Release**
   - app version
   - bundle identifiers/package names
   - EAS build profiles
   - whether remote Expo monitoring is configured

7. **Service Health**
   - DB
   - storage
   - email
   - SMS/OTP
   - push
   - OAuth/session server
   - payments

8. **Operational Queues**
   - pending applications
   - pending Venmo reviews
   - pending test reviews

9. **Safe Actions**
   - send test push to current admin device
   - create test in-app notification
   - rerun failed GitHub workflow run

10. **Recent Admin Actions**

- lightweight audit trail

## Backend API

### Query

- `admin.platformOpsSummary`

Returns:

- overview
- alerts
- integrations
- GitHub status
- DigitalOcean deployment status
- Expo/EAS configuration summary
- service health
- queue health
- recent audit logs
- enabled actions

### Mutation

- `admin.platformOpsRunAction`

Allowed actions:

- `send_test_push_to_self`
- `create_test_in_app_notification`
- `rerun_github_run`

## Security model

- Admin-only tRPC procedures
- All actions performed from server
- Every action written to `adminAuditLogs`
- Mobile app never receives platform secrets

## Required environment variables for full external monitoring

- `GITHUB_TOKEN`
- `GITHUB_REPOSITORY`
- `GITHUB_WORKFLOW_BRANCH`
- `GITHUB_PR_NUMBER`
- `DIGITALOCEAN_TOKEN` or `DO_API_TOKEN`
- `DIGITALOCEAN_APP_ID` or `DO_APP_ID`
- `EXPO_TOKEN` (optional for future expansion)
- `EXPO_PROJECT_ID` (optional for future expansion)

## Current implementation scope

Implemented now:

- server summary aggregation
- GitHub workflow monitoring
- DigitalOcean deployment monitoring
- Expo/EAS config visibility
- provider/service readiness visibility
- queue health and audit trail
- safe action execution
- mobile admin UI screen

Future recommended expansion:

- richer Expo/EAS remote build status
- DigitalOcean redeploy/restart actions
- background job/cron health integration
- App Store / Play review state ingestion
- granular ops-admin permission tier
