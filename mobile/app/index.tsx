import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width: W, height: H } = Dimensions.get('window');

// ─── Floating orb ────────────────────────────────────────────────────────────
function Orb({
  size,
  color,
  startX,
  startY,
  delay,
  duration,
}: {
  size: number;
  color: string;
  startX: number;
  startY: number;
  delay: number;
  duration: number;
}) {
  const y = useRef(new Animated.Value(0)).current;
  const x = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Fade + scale in
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.55, duration: 1200, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      ]),
    ]).start();

    // Float loop
    const floatLoop = () => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(y, { toValue: -28, duration: duration, useNativeDriver: true }),
          Animated.timing(x, { toValue: 12, duration: duration * 0.7, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(y, { toValue: 14, duration: duration * 0.9, useNativeDriver: true }),
          Animated.timing(x, { toValue: -8, duration: duration * 1.1, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(y, { toValue: 0, duration: duration * 0.8, useNativeDriver: true }),
          Animated.timing(x, { toValue: 0, duration: duration, useNativeDriver: true }),
        ]),
      ]).start(floatLoop);
    };

    const t = setTimeout(floatLoop, delay + 800);
    return () => clearTimeout(t);
  }, [delay, duration, opacity, scale, x, y]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        top: startY,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY: y }, { translateX: x }, { scale }],
      }}
    />
  );
}

// ─── Particle ─────────────────────────────────────────────────────────────────
function Particle({ x, y, delay }: { x: number; y: number; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = () => {
      anim.setValue(0);
      Animated.sequence([
        Animated.delay(delay + Math.random() * 2000),
        Animated.timing(anim, {
          toValue: 1,
          duration: 2500 + Math.random() * 1500,
          useNativeDriver: true,
        }),
      ]).start(loop);
    };
    loop();
  }, [anim, delay]);

  const opacity = anim.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0, 1, 1, 0] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -60] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#EC4899',
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

