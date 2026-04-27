# Soapies Mobile — App Store Readiness Checklist

Last Updated: 2026-04-13
Branch: react-native

---

## Current app.json Status

- Bundle ID (iOS): `com.soapies.app` ✅
- Package (Android): `com.soapies.app` ✅
- Deep link scheme: `soapies://` ✅
- Version: `1.0.0` ✅
- Orientation: portrait ✅
- User interface style: dark ✅
- Icon path: `./assets/icon.png` ✅ (file exists)
- Splash bg color: `#0D0D0D` ✅
- Adaptive icon: config present, no `foregroundImage` set ⚠️

---

## 🍎 iOS — Apple App Store

### App Identity

- [x] Bundle identifier set: `com.soapies.app`
- [x] App name: Soapies
- [x] Version: 1.0.0
- [ ] Build number incremented before each TestFlight / release upload
- [ ] Signing certificate configured (Expo EAS or manual)
- [ ] Provisioning profile configured

### Assets

- [x] App icon file exists (`assets/icon.png`) — **verify it is 1024×1024 PNG, no alpha channel**
- [x] Splash screen background color set (`#0D0D0D`)
- [ ] Splash screen foreground image (`assets/splash-icon.png`) — verify dimensions (1284×2778 or larger)
- [ ] Screenshots: 6.7" iPhone (1290×2796) — minimum 2, up to 10
- [ ] Screenshots: 5.5" iPhone (1242×2208) — required for older device support
- [ ] iPad screenshots (if `supportsTablet: true` — currently false, OK to skip)
- [ ] App preview video (optional but recommended)

### Listing Copy

- [ ] App description written (up to 4000 characters)
- [ ] Subtitle (30 chars max): e.g. "Members-only lifestyle community"
- [ ] Keywords (100 chars): e.g. "events,community,social,lifestyle,exclusive"
- [ ] What's New in This Version text (first release can be generic)
- [ ] Primary category selected (e.g. Social Networking)
- [ ] Secondary category (optional, e.g. Lifestyle)

### Content & Compliance

- [ ] Age rating selected — **recommend 17+** (adult community content, suggestive themes)
- [ ] Content warnings acknowledged in App Store Connect:
  - [ ] Mature/Suggestive Themes — likely YES given community nature
  - [ ] Alcohol/Tobacco — potentially YES (events)
  - [ ] Gambling — NO
- [ ] Privacy policy URL — **REQUIRED**, e.g. `https://soapies.app/privacy`
  - Web has `Privacy.tsx` page — must be deployed and publicly accessible
- [ ] Support URL — **REQUIRED**, e.g. `https://soapies.app/support` or email link
- [ ] Marketing URL (optional): `https://soapies.app`
- [ ] Copyright notice: e.g. "© 2026 Soapies Inc."
- [ ] EULA / Terms of Service URL (if custom): `https://soapies.app/tos`

### In-App Purchases & Payments

- [ ] Declare whether app uses in-app purchases
  - If Stripe is used for ticket purchases: **Stripe on mobile may violate App Store guidelines** — Apple requires IAP for digital goods. Physical event tickets are generally exempt as "real-world services." Confirm legal position.
  - [ ] Add disclaimer or legal review before Stripe mobile integration

### Technical Requirements

- [ ] `expo-notifications` installed and configured (push entitlement)
- [ ] Camera usage description in `app.json` (if using `expo-image-picker`):
  ```json
  "ios": {
    "infoPlist": {
      "NSCameraUsageDescription": "Used to upload profile and post photos",
      "NSPhotoLibraryUsageDescription": "Used to select photos for your profile and posts"
    }
  }
  ```
- [ ] Microphone usage (if voice features added later)
- [ ] No private API usage
- [ ] App does not request tracking without ATT prompt (if analytics added)

### Submission

- [ ] App reviewed internally on physical iPhone (not just simulator)
- [ ] TestFlight beta tested with at least 5 real users
- [ ] All crash-level bugs fixed (see sprint-status.md blockers)
- [ ] Privacy Nutrition Labels filled in App Store Connect
- [ ] Export compliance: answer encryption questions (HTTPS = standard, answer NO to proprietary encryption)

---

## 🤖 Android — Google Play Store

