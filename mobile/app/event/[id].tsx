import React, { useState, useEffect, useRef } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  TextInput,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import BrandGradient from '../../components/BrandGradient';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { FONT } from '../../lib/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../lib/theme';

const TICKET_TYPES = [
  { key: 'single_female', label: 'Single Woman' },
  { key: 'single_male', label: 'Single Man' },
  { key: 'couple', label: 'Couple' },
] as const;

type TicketType = (typeof TICKET_TYPES)[number]['key'];

export default function EventDetailScreen() {
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { alpha, colors, gradients, isDark } = theme;
  const utils = trpc.useUtils();
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketType, setTicketType] = useState<TicketType>('single_female');
  const [partnerUserId, setPartnerUserId] = useState<number | null>(null);
  const [, setShowPartnerPicker] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [modalStep, setModalStep] = useState<'ticket' | 'partner' | 'picker'>('ticket');
  const [isQueerPlay, setIsQueerPlay] = useState(false);
  const [isVolunteer, setIsVolunteer] = useState(false);
  const [useCredits, setUseCredits] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any | null>(null);
  const [promoFeedback, setPromoFeedback] = useState<string | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<Record<number, number>>({});

  // Waiver gate (P1-4 / ITEM-025). Bump this when the waiver text materially changes.
  const WAIVER_VERSION = '2026-04';
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [waiverSignature, setWaiverSignature] = useState('');

  // ── Data ──────────────────────────────────────────────────────────────────
  const {
    data: event,
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.events.byId.useQuery({ id: Number(id) }, { enabled: !!id });

  const { data: profileData, isLoading: profileLoading } = trpc.profile.me.useQuery();
  const userGender = (profileData as any)?.gender?.toLowerCase() ?? '';
  const waiverRequired = !!profileData && !(profileData as any)?.waiverSignedAt;
  const { data: creditBalanceData } = trpc.credits.balance.useQuery(undefined, {
    staleTime: 60_000,
  });
  const { data: eventAddons } = trpc.eventAddons.list.useQuery(
    { eventId: Number(id) },
    { enabled: !!id, staleTime: 60_000 }
  );
  // Credits stored as dollars (e.g. 105.00 = $105.00)
  const creditBalanceDollars =
    typeof creditBalanceData === 'number'
      ? creditBalanceData
      : ((creditBalanceData as any)?.balance ?? 0);

  const { data: primaryPartnerData } = trpc.partners.myPrimaryPartner.useQuery();
  const primaryPartner = primaryPartnerData as any;

  // Track whether the user explicitly cleared the default partner so we don't re-fill it
  const [partnerManuallyCleared, setPartnerManuallyCleared] = useState(false);

  // Pre-fill partner when couple ticket is selected and user has a primary partner,
  // but only if they haven't manually cleared it this session.
  useEffect(() => {
    if (
      ticketType === 'couple' &&
      primaryPartner?.partnerUserId &&
      !partnerUserId &&
      !partnerManuallyCleared
    ) {
      setPartnerUserId(primaryPartner.partnerUserId);
    }
  }, [ticketType, partnerManuallyCleared, partnerUserId, primaryPartner]);

  function clearPartner() {
    setPartnerUserId(null);
    setPartnerManuallyCleared(true);
    setPartnerSearch('');
  }

  // Gender helpers — must be above the query that uses them
  const FEMALE_VALS = ['female', 'woman', 'trans female', 'transfemale'];
  const MALE_VALS = ['male', 'man', 'trans male', 'transmale', 'non-binary', 'nonbinary'];
  const ug = userGender.toLowerCase();
  const userIsMale = MALE_VALS.includes(ug);
  const userIsFemale = FEMALE_VALS.includes(ug);

  // Debounce partner search so we don't fire on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(partnerSearch.trim()), 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [partnerSearch]);

  // Partner search — always cross-community.
  // Only apply gender filter once profileData has resolved — prevents empty list on first open.
  const partnerPickerActive =
    showTicketModal &&
    ticketType === 'couple' &&
    (modalStep === 'partner' || modalStep === 'picker');
  const { data: membersData, isLoading: membersLoading } = trpc.members.browse.useQuery(
    {
      page: 0,
      search: debouncedSearch || undefined,
      community: 'all',
    },
    {
      enabled: partnerPickerActive,
      staleTime: 15_000,
      placeholderData: keepPreviousData,
    } as any
  );

  const availableTicketTypes = TICKET_TYPES.filter((t) => {
    if (t.key === 'couple') return true;
    if (!userGender) return true;
    const isMale = ['male', 'man', 'non-binary', 'nonbinary'].includes(userGender);
    const isFemale = ['female', 'woman'].includes(userGender);
    if (isMale && t.key === 'single_female') return false;
    if (isFemale && t.key === 'single_male') return false;
    return true;
  });

  useEffect(() => {
    if (!profileData) return;
    const nextTicketType: TicketType = !userGender
      ? 'single_female'
      : ['male', 'man', 'non-binary', 'nonbinary'].includes(userGender)
        ? 'single_male'
        : 'single_female';
    setTicketType(nextTicketType);
  }, [profileData, userGender]);

  const { data: myReservations } = trpc.reservations.myReservations.useQuery(undefined, {
    staleTime: 30_000,
  });

  const { data: waitlistPosition, refetch: refetchWaitlist } =
    trpc.reservations.getWaitlistPosition.useQuery({ eventId: Number(id) }, { enabled: !!id });

  // Waiver mutation — used by the gate modal before proceeding to reservation.
  const signWaiverMutation = trpc.profile.signWaiver.useMutation({
    onSuccess: () => {
      utils.profile.me.invalidate();
      setShowWaiverModal(false);
      setWaiverSignature('');
      // After signing, carry through with the reservation the user originally attempted.
      doReserve();
    },
    onError: (e: any) => {
      toast.error(e?.message ?? 'Could not record waiver. Please try again.');
    },
  });

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

  const ev = event as any;
  const fallbackHeroGradient = (ev?.gradientColors ?? gradients.brandH) as [string, string];
  const reservationNoticeTone = React.useMemo(
    () => ({
      successGradient: gradients.green,
      pendingGradient: gradients.amber,
      soldOutBg: alpha(colors.primary, 0.12),
      soldOutBorder: alpha(colors.primary, 0.24),
      communityBadgeBg: alpha(colors.secondary, isDark ? 0.2 : 0.13),
      queerBadgeBorder: alpha(colors.secondary, 0.26),
      selectedPartnerBg: alpha(colors.primary, 0.07),
      selectedPartnerBorder: alpha(colors.primary, 0.3),
    }),
    [alpha, colors, gradients.amber, gradients.green, isDark]
  );

  function renderWaiverNotice() {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          backgroundColor: alpha(colors.warning, 0.1),
          borderRadius: 14,
          borderWidth: 1,
          borderColor: alpha(colors.warning, 0.22),
          padding: 14,
          marginBottom: 12,
        }}
      >
        <Ionicons
          name="document-text-outline"
          size={18}
          color={colors.warning}
          style={{ marginTop: 1 }}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.warning,
              fontWeight: '800',
              fontSize: 13,
              marginBottom: 4,
            }}
          >
            Waiver required before reserving
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
            You will review and sign the community waiver before your reservation is submitted.
          </Text>
        </View>
      </View>
    );
  }

  // Check if user already has reservation for this event
  const existingReservation = (myReservations as any[])?.find(
    (r: any) => r.eventId === Number(id) && r.status !== 'cancelled'
  );

  const isAtCapacity = ev?.capacity && ev.capacity > 0 && (ev.currentAttendees ?? 0) >= ev.capacity;
  const hasWaitlistPos = (waitlistPosition as any)?.position;

  // ── Hooks that must stay above early returns ───────────────────────────────
  const countdownStr = React.useMemo(() => {
    if (!ev?.startDate) return null;
    const diff = new Date(ev.startDate).getTime() - Date.now();
    if (diff < 0) return null;
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (d > 0) return `${d}d ${h}h away`;
    if (h > 0) return `${h}h away`;
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${m}m away`;
  }, [ev?.startDate]);

  const reserveScale = React.useRef(new Animated.Value(1)).current;
  const handleReservePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.spring(reserveScale, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const handleReservePressOut = () => {
    Animated.spring(reserveScale, { toValue: 1, useNativeDriver: true }).start();
  };

  // ── Loading / error states ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.page,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator color={theme.colors.pink} size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.page,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 28,
        }}
      >
        <Ionicons name="cloud-offline-outline" size={42} color={theme.colors.textMuted} />
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 20,
            fontWeight: '800',
            textAlign: 'center',
            marginTop: 14,
          }}
        >
          Could not load this event
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: 14,
            textAlign: 'center',
            lineHeight: 21,
            marginTop: 8,
          }}
        >
          {(error as any)?.message ?? 'Please try again in a moment.'}
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          style={{
            marginTop: 18,
            paddingHorizontal: 18,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text style={{ color: theme.colors.text, fontWeight: '800' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!ev) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.page,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: theme.colors.textMuted }}>Event not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.colors.pink }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUrl = ev.coverImageUrl ?? ev.imageUrl;
  const title = ev.title ?? ev.name ?? 'Event';
  const dateStr = ev.startDate
    ? new Date(ev.startDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'TBD';
  const timeStr = ev.startDate
    ? new Date(ev.startDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '';

  function getTicketPriceDollars(t: TicketType): number {
    switch (t) {
      case 'single_female':
        return ev.priceSingleFemale ? parseFloat(ev.priceSingleFemale) : 0;
      case 'single_male':
        return ev.priceSingleMale ? parseFloat(ev.priceSingleMale) : 0;
      case 'couple':
        return ev.priceCouple ? parseFloat(ev.priceCouple) : 0;
    }
  }

  const activeAddons = ((eventAddons as any[]) ?? []).filter(
    (addon: any) => addon?.isActive !== false
  );
  const addonSubtotal = activeAddons.reduce((sum: number, addon: any) => {
    const qty = selectedAddons[Number(addon.id)] ?? 0;
    return sum + parseFloat(String(addon.price ?? 0)) * qty;
  }, 0);
  const promoDiscount = appliedPromo
    ? Math.min(
        getTicketPriceDollars(ticketType) + addonSubtotal,
        appliedPromo.discountType === 'percentage'
          ? (getTicketPriceDollars(ticketType) + addonSubtotal) *
              (parseFloat(String(appliedPromo.discountValue ?? 0)) / 100)
          : parseFloat(String(appliedPromo.discountValue ?? 0))
      )
    : 0;
  const subtotalBeforeCredits = Math.max(
    0,
    getTicketPriceDollars(ticketType) + addonSubtotal - promoDiscount
  );

  function getPriceForTicketType(t: TicketType) {
    const priceDollars = getTicketPriceDollars(t);
    if (priceDollars === 0) return 'Free';
    if (useCredits && t === ticketType && creditBalanceDollars > 0) {
      const creditsApplied = Math.min(creditBalanceDollars, subtotalBeforeCredits);
      const remaining = subtotalBeforeCredits - creditsApplied;
      const creditsDisplay = `$${creditsApplied.toFixed(2)} credits`;
      return remaining === 0
        ? `Free (${creditsDisplay})`
        : `$${remaining.toFixed(2)} + ${creditsDisplay}`;
    }
    return `$${priceDollars.toFixed(0)}`;
  }

  function toggleAddon(addonId: number) {
    setSelectedAddons((prev) => {
      const next = { ...prev };
      if (next[addonId]) delete next[addonId];
      else next[addonId] = 1;
      return next;
    });
  }

  async function applyPromoCode() {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) {
      setAppliedPromo(null);
      setPromoFeedback(null);
      return;
    }
    try {
      setIsApplyingPromo(true);
      const result = await utils.promoCodes.validate.fetch({ code, eventId: Number(id) });
      if (!(result as any)?.valid) {
        setAppliedPromo(null);
        setPromoFeedback((result as any)?.reason ?? 'Invalid promo code');
        return;
      }
      setAppliedPromo((result as any).promo);
      setPromoCodeInput(code);
      setPromoFeedback(`Promo applied: ${code}`);
    } catch (error: any) {
      setAppliedPromo(null);
      setPromoFeedback(error?.message ?? 'Could not validate promo code');
    } finally {
      setIsApplyingPromo(false);
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

  // Actual reservation mutation call — separated so the waiver gate can
  // defer it, then re-invoke post-sign without re-entering the modal flow.
  function doReserve() {
    const priceDollars = subtotalBeforeCredits;
    const creditsApplied = useCredits ? Math.min(creditBalanceDollars, priceDollars) : 0;
    const remaining = priceDollars - creditsApplied;
    const creditsUsedCents = Math.round(creditsApplied * 100);
    reserveMutation.mutate({
      eventId: Number(id),
      ticketType,
      totalAmount: priceDollars.toFixed(2),
      paymentMethod: creditsApplied > 0 && remaining === 0 ? 'credits' : 'venmo',
      paymentStatus: 'pending',
      creditsUsed: creditsUsedCents,
      partnerUserId: partnerUserId ?? undefined,
      isQueerPlay,
      orientationSignal: isQueerPlay ? 'queer' : 'straight',
      isVolunteer,
      promoCode: appliedPromo?.code ?? undefined,
      addonSelections: Object.entries(selectedAddons).map(([addonId, quantity]) => ({
        addonId: Number(addonId),
        quantity: Number(quantity),
      })),
    });
  }

  // Waiver gate (P1-4, ITEM-025 client-side):
  // If profile.waiverSignedAt is missing, open the waiver modal instead of
  // reserving. The onboarding flow collects a waiver checkbox, but profiles
  // created before that shipped can still be missing a recorded signature.
  function handleReserve() {
    const signedAt = (profileData as any)?.waiverSignedAt;
    if (!signedAt) {
      setShowTicketModal(false);
      setShowWaiverModal(true);
      return;
    }
    doReserve();
  }

  function handleOpenTicketModal() {
    setModalStep('ticket');
    setPartnerUserId(null);
    setPartnerSearch('');
    setPartnerManuallyCleared(false);
    setShowPartnerPicker(false);
    setPromoCodeInput('');
    setAppliedPromo(null);
    setPromoFeedback(null);
    setSelectedAddons({});
    setShowTicketModal(true);
  }

  function handleCloseWaiverModal() {
    setShowWaiverModal(false);
    setWaiverSignature('');
    setShowTicketModal(true);
  }

  const reserveButtonLabel = profileLoading
    ? 'Checking reservation details...'
    : waiverRequired
      ? 'Review Waiver to Continue'
      : 'Confirm Reservation';

  // Filter members by opposite gender for couple ticket partner selection
  const allMembers = (membersData as any[]) ?? [];

  function isOppositeGender(mGender: string) {
    const mg = mGender.toLowerCase();
    if (userIsMale) return FEMALE_VALS.includes(mg);
    if (userIsFemale) return MALE_VALS.includes(mg);
    return false;
  }

  // Show all members — sort opposite-gender to top, badge them with a ✓
  const filteredMembers = [...allMembers].sort((a: any, b: any) => {
    const aOpp = isOppositeGender(a.gender ?? '');
    const bOpp = isOppositeGender(b.gender ?? '');
    if (aOpp && !bOpp) return -1;
    if (!aOpp && bOpp) return 1;
    return 0;
  });

  // Keep selected partner available even if not in current filtered page
  const selectedPartner = allMembers.find((m: any) => m.id === partnerUserId);

  function handleJoinWaitlist() {
    joinWaitlistMutation.mutate({ eventId: Number(id) });
  }

  // ── Render CTA ─────────────────────────────────────────────────────────────
  function renderCTA() {
    if (existingReservation) {
      const hasPendingPayment = existingReservation.paymentStatus === 'pending';
      return (
        <View style={{ flex: 1 }}>
          <LinearGradient
            colors={
              hasPendingPayment
                ? reservationNoticeTone.pendingGradient
                : reservationNoticeTone.successGradient
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Ionicons
              name={hasPendingPayment ? 'card-outline' : 'checkmark-circle'}
              size={20}
              color={theme.colors.white}
            />
            <Text style={{ color: theme.colors.white, fontWeight: '800', fontSize: 16 }}>
              {hasPendingPayment ? 'Reservation Held — Complete Payment' : "You're Going! ✅"}
            </Text>
          </LinearGradient>
          {hasPendingPayment && (
            <TouchableOpacity
              onPress={() => router.push('/tickets' as any)}
              style={{ marginTop: 8, alignItems: 'center' }}
            >
              <Text style={{ color: theme.colors.pink, fontSize: 13, fontWeight: '600' }}>
                Complete payment to secure your ticket
              </Text>
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
              backgroundColor: reservationNoticeTone.soldOutBg,
              borderColor: reservationNoticeTone.soldOutBorder,
              borderWidth: 1,
            }}
          >
            <Text style={{ color: theme.colors.pink, fontWeight: '700', fontSize: 16 }}>
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
            style={{
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              opacity: joinWaitlistMutation.isPending ? 0.7 : 1,
            }}
          >
            {joinWaitlistMutation.isPending ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={{ color: theme.colors.white, fontWeight: '700', fontSize: 16 }}>
                Join Waitlist
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      );
    }

    return (
      <Animated.View style={{ transform: [{ scale: reserveScale }] }}>
        <TouchableOpacity
          onPress={handleOpenTicketModal}
          onPressIn={handleReservePressIn}
          onPressOut={handleReservePressOut}
          activeOpacity={1}
        >
          <BrandGradient
            style={{
              borderRadius: 18,
              paddingVertical: 16,
              alignItems: 'center',
              shadowColor: theme.colors.primary,
              shadowOpacity: 0.4,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            <Text
              style={{
                color: theme.colors.white,
                fontWeight: '800',
                fontSize: 16,
                fontFamily: FONT.displaySemiBold,
              }}
            >
              Reserve Now
            </Text>
          </BrandGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.page }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <View style={{ height: 280, position: 'relative' }}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          ) : (
            <LinearGradient
              colors={fallbackHeroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: '100%',
                height: '100%',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 64 }}>{ev.emoji ?? '🎉'}</Text>
            </LinearGradient>
          )}
          <LinearGradient
            colors={[
              alpha(theme.colors.page, 0.04),
              alpha(theme.colors.page, isDark ? 0.55 : 0.18),
              theme.colors.page,
            ]}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 }}
          />
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              position: 'absolute',
              top: insets.top + 10,
              left: 16,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: alpha(theme.colors.floating, 0.88),
              borderWidth: 1,
              borderColor: theme.colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={{ padding: 20, paddingTop: 16 }}>
          {/* Community badge */}
          {(ev.communityId || ev.community?.name) && (
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: reservationNoticeTone.communityBadgeBg,
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 4,
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  color: theme.colors.purple,
                  fontSize: 12,
                  fontWeight: '700',
                  fontFamily: FONT.displaySemiBold,
                  letterSpacing: 0.4,
                }}
              >
                {ev.communityId ?? ev.community?.name}
              </Text>
            </View>
          )}

          {/* Capacity badge */}
          {isAtCapacity && (
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: theme.colors.dangerSoft,
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 4,
                marginBottom: 10,
                borderColor: theme.colors.dangerBorder,
                borderWidth: 1,
              }}
            >
              <Text
                style={{
                  color: theme.colors.danger,
                  fontSize: 12,
                  fontWeight: '700',
                  fontFamily: FONT.displaySemiBold,
                  letterSpacing: 0.8,
                }}
              >
                SOLD OUT
              </Text>
            </View>
          )}

          <Text
            style={{
              color: theme.colors.text,
              fontSize: 30,
              fontWeight: '900',
              marginBottom: 14,
              letterSpacing: -0.9,
              fontFamily: FONT.displayBold,
            }}
          >
            {title}
          </Text>

          <LinearGradient
            colors={[
              alpha(theme.colors.primary, isDark ? 0.14 : 0.1),
              alpha(theme.colors.secondary, isDark ? 0.08 : 0.06),
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 20,
              padding: 18,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: alpha(theme.colors.primary, isDark ? 0.16 : 0.12),
            }}
          >
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 1.2,
                fontFamily: FONT.displaySemiBold,
              }}
            >
              EVENING ACCESS
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                marginTop: 10,
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: 26,
                    fontWeight: '900',
                    fontFamily: FONT.displayBold,
                  }}
                >
                  {TICKET_TYPES.some((t) => getTicketPriceDollars(t.key) > 0)
                    ? `$${Math.min(...TICKET_TYPES.map((t) => getTicketPriceDollars(t.key)).filter((v) => v > 0)).toFixed(0)}`
                    : 'Free'}
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 4 }}>
                  Starting price for this experience
                </Text>
              </View>
              {countdownStr ? (
                <View
                  style={{
                    backgroundColor: alpha(theme.colors.white, isDark ? 0.06 : 0.52),
                    borderRadius: 16,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: alpha(theme.colors.white, isDark ? 0.08 : 0.36),
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: 12,
                      fontWeight: '800',
                      fontFamily: FONT.displaySemiBold,
                    }}
                  >
                    {countdownStr}
                  </Text>
                </View>
              ) : null}
            </View>
          </LinearGradient>

          {/* Meta rows */}
          <View
            style={{
              marginBottom: 6,
              backgroundColor: theme.colors.surface,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: theme.colors.border,
              padding: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.pink} />
              <Text style={{ color: theme.colors.textSecondary, marginLeft: 8, fontSize: 13 }}>
                {dateStr}
                {timeStr ? ' · ' + timeStr : ''}
              </Text>
            </View>
            {ev.venue || ev.location ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Ionicons name="location-outline" size={16} color={theme.colors.purple} />
                <Text style={{ color: theme.colors.textSecondary, marginLeft: 8, fontSize: 13 }}>
                  {ev.venue || ev.location}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Attendees / capacity bar */}
          {ev.capacity && ev.capacity > 0 ? (
            <View style={{ marginBottom: 16 }}>
              <View
                style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}
              >
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  {ev.currentAttendees ?? 0} attending
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  {ev.capacity} capacity
                </Text>
              </View>
              <View
                style={{
                  height: 4,
                  backgroundColor: theme.colors.border,
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <LinearGradient
                  colors={[theme.colors.purple, theme.colors.pink]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    height: '100%',
                    width: `${Math.min(100, Math.round(((ev.currentAttendees ?? 0) / ev.capacity) * 100))}%`,
                    borderRadius: 4,
                  }}
                />
              </View>
            </View>
          ) : null}

          {/* Pricing */}
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                color: theme.colors.textMuted,
                fontWeight: '800',
                fontSize: 11,
                marginBottom: 12,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
              }}
            >
              Tickets
            </Text>
            {TICKET_TYPES.map((t) => (
              <View
                key={t.key}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: theme.colors.page,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '700' }}>
                  {t.label}
                </Text>
                <Text
                  style={{
                    color: theme.colors.pink,
                    fontSize: 18,
                    fontWeight: '800',
                    fontFamily: FONT.displayBold,
                  }}
                >
                  {getPriceForTicketType(t.key)}
                </Text>
              </View>
            ))}
          </View>

          {ev.description && (
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontWeight: '800',
                  fontSize: 11,
                  marginBottom: 10,
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                  fontFamily: FONT.displaySemiBold,
                }}
              >
                About
              </Text>
              <Text style={{ color: theme.colors.textSecondary, lineHeight: 22, fontSize: 14 }}>
                {ev.description}
              </Text>
            </View>
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
          backgroundColor: theme.colors.page,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
        }}
      >
        {renderCTA()}
      </View>

      {/* Ticket type selection modal — hidden when picker is open so iOS doesn't stack two modals */}
      <Modal visible={showTicketModal && modalStep !== 'picker'} animationType="slide" transparent>
        <View
          style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' }}
        >
          <View
            style={{
              backgroundColor: theme.colors.floating,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              paddingBottom: insets.bottom + 20,
              borderColor: theme.colors.border,
              borderTopWidth: 1,
            }}
          >
            {/* Drag handle */}
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.colors.border,
                alignSelf: 'center',
                marginBottom: 20,
              }}
            />
            {modalStep === 'ticket' ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                  <Text
                    style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800', flex: 1 }}
                  >
                    Select Ticket Type
                  </Text>
                  <TouchableOpacity onPress={() => setShowTicketModal(false)}>
                    <Ionicons name="close" size={24} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {availableTicketTypes.map((t) => (
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
                      backgroundColor:
                        ticketType === t.key
                          ? alpha(theme.colors.primary, 0.08)
                          : theme.colors.surface,
                      borderColor:
                        ticketType === t.key ? theme.colors.primary : theme.colors.border,
                      borderWidth: 1,
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 15 }}>
                        {t.label}
                      </Text>
                      <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
                        {getPriceForTicketType(t.key)}
                      </Text>
                    </View>
                    {ticketType === t.key && t.key !== 'couple' && (
                      <Ionicons name="checkmark-circle" size={22} color={theme.colors.pink} />
                    )}
                    {t.key === 'couple' && (
                      <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                    )}
                  </TouchableOpacity>
                ))}

                {/* Queer Play Zone opt-in */}
                <View
                  style={{
                    backgroundColor: theme.colors.card,
                    borderRadius: 12,
                    padding: 16,
                    borderColor: reservationNoticeTone.queerBadgeBorder,
                    borderWidth: 1,
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontWeight: '700',
                      fontSize: 15,
                      marginBottom: 8,
                    }}
                  >
                    🌈 Queer Play Zone
                  </Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginBottom: 12 }}>
                    Would you like to opt into the Queer Play Zone? You&apos;ll receive a rainbow
                    wristband at check-in, granting access to queer-friendly play spaces.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => setIsQueerPlay(true)}
                      style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 10,
                        backgroundColor: isQueerPlay
                          ? alpha(theme.colors.purple, 0.2)
                          : theme.colors.page,
                        borderColor: isQueerPlay ? theme.colors.purple : theme.colors.border,
                        borderWidth: 1,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: isQueerPlay ? theme.colors.purple : theme.colors.textMuted,
                          fontWeight: '600',
                        }}
                      >
                        🌈 Yes, opt in
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setIsQueerPlay(false)}
                      style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 10,
                        backgroundColor: !isQueerPlay
                          ? alpha(theme.colors.pink, 0.14)
                          : theme.colors.page,
                        borderColor: !isQueerPlay ? theme.colors.pink : theme.colors.border,
                        borderWidth: 1,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: !isQueerPlay ? theme.colors.pink : theme.colors.textMuted,
                          fontWeight: '600',
                        }}
                      >
                        No thanks
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Credits toggle */}
                {creditBalanceDollars > 0 && (
                  <TouchableOpacity
                    onPress={() => setUseCredits((v) => !v)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.colors.card,
                      borderRadius: 12,
                      padding: 14,
                      borderColor: useCredits ? theme.colors.pink : theme.colors.border,
                      borderWidth: 1,
                      marginBottom: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: useCredits ? theme.colors.pink : theme.colors.border,
                        backgroundColor: useCredits
                          ? theme.colors.pink
                          : alpha(theme.colors.page, 0),
                        marginRight: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {useCredits && (
                        <Ionicons name="checkmark" size={14} color={theme.colors.white} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
                        ⭐ Apply credits — ${Number(creditBalanceDollars).toFixed(2)} available
                      </Text>
                      <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                        {useCredits && getTicketPriceDollars(ticketType) > 0
                          ? `Saves $${Math.min(creditBalanceDollars, getTicketPriceDollars(ticketType)).toFixed(2)} on this ticket`
                          : 'Use your credit balance to reduce ticket cost'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {activeAddons.length > 0 && (
                  <View
                    style={{
                      backgroundColor: theme.colors.card,
                      borderRadius: 12,
                      padding: 14,
                      borderColor: theme.colors.border,
                      borderWidth: 1,
                      marginBottom: 12,
                    }}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: '700', marginBottom: 6 }}>
                      Add-ons
                    </Text>
                    <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginBottom: 10 }}>
                      Optional upgrades for this reservation.
                    </Text>
                    {activeAddons.map((addon: any) => {
                      const qty = selectedAddons[Number(addon.id)] ?? 0;
                      return (
                        <TouchableOpacity
                          key={addon.id}
                          onPress={() => toggleAddon(Number(addon.id))}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: theme.colors.page,
                            borderRadius: 10,
                            padding: 12,
                            borderColor: qty > 0 ? theme.colors.pink : theme.colors.border,
                            borderWidth: 1,
                            marginBottom: 8,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: theme.colors.text, fontWeight: '600' }}>
                              {addon.name}
                            </Text>
                            {addon.description ? (
                              <Text
                                style={{
                                  color: theme.colors.textMuted,
                                  fontSize: 12,
                                  marginTop: 2,
                                }}
                              >
                                {addon.description}
                              </Text>
                            ) : null}
                          </View>
                          <Text
                            style={{ color: theme.colors.pink, fontWeight: '700', marginRight: 10 }}
                          >
                            ${parseFloat(String(addon.price ?? 0)).toFixed(2)}
                          </Text>
                          {qty > 0 ? (
                            <TouchableOpacity
                              onPress={() =>
                                setSelectedAddons((prev) => ({
                                  ...prev,
                                  [Number(addon.id)]: Math.min(
                                    addon.maxQuantity ?? 10,
                                    (prev[Number(addon.id)] ?? 1) + 1
                                  ),
                                }))
                              }
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 8,
                                backgroundColor: alpha(theme.colors.pink, 0.12),
                              }}
                            >
                              <Text style={{ color: theme.colors.pink, fontWeight: '700' }}>
                                Qty {qty}
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <View
                  style={{
                    backgroundColor: theme.colors.card,
                    borderRadius: 12,
                    padding: 14,
                    borderColor: theme.colors.border,
                    borderWidth: 1,
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: '700', marginBottom: 6 }}>
                    Promo Code
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      value={promoCodeInput}
                      onChangeText={(text) => {
                        setPromoCodeInput(text.toUpperCase());
                        if (promoFeedback) setPromoFeedback(null);
                      }}
                      placeholder="Enter code"
                      placeholderTextColor={theme.colors.textMuted}
                      autoCapitalize="characters"
                      style={{
                        flex: 1,
                        backgroundColor: theme.colors.page,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                      }}
                    />
                    <TouchableOpacity
                      onPress={applyPromoCode}
                      style={{
                        paddingHorizontal: 14,
                        borderRadius: 10,
                        backgroundColor: alpha(theme.colors.pink, 0.12),
                        borderWidth: 1,
                        borderColor: alpha(theme.colors.pink, 0.25),
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: theme.colors.pink, fontWeight: '700' }}>
                        {isApplyingPromo ? '...' : 'Apply'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {promoFeedback ? (
                    <Text
                      style={{
                        color: appliedPromo ? theme.colors.success : theme.colors.danger,
                        fontSize: 12,
                        marginTop: 8,
                      }}
                    >
                      {promoFeedback}
                    </Text>
                  ) : null}
                </View>

                <View
                  style={{
                    backgroundColor: theme.colors.card,
                    borderRadius: 12,
                    padding: 14,
                    borderColor: theme.colors.border,
                    borderWidth: 1,
                    marginBottom: 12,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Ticket</Text>
                    <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                      ${getTicketPriceDollars(ticketType).toFixed(2)}
                    </Text>
                  </View>
                  {addonSubtotal > 0 && (
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                      }}
                    >
                      <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Add-ons</Text>
                      <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                        ${addonSubtotal.toFixed(2)}
                      </Text>
                    </View>
                  )}
                  {promoDiscount > 0 && (
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                      }}
                    >
                      <Text style={{ color: theme.colors.success, fontSize: 12 }}>
                        Promo discount
                      </Text>
                      <Text style={{ color: theme.colors.success, fontSize: 12 }}>
                        - ${promoDiscount.toFixed(2)}
                      </Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '800' }}>Subtotal</Text>
                    <Text style={{ color: theme.colors.text, fontWeight: '800' }}>
                      ${subtotalBeforeCredits.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Volunteer add-on */}
                <TouchableOpacity
                  onPress={handleVolunteerToggle}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.colors.card,
                    borderRadius: 12,
                    padding: 14,
                    borderColor: isVolunteer ? theme.colors.successBorder : theme.colors.border,
                    borderWidth: 1,
                    marginBottom: 12,
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: isVolunteer ? theme.colors.success : theme.colors.border,
                      backgroundColor: isVolunteer
                        ? theme.colors.success
                        : alpha(theme.colors.page, 0),
                      marginRight: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isVolunteer && (
                      <Ionicons name="checkmark" size={14} color={theme.colors.white} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
                      🙌 I want to volunteer
                    </Text>
                    <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                      Help with setup/teardown and potentially get your ticket reimbursed
                    </Text>
                  </View>
                </TouchableOpacity>

                {waiverRequired && !profileLoading && renderWaiverNotice()}

                <TouchableOpacity
                  onPress={handleReserve}
                  disabled={reserveMutation.isPending || ticketType === 'couple' || profileLoading}
                  activeOpacity={0.85}
                  style={{
                    marginTop: 8,
                    opacity:
                      reserveMutation.isPending || ticketType === 'couple' || profileLoading
                        ? 0.5
                        : 1,
                  }}
                >
                  <BrandGradient
                    style={{
                      borderRadius: 18,
                      paddingVertical: 16,
                      alignItems: 'center',
                      shadowColor: theme.colors.primary,
                      shadowOpacity: 0.4,
                      shadowRadius: 14,
                      shadowOffset: { width: 0, height: 4 },
                    }}
                  >
                    {reserveMutation.isPending ? (
                      <ActivityIndicator color={theme.colors.white} />
                    ) : (
                      <Text style={{ color: theme.colors.white, fontWeight: '800', fontSize: 16 }}>
                        {reserveButtonLabel}
                      </Text>
                    )}
                  </BrandGradient>
                </TouchableOpacity>
              </>
            ) : (
              /* Partner selection step */
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                  <TouchableOpacity
                    onPress={() => setModalStep('ticket')}
                    style={{ marginRight: 12 }}
                  >
                    <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
                  </TouchableOpacity>
                  <Text
                    style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800', flex: 1 }}
                  >
                    Select Your Partner
                  </Text>
                  <TouchableOpacity onPress={() => setShowTicketModal(false)}>
                    <Ionicons name="close" size={24} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Selected partner card */}
                {selectedPartner ? (
                  <View
                    style={{
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: reservationNoticeTone.selectedPartnerBorder,
                      backgroundColor: reservationNoticeTone.selectedPartnerBg,
                      marginBottom: 14,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Default connection label */}
                    {primaryPartner && selectedPartner.id === primaryPartner.partnerUserId && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          paddingHorizontal: 14,
                          paddingTop: 10,
                          paddingBottom: 4,
                        }}
                      >
                        <Text style={{ fontSize: 12 }}>💗</Text>
                        <Text
                          style={{
                            color: theme.colors.pink,
                            fontSize: 11,
                            fontWeight: '800',
                            letterSpacing: 0.5,
                          }}
                        >
                          YOUR CONNECTION
                        </Text>
                      </View>
                    )}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 14,
                        paddingTop:
                          primaryPartner && selectedPartner.id === primaryPartner.partnerUserId
                            ? 6
                            : 14,
                        gap: 12,
                      }}
                    >
                      {selectedPartner.avatarUrl ? (
                        <Image
                          source={{ uri: selectedPartner.avatarUrl }}
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            borderWidth: 2,
                            borderColor: alpha(theme.colors.pink, 0.38),
                          }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: alpha(theme.colors.purple, 0.14),
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderWidth: 2,
                            borderColor: alpha(theme.colors.purple, 0.24),
                          }}
                        >
                          <Ionicons name="person" size={22} color={theme.colors.purple} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 15 }}>
                          {selectedPartner.displayName ?? 'Member'}
                        </Text>
                        {selectedPartner.gender ? (
                          <Text
                            style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 1 }}
                          >
                            {selectedPartner.gender}
                            {selectedPartner.orientation ? ` · ${selectedPartner.orientation}` : ''}
                          </Text>
                        ) : null}
                      </View>
                      {/* Remove / change button */}
                      <TouchableOpacity
                        onPress={clearPartner}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={{
                          backgroundColor: theme.colors.dangerSoft,
                          borderRadius: 20,
                          padding: 6,
                          borderWidth: 1,
                          borderColor: theme.colors.dangerBorder,
                        }}
                      >
                        <Ionicons name="close" size={16} color={theme.colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View
                    style={{
                      padding: 20,
                      borderRadius: 14,
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      borderWidth: 1,
                      marginBottom: 14,
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Ionicons name="people-outline" size={28} color={theme.colors.textMuted} />
                    <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 14 }}>
                      No partner selected
                    </Text>
                    <Text
                      style={{ color: theme.colors.textMuted, fontSize: 12, textAlign: 'center' }}
                    >
                      Search for a member below to link to your couples ticket
                    </Text>
                  </View>
                )}

                {/* Search / change partner — opens picker as separate modal above ticket modal */}
                <TouchableOpacity
                  onPress={() => {
                    setPartnerSearch('');
                    setModalStep('picker');
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 13,
                    borderRadius: 14,
                    backgroundColor: theme.colors.surface,
                    borderColor: selectedPartner
                      ? theme.colors.border
                      : reservationNoticeTone.queerBadgeBorder,
                    borderWidth: 1,
                    marginBottom: 16,
                    gap: 8,
                  }}
                >
                  <Ionicons
                    name={selectedPartner ? 'swap-horizontal' : 'search'}
                    size={18}
                    color={selectedPartner ? theme.colors.textMuted : theme.colors.purple}
                  />
                  <Text
                    style={{
                      color: selectedPartner ? theme.colors.textMuted : theme.colors.purple,
                      fontWeight: '700',
                      fontSize: 14,
                    }}
                  >
                    {selectedPartner ? 'Change partner' : 'Search for a partner'}
                  </Text>
                </TouchableOpacity>

                {waiverRequired && !profileLoading && renderWaiverNotice()}

                <TouchableOpacity
                  onPress={handleReserve}
                  disabled={reserveMutation.isPending || !partnerUserId || profileLoading}
                  activeOpacity={0.85}
                  style={{
                    opacity:
                      reserveMutation.isPending || !partnerUserId || profileLoading ? 0.5 : 1,
                  }}
                >
                  <BrandGradient
                    style={{
                      borderRadius: 18,
                      paddingVertical: 16,
                      alignItems: 'center',
                      shadowColor: theme.colors.primary,
                      shadowOpacity: 0.4,
                      shadowRadius: 14,
                      shadowOffset: { width: 0, height: 4 },
                    }}
                  >
                    {reserveMutation.isPending ? (
                      <ActivityIndicator color={theme.colors.white} />
                    ) : (
                      <Text style={{ color: theme.colors.white, fontWeight: '800', fontSize: 16 }}>
                        {reserveButtonLabel}
                      </Text>
                    )}
                  </BrandGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Partner picker — rendered as its own modal so it sits above the ticket modal on iOS */}
      <Modal visible={showTicketModal && modalStep === 'picker'} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: alpha(theme.colors.overlay, 0.95),
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.floating,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 20,
              paddingBottom: insets.bottom + 16,
              borderColor: theme.colors.border,
              borderTopWidth: 1,
              maxHeight: '85%',
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => {
                  setModalStep('partner');
                  setPartnerSearch('');
                }}
                style={{
                  marginRight: 12,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="arrow-back" size={18} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '800', flex: 1 }}>
                Choose Partner
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalStep('partner');
                  setPartnerSearch('');
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.surface,
                borderRadius: 14,
                borderColor: alpha(theme.colors.primary, 0.16),
                borderWidth: 1,
                paddingHorizontal: 14,
                marginBottom: 12,
              }}
            >
              <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} />
              <TextInput
                value={partnerSearch}
                onChangeText={setPartnerSearch}
                placeholder="Search by name…"
                placeholderTextColor={theme.colors.textMuted}
                style={{
                  flex: 1,
                  color: theme.colors.text,
                  fontSize: 14,
                  paddingVertical: 12,
                  paddingLeft: 8,
                }}
                autoCorrect={false}
                autoCapitalize="none"
                autoFocus
              />
              {membersLoading ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.pink}
                  style={{ marginLeft: 6 }}
                />
              ) : partnerSearch.length > 0 ? (
                <TouchableOpacity onPress={() => setPartnerSearch('')}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              data={filteredMembers}
              keyExtractor={(item: any) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews
              windowSize={5}
              initialNumToRender={10}
              maxToRenderPerBatch={8}
              renderItem={({ item }: { item: any }) => {
                const isSelected = partnerUserId === item.id;
                const isOpp = isOppositeGender(item.gender ?? '');
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setPartnerUserId(item.id);
                      setPartnerManuallyCleared(false);
                      setPartnerSearch('');
                      setModalStep('partner');
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: isSelected
                        ? alpha(theme.colors.primary, 0.12)
                        : theme.colors.surface,
                      borderWidth: 1,
                      borderColor: isSelected
                        ? alpha(theme.colors.primary, 0.38)
                        : isOpp
                          ? alpha(theme.colors.primary, 0.18)
                          : theme.colors.border,
                      marginBottom: 8,
                      gap: 12,
                    }}
                  >
                    {item.avatarUrl ? (
                      <Image
                        source={{ uri: item.avatarUrl }}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          borderWidth: 1.5,
                          borderColor: isOpp
                            ? alpha(theme.colors.primary, 0.38)
                            : alpha(theme.colors.border, 0.6),
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: isOpp
                            ? alpha(theme.colors.pink, 0.12)
                            : alpha(theme.colors.purple, 0.12),
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Ionicons
                          name="person"
                          size={20}
                          color={isOpp ? theme.colors.pink : theme.colors.purple}
                        />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 14 }}>
                        {item.displayName ?? 'Member'}
                      </Text>
                      {item.gender || item.orientation ? (
                        <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 1 }}>
                          {[item.gender, item.orientation].filter(Boolean).join(' · ')}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={22} color={theme.colors.pink} />
                    ) : isOpp ? (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: theme.colors.pink,
                        }}
                      />
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  {membersLoading ? (
                    <ActivityIndicator color={theme.colors.pink} size="large" />
                  ) : (
                    <>
                      <Text style={{ fontSize: 36, marginBottom: 10 }}>🔍</Text>
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontWeight: '700',
                          fontSize: 15,
                          marginBottom: 6,
                        }}
                      >
                        {partnerSearch.trim() ? 'No matches found' : 'No members available'}
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.textMuted,
                          fontSize: 13,
                          textAlign: 'center',
                          paddingHorizontal: 24,
                        }}
                      >
                        {partnerSearch.trim()
                          ? 'Try a different name'
                          : 'Start typing a name to search members'}
                      </Text>
                    </>
                  )}
                </View>
              }
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        </View>
      </Modal>

      {/* ───── Waiver gate modal (P1-4 / ITEM-025) ─────────────────────────── */}
      <Modal
        visible={showWaiverModal}
        animationType="slide"
        transparent
        onRequestClose={handleCloseWaiverModal}
      >
        <View
          style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' }}
        >
          <View
            style={{
              backgroundColor: theme.colors.floating,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 20,
              paddingBottom: 36,
              borderTopWidth: 1,
              borderColor: theme.colors.border,
              maxHeight: '90%',
            }}
          >
            {/* Drag handle */}
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.colors.border,
                alignSelf: 'center',
                marginBottom: 16,
              }}
            />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800' }}>
                Community Waiver
              </Text>
              <TouchableOpacity
                onPress={handleCloseWaiverModal}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 260, marginBottom: 16 }} showsVerticalScrollIndicator>
              <Text style={{ color: theme.colors.text, fontSize: 14, lineHeight: 22 }}>
                Before reserving, please acknowledge the Soapies community agreement.
                {'\n\n'}
                <Text style={{ fontWeight: '700' }}>Consent:</Text> All interaction at community
                events is based on enthusiastic consent. &quot;No&quot; is always respected. Consent
                can be withdrawn at any time.
                {'\n\n'}
                <Text style={{ fontWeight: '700' }}>Confidentiality:</Text> What happens at an event
                stays at the event. Do not share photos, identities, or stories of other members
                without their explicit permission.
                {'\n\n'}
                <Text style={{ fontWeight: '700' }}>Safety:</Text> You participate at your own risk.
                You agree to follow venue rules, operator instructions, and community guidelines.
                You will not participate while impaired beyond your ability to give consent.
                {'\n\n'}
                <Text style={{ fontWeight: '700' }}>Liability:</Text> You release Soapies, its
                organizers, hosts, and venue partners from liability for any injury, loss, or damage
                arising from your voluntary participation, except in cases of gross negligence.
                {'\n\n'}
                <Text style={{ fontWeight: '700' }}>Enforcement:</Text> Violations may result in
                removal from the event and suspension or termination of your Soapies membership
                without refund.
                {'\n\n'}
                By typing your full legal name below, you acknowledge that you have read,
                understood, and agreed to this waiver (version {WAIVER_VERSION}).
              </Text>
            </ScrollView>

            <TextInput
              value={waiverSignature}
              onChangeText={setWaiverSignature}
              placeholder="Type your full legal name"
              placeholderTextColor={theme.colors.textMuted}
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: alpha(theme.colors.primary, 0.24),
                color: theme.colors.text,
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 14,
                fontSize: 15,
              }}
              autoCapitalize="words"
              autoCorrect={false}
            />

            <TouchableOpacity
              onPress={() =>
                signWaiverMutation.mutate({
                  signature: waiverSignature.trim(),
                  version: WAIVER_VERSION,
                })
              }
              disabled={signWaiverMutation.isPending || waiverSignature.trim().length < 2}
              activeOpacity={0.85}
            >
              <BrandGradient
                style={{
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: 'center',
                  opacity:
                    signWaiverMutation.isPending || waiverSignature.trim().length < 2 ? 0.4 : 1,
                }}
              >
                {signWaiverMutation.isPending ? (
                  <ActivityIndicator color={theme.colors.white} />
                ) : (
                  <Text style={{ color: theme.colors.white, fontWeight: '700', fontSize: 15 }}>
                    Agree &amp; Continue to Reserve
                  </Text>
                )}
              </BrandGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
