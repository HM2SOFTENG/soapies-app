import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../components/Toast';

const TICKET_TYPES = [
  { key: 'single_female', label: 'Single Woman' },
  { key: 'single_male', label: 'Single Man' },
  { key: 'couple', label: 'Couple' },
] as const;

type TicketType = typeof TICKET_TYPES[number]['key'];

export default function EventDetailScreen() {
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketType, setTicketType] = useState<TicketType>('single_female');
  const [partnerUserId, setPartnerUserId] = useState<number | null>(null);
  const [showPartnerPicker, setShowPartnerPicker] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [modalStep, setModalStep] = useState<'ticket' | 'partner'>('ticket');
  const [isQueerPlay, setIsQueerPlay] = useState(false);
  const [isVolunteer, setIsVolunteer] = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: event, isLoading } = trpc.events.byId.useQuery(
    { id: Number(id) },
    { enabled: !!id },
  );

  const { data: profileData } = trpc.profile.me.useQuery();
  const userGender = (profileData as any)?.gender?.toLowerCase() ?? '';

  const { data: membersData } = trpc.members.browse.useQuery(
    { page: 0 },
    { enabled: showTicketModal && ticketType === 'couple' },
  );

  const availableTicketTypes = TICKET_TYPES.filter(t => {
    if (t.key === 'couple') return true;
    if (!userGender) return true;
    const isMale = ['male', 'man', 'non-binary', 'nonbinary'].includes(userGender);
    const isFemale = ['female', 'woman'].includes(userGender);
    if (isMale && t.key === 'single_female') return false;
    if (isFemale && t.key === 'single_male') return false;
    return true;
  });

  const defaultTicketType = (): TicketType => {
    if (!userGender) return 'single_female';
    const isMale = ['male', 'man', 'non-binary', 'nonbinary'].includes(userGender);
    return isMale ? 'single_male' : 'single_female';
  };

  useEffect(() => {
    if (profileData) setTicketType(defaultTicketType());
  }, [profileData]);

  const { data: myReservations } = trpc.reservations.myReservations.useQuery(undefined, {
    staleTime: 30_000,
  });

  const { data: waitlistPosition, refetch: refetchWaitlist } = trpc.reservations.getWaitlistPosition.useQuery(
    { eventId: Number(id) },
    { enabled: !!id },
  );

  const reserveMutation = trpc.reservations.create.useMutation({
    onSuccess: () => {
      setShowTicketModal(false);
      setPartnerUserId(null);
      setModalStep('ticket');
      utils.reservations.myTickets.invalidate();
      utils.reservations.myReservations.invalidate();
      toast.success('🎉 Spot reserved! Check your tickets.');
    },
    onError: (e: any) => {
      // console.log('[EventDetail] reserve error:', e.message);
      toast.error(e.message);
    },
  });

  const joinWaitlistMutation = trpc.reservations.joinWaitlist.useMutation({
    onSuccess: () => {
      // console.log('[EventDetail] joined waitlist for event:', id);
      refetchWaitlist();
      Alert.alert('✅ Added to Waitlist', "We'll notify you if a spot opens up!");
    },
    onError: (e: any) => {
      // console.log('[EventDetail] waitlist error:', e.message);
      Alert.alert('Error', e.message);
    },
  });

  const checkoutMutation = trpc.reservations.createCheckoutSession.useMutation({
    onSuccess: async (result: any) => {
      if (result?.url) {
        // console.log('[EventDetail] opening stripe checkout:', result.url);
        await WebBrowser.openBrowserAsync(result.url);
      }
    },
    onError: (e: any) => {
      // console.log('[EventDetail] checkout error:', e.message);
      Alert.alert('Payment Error', e.message);
    },
  });

  const ev = event as any;

  // Check if user already has reservation for this event
  const existingReservation = (myReservations as any[])?.find(
    (r: any) => r.eventId === Number(id) && r.status !== 'cancelled',
  );

  const isAtCapacity = ev?.capacity && ev.capacity > 0 && (ev.currentAttendees ?? 0) >= ev.capacity;
  const hasWaitlistPos = (waitlistPosition as any)?.position;

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
    }
  }

  function handleVolunteerToggle() {
    if (!isVolunteer) {
      Alert.alert(
        '🙌 Volunteer Agreement',
        'By volunteering you agree to:\n\n• Pay full ticket price upfront via Venmo @KELLEN-BRENNAN\n• Arrive early and/or stay late to help with setup/teardown\n• Complete your assigned duties\n\nIf you fulfill your volunteer duties, admin will credit your full ticket price back to your account.\n\nIf you fail to show or complete duties without a valid excuse, you will NOT receive a refund and may face suspension from the community.\n\nDo you agree?',
        [
          { text: 'I Agree — Sign Me Up! 🙌', onPress: () => setIsVolunteer(true) },
          { text: 'Cancel', style: 'cancel', onPress: () => setIsVolunteer(false) },
        ]
      );
    } else {
      setIsVolunteer(false);
    }
  }

  function handleReserve() {
    reserveMutation.mutate({
      eventId: Number(id),
      ticketType,
      paymentMethod: 'venmo',
      paymentStatus: 'pending',
      partnerUserId: partnerUserId ?? undefined,
      isQueerPlay,
      orientationSignal: isQueerPlay ? 'queer' : 'straight',
      isVolunteer,
    });
  }

  function handleOpenTicketModal() {
    setModalStep('ticket');
    setPartnerUserId(null);
    setPartnerSearch('');
    setShowTicketModal(true);
  }

  // Filter members by opposite gender for couple ticket partner selection
  const allMembers = (membersData as any[]) ?? [];
  const filteredMembers = allMembers.filter((m: any) => {
    const mGender = (m.gender ?? '').toLowerCase();
    const search = partnerSearch.toLowerCase();
    const matchesSearch = !search || (m.displayName ?? '').toLowerCase().includes(search);
    if (!matchesSearch) return false;
    if (!userGender) return true;
    const isMale = ['male', 'man', 'trans male', 'transmale', 'non-binary', 'nonbinary'].includes(userGender);
    const isFemale = ['female', 'woman', 'trans female', 'transfemale'].includes(userGender);
    if (isMale) return ['female', 'woman', 'trans female', 'transfemale'].includes(mGender);
    if (isFemale) return ['male', 'man', 'trans male', 'transmale'].includes(mGender);
    return true; // non-binary sees all
  });

  const selectedPartner = allMembers.find((m: any) => m.id === partnerUserId);

  function handleJoinWaitlist() {
    joinWaitlistMutation.mutate({ eventId: Number(id) });
  }

  function handlePayNow(reservationId: number) {
    // console.log('[EventDetail] pay now for reservation:', reservationId);
    checkoutMutation.mutate({ reservationId });
  }

  // ── Render CTA ─────────────────────────────────────────────────────────────
  function renderCTA() {
    if (existingReservation) {
      return (
        <View style={{ flex: 1 }}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: 14, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
              You're Going! {existingReservation.status === 'pending' ? '(Payment Pending)' : '✅'}
            </Text>
          </LinearGradient>
          {existingReservation.paymentStatus === 'pending' && (
            <TouchableOpacity
              onPress={() => router.push('/tickets' as any)}
              style={{ marginTop: 8, alignItems: 'center' }}
            >
              <Text style={{ color: colors.pink, fontSize: 13, fontWeight: '600' }}>Pay Now → View Tickets</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (isAtCapacity) {
      if (hasWaitlistPos) {
        return (
          <View
            style={{
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
              backgroundColor: `${colors.pink}22`,
              borderColor: `${colors.pink}44`,
              borderWidth: 1,
            }}
          >
            <Text style={{ color: colors.pink, fontWeight: '700', fontSize: 16 }}>
              🕐 Waitlist Position #{(waitlistPosition as any).position}
            </Text>
          </View>
        );
      }
      return (
        <TouchableOpacity
          onPress={handleJoinWaitlist}
          disabled={joinWaitlistMutation.isPending}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#F59E0B', '#EF4444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center', opacity: joinWaitlistMutation.isPending ? 0.7 : 1 }}
          >
            {joinWaitlistMutation.isPending ? <ActivityIndicator color="#fff" /> : (
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Join Waitlist</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity onPress={handleOpenTicketModal} activeOpacity={0.85}>
        <LinearGradient
          colors={[colors.pink, colors.purple]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Reserve Now</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
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
          <LinearGradient
            colors={['transparent', 'rgba(13,13,13,0.7)']}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 }}
          />
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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

          {/* Capacity badge */}
          {isAtCapacity && (
            <View style={{
              alignSelf: 'flex-start',
              backgroundColor: '#EF444422',
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 4,
              marginBottom: 10,
              borderColor: '#EF444444',
              borderWidth: 1,
            }}>
              <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>SOLD OUT</Text>
            </View>
          )}

          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: 16 }}>{title}</Text>

          {/* Meta rows */}
          {[
            { icon: 'calendar-outline' as const, text: `${dateStr}${timeStr ? ' · ' + timeStr : ''}` },
            ev.venue ? { icon: 'location-outline' as const, text: ev.venue } : null,
            ev.capacity ? {
              icon: 'people-outline' as const,
              text: `${ev.currentAttendees ?? 0} / ${ev.capacity} attending`,
            } : null,
          ].filter(Boolean).map((item: any, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Ionicons name={item.icon} size={18} color={colors.pink} />
              <Text style={{ color: colors.muted, marginLeft: 10, fontSize: 15 }}>{item.text}</Text>
            </View>
          ))}

          {/* Pricing */}
          <View style={{ marginTop: 16, marginBottom: 10 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 10 }}>Tickets</Text>
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
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 17, marginTop: 16, marginBottom: 8 }}>About</Text>
              <Text style={{ color: colors.muted, lineHeight: 22, fontSize: 15 }}>{ev.description}</Text>
            </>
          )}
        </View>
      </ScrollView>

      {/* CTA */}
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
        {renderCTA()}
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
            {modalStep === 'ticket' ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                  <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', flex: 1 }}>Select Ticket Type</Text>
                  <TouchableOpacity onPress={() => setShowTicketModal(false)}>
                    <Ionicons name="close" size={24} color={colors.muted} />
                  </TouchableOpacity>
                </View>

                {availableTicketTypes.map(t => (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => {
                      setTicketType(t.key);
                      if (t.key === 'couple') {
                        setModalStep('partner');
                      }
                    }}
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
                    {ticketType === t.key && t.key !== 'couple' && <Ionicons name="checkmark-circle" size={22} color={colors.pink} />}
                    {t.key === 'couple' && <Ionicons name="chevron-forward" size={20} color={colors.muted} />}
                  </TouchableOpacity>
                ))}

                {/* Queer Play Zone opt-in */}
                <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 16, borderColor: `${colors.purple}44`, borderWidth: 1, marginBottom: 12 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 8 }}>🌈 Queer Play Zone</Text>
                  <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>
                    Would you like to opt into the Queer Play Zone? You'll receive a rainbow wristband at check-in, granting access to queer-friendly play spaces.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => setIsQueerPlay(true)}
                      style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: isQueerPlay ? `${colors.purple}33` : colors.bg, borderColor: isQueerPlay ? colors.purple : colors.border, borderWidth: 1, alignItems: 'center' }}
                    >
                      <Text style={{ color: isQueerPlay ? colors.purple : colors.muted, fontWeight: '600' }}>🌈 Yes, opt in</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setIsQueerPlay(false)}
                      style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: !isQueerPlay ? `${colors.pink}22` : colors.bg, borderColor: !isQueerPlay ? colors.pink : colors.border, borderWidth: 1, alignItems: 'center' }}
                    >
                      <Text style={{ color: !isQueerPlay ? colors.pink : colors.muted, fontWeight: '600' }}>No thanks</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Volunteer add-on */}
                <TouchableOpacity
                  onPress={handleVolunteerToggle}
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 14, borderColor: isVolunteer ? '#10B981' : colors.border, borderWidth: 1, marginBottom: 12 }}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: isVolunteer ? '#10B981' : colors.border, backgroundColor: isVolunteer ? '#10B981' : 'transparent', marginRight: 10, alignItems: 'center', justifyContent: 'center' }}>
                    {isVolunteer && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>🙌 I want to volunteer</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>Help with setup/teardown and potentially get your ticket reimbursed</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleReserve}
                  disabled={reserveMutation.isPending || ticketType === 'couple'}
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
                      opacity: (reserveMutation.isPending || ticketType === 'couple') ? 0.4 : 1,
                    }}
                  >
                    {reserveMutation.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Confirm Reservation</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              /* Partner selection step */
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                  <TouchableOpacity onPress={() => setModalStep('ticket')} style={{ marginRight: 12 }}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', flex: 1 }}>Select Your Partner</Text>
                  <TouchableOpacity onPress={() => setShowTicketModal(false)}>
                    <Ionicons name="close" size={24} color={colors.muted} />
                  </TouchableOpacity>
                </View>

                {/* Selected partner card */}
                {selectedPartner ? (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 14,
                    borderRadius: 12,
                    backgroundColor: `${colors.pink}15`,
                    borderColor: colors.pink,
                    borderWidth: 1,
                    marginBottom: 14,
                    gap: 12,
                  }}>
                    {selectedPartner.avatarUrl ? (
                      <Image source={{ uri: selectedPartner.avatarUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                    ) : (
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${colors.purple}44`, justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="person" size={22} color={colors.purple} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{selectedPartner.displayName ?? 'Member'}</Text>
                      {selectedPartner.orientation ? (
                        <Text style={{ color: colors.muted, fontSize: 12 }}>{selectedPartner.orientation}</Text>
                      ) : null}
                    </View>
                    <TouchableOpacity onPress={() => setPartnerUserId(null)} style={{ padding: 4 }}>
                      <Ionicons name="close-circle" size={22} color={colors.muted} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{
                    padding: 14,
                    borderRadius: 12,
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: 1,
                    marginBottom: 14,
                    alignItems: 'center',
                  }}>
                    <Text style={{ color: colors.muted, fontSize: 14 }}>No partner selected yet</Text>
                  </View>
                )}

                {/* Browse Members button */}
                <TouchableOpacity
                  onPress={() => setShowPartnerPicker(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: `${colors.purple}22`,
                    borderColor: `${colors.purple}44`,
                    borderWidth: 1,
                    marginBottom: 16,
                    gap: 8,
                  }}
                >
                  <Ionicons name="people-outline" size={18} color={colors.purple} />
                  <Text style={{ color: colors.purple, fontWeight: '600', fontSize: 14 }}>Browse Members</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleReserve}
                  disabled={reserveMutation.isPending || !partnerUserId}
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
                      opacity: (reserveMutation.isPending || !partnerUserId) ? 0.4 : 1,
                    }}
                  >
                    {reserveMutation.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Confirm Reservation</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Partner picker modal */}
      <Modal visible={showPartnerPicker} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.bg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: insets.bottom + 16,
              borderColor: colors.border,
              borderTopWidth: 1,
              maxHeight: '80%',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800', flex: 1 }}>Choose Partner</Text>
              <TouchableOpacity onPress={() => setShowPartnerPicker(false)}>
                <Ionicons name="close" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.card,
              borderRadius: 10,
              borderColor: colors.border,
              borderWidth: 1,
              paddingHorizontal: 12,
              marginBottom: 12,
            }}>
              <Ionicons name="search-outline" size={16} color={colors.muted} />
              <TextInput
                value={partnerSearch}
                onChangeText={setPartnerSearch}
                placeholder="Search members…"
                placeholderTextColor={colors.muted}
                style={{ flex: 1, color: colors.text, fontSize: 14, paddingVertical: 10, paddingLeft: 8 }}
              />
            </View>

            <FlatList
              data={filteredMembers}
              keyExtractor={(item: any) => String(item.id)}
              renderItem={({ item }: { item: any }) => (
                <TouchableOpacity
                  onPress={() => {
                    setPartnerUserId(item.id);
                    setShowPartnerPicker(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor: partnerUserId === item.id ? `${colors.pink}22` : 'transparent',
                    marginBottom: 4,
                    gap: 12,
                  }}
                >
                  {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={{ width: 42, height: 42, borderRadius: 21 }} />
                  ) : (
                    <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: `${colors.purple}44`, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="person" size={20} color={colors.purple} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{item.displayName ?? 'Member'}</Text>
                    {item.orientation ? (
                      <Text style={{ color: colors.muted, fontSize: 12 }}>{item.orientation}</Text>
                    ) : null}
                  </View>
                  {partnerUserId === item.id && <Ionicons name="checkmark-circle" size={20} color={colors.pink} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <Text style={{ color: colors.muted, fontSize: 14 }}>No members found</Text>
                </View>
              }
              style={{ maxHeight: 320 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
