import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Dimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: W } = Dimensions.get('window');

function Ring({ size, delay, color }: { size: number; delay: number; color: string }) {
  const scale   = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = () => {
      scale.setValue(0.3);
      opacity.setValue(0.7);
      Animated.parallel([
        Animated.timing(scale,   { toValue: 1.6, duration: 2200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0,   duration: 2200, useNativeDriver: true }),
      ]).start(() => setTimeout(loop, delay));
    };
    setTimeout(loop, delay);
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute',
      width: size, height: size, borderRadius: size / 2,
      borderWidth: 1.5, borderColor: color,
      opacity, transform: [{ scale }],
    }} />
  );
}

function Dot({ index, total, logoAnim }: { index: number; total: number; logoAnim: Animated.Value }) {
  const angle = (index / total) * 2 * Math.PI;
  const r = 52;
  const cx = Math.cos(angle) * r;
  const cy = Math.sin(angle) * r;

  const scale = logoAnim.interpolate({
    inputRange: [0, (index / total), Math.min((index / total) + 0.15, 1), 1],
    outputRange: [0.3, 0.3, 1.2, 1],
    extrapolate: 'clamp',
  });
  const opacity = logoAnim.interpolate({
    inputRange: [0, (index / total) * 0.8, 1],
    outputRange: [0.2, 0.2, 1],
    extrapolate: 'clamp',
  });

  const colors = ['#EC4899', '#DB2777', '#A855F7', '#7C3AED', '#9333EA', '#C026D3'];

  return (
    <Animated.View style={{
      position: 'absolute',
      left: cx - 5, top: cy - 5,
      width: 10, height: 10, borderRadius: 5,
      backgroundColor: colors[index % colors.length],
      opacity, transform: [{ scale }],
    }} />
  );
}

export default function LoadingScreen() {
  const logoScale   = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const dotsProgress = useRef(new Animated.Value(0)).current;
  const barWidth     = useRef(new Animated.Value(0)).current;
  const shimmer      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale,   { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(dotsProgress, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(barWidth, { toValue: 1, duration: 1200, useNativeDriver: false }),
    ]).start();

    // Shimmer loop
    const shimmerLoop = () => {
      shimmer.setValue(0);
      Animated.timing(shimmer, { toValue: 1, duration: 1400, useNativeDriver: true }).start(shimmerLoop);
    };
    setTimeout(shimmerLoop, 400);
  }, []);

  const shimmerX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-120, 120] });
  const barInterp = barWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const dots = Array.from({ length: 6 });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#050508', '#0A0515', '#0D0820']}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient glow */}
      <View style={styles.glow1} />
      <View style={styles.glow2} />

      {/* Center logo + rings */}
      <View style={styles.logoArea}>
        {/* Pulse rings */}
        <Ring size={140} delay={0}    color="#EC489955" />
        <Ring size={140} delay={750}  color="#A855F744" />
        <Ring size={140} delay={1500} color="#7C3AED33" />

        {/* Orbiting dots */}
        <View style={{ width: 140, height: 140, alignItems: 'center', justifyContent: 'center' }}>
          {dots.map((_, i) => (
            <Dot key={i} index={i} total={dots.length} logoAnim={dotsProgress} />
          ))}

          {/* Logo pill */}
          <Animated.View style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }}>
            <View style={styles.logoPill}>
              <LinearGradient
                colors={['#7C3AED', '#EC4899', '#A855F7']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.logoPillInner}
              >
                {/* Shimmer */}
                <Animated.View style={[styles.shimmerBar, { transform: [{ translateX: shimmerX }] }]}>
                  <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,0.18)', 'transparent']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ flex: 1 }}
                  />
                </Animated.View>
                <Text style={styles.logoLetter}>S</Text>
              </LinearGradient>
            </View>
          </Animated.View>
        </View>
      </View>

      {/* Text */}
      <Animated.View style={{ alignItems: 'center', opacity: textOpacity }}>
        <Text style={styles.appName}>Soapies</Text>
        <Text style={styles.tagline}>Your Private Playground</Text>
      </Animated.View>

      {/* Loading bar */}
      <View style={styles.barContainer}>
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, { width: barInterp as any }]}>
            <LinearGradient
              colors={['#EC4899', '#A855F7']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ flex: 1, borderRadius: 3 }}
            />
          </Animated.View>
        </View>
        <Animated.Text style={[styles.loadingText, { opacity: textOpacity }]}>
          Loading your world...
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#050508',
    alignItems: 'center', justifyContent: 'center',
  },

  glow1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: '#7C3AED0D', top: '20%', left: '-10%',
  },
  glow2: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: '#EC48990A', bottom: '25%', right: '-5%',
  },

  logoArea: {
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 36,
  },

  logoPill: {
    width: 72, height: 72, borderRadius: 20, overflow: 'hidden',
    shadowColor: '#EC4899', shadowOpacity: 0.7, shadowRadius: 20, shadowOffset: { width: 0, height: 4 },
    elevation: 16,
  },
  logoPillInner: {
    flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  shimmerBar: {
    position: 'absolute', top: 0, bottom: 0, width: 60,
  },
  logoLetter: { color: '#fff', fontSize: 34, fontWeight: '900' },

  appName: {
    color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -1,
    textShadowColor: '#EC489955', textShadowRadius: 16,
  },
  tagline: {
    color: '#6B7280', fontSize: 14, marginTop: 6, letterSpacing: 0.4,
  },

  barContainer: { position: 'absolute', bottom: 72, left: 48, right: 48, alignItems: 'center' },
  barTrack: {
    height: 4, backgroundColor: '#1A1A2E', borderRadius: 3,
    overflow: 'hidden', width: '100%',
  },
  barFill: { height: '100%' },
  loadingText: { color: '#4B5563', fontSize: 12, marginTop: 10, letterSpacing: 0.5 },
});