// ─── Ring ────────────────────────────────────────────────────────────────────
function PulseRing({ size, delay, color }: { size: number; delay: number; color: string }) {
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = () => {
      scale.setValue(0.4);
      opacity.setValue(0.6);
      Animated.parallel([
        Animated.timing(scale, { toValue: 1.8, duration: 3200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 3200, useNativeDriver: true }),
      ]).start(() => setTimeout(loop, delay));
    };
    setTimeout(loop, delay);
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
        alignSelf: 'center',
      }}
    />
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LandingScreen() {
  const router = useRouter();

  // Entrance animations
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const tagY = useRef(new Animated.Value(20)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const btnY = useRef(new Animated.Value(40)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(tagOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(tagY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(badgeOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(btnOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(btnY, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();
  }, [badgeOpacity, btnOpacity, btnY, logoOpacity, logoScale, tagOpacity, tagY]);

  // Logo shimmer
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = () => {
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ]).start(loop);
    };
    setTimeout(loop, 1200);
  }, [shimmer]);

  const shimmerTranslate = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-W, W] });

  const particles = Array.from({ length: 18 }, (_, i) => ({
    x: Math.random() * W,
    y: Math.random() * H,
    delay: i * 300,
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Deep background gradient */}
      <LinearGradient
        colors={['#050508', '#0A0515', '#0D0820', '#0A0010']}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Orbs */}
      <Orb size={280} color="#7C3AED" startX={-80} startY={-60} delay={0} duration={4000} />
      <Orb size={240} color="#EC4899" startX={W - 160} startY={H / 2} delay={300} duration={4500} />
      <Orb
        size={180}
        color="#A855F7"
        startX={W / 2 - 60}
        startY={H - 180}
        delay={600}
        duration={3800}
      />
      <Orb size={120} color="#DB2777" startX={W * 0.7} startY={80} delay={900} duration={5000} />
      <Orb size={90} color="#6D28D9" startX={40} startY={H * 0.6} delay={1200} duration={4200} />
      <Orb
        size={60}
        color="#EC4899"
        startX={W * 0.3}
        startY={H * 0.8}
        delay={400}
        duration={3500}
      />

      {/* Pulse rings centered */}
      <View
        style={{ position: 'absolute', top: H * 0.38, left: 0, right: 0, alignItems: 'center' }}
      >
        <PulseRing size={160} delay={0} color="#EC489966" />
        <PulseRing size={160} delay={1100} color="#A855F744" />
        <PulseRing size={160} delay={2200} color="#7C3AED33" />
      </View>

      {/* Particles */}
      {particles.map((p, i) => (
        <Particle key={i} x={p.x} y={p.y} delay={p.delay} />
      ))}

      {/* Mesh lines — decorative */}
      <View style={[styles.meshLine, { top: H * 0.25, transform: [{ rotate: '-15deg' }] }]} />
      <View style={[styles.meshLine, { top: H * 0.55, transform: [{ rotate: '12deg' }] }]} />
      <View style={[styles.meshLineV, { left: W * 0.2 }]} />
      <View style={[styles.meshLineV, { left: W * 0.8 }]} />

      {/* Content */}
      <View style={styles.content}>
        {/* Logo area */}
        <Animated.View
          style={{
            alignItems: 'center',
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }}
        >
          {/* Logo pill with shimmer */}
          <View style={styles.logoPill}>
            <LinearGradient
              colors={['#7C3AED', '#EC4899', '#A855F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoPillGradient}
            >
              {/* Shimmer overlay */}
              <Animated.View
                style={[styles.shimmerOverlay, { transform: [{ translateX: shimmerTranslate }] }]}
              >
                <LinearGradient
                  colors={['transparent', 'rgba(255,255,255,0.15)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1 }}
                />
              </Animated.View>

              <Text style={styles.logoText}>S</Text>
            </LinearGradient>
          </View>

          <Text style={styles.appName}>Soapies</Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View
          style={{
            alignItems: 'center',
            marginTop: 16,
            opacity: tagOpacity,
            transform: [{ translateY: tagY }],
          }}
        >
          <Text style={styles.tagline}>Your Private Playground</Text>
          <Text style={styles.taglineSub}>Members-only. Curated. Intimate.</Text>
        </Animated.View>

        {/* Community badge */}
        <Animated.View style={{ alignItems: 'center', marginTop: 24, opacity: badgeOpacity }}>
          <View style={styles.badgeRow}>
            {['🎉 Soapies', '💑 Groupies', '🌈 Gaypeez'].map((b) => (
              <View key={b} style={styles.badge}>
                <Text style={styles.badgeText}>{b}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>

      {/* Buttons */}
      <Animated.View
        style={[styles.buttons, { opacity: btnOpacity, transform: [{ translateY: btnY }] }]}
      >
        {/* Sign In */}
        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.88}
          style={{ width: '100%' }}
        >
          <LinearGradient
            colors={['#EC4899', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Sign In</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Join */}
        <TouchableOpacity
          onPress={() => router.push('/onboarding')}
          activeOpacity={0.88}
          style={[styles.secondaryBtn, { width: '100%' }]}
        >
          <Text style={styles.secondaryBtnText}>Apply to Join</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Invitation-only · 21+ · Sex-positive community</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050508' },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },

  logoPill: {
    width: 96,
    height: 96,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#EC4899',
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
  },
  logoPillGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '60%',
  },
  logoText: { color: '#fff', fontSize: 44, fontWeight: '900' },

  appName: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1.5,
    marginTop: 16,
    textShadowColor: '#EC489966',
    textShadowRadius: 20,
  },
  tagline: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  taglineSub: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
  },
  badgeText: { color: '#E5E7EB', fontSize: 12, fontWeight: '600' },

  buttons: {
    paddingHorizontal: 28,
    paddingBottom: 48,
    alignItems: 'center',
    gap: 12,
  },
  primaryBtn: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#EC4899',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },

  secondaryBtn: {
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(168,85,247,0.5)',
    backgroundColor: 'rgba(168,85,247,0.08)',
  },
  secondaryBtnText: { color: '#A855F7', fontSize: 17, fontWeight: '700' },

  footer: {
    color: '#4B5563',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },

  meshLine: {
    position: 'absolute',
    left: -W * 0.1,
    right: -W * 0.1,
    height: 1,
    backgroundColor: 'rgba(168,85,247,0.08)',
  },
  meshLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(236,72,153,0.06)',
  },
});
