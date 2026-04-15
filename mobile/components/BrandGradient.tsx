/**
 * BrandGradient - Reusable brand color gradient component
 *
 * This component encapsulates the brand's signature pink-to-purple gradient
 * (or alternatives like vertical/diagonal) to keep gradient configuration DRY.
 * It's a thin wrapper around LinearGradient that applies sensible defaults
 * while allowing full customization of direction and colors.
 */

import React from 'react';
import { StyleProp, ViewStyle, ColorValue } from 'react-native';
import { LinearGradient, LinearGradientProps } from 'expo-linear-gradient';
import { colors } from '../lib/colors';

type GradientDirection = 'horizontal' | 'vertical' | 'diagonal';

interface BrandGradientProps extends Omit<LinearGradientProps, 'start' | 'end' | 'colors'> {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  direction?: GradientDirection;
  // Allow explicit overrides of start, end, or colors if needed
  start?: LinearGradientProps['start'];
  end?: LinearGradientProps['end'];
  colors?: readonly [ColorValue, ColorValue, ...ColorValue[]];
}

const directionMap: Record<GradientDirection, { start: LinearGradientProps['start']; end: LinearGradientProps['end'] }> = {
  horizontal: { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
  vertical: { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
  diagonal: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
};

export default function BrandGradient({
  children,
  style,
  direction = 'horizontal',
  start: explicitStart,
  end: explicitEnd,
  colors: explicitColors,
  ...restProps
}: BrandGradientProps) {
  const { start: defaultStart, end: defaultEnd } = directionMap[direction];

  return (
    <LinearGradient
      colors={(explicitColors || [colors.pink, colors.purple]) as readonly [ColorValue, ColorValue, ...ColorValue[]]}
      start={explicitStart || defaultStart}
      end={explicitEnd || defaultEnd}
      style={style}
      {...restProps}
    >
      {children}
    </LinearGradient>
  );
}
