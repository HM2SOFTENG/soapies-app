import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { DS } from './design';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ThemeScheme = 'light' | 'dark';

export const THEME_PREFERENCE_KEY = 'app_theme_preference';

function withAlpha(color: string, alpha: number) {
  const normalized = color.replace('#', '');
  if (normalized.length !== 6) return color;
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  const hexAlpha = Math.round(safeAlpha * 255).toString(16).padStart(2, '0').toUpperCase();
  return `#${normalized}${hexAlpha}`;
}

function createThemeColors(scheme: ThemeScheme) {
  const isDark = scheme === 'dark';
  const palette = isDark
    ? {
        ...DS.colors,
        background: DS.colors.bg,
        backgroundDeep: DS.colors.bgDeep,
        surface: DS.colors.surface,
        surfaceHigh: DS.colors.surfaceHi,
        card: DS.colors.card,
        cardHigh: DS.colors.cardHi,
        border: DS.colors.border,
        borderAccent: DS.colors.borderGlow,
        text: DS.colors.text,
        textSecondary: DS.colors.textSub,
        textMuted: DS.colors.textMuted,
        primary: DS.colors.pink,
        primaryStrong: DS.colors.pinkDeep,
        secondary: DS.colors.purple,
        success: DS.colors.green,
        warning: DS.colors.amber,
        danger: DS.colors.red,
        tabBar: 'rgba(12, 12, 26, 0.94)',
        tabBarBorder: 'rgba(236, 72, 153, 0.18)',
        tabBarInactive: '#8D88A8',
        overlay: 'rgba(0, 0, 0, 0.6)',
        switchTrackOff: '#1A1A30',
        switchThumb: '#FFFFFF',
      }
    : {
        ...DS.colors,
        bg: '#FFF8FC',
        bgDeep: '#F7EFFA',
        surface: '#FFFFFF',
        surfaceHi: '#FFF4FA',
        card: '#FFFFFF',
        cardHi: '#FFF0F8',
        border: '#ECDDEE',
        borderGlow: '#EC489924',
        text: '#241629',
        textSub: '#6C5C78',
        textMuted: '#8C7E95',
        white: '#FFFFFF',
        background: '#FFF8FC',
        backgroundDeep: '#F7EFFA',
        surfaceHigh: '#FFF4FA',
        cardHigh: '#FFF0F8',
        borderAccent: '#EC489924',
        textSecondary: '#6C5C78',
        primary: DS.colors.pink,
        primaryStrong: DS.colors.pinkDeep,
        secondary: DS.colors.purple,
        success: DS.colors.green,
        warning: DS.colors.amber,
        danger: DS.colors.red,
        tabBar: 'rgba(255, 248, 252, 0.96)',
        tabBarBorder: 'rgba(236, 72, 153, 0.16)',
        tabBarInactive: '#7B6F8D',
        overlay: 'rgba(36, 22, 41, 0.2)',
        switchTrackOff: '#E7DCEB',
        switchThumb: '#FFFFFF',
      };

  return {
    ...palette,
    page: palette.background,
    pageAlt: palette.backgroundDeep,
    pageHeader: isDark ? '#12051E' : '#FFF1F8',
    pageHeaderBorder: isDark ? '#1A1A30' : '#EAD6E7',
    floating: isDark ? '#0C0C1A' : '#FFF7FB',
    surfaceMuted: isDark ? '#0D0D18' : '#FAF0F7',
    input: isDark ? '#0C0C1A' : '#FFF4FA',
    icon: palette.textSecondary,
    iconStrong: palette.text,
    divider: palette.border,
    focusRing: withAlpha(palette.primary, isDark ? 0.38 : 0.24),
    tintSoft: withAlpha(palette.primary, isDark ? 0.12 : 0.08),
    tintMuted: withAlpha(palette.primary, isDark ? 0.2 : 0.12),
    successSoft: withAlpha(palette.success, isDark ? 0.16 : 0.12),
    warningSoft: withAlpha(palette.warning, isDark ? 0.16 : 0.12),
    dangerSoft: withAlpha(palette.danger, isDark ? 0.12 : 0.08),
    infoSoft: withAlpha('#67E8F9', isDark ? 0.18 : 0.12),
    successBorder: withAlpha(palette.success, isDark ? 0.4 : 0.26),
    warningBorder: withAlpha(palette.warning, isDark ? 0.4 : 0.24),
    dangerBorder: withAlpha(palette.danger, isDark ? 0.34 : 0.22),
    infoBorder: withAlpha('#67E8F9', isDark ? 0.36 : 0.24),
    shadow: isDark ? '#000000' : '#A14B7D',
    statusBar: (isDark ? 'light' : 'dark') as 'light' | 'dark',
  };
}

const darkGradients = {
  ...DS.grad,
  background: DS.grad.dark,
  cardSurface: DS.grad.card,
  screen: ['#12051E', '#080810'] as const,
} as const;

const lightGradients = {
  ...DS.grad,
  dark: ['#FFFFFF', '#F7EFFA'] as const,
  card: ['#FFF6FB', '#FFFFFF'] as const,
  background: ['#FFFFFF', '#F7EFFA'] as const,
  cardSurface: ['#FFF6FB', '#FFFFFF'] as const,
  screen: ['#FFF7FB', '#FFF1F8', '#FFF8FC'] as const,
} as const;

export type ThemeColors = ReturnType<typeof createThemeColors>;
export type AppTheme = {
  preference: ThemePreference;
  scheme: ThemeScheme;
  isDark: boolean;
  colors: ThemeColors;
  gradients: typeof darkGradients | typeof lightGradients;
  setPreference: (preference: ThemePreference) => Promise<void>;
  alpha: (color: string, alpha: number) => string;
};

const ThemeContext = createContext<AppTheme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_PREFERENCE_KEY)
      .then((value) => {
        if (value === 'light' || value === 'dark' || value === 'system') {
          setPreferenceState(value);
        }
      })
      .finally(() => setIsHydrated(true));
  }, []);

  const setPreference = async (nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, nextPreference);
  };

  const scheme: ThemeScheme = preference === 'system'
    ? (systemScheme === 'light' ? 'light' : 'dark')
    : preference;

  const value = useMemo<AppTheme>(() => ({
    preference,
    scheme,
    isDark: scheme === 'dark',
    colors: createThemeColors(scheme),
    gradients: scheme === 'dark' ? darkGradients : lightGradients,
    setPreference,
    alpha: withAlpha,
  }), [preference, scheme]);

  if (!isHydrated) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

export function useThemePreference() {
  const { preference, setPreference, scheme, isDark } = useTheme();
  return { preference, setPreference, scheme, isDark };
}

export { withAlpha };
