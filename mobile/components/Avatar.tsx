import React from 'react';
import { View, Text, Image, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../lib/colors';
import { getInitials } from '../lib/utils';

const SIZES = {
  sm: 32,
  md: 44,
  lg: 72,
  xl: 88,
} as const;

type AvatarSize = keyof typeof SIZES | number;

interface AvatarProps {
  name?: string | null;
  url?: string | null;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
}

const Avatar = React.memo(function Avatar({ name, url, size = 'md', style }: AvatarProps) {
  const px = typeof size === 'number' ? size : SIZES[size];
  const fontSize = px * 0.35;
  const borderRadius = px / 2;

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[{ width: px, height: px, borderRadius }, style as any]}
        resizeMode="cover"
      />
    );
  }

  return (
    <LinearGradient
      colors={[colors.pink, colors.purple]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ width: px, height: px, borderRadius, justifyContent: 'center', alignItems: 'center' }, style as any]}
    >
      <Text style={{ color: '#fff', fontSize, fontWeight: '700' }}>
        {getInitials(name)}
      </Text>
    </LinearGradient>
  );
});

export default Avatar;
