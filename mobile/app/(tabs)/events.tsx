import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  Pressable,
  ScrollView,
  Animated,
} from 'react-native';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import EventCard from '../../components/EventCard';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const COMMUNITIES = ['All', 'Soapies', 'Groupus', 'Gaypeez'];

// ── Skeleton loader ───────────────────────────────────────────────────────────
function EventSkeleton() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        opacity,
        backgroundColor: colors.card,
        borderRadius: 16,
        overflow: 'hidden',
        borderColor: colors.border,
        borderWidth: 1,
        marginBottom: 12,
      }}
    >
      {/* Image placeholder */}
      <View style={{ height: 160, backgroundColor: colors.border }} />
      {/* Text lines */}
      <View style={{ padding: 16, gap: 10 }}>
        <View style={{ width: '75%', height: 14, borderRadius: 7, backgroundColor: colors.border }} />
        <View style={{ width: '50%', height: 11, borderRadius: 5, backgroundColor: colors.border }} />
      </View>
    </Animated.View>
  );
}

export default function EventsScreen() {
  const [selected, setSelected] = useState('All');

  const { data, isLoading } = trpc.events.list.useQuery({}, {
    staleTime: 120_000,
    refetchOnWindowFocus: true,
  });

  const allEvents = useMemo(() => (data as any)?.events ?? data ?? [], [data]);
  const filtered = useMemo(
    () =>
      selected === 'All'
        ? allEvents
        : allEvents.filter((e: any) =>
            e.community?.name?.toLowerCase() === selected.toLowerCase(),
          ),
    [allEvents, selected],
  );

  const renderEvent = useCallback(
    ({ item }: { item: any }) => <EventCard event={item} />,
    [],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '700' }}>Events</Text>
      </View>

      {/* Community Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
      >
        {COMMUNITIES.map((c) => (
          <Pressable
            key={c}
            onPress={() => {
              Haptics.selectionAsync();
              setSelected(c);
            }}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: selected === c ? colors.pink : colors.card,
              borderColor: selected === c ? colors.pink : colors.border,
              borderWidth: 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
          >
            <Text
              style={{
                color: selected === c ? '#fff' : colors.muted,
                fontWeight: '600',
                fontSize: 13,
              }}
            >
              {c}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={{ padding: 16 }}>
          <EventSkeleton />
          <EventSkeleton />
          <EventSkeleton />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={renderEvent}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={8}
          updateCellsBatchingPeriod={50}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🎉</Text>
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 18,
                  fontWeight: '600',
                  textAlign: 'center',
                  marginBottom: 8,
                }}
              >
                No events yet
              </Text>
              <Text
                style={{
                  color: '#9CA3AF',
                  fontSize: 15,
                  fontWeight: '400',
                  textAlign: 'center',
                }}
              >
                Check back soon — something exciting is always brewing
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
