import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: event, isLoading } = trpc.events.detail.useQuery({ id: Number(id) });
  const reserveMutation = trpc.events.reserve.useMutation({
    onSuccess: () => Alert.alert('🎉 Reserved!', 'Your spot is confirmed. Check My Tickets.'),
    onError: (e) => Alert.alert('Error', e.message),
  });

  const ev = event as any;

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.pink} size="large" />
      </View>
    );
  }

  if (!ev) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.muted }}>Event not found</Text>
      </View>
    );
  }

  const price = ev.price ? `$${(ev.price / 100).toFixed(2)}` : 'Free';
  const dateStr = ev.startDate ? new Date(ev.startDate).toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  }) : 'TBD';
  const timeStr = ev.startDate ? new Date(ev.startDate).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  }) : '';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <View style={{ height: 280, position: 'relative' }}>
          {ev.imageUrl ? (
            <Image source={{ uri: ev.imageUrl }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <LinearGradient
              colors={['#7C3AED', '#EC4899']}
              style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="calendar" size={60} color="rgba(255,255,255,0.4)" />
            </LinearGradient>
          )}
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              position: 'absolute',
              top: insets.top + 10,
              left: 16,
              backgroundColor: 'rgba(0,0,0,0.6)',
              borderRadius: 20,
              padding: 8,
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={{ padding: 20 }}>
          {/* Community badge */}
          {ev.community?.name && (
            <View style={{
              alignSelf: 'flex-start',
              backgroundColor: `${colors.purple}22`,
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 4,
              marginBottom: 10,
            }}>
              <Text style={{ color: colors.purple, fontSize: 12, fontWeight: '700' }}>
                {ev.community.name}
              </Text>
            </View>
          )}

          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: 12 }}>
            {ev.name ?? ev.title}
          </Text>

          {/* Meta */}
          {[
            { icon: 'calendar-outline', text: `${dateStr}${timeStr ? ' · ' + timeStr : ''}` },
            ev.venue && { icon: 'location-outline', text: ev.venue },
            { icon: 'pricetag-outline', text: price },
          ].filter(Boolean).map((item: any, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Ionicons name={item.icon} size={18} color={colors.pink} />
              <Text style={{ color: colors.muted, marginLeft: 10, fontSize: 15 }}>{item.text}</Text>
            </View>
          ))}

          {ev.description && (
            <>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 17, marginTop: 20, marginBottom: 10 }}>
                About
              </Text>
              <Text style={{ color: colors.muted, lineHeight: 22, fontSize: 15 }}>
                {ev.description}
              </Text>
            </>
          )}
        </View>
      </ScrollView>

      {/* Reserve CTA */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 20,
          paddingBottom: insets.bottom + 16,
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        }}
      >
        <TouchableOpacity
          onPress={() => reserveMutation.mutate({ eventId: Number(id) })}
          disabled={reserveMutation.isPending}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[colors.pink, colors.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              opacity: reserveMutation.isPending ? 0.7 : 1,
            }}
          >
            {reserveMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                Reserve Now · {price}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}
