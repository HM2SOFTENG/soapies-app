import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TICKET_TYPES = [
  { key: 'single_female', label: 'Single Woman' },
  { key: 'single_male', label: 'Single Man' },
  { key: 'couple', label: 'Couple' },
  { key: 'volunteer', label: 'Volunteer' },
] as const;

type TicketType = typeof TICKET_TYPES[number]['key'];

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketType, setTicketType] = useState<TicketType>('single_female');

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: event, isLoading } = trpc.events.byId.useQuery(
    { id: Number(id) },
    { enabled: !!id },
  );

  const reserveMutation = trpc.reservations.create.useMutation({
    onSuccess: () => {
      setShowTicketModal(false);
      Alert.alert('🎉 Reserved!', 'Your spot is confirmed. Check your tickets.');
    },
    onError: (e) => Alert.alert('Error', e.message),
  });

  const ev = event as any;

  // ── Loading / error states ─────────────────────────────────────────────────
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
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.pink }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUrl = ev.coverImageUrl ?? ev.imageUrl;
  const title = ev.title ?? ev.name ?? 'Event';
  const dateStr = ev.startDate
    ? new Date(ev.startDate).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : 'TBD';
  const timeStr = ev.startDate
    ? new Date(ev.startDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '';

  function getPriceForTicketType(t: TicketType) {
    switch (t) {
      case 'single_female': return ev.priceSingleFemale ? `$${parseFloat(ev.priceSingleFemale).toFixed(0)}` : 'Free';
      case 'single_male': return ev.priceSingleMale ? `$${parseFloat(ev.priceSingleMale).toFixed(0)}` : 'Free';
      case 'couple': return ev.priceCouple ? `$${parseFloat(ev.priceCouple).toFixed(0)}` : 'Free';
      case 'volunteer': return 'Free';
    }
  }

  function handleReserve() {
    reserveMutation.mutate({
      eventId: Number(id),
      ticketType,
      paymentMethod: 'venmo',
      paymentStatus: 'pending',
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <View style={{ height: 280, position: 'relative' }}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={['#7C3AED', '#EC4899']}
              style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="calendar" size={60} color="rgba(255,255,255,0.4)" />
            </LinearGradient>
          )}
          {/* Gradient overlay for readability */}
          <LinearGradient
            colors={['transparent', 'rgba(13,13,13,0.7)']}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 }}
          />
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
          {(ev.communityId || ev.community?.name) && (
            <View style={{
              alignSelf: 'flex-start',
              backgroundColor: `${colors.purple}22`,
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 4,
              marginBottom: 10,
            }}>
              <Text style={{ color: colors.purple, fontSize: 12, fontWeight: '700' }}>
                {ev.communityId ?? ev.community?.name}
              </Text>
            </View>
          )}

          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: 16 }}>
            {title}
          </Text>

          {/* Meta rows */}
          {[
            { icon: 'calendar-outline' as const, text: `${dateStr}${timeStr ? ' · ' + timeStr : ''}` },
            ev.venue ? { icon: 'location-outline' as const, text: ev.venue } : null,
          ].filter(Boolean).map((item: any, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Ionicons name={item.icon} size={18} color={colors.pink} />
              <Text style={{ color: colors.muted, marginLeft: 10, fontSize: 15 }}>{item.text}</Text>
            </View>
          ))}

          {/* Pricing */}
          <View style={{ marginTop: 16, marginBottom: 10 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 10 }}>
              Tickets
            </Text>
            {TICKET_TYPES.map(t => (
              <View key={t.key} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: colors.muted, fontSize: 14 }}>{t.label}</Text>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                  {getPriceForTicketType(t.key)}
                </Text>
              </View>
            ))}
          </View>

          {ev.description && (
            <>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 17, marginTop: 16, marginBottom: 8 }}>
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
        <TouchableOpacity onPress={() => setShowTicketModal(true)} activeOpacity={0.85}>
          <LinearGradient
            colors={[colors.pink, colors.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Reserve Now</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Ticket type selection modal */}
      <Modal visible={showTicketModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.bg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: insets.bottom + 20,
              borderColor: colors.border,
              borderTopWidth: 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', flex: 1 }}>
                Select Ticket Type
              </Text>
              <TouchableOpacity onPress={() => setShowTicketModal(false)}>
                <Ionicons name="close" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {TICKET_TYPES.map(t => (
              <TouchableOpacity
                key={t.key}
                onPress={() => setTicketType(t.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: ticketType === t.key ? `${colors.pink}22` : colors.card,
                  borderColor: ticketType === t.key ? colors.pink : colors.border,
                  borderWidth: 1,
                  marginBottom: 10,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>{t.label}</Text>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>{getPriceForTicketType(t.key)}</Text>
                </View>
                {ticketType === t.key && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.pink} />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={handleReserve}
              disabled={reserveMutation.isPending}
              activeOpacity={0.85}
              style={{ marginTop: 8 }}
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
                    Confirm Reservation
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
