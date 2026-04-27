import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Dimensions, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: W, height: H } = Dimensions.get('window');

function Ring({ size, delay, color }: { size: number; delay: number; color: string }) {
  const scale = useRef(new Animated.Value(0.55)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    const run = () => {
      if (!mounted) return;
      scale.setValue(0.55);
      opacity.setValue(0.55);
      Animated.parallel([
        Animated.timing(scale, { toValue: 1.55, duration: 2400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ]).start(() => {
        if (mounted) setTimeout(run, delay);
      });
    };

    const timer = setTimeout(run, delay);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [delay, opacity, scale]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

function FloatingBlob({
  size,
  color,
  startX,
  startY,
  travelX,
  travelY,
  duration,
  delay = 0,
}: {
  size: number;
  color: string;
  startX: number;
  startY: number;
  travelX: number;
  travelY: number;
  duration: number;
  delay?: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(progress, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [delay, duration, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [startX, startX + travelX],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [startY, startY + travelY],
  });
  const scale = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.12, 1] });
  const opacity = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.32, 0.5, 0.32] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        transform: [{ translateX }, { translateY }, { scale }],
        opacity,
      }}
    />
  );
}

function Sparkle({
  index,
  total,
  progress,
}: {
  index: number;
  total: number;
  progress: Animated.Value;
}) {
  const angle = (index / total) * 2 * Math.PI;
  const radius = 108;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  const translateY = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, index % 2 === 0 ? -10 : 8, 0],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.25, 0.9, 0.25],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 1.3, 0.8],
  });

  const colors = ['#F9A8D4', '#EC4899', '#C084FC', '#A855F7', '#F5D0FE', '#F472B6'];

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 8,
        height: 8,
        borderRadius: 999,
        backgroundColor: colors[index % colors.length],
        opacity,
        transform: [{ translateY }, { scale }],
        shadowColor: colors[index % colors.length],
        shadowOpacity: 0.7,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
      }}
    />
  );
}

