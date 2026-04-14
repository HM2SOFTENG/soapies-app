import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import EventCard from '../../components/EventCard';
import { Ionicons } from '@expo/vector-icons';

const COMMUNITIES = ['All', 'Soapies', 'Groupus', 'Gaypeez'];

export default function EventsScreen() {
  const [selected, setSelected] = useState('All');

  const { data, isLoading, refetch } = trpc.events.list.useQuery({});

  const allEvents = (data as any)?.events ?? data ?? [];
  const filtered =
    selected === 'All'
      ? allEvents
      : allEvents.filter((e: any) =>
          e.community?.name?.toLowerCase() === selected.toLowerCase(),
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
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>Events</Text>
      </View>

      {/* Community Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
      >
        {COMMUNITIES.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => setSelected(c)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: selected === c ? colors.pink : colors.card,
              borderColor: selected === c ? colors.pink : colors.border,
              borderWidth: 1,
            }}
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
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.pink} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={({ item }) => <EventCard event={item} />}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="calendar-outline" size={48} color={colors.border} />
              <Text style={{ color: colors.muted, marginTop: 12, fontSize: 16 }}>
                No events yet
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
