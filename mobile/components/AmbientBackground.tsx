import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, Dimensions } from 'react-native';
import { DS } from '../lib/design';

const { width: W, height: H } = Dimensions.get('window');

function GlowOrb({ x, y, size, color, delay }: { x: number; y: number; size: number; color: string; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, { toValue: 1, duration: 4000, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 4000, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.12] });
  const scale   = anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] });
  return (
    <Animated.View style={{ position: 'absolute', left: x - size/2, top: y - size/2, width: size, height: size, borderRadius: size/2, backgroundColor: color, opacity, transform: [{ scale }] }} />
  );
}

export default function AmbientBackground() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <GlowOrb x={W*0.15} y={H*0.2}  size={W*0.8} color={DS.colors.purple} delay={0}    />
      <GlowOrb x={W*0.85} y={H*0.35} size={W*0.7} color={DS.colors.pink}   delay={2000} />
      <GlowOrb x={W*0.5}  y={H*0.75} size={W*0.6} color={DS.colors.violet} delay={1000} />
    </View>
  );
}
