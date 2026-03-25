# ClawBot Fix Log — soapies-app
**Started:** 2026-03-25 09:16 PDT  
**Triggered by:** Brian Smith — "Fix these now, create and update a log"

---

## Current State (on pull)
8 TypeScript errors across 4 files found via `pnpm run check`.

### Errors Identified
| # | File | Line | Error | Status |
|---|------|------|-------|--------|
| 1 | `server/_core/websocket.ts` | 92 | `Map` can only be iterated with `--downlevelIteration` or `es2015+` target | 🔧 In Progress |
| 2 | `server/_core/websocket.ts` | 180 | `Set<number>` iteration same issue | 🔧 In Progress |
| 3 | `server/_core/websocket.ts` | 183 | `Set<AuthenticatedWebSocket>` iteration same issue | 🔧 In Progress |
| 4 | `server/_core/websocket.ts` | 197 | `Set<AuthenticatedWebSocket>` iteration same issue | 🔧 In Progress |
| 5 | `client/src/pages/EventDetail.tsx` | 218 | `.useMutation` called on a `DecoratedQuery` (should use query or imperative fetch) | ⏳ Pending |
| 6 | `client/src/pages/Messages.tsx` | 178 | Function called with 0 args, expected 1 | ⏳ Pending |
| 7 | `client/src/pages/Messages.tsx` | 272 | `participantCount` does not exist on `Conversation` type | ⏳ Pending |
| 8 | `client/src/pages/admin/AdminSettings.tsx` | 214 | `settingValue` does not exist on settings type (should be `value`, `key` is `settingKey`) | ⏳ Pending |

---

## Root Cause Analysis

- **WebSocket errors (1-4):** `tsconfig.json` has no `target` set (defaults to ES3). Adding `"target": "ES2020"` fixes all 4 Set/Map iteration errors.
- **EventDetail (5):** `trpc.promoCodes.validate` is registered as a `.query()` on the server, but client calls `.useMutation()`. Fix: use `trpc.useUtils()` for imperative fetch.
- **Messages (6):** `subscribe()` from `useWebSocket` hook called with 0 args but requires a callback argument.
- **Messages (7):** `participantCount` not in `Conversation` schema — UI references a field that doesn't exist. Fix: use optional chain with fallback.
- **AdminSettings (8):** Schema column is `key: varchar("settingKey")` / `value: text("value")` — the TS type fields are `.key` and `.value`, not `.settingKey`/`.settingValue`. Fix: change references accordingly.

---

## Work Log

### Fix 1-4: tsconfig.json — Add ES2020 target
- **File:** `tsconfig.json`
- **Change:** Added `"target": "ES2020"` to compilerOptions
- **Status:** ✅ Complete

### Fix 5: EventDetail.tsx — useMutation on a query
- **File:** `client/src/pages/EventDetail.tsx`
- **Change:** Replaced `trpc.promoCodes.validate.useMutation()` with `trpc.useUtils()` imperative fetch pattern
- **Status:** ⏳ Pending

### Fix 6-7: Messages.tsx — subscribe args + participantCount
- **File:** `client/src/pages/Messages.tsx`
- **Change:** TBD after reading full context
- **Status:** ⏳ Pending

### Fix 8: AdminSettings.tsx — settingValue → value
- **File:** `client/src/pages/admin/AdminSettings.tsx`
- **Change:** `s.settingValue` → `s.value` and `s.settingKey` → `s.key`
- **Status:** ⏳ Pending

---

## Final State
_Will be updated after all fixes verified clean._
