import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import QRCode from 'react-native-qrcode-svg';
import { trpc } from '../lib/trpc';
import { useToast } from '../components/Toast';
import { colors } from '../lib/colors';
import { useTheme } from '../lib/theme';

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#10B981',
  pending: '#F59E0B',
  cancelled: '#EF4444',
  checked_in: '#6366F1',
  no_show: '#6B7280',
};

const PAYMENT_COLORS: Record<string, string> = {
  paid: '#10B981',
  pending: '#F59E0B',
  refunded: '#6B7280',
  failed: '#EF4444',
  partial: '#F59E0B',
};

const TICKET_TYPE_COLORS: Record<string, string> = {
  single_female: '#EC4899',
  single_male: '#A855F7',
  couple: '#10B981',
  volunteer: '#F59E0B',
};

function getTicketAmount(ticket: any): string {
  if (ticket.totalAmount && parseFloat(ticket.totalAmount) > 0) {
    return parseFloat(ticket.totalAmount).toFixed(0);
  }
  const defaults: Record<string, number> = {
    single_female: 40,
    single_male: 145,
    couple: 130,
    volunteer: 0,
  };
  return String(defaults[ticket.ticketType] ?? 40);
}

function TicketCard({
  ticket,
  onViewQR,
  onPayNow,
  onUploadTest,
  uploadingId,
  payingId,
}: {
  ticket: any;
  onViewQR: (qr: string, title: string) => void;
  onPayNow: (ticket: any) => void;
  onUploadTest: (ticket: any) => void;
  uploadingId: number | null;
  payingId: number | null;
}) {
  const theme = useTheme();
  const t = theme.colors;
  const title = ticket.event?.title ?? ticket.eventTitle ?? 'Event';
  const dateStr = ticket.event?.startDate
    ? new Date(ticket.event.startDate).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
      })
    : ticket.startDate
    ? new Date(ticket.startDate).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
      })
    : 'TBD';

  const statusColor = STATUS_COLORS[ticket.status] ?? '#9CA3AF';
  const paymentColor = PAYMENT_COLORS[ticket.paymentStatus] ?? '#9CA3AF';
  const typeColor = TICKET_TYPE_COLORS[ticket.ticketType] ?? '#9CA3AF';
  const hasQR = !!ticket.qrCode;
  const needsPayment = ticket.paymentStatus === 'pending' && ticket.status !== 'cancelled';
  const isPaying = payingId === ticket.id;

  const ticketTypeLabels: Record<string, string> = {
    single_female: 'Single Woman',
    single_male: 'Single Man',
    couple: 'Couple',
    volunteer: 'Volunteer',
  };

  return (
    <View
      style={{
        backgroundColor: t.surface,
        borderRadius: 20,
        marginHorizontal: 16,
        marginBottom: 14,
        borderColor: t.border,
        borderWidth: 1,
        overflow: 'hidden',
      }}
    >
      {/* Left accent + top section as flex row workaround — use top gradient stripe */}
      <LinearGradient
        colors={['#EC4899', '#A855F7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: 3 }}
      />

      {/* Event top section */}
      <LinearGradient
        colors={theme.isDark ? ['#1A0830', '#10101C'] : [t.surfaceHigh, t.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 }}
      >
        <Text style={{ color: t.text, fontWeight: '800', fontSize: 15, marginBottom: 8 }}>
          {title}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name="calendar-outline" size={13} color={colors.pink} />
            <Text style={{ color: t.textMuted, fontSize: 12 }}>{dateStr}</Text>
          </View>
          {(ticket.eventVenue || ticket.event?.venue) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="location-outline" size={13} color={t.textMuted} />
              <Text style={{ color: t.textMuted, fontSize: 12 }}>
                {ticket.eventVenue ?? ticket.event?.venue}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Bottom section */}
      <View style={{ padding: 16 }}>
        {/* Badges row */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {ticket.ticketType && (
            <View style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 20,
              backgroundColor: `${typeColor}22`,
              borderWidth: 1,
              borderColor: `${typeColor}44`,
            }}>
              <Text style={{ color: typeColor, fontSize: 12, fontWeight: '700' }}>
                {ticketTypeLabels[ticket.ticketType] ?? ticket.ticketType}
              </Text>
            </View>
          )}
          <View style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
            backgroundColor: `${statusColor}22`,
            borderWidth: 1,
            borderColor: `${statusColor}44`,
          }}>
            <Text style={{ color: statusColor, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' }}>
              {ticket.status?.replace('_', ' ') ?? 'Unknown'}
            </Text>
          </View>
          <View style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
            backgroundColor: `${paymentColor}22`,
            borderWidth: 1,
            borderColor: `${paymentColor}44`,
          }}>
            <Text style={{ color: paymentColor, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' }}>
              {ticket.paymentStatus?.replace('_', ' ') ?? 'Pending'}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {hasQR && (
            <TouchableOpacity
              onPress={() => onViewQR(ticket.qrCode, title)}
              style={{
                flex: 1,
                backgroundColor: `${colors.purple}22`,
                borderRadius: 12,
                paddingVertical: 11,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                borderColor: `${colors.purple}44`,
                borderWidth: 1,
              }}
            >
              <Ionicons name="qr-code-outline" size={18} color={colors.purple} />
              <Text style={{ color: colors.purple, fontWeight: '700', fontSize: 14 }}>Show QR</Text>
            </TouchableOpacity>
          )}

          {needsPayment && (
            <TouchableOpacity
              onPress={() => onPayNow(ticket)}
              disabled={isPaying}
              style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#EC4899', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 11,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  opacity: isPaying ? 0.7 : 1,
                  borderRadius: 12,
                }}
              >
                {isPaying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="logo-venmo" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                      Pay ${getTicketAmount(ticket)} via Venmo
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {!hasQR && !needsPayment && (
            <View style={{
              flex: 1,
              borderRadius: 12,
              paddingVertical: 11,
              alignItems: 'center',
              backgroundColor: t.surfaceMuted,
              borderWidth: 1,
              borderColor: t.border,
            }}>
              <Text style={{ color: t.textMuted, fontSize: 13 }}>
                {ticket.status === 'cancelled' ? 'Cancelled' : 'QR pending confirmation'}
              </Text>
            </View>
          )}
        </View>

        {/* Upload Test Result */}
        {!ticket.testResultSubmitted && ticket.status !== 'cancelled' && (
          <TouchableOpacity
            onPress={() => onUploadTest(ticket)}
            disabled={uploadingId === ticket.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 10,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: t.surfaceMuted,
              borderColor: t.border,
              borderWidth: 1,
            }}
          >
            {uploadingId === ticket.id ? (
              <ActivityIndicator color={t.textMuted} size="small" />
            ) : (
              <>
                <Ionicons name="document-attach-outline" size={16} color={t.textMuted} />
                <Text style={{ color: t.textMuted, fontSize: 13, marginLeft: 6 }}>Upload Test Result</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function TicketsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const theme = useTheme();
  const t = theme.colors;
  const [refreshing, setRefreshing] = useState(false);
  const [qrModal, setQrModal] = useState<{ visible: boolean; code: string; title: string }>({
    visible: false, code: '', title: '',
  });
  const [payingId, setPayingId] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [showPaymentAgreement, setShowPaymentAgreement] = useState(false);
  const [pendingPayTicket, setPendingPayTicket] = useState<any>(null);

  const { data, isLoading, isError, error, refetch } = trpc.reservations.myTickets.useQuery(undefined, {
    staleTime: 0,
  });

  const { mutateAsync: submitTestResult } = trpc.testResults.submit.useMutation();

  const tickets = (data as any[]) ?? [];
  const pendingTickets = tickets.filter((t: any) => t.paymentStatus === 'pending' && t.status !== 'cancelled');
  const confirmedTickets = tickets.filter((t: any) => !(t.paymentStatus === 'pending' && t.status !== 'cancelled'));

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  function handleViewQR(code: string, title: string) {
    setQrModal({ visible: true, code, title });
  }

  function onPayNowPress(ticket: any) {
    setPendingPayTicket(ticket);
    setShowPaymentAgreement(true);
  }

  async function handlePayNow(ticket: any) {
    const amount = getTicketAmount(ticket);
    const eventTitle = ticket.eventTitle ?? ticket.event?.title ?? 'Soapies Event';
    const note = encodeURIComponent(`Soapies ticket - ${eventTitle} - ${ticket.ticketType?.replace('_', ' ')}`);
    const venmoUrl = `venmo://paycharge?txn=pay&recipients=KELLEN-BRENNAN&amount=${amount}&note=${note}`;
    const venmoWebUrl = `https://venmo.com/KELLEN-BRENNAN?txn=pay&amount=${amount}&note=${note}`;
    try {
      const canOpen = await Linking.canOpenURL(venmoUrl);
      if (canOpen) {
        await Linking.openURL(venmoUrl);
      } else {
        await Linking.openURL(venmoWebUrl);
      }
      Alert.alert(
        '💸 Complete Payment',
        `Send $${amount} to @KELLEN-BRENNAN on Venmo with note:\n"${decodeURIComponent(note)}"\n\nYour ticket will be confirmed once payment is verified by admin.`,
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  async function handleUploadTestResult(ticket: any) {
    Alert.alert(
      'Upload Test Result',
      'Choose how to upload your test result',
      [
        { text: 'Photo Library', onPress: () => uploadFromImagePicker(ticket) },
        { text: 'File / PDF', onPress: () => uploadFromDocumentPicker(ticket) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  async function uploadFromImagePicker(ticket: any) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    await doUpload(ticket, asset.uri, 'image/jpeg', 'test-result.jpg');
  }

  async function uploadFromDocumentPicker(ticket: any) {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    await doUpload(ticket, asset.uri, asset.mimeType ?? 'application/octet-stream', asset.name ?? 'test-result');
  }

  async function doUpload(ticket: any, uri: string, mimeType: string, fileName: string) {
    try {
      setUploadingId(ticket.id);
      const formData = new FormData();
      formData.append('photo', { uri, type: mimeType, name: fileName } as any);
      const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://soapies-app-3uk2q.ondigitalocean.app';
      const uploadRes = await fetch(`${API_URL}/api/upload-photo`, {
        method: 'POST',
        body: formData,
      });
      const { url } = await uploadRes.json();
      await submitTestResult({ reservationId: ticket.id, eventId: ticket.eventId, resultUrl: url });
      toast.success('Test result submitted for review ✅');
      refetch();
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message);
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['bottom']}>
      {/* ── Gradient Header ── */}
      <LinearGradient
        colors={theme.gradients.screen as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ paddingTop: insets.top + 12, paddingBottom: 18, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: t.surface,
              borderWidth: 1,
              borderColor: t.border,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}
          >
            <Ionicons name="arrow-back" size={20} color={t.text} />
          </TouchableOpacity>
          <Text style={{ color: t.text, fontSize: 24, fontWeight: '900', flex: 1 }}>My Tickets 🎟️</Text>
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.pink} size="large" />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }}>
          <Ionicons name="cloud-offline-outline" size={42} color={t.textMuted} />
          <Text style={{ color: t.text, fontSize: 20, fontWeight: '800', textAlign: 'center', marginTop: 14 }}>
            Could not load your tickets
          </Text>
          <Text style={{ color: t.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 21, marginTop: 8 }}>
            {(error as any)?.message ?? 'Please check your connection and try again.'}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{ marginTop: 18, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }}
          >
            <Text style={{ color: t.text, fontWeight: '800' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.pink} />
          }
        >
          {tickets.length === 0 ? (
            // ── Empty state ──
            <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 56, marginBottom: 16 }}>🎟️</Text>
              <Text style={{ color: t.text, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 10 }}>
                No tickets yet
              </Text>
              <Text style={{ color: t.textMuted, fontSize: 15, textAlign: 'center', marginBottom: 28, lineHeight: 22 }}>
                Reserve a spot at an upcoming event to get your tickets
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/events' as any)}
                style={{ borderRadius: 16, overflow: 'hidden' }}
              >
                <LinearGradient
                  colors={['#EC4899', '#A855F7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Browse Events</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {pendingTickets.length > 0 && (
                <>
                  <View style={{
                    marginHorizontal: 16,
                    marginBottom: 12,
                    padding: 14,
                    backgroundColor: `${colors.pink}15`,
                    borderRadius: 14,
                    borderColor: `${colors.pink}33`,
                    borderWidth: 1,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Ionicons name="time-outline" size={16} color={colors.pink} />
                      <Text style={{ color: colors.pink, fontWeight: '700', fontSize: 14 }}>Payment Pending</Text>
                    </View>
                    <Text style={{ color: t.textMuted, fontSize: 13, lineHeight: 19 }}>
                      Complete payment to confirm your spot. Tap &quot;Pay Now&quot; on any pending reservation.
                    </Text>
                  </View>
                  {pendingTickets.map((ticket: any) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onViewQR={handleViewQR}
                      onPayNow={onPayNowPress}
                      onUploadTest={handleUploadTestResult}
                      uploadingId={uploadingId}
                      payingId={payingId}
                    />
                  ))}
                </>
              )}
              {confirmedTickets.length > 0 && (
                <>
                  {pendingTickets.length > 0 && (
                    <Text style={{
                      color: t.textMuted,
                      fontSize: 11,
                      fontWeight: '800',
                      marginHorizontal: 16,
                      marginBottom: 10,
                      marginTop: 4,
                      textTransform: 'uppercase',
                      letterSpacing: 1.2,
                    }}>
                      Confirmed
                    </Text>
                  )}
                  {confirmedTickets.map((ticket: any) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onViewQR={handleViewQR}
                      onPayNow={onPayNowPress}
                      onUploadTest={handleUploadTestResult}
                      uploadingId={uploadingId}
                      payingId={payingId}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* ── Community Agreement Modal ── */}
      <Modal visible={showPaymentAgreement} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: t.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: t.border,
            padding: 24,
            maxHeight: '85%',
          }}>
            <Text style={{ color: t.text, fontSize: 20, fontWeight: '800', marginBottom: 16 }}>
              🎉 Community Agreement
            </Text>
            <ScrollView style={{ marginBottom: 20 }}>
              <Text style={{ color: t.textSecondary, fontSize: 14, lineHeight: 22 }}>
                By attending a Soapies event, you agree to:
                {`\n\n`}🤝 Respect all community members and their boundaries at all times
                {`\n\n`}🚫 No means no — consent is mandatory and non-negotiable
                {`\n\n`}🔒 What happens at Soapies stays at Soapies — absolute discretion
                {`\n\n`}📵 No photography or recording without explicit consent of all parties
                {`\n\n`}🍷 Drink responsibly — we want everyone to have a safe, fun time
                {`\n\n`}🧹 This is a COMMUNITY-operated event. Help with setup or teardown is highly welcomed and deeply appreciated — even 15 minutes makes a difference!
                {`\n\n`}⚕️ Please test before attending. Your safety and the safety of others matters.
                {`\n\n`}❤️ We are a sex-positive, inclusive community. Judgment-free zone.
              </Text>
            </ScrollView>
            <TouchableOpacity
              onPress={() => {
                setShowPaymentAgreement(false);
                if (pendingPayTicket) handlePayNow(pendingPayTicket);
              }}
              style={{ borderRadius: 16, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#EC4899', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 16, padding: 16, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>I Agree — Proceed to Payment 💸</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPaymentAgreement(false)} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={{ color: t.textMuted, fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── QR Code Modal ── */}
      <Modal visible={qrModal.visible} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <View style={{
            backgroundColor: t.surface,
            borderRadius: 24,
            padding: 28,
            width: '100%',
            alignItems: 'center',
            borderColor: t.border,
            borderWidth: 1,
          }}>
            <Text style={{ color: t.text, fontSize: 18, fontWeight: '800', marginBottom: 6, textAlign: 'center' }}>
              {qrModal.title}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: 13, marginBottom: 24 }}>
              Show this at the door
            </Text>

            {/* QR Code on white bg */}
            <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 16 }}>
              {qrModal.code && qrModal.code.startsWith('data:image') ? (
                <Image
                  source={{ uri: qrModal.code }}
                  style={{ width: 220, height: 220 }}
                  resizeMode="contain"
                />
              ) : qrModal.code ? (
                <QRCode
                  value={qrModal.code}
                  size={220}
                  backgroundColor="white"
                  color="black"
                />
              ) : null}
            </View>

            <Text style={{ color: t.textMuted, fontSize: 11, marginTop: 16, letterSpacing: 1, textAlign: 'center' }}>
              {qrModal.code}
            </Text>

            <TouchableOpacity
              onPress={() => setQrModal({ visible: false, code: '', title: '' })}
              style={{
                marginTop: 24,
                paddingVertical: 14,
                paddingHorizontal: 40,
                borderRadius: 14,
                backgroundColor: t.surfaceHigh,
                borderColor: t.border,
                borderWidth: 1,
              }}
            >
              <Text style={{ color: t.text, fontWeight: '700', fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
