# Soapies Mobile QA Checklist

## Automated gates

Run before every release:

- `npm run lint`
- `npm run typecheck`
- `npm run test:ci`
- `npm run doctor:config`
- `npx expo-doctor`

## Device / manual QA

### Authentication

- Sign up flow works end-to-end
- Login succeeds with valid credentials
- Invalid credentials show safe error state
- Logout clears session and cached authenticated data
- Cold-start session restore works
- Transient API failure does not silently destroy session

### Core product

- Home feed loads, handles offline/error states
- Events list and event detail load correctly
- Ticket reservation and payment instructions display correctly
- Member directory/profile routes load in light/dark/system themes
- Chat threads open and mark-read failures do not crash the app
- Push notification permission prompt behaves correctly
- Deep links route to supported screens

### Media / permissions

- Camera prompt copy is accurate
- Photo picker prompt copy is accurate
- Location permission copy is accurate
- Notification permission copy is accurate
- Upload photo flow works on iOS and Android

### Security / privacy

- No debug logs with tokens/PII in production builds
- Privacy Policy link opens correctly
- SecureStore persists auth tokens
- AsyncStorage is used only for non-sensitive preferences

### Release validation

- Preview build installs on iOS simulator/device
- Android AAB preview build completes
- TestFlight build uploads successfully
- Google Play internal test artifact uploads successfully
