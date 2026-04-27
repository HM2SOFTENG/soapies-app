import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DS } from '../lib/design';

interface GlassCardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glowColor?: string;
  animated?: boolean;
  intensity?: 'low' | 'medium' | 'high';
  radius?: number;
}

export default function GlassCard({
  children,
  style,
  glowColor = DS.colors.pink,
  animated = false,
  intensity = 'medium',
  radius = DS.r.lg,
}: GlassCardProps) {
  const glowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animated, glowAnim]);
  const bgAlpha = intensity === 'low' ? '0A' : intensity === 'high' ? '18' : '12';
  const borderAlpha = intensity === 'low' ? '20' : intensity === 'high' ? '50' : '35';
  const borderColor = animated
    ? glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [`${glowColor}30`, `${glowColor}70`],
      })
    : `${glowColor}${borderAlpha}`;
  return (
    <Animated.View
      style={[
        {
          backgroundColor: `${DS.colors.surface}${bgAlpha}`,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: borderColor as any,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[`${DS.colors.surfaceHi}60`, `${DS.colors.surface}30`, `${DS.colors.bgDeep}40`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {children}
    </Animated.View>
  );
}
