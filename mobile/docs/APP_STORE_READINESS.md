# Soapies App Store & Google Play Readiness

## Branding decision

Canonical production display name: **Soapies**

Observed discrepancy resolved: use `Soapies` as the canonical product name in mobile/store metadata.

## iOS checklist

- App name: Soapies
- Bundle ID: currently `com.soapies.app` in repo; production-safe placeholder path supported via `EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER`
- SKU: `YOUR_SKU_HERE`
- Category: Social Networking (recommended)
- Age rating: review based on user-generated social content and event/community features
- Support URL: `https://YOUR_DOMAIN/support`
- Marketing URL: `https://YOUR_DOMAIN`
- Privacy Policy URL: `https://soapiesplaygrp.club/privacy`
- App Review contact: owner must supply
- Demo account: provide if review cannot complete without membership approval
- Export compliance: app currently declares non-exempt encryption false; re-confirm if auth/payment stack changes
- Screenshots required: 6.7", 6.5" or 6.3", and any additional required device classes in App Store Connect
- App preview video: optional
- App privacy questionnaire: align with data inventory below
- Sign in with Apple: assess whether required if third-party/social auth is added later
- Push notifications: verify entitlement/capability when first native iOS build is generated
- Associated domains / universal links: optional, configure if desired through `EXPO_PUBLIC_ASSOCIATED_DOMAINS`
- TestFlight process: use `workflow_dispatch` iOS release workflow or `npm run build:ios:production`
- Final submission: manual approval after TestFlight validation and metadata completeness

## Android checklist

- App name: Soapies
- Package name: currently `com.soapies.app` in repo; production-safe placeholder path supported via `EXPO_PUBLIC_ANDROID_PACKAGE`
- Short description: owner to supply (80 chars max)
- Full description: owner to supply
- Feature graphic: required
- Phone screenshots: required
- Tablet screenshots: only if tablet support is enabled later
- App category: Social
- Content rating: likely Mature / high interaction depending on app positioning; complete questionnaire carefully
- Target audience: define explicitly in Play Console
- Data Safety: align with privacy inventory below
- Privacy Policy URL: `https://soapiesplaygrp.club/privacy`
- Play App Signing: enable in Play Console
- Internal testing track: configured as primary automated submit target
- Closed testing track: recommended before production
- Production rollout: staged rollout recommended (5% → 20% → 100%)
- Release notes: provide per build
- First upload: may require manual Play Console bootstrap before CI submit succeeds

## Privacy / data inventory to validate

Current app signals indicate collection/use of:

- name
- email address
- phone number
- user ID
- photos / user content
- location (when granted)
- sensitive profile/community data
- payment-related metadata / reservation payment status

Review all backend flows before final store submission to ensure the store forms match actual data handling.

## Final submission prerequisites

- Finalize canonical company/legal entity
- Confirm final bundle/package identifiers
- Create store listings and metadata
- Upload screenshots and policy URLs
- Validate login, onboarding, event reservation, payments, push notifications, logout, and account recovery flows on real devices
