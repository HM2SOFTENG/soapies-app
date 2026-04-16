import React, { useRef } from 'react';
import { Animated, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

interface PressableScaleProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scale?: number;
  haptic?: 'light' | 'medium' | 'selection' | 'none';
  disabled?: boolean;
  activeOpacity?: number;
}

export default function PressableScale({ children, onPress, style, scale = 0.94, haptic = 'light', disabled = false, activeOpacity = 1 }: PressableScaleProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  function onPressIn() { Animated.spring(scaleAnim, { toValue: scale, useNativeDriver: true, speed: 50, bounciness: 2 }).start(); }
  function onPressOut() { Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start(); }
  function handlePress() {
    if (haptic === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (haptic === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else if (haptic === 'selection') Haptics.selectionAsync();
    onPress?.();
  }
  return (
    <TouchableOpacity activeOpacity={activeOpacity} onPressIn={onPressIn} onPressOut={onPressOut} onPress={handlePress} disabled={disabled} style={style}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>{children}</Animated.View>
    </TouchableOpacity>
  );
}
