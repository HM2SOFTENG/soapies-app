import React from 'react';
import { ScrollView, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../lib/theme';

type ThemedScreenProps = {
  children: React.ReactNode;
  edges?: Edge[];
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  gradientColors?: readonly string[];
  gradientStyle?: StyleProp<ViewStyle>;
  scrollProps?: Omit<ScrollViewProps, 'contentContainerStyle'>;
};

export default function ThemedScreen({
  children,
  edges = ['bottom'],
  scroll = false,
  style,
  contentContainerStyle,
  gradientColors,
  gradientStyle,
  scrollProps,
}: ThemedScreenProps) {
  const { colors, gradients } = useTheme();
  const background = gradientColors ?? gradients.screen;

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: colors.page }, style]} edges={edges}>
      <LinearGradient
        colors={background as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[{ flex: 1 }, gradientStyle]}
      >
        {scroll ? (
          <ScrollView contentContainerStyle={contentContainerStyle} {...scrollProps}>
            {children}
          </ScrollView>
        ) : children}
      </LinearGradient>
    </SafeAreaView>
  );
}
