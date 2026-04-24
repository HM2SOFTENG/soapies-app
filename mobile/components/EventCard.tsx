import React, { useMemo, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../lib/theme';
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

const EventCard = React.memo(function EventCard({ event, onPress }: EventCardProps) {
  const router = useRouter();
  const theme = useTheme();
  const title = event.title ?? event.name ?? 'Untitled Event';
  const imageUrl = event.coverImageUrl ?? event.imageUrl;
  const community = event.communityId ?? event.community?.name;
  const badgeColor = useMemo(() => communityColor(community), [community]);

  const dateStr = useMemo(
    () =>
      event.startDate
        ? new Date(event.startDate).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })
        : 'TBD',
    [event.startDate],
  );

  const priceLabel = useMemo(() => {
    const lowestPrice = [event.priceSingleFemale, event.priceCouple, event.priceSingleMale]
      .filter(Boolean)
      .map((p) => parseFloat(p!))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b)[0];
    return lowestPrice !== undefined ? `From $${lowestPrice.toFixed(0)}` : 'Free';
  }, [event.priceSingleFemale, event.priceCouple, event.priceSingleMale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) {
      onPress();
      return;
    }
    router.push(`/event/${event.id}`);
  }, [onPress, router, event.id]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => ({
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        overflow: 'hidden',
        borderColor: theme.colors.border,
        borderWidth: 1,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      {/* Hero */}
      <View style={{ height: 160, position: 'relative' }}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        ) : (
          <LinearGradient
            colors={['#7C3AED', '#EC4899']}
            style={{
              width: '100%',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="calendar" size={40} color="rgba(255,255,255,0.3)" />
          </LinearGradient>
        )}
        {/* Subtle gradient overlay */}
        <LinearGradient
          colors={theme.isDark ? ['transparent', 'rgba(26,26,46,0.6)'] : ['transparent', 'rgba(255,248,252,0.12)']}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 }}
        />
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
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>
              {community.charAt(0).toUpperCase() + community.slice(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={{ padding: 16 }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 17,
            fontWeight: '700',
            marginBottom: 8,
          }}
          numberOfLines={2}
        >
          {title}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
            <Ionicons name="calendar-outline" size={13} color={theme.colors.textMuted} />
            <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: '400' }}>{dateStr}</Text>
          </View>

          {event.venue && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
              <Ionicons name="location-outline" size={13} color={theme.colors.textMuted} />
              <Text
                style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: '400' }}
                numberOfLines={1}
              >
                {event.venue}
              </Text>
            </View>
          )}

          <View
            style={{
              backgroundColor: theme.colors.tintSoft,
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: theme.colors.pink, fontSize: 11, fontWeight: '600' }}>
              {priceLabel}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

export default EventCard;
