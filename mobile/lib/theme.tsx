import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { DS } from './design';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ThemeScheme = 'light' | 'dark';

export const THEME_PREFERENCE_KEY = 'app_theme_preference';

const darkColors = {
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
};

const lightColors = {
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

const darkGradients = {
  ...DS.grad,
  background: DS.grad.dark,
  cardSurface: DS.grad.card,
} as const;

const lightGradients = {
  ...DS.grad,
  dark: ['#FFFFFF', '#F7EFFA'] as const,
  card: ['#FFF6FB', '#FFFFFF'] as const,
  background: ['#FFFFFF', '#F7EFFA'] as const,
  cardSurface: ['#FFF6FB', '#FFFFFF'] as const,
} as const;

export type AppTheme = {
  preference: ThemePreference;
  scheme: ThemeScheme;
  isDark: boolean;
  colors: typeof darkColors;
  gradients: typeof darkGradients | typeof lightGradients;
  setPreference: (preference: ThemePreference) => Promise<void>;
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
    colors: scheme === 'dark' ? darkColors : lightColors,
    gradients: scheme === 'dark' ? darkGradients : lightGradients,
    setPreference,
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
