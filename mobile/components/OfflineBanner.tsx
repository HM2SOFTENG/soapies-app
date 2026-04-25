import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

/**
 * OfflineBanner — shows when device has no internet.
 * Subscribes to NetInfo and slides a red banner in from the top
 * when the device loses connectivity.
 */
export default function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;

    // Initial state — don't flash the banner during the first connectivity probe
    NetInfo.fetch()
      .then((state: NetInfoState) => {
        if (cancelled) return;
        const connected =
          state.isConnected !== false && state.isInternetReachable !== false;
        setIsConnected(connected);
      })
      .catch(() => {
        // Ignore — leave as null (no-op)
      });

    // Subscribe to changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected =
        state.isConnected !== false && state.isInternetReachable !== false;
      setIsConnected(connected);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // Animate slide down when offline, slide up when online
  useEffect(() => {
    if (isConnected === false) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else if (isConnected === true) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [isConnected, slideAnim]);

  // Only render if definitely offline; null = no-op (first probe pending, or online)
  if (isConnected !== false) {
    return null;
  }

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-70, 0],
  });

  return (
    <Animated.View
      style={[
        {
          transform: [{ translateY }],
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 999,
        },
      ]}
    >
      <View
        style={{
          backgroundColor: '#DC2626',
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
        }}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '600',
            lineHeight: 20,
          }}
        >
          You&apos;re offline — some features may not work.
        </Text>
      </View>
    </Animated.View>
  );
}
