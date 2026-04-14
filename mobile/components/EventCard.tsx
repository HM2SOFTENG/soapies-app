import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/colors';

type Props = { event: any };

export default function EventCard({ event }: Props) {
  const router = useRouter();
  const price = event.price ? `$${(event.price / 100).toFixed(2)}` : 'Free';
  const dateStr = event.startDate
    ? new Date(event.startDate).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
      })
    : 'TBD';

  return (
    <TouchableOpacity
      onPress={() => router.push(`/event/${event.id}`)}
      activeOpacity={0.85}
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        overflow: 'hidden',
        borderColor: colors.border,
        borderWidth: 1,
      }}
    >
      {/* Image */}
      <View style={{ height: 160 }}>
        {event.imageUrl ? (
          <Image source={{ uri: event.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={['#7C3AED', '#EC4899']}
            style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
          >
            <Ionicons name="calendar" size={44} color="rgba(255,255,255,0.4)" />
          </LinearGradient>
        )}
        {/* Date badge */}
        <View
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            backgroundColor: 'rgba(0,0,0,0.75)',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{dateStr}</Text>
        </View>
      </View>

      <View style={{ padding: 14 }}>
        {event.community?.name && (
          <Text style={{ color: colors.purple, fontSize: 11, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {event.community.name}
          </Text>
        )}
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16, marginBottom: 8 }}>
          {event.name ?? event.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {event.venue && (
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="location-outline" size={13} color={colors.muted} />
              <Text style={{ color: colors.muted, fontSize: 13, marginLeft: 4 }} numberOfLines={1}>
                {event.venue}
              </Text>
            </View>
          )}
          <View
            style={{
              backgroundColor: `${colors.pink}22`,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text style={{ color: colors.pink, fontWeight: '700', fontSize: 13 }}>{price}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
