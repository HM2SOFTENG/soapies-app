import appJson from './app.json';

const fallbackApiUrl = 'https://api.example.com';
const fallbackWebUrl = 'https://soapies.example.com';

const baseExpo = appJson.expo as any;
const version = process.env.EXPO_PUBLIC_APP_VERSION ?? baseExpo.version ?? '1.0.0';
const iosBuildNumber = process.env.IOS_BUILD_NUMBER ?? baseExpo.ios?.buildNumber ?? '1';
const androidVersionCode = Number(process.env.ANDROID_VERSION_CODE ?? baseExpo.android?.versionCode ?? 1);

export default () => ({
  ...appJson,
  expo: {
    ...baseExpo,
    name: 'Soapies',
    slug: 'soapies',
    scheme: 'soapies',
    version,
    extra: {
      ...(baseExpo.extra ?? {}),
      env: process.env.EXPO_PUBLIC_ENVIRONMENT ?? 'development',
      eas: {
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID ?? 'e838de7c-c450-4eab-85a0-3e98440771fc',
      },
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? fallbackApiUrl,
      webUrl: process.env.EXPO_PUBLIC_WEB_URL ?? fallbackWebUrl,
    },
    ios: {
      ...baseExpo.ios,
      bundleIdentifier: process.env.EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER ?? baseExpo.ios?.bundleIdentifier ?? 'com.yourcompany.soapi​​es',
      buildNumber: iosBuildNumber,
      associatedDomains: process.env.EXPO_PUBLIC_ASSOCIATED_DOMAINS
        ? process.env.EXPO_PUBLIC_ASSOCIATED_DOMAINS.split(',').map((v: string) => v.trim()).filter(Boolean)
        : baseExpo.ios?.associatedDomains,
    },
    android: {
      ...baseExpo.android,
      package: process.env.EXPO_PUBLIC_ANDROID_PACKAGE ?? baseExpo.android?.package ?? 'com.yourcompany.soapies',
      versionCode: androidVersionCode,
    },
    updates: {
      ...(baseExpo.updates ?? {}),
      url: process.env.EXPO_PUBLIC_EAS_UPDATES_URL ?? baseExpo.updates?.url,
    },
  },
});