export default function LoadingScreen() {
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textLift = useRef(new Animated.Value(18)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const sparklePulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 7,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(textOpacity, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(textLift, { toValue: 0, duration: 650, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: 2200, useNativeDriver: false }),
    ]).start();

    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloat, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(logoFloat, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );

    const rotateLoop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 14000,
        useNativeDriver: true,
      })
    );

    const sparkleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sparklePulse, { toValue: 1, duration: 1300, useNativeDriver: true }),
        Animated.timing(sparklePulse, { toValue: 0, duration: 1300, useNativeDriver: true }),
      ])
    );

    shimmerLoop.start();
    floatLoop.start();
    rotateLoop.start();
    sparkleLoop.start();

    return () => {
      shimmerLoop.stop();
      floatLoop.stop();
      rotateLoop.stop();
      sparkleLoop.stop();
    };
  }, [
    cardOpacity,
    cardScale,
    logoFloat,
    progress,
    rotation,
    shimmer,
    sparklePulse,
    textLift,
    textOpacity,
  ]);

  const cardTranslateY = logoFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const shimmerX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-180, 220] });
  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const reverseSpin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });

  const sparkles = Array.from({ length: 10 });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#12041F', '#2A0C45', '#4C136F', '#5B167A']}
        style={StyleSheet.absoluteFill}
      />

      <FloatingBlob
        size={320}
        color="rgba(244, 114, 182, 0.18)"
        startX={-90}
        startY={110}
        travelX={40}
        travelY={35}
        duration={9000}
      />
      <FloatingBlob
        size={260}
        color="rgba(192, 132, 252, 0.18)"
        startX={W - 200}
        startY={H * 0.18}
        travelX={-30}
        travelY={45}
        duration={8400}
        delay={300}
      />
      <FloatingBlob
        size={380}
        color="rgba(236, 72, 153, 0.12)"
        startX={W * 0.35}
        startY={H * 0.64}
        travelX={-28}
        travelY={-34}
        duration={9800}
        delay={500}
      />
      <FloatingBlob
        size={180}
        color="rgba(245, 208, 254, 0.12)"
        startX={W * 0.12}
        startY={H * 0.72}
        travelX={24}
        travelY={-24}
        duration={7600}
        delay={200}
      />

      <View style={styles.noiseOverlay} />

      <View style={styles.centerWrap}>
        <Animated.View style={[styles.orbitRingOuter, { transform: [{ rotate: spin }] }]} />
        <Animated.View style={[styles.orbitRingInner, { transform: [{ rotate: reverseSpin }] }]} />

        <View style={styles.sparkleField} pointerEvents="none">
          {sparkles.map((_, i) => (
            <Sparkle key={i} index={i} total={sparkles.length} progress={sparklePulse} />
          ))}
        </View>

        <Ring size={180} delay={0} color="rgba(249, 168, 212, 0.34)" />
        <Ring size={180} delay={700} color="rgba(216, 180, 254, 0.28)" />
        <Ring size={180} delay={1400} color="rgba(236, 72, 153, 0.2)" />

        <Animated.View
          style={[
            styles.cardShell,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }, { translateY: cardTranslateY }],
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(30, 8, 53, 0.92)', 'rgba(49, 12, 82, 0.82)', 'rgba(23, 6, 38, 0.92)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.glassHighlight} />
            <View style={styles.glassReflection} />
            <View style={styles.innerGlow} />

            <Animated.View
              style={[
                styles.shimmerSweep,
                { transform: [{ translateX: shimmerX }, { rotate: '-12deg' }] },
              ]}
            >
              <LinearGradient
                colors={[
                  'transparent',
                  'rgba(255,255,255,0.22)',
                  'rgba(255,255,255,0.08)',
                  'transparent',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            <View style={styles.logoFrame}>
              <LinearGradient
                colors={['rgba(236,72,153,0.24)', 'rgba(168,85,247,0.2)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoFrameInner}
              >
                <Image
                  source={require('../assets/icon.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </LinearGradient>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textLift }] }}>
          <Text style={styles.appName}>Soapies</Text>
          <Text style={styles.tagline}>Loading your private playground</Text>
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.bottomPanel,
          { opacity: textOpacity, transform: [{ translateY: textLift }] },
        ]}
      >
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth as any }]}>
            <LinearGradient
              colors={['#F472B6', '#EC4899', '#C084FC', '#A855F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <Animated.View
            style={[styles.progressShine, { transform: [{ translateX: shimmerX }] }]}
          />
        </View>
        <Text style={styles.loadingText}>Preparing events, chats, and connections...</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#12041F',
    alignItems: 'center',
    justifyContent: 'center',
  },

  noiseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },

  centerWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  orbitRingOuter: {
    position: 'absolute',
    width: 244,
    height: 244,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderStyle: 'solid',
  },

  orbitRingInner: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(244,114,182,0.16)',
  },

  sparkleField: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardShell: {
    width: 228,
    height: 228,
    borderRadius: 42,
    overflow: 'hidden',
    shadowColor: '#EC4899',
    shadowOpacity: 0.36,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
    elevation: 26,
    marginBottom: 34,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  cardGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },

  glassHighlight: {
    position: 'absolute',
    top: -18,
    left: 16,
    right: 16,
    height: 74,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  glassReflection: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: 30,
    left: -18,
  },

  innerGlow: {
    position: 'absolute',
    width: 134,
    height: 134,
    borderRadius: 999,
    backgroundColor: 'rgba(236,72,153,0.18)',
    shadowColor: '#C084FC',
    shadowOpacity: 0.6,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
  },

  shimmerSweep: {
    position: 'absolute',
    width: 120,
    top: -30,
    bottom: -30,
    opacity: 0.85,
  },

  logoFrame: {
    width: 144,
    height: 144,
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#F472B6',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },

  logoFrameInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },

  logo: {
    width: '100%',
    height: '100%',
  },

  appName: {
    color: '#FFF4FC',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.2,
    textAlign: 'center',
    textShadowColor: 'rgba(244,114,182,0.3)',
    textShadowRadius: 18,
  },

  tagline: {
    color: 'rgba(255, 234, 248, 0.78)',
    fontSize: 15,
    marginTop: 8,
    letterSpacing: 0.35,
    textAlign: 'center',
  },

  bottomPanel: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 64,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    overflow: 'hidden',
  },

  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(29, 12, 46, 0.72)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  progressFill: {
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },

  progressShine: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.18)',
    opacity: 0.35,
    borderRadius: 999,
  },

  loadingText: {
    color: 'rgba(255, 240, 250, 0.82)',
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