### App Identity

- [x] Application ID: `com.soapies.app`
- [x] App name: Soapies
- [x] Version: 1.0.0
- [ ] Version code incremented per release
- [ ] Keystore / signing key generated and stored securely (EAS or manual)

### Assets

- [x] Adaptive icon config present in `app.json` — **missing `foregroundImage`**
  ```json
  "android": {
    "adaptiveIcon": {
      "foregroundImage": "./assets/adaptive-icon.png",  ← ADD THIS
      "backgroundColor": "#0D0D0D"
    }
  }
  ```
- [ ] Adaptive icon foreground image: 1024×1024 PNG on transparent background
- [ ] Feature graphic: 1024×500 PNG (required for Play Store listing)
- [ ] Screenshots: minimum 2, phone size (16:9 or 9:16)
- [ ] Screenshots: 7" and 10" tablet (optional)

### Listing Copy

- [ ] Short description (80 chars max)
- [ ] Full description (4000 chars max)
- [ ] App category: Social
- [ ] Tags (optional)
- [ ] Contact email
- [ ] Privacy policy URL — **REQUIRED** (same URL as iOS)
- [ ] App website URL

### Content Rating

- [ ] Complete IARC content rating questionnaire
- [ ] Expected result: **Teen or Mature 17+** (adult social community)
- [ ] Declare sensitive content categories (sexual content references, alcohol)

### Permissions (in `app.json` / `AndroidManifest`)

- [ ] Camera permission declared if using `expo-image-picker` with camera
- [ ] `INTERNET` (automatic)
- [ ] `VIBRATE` (automatic for haptics)
- [ ] Push notification permissions (via `expo-notifications`)
- [ ] Remove any unused permissions before submission

### Technical Requirements

- [ ] Target SDK: Android 14 (API 34) — required by Play Store as of Aug 2024
- [ ] 64-bit support (handled by React Native / Expo)
- [ ] App tested on physical Android device

### Submission

- [ ] Internal test track release
- [ ] Closed testing (alpha) with real users
- [ ] Open testing (beta) before production

---

## 🔑 EAS Build Configuration (Recommended)

If using Expo Application Services:

- [ ] `eas.json` created with `preview` and `production` profiles
- [ ] `eas build --platform ios --profile preview` tested
- [ ] `eas build --platform android --profile preview` tested
- [ ] Credentials stored in EAS (not local machine only)

```json
// eas.json (recommended minimal setup)
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false },
      "android": { "buildType": "apk" }
    },
    "production": {
      "ios": { "autoIncrement": true },
      "android": { "autoIncrement": true }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## 📋 Pre-Submission Checklist Summary

| Item                        | iOS       | Android               | Status                                |
| --------------------------- | --------- | --------------------- | ------------------------------------- |
| Bundle/package ID           | ✅        | ✅                    | Done                                  |
| App icon (correct size)     | ⚠️ Verify | ⚠️ Missing foreground | Needs work                            |
| Splash screen               | ✅        | ✅                    | Done                                  |
| Privacy policy URL          | ❌        | ❌                    | Not deployed                          |
| Support URL                 | ❌        | ❌                    | Not created                           |
| App description             | ❌        | ❌                    | Not written                           |
| Screenshots                 | ❌        | ❌                    | Not created                           |
| Age rating                  | ❌ (17+)  | ❌ (17+)              | Not set                               |
| Camera usage description    | ❌        | ❌                    | Not in app.json                       |
| Push notifications wired    | ❌        | ❌                    | expo-notifications not installed      |
| Adaptive icon foreground    | N/A       | ❌                    | Missing file                          |
| Feature graphic             | N/A       | ❌                    | Not created                           |
| EAS build config            | ❌        | ❌                    | No eas.json                           |
| TestFlight / internal track | ❌        | ❌                    | Not started                           |
| Core loop working           | ❌        | ❌                    | Blockers exist (see sprint-status.md) |

**Estimated weeks to App Store readiness (starting from today): 6-8 weeks**

- Sprints 1-2 completion: ~3-4 weeks of dev
- Asset creation + listing copy: 1 week
- TestFlight beta + bug fixes: 1-2 weeks
- Apple review: 1-7 days typical
