#!/usr/bin/env bash
set -euo pipefail

REPO="HM2SOFTENG/soapies-app"
PROJECT_ID="e838de7c-c450-4eab-85a0-3e98440771fc"
API_URL_DEFAULT="https://soapies-app-3uk2q.ondigitalocean.app"
WEB_URL_DEFAULT="https://soapiesplaygrp.club"
IOS_BUNDLE_ID_DEFAULT="com.soapies.app"
ANDROID_PACKAGE_DEFAULT="com.soapies.app"

echo "Setting non-sensitive default mobile GitHub secrets for ${REPO}"

gh secret set EXPO_PUBLIC_PROJECT_ID -R "$REPO" -b"$PROJECT_ID"
gh secret set EXPO_PUBLIC_API_URL -R "$REPO" -b"$API_URL_DEFAULT"
gh secret set EXPO_PUBLIC_WEB_URL -R "$REPO" -b"$WEB_URL_DEFAULT"
gh secret set EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER -R "$REPO" -b"$IOS_BUNDLE_ID_DEFAULT"
gh secret set EXPO_PUBLIC_ANDROID_PACKAGE -R "$REPO" -b"$ANDROID_PACKAGE_DEFAULT"

echo
echo "Done. Remaining sensitive secrets still need to be set manually:"
echo "  EXPO_TOKEN"
echo "  APP_STORE_CONNECT_API_KEY_ID"
echo "  APP_STORE_CONNECT_ISSUER_ID"
echo "  APP_STORE_CONNECT_API_KEY_BASE64"
echo "  APPLE_TEAM_ID"
echo "  ASC_APP_ID"
echo "  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64"
