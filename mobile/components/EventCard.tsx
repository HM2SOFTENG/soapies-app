import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../lib/colors';
import { communityColor } from '../lib/utils';

export interface EventCardEvent {
  id: number;
  title?: string | null;
  name?: string | null;
  coverImageUrl?: string | null;
  imageUrl?: string | null;
  startDate?: string | Date | null;
  venue?: string | null;
  communityId?: string | null;
  community?: { name?: string | null } | null;
  priceSingleMale?: string | null;
  priceSingleFemale?: string | null;
  priceCouple?: string | null;
  status?: string | null;
}

interface EventCardProps {
  event: EventCardEvent;
  onPress?: () => void;
}

export default function EventCard({ event, onPress }: EventCardProps) {
  const router = useRouter();
  const title = event.title ?? event.name ?? 'Untitled Event';
  const imageUrl = event.coverImageUrl ?? event.imageUrl;
  const community = event.communityId ?? event.community?.name;
  const badgeColor = communityColor(community);

  const dateStr = event.startDate
    ? new Date(event.startDate).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
      })
    : 'TBD';

  const lowestPrice = [event.priceSingleFemale, event.priceCouple, event.priceSingleMale]
    .filter(Boolean)
    .map(p => parseFloat(p!))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b)[0];

  const priceLabel = lowestPrice !== undefined ? `From $${lowestPrice.toFixed(0)}` : 'Free';

  function handlePress() {
    if (onPress) { onPress(); return; }
    router.push(`/event/${event.id}`);
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.9}
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        overflow: 'hidden',
        borderColor: colors.border,
        borderWidth: 1,
      }}
    >
      {/* Hero */}
      <View style={{ height: 160, position: 'relative' }}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={['#7C3AED', '#EC4899']}
            style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
          >
            <Ionicons name="calendar" size={40} color="rgba(255,255,255,0.3)" />
          </LinearGradient>
        )}
        {community && (
          <View
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
              backgroundColor: `${badgeColor}dd`,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
              {community.charAt(0).toUpperCase() + community.slice(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={{ padding: 14 }}>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 6 }} numberOfLines={2}>
          {title}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
            <Ionicons name="calendar-outline" size={13} color={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 13 }}>{dateStr}</Text>
          </View>

          {event.venue && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
              <Ionicons name="location-outline" size={13} color={colors.muted} />
              <Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>{event.venue}</Text>
            </View>
          )}

          <View
            style={{
              backgroundColor: `${colors.pink}22`,
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: colors.pink, fontSize: 12, fontWeight: '700' }}>{priceLabel}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
