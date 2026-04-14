import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  View,
  Text,
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
import { colors } from '../lib/colors';

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

  const statusColor = STATUS_COLORS[ticket.status] ?? colors.muted;
  const paymentColor = PAYMENT_COLORS[ticket.paymentStatus] ?? colors.muted;
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
        backgroundColor: colors.card,
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 14,
        borderColor: colors.border,
        borderWidth: 1,
        overflow: 'hidden',
      }}
    >
      {/* Top stripe */}
      <LinearGradient
        colors={[colors.pink, colors.purple]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: 4 }}
      />

      <View style={{ padding: 16 }}>
        {/* Event title */}
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 6 }}>
          {title}
        </Text>

        {/* Date, ticket type, and venue */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name="calendar-outline" size={14} color={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 13 }}>{dateStr}</Text>
          </View>
          {ticket.ticketType && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="ticket-outline" size={14} color={colors.muted} />
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                {ticketTypeLabels[ticket.ticketType] ?? ticket.ticketType}
              </Text>
            </View>
          )}
        </View>
        {(ticket.eventVenue || ticket.event?.venue) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 }}>
            <Ionicons name="location-outline" size={14} color={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              {ticket.eventVenue ?? ticket.event?.venue}
            </Text>
          </View>
        )}

        {/* Status badges */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          <View style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
            backgroundColor: `${statusColor}22`,
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
                borderRadius: 10,
                paddingVertical: 10,
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
              style={{
                flex: 1,
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={[colors.pink, colors.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  opacity: isPaying ? 0.7 : 1,
                }}
              >
                {isPaying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="logo-venmo" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Pay ${getTicketAmount(ticket)} via Venmo</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {!hasQR && !needsPayment && (
            <View style={{
              flex: 1,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: 'center',
              backgroundColor: `${colors.muted}11`,
            }}>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                {ticket.status === 'cancelled' ? 'Cancelled' : 'QR pending confirmation'}
              </Text>
            </View>
          )}
        </View>

        {/* Upload Test Result button */}
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
              backgroundColor: `${colors.muted}11`,
              borderColor: `${colors.muted}33`,
              borderWidth: 1,
            }}
          >
            {uploadingId === ticket.id ? (
              <ActivityIndicator color={colors.muted} size="small" />
            ) : (
              <>
                <Ionicons name="document-attach-outline" size={16} color={colors.muted} />
                <Text style={{ color: colors.muted, fontSize: 13, marginLeft: 6 }}>Upload Test Result</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function TicketsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [qrModal, setQrModal] = useState<{ visible: boolean; code: string; title: string }>({
    visible: false, code: '', title: '',
  });
  const [payingId, setPayingId] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const { data, isLoading, refetch } = trpc.reservations.myTickets.useQuery(undefined, {
    staleTime: 30_000,
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
        {
          text: 'Photo Library',
          onPress: () => uploadFromImagePicker(ticket),
        },
        {
          text: 'File / PDF',
          onPress: () => uploadFromDocumentPicker(ticket),
        },
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
      Alert.alert('✅ Submitted', 'Your test result has been submitted for review.');
      refetch();
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message);
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', flex: 1 }}>My Tickets</Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.pink} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 60 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.pink} />
          }
        >
          {tickets.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🎟️</Text>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
                No tickets yet
              </Text>
              <Text style={{ color: colors.muted, fontSize: 15, textAlign: 'center', marginBottom: 24 }}>
                Reserve a spot at an upcoming event to get your tickets
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/events' as any)}
                style={{
                  borderRadius: 14,
                  overflow: 'hidden',
                }}
              >
                <LinearGradient
                  colors={[colors.pink, colors.purple]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ paddingHorizontal: 28, paddingVertical: 14 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Browse Events</Text>
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
                    borderRadius: 12,
                    borderColor: `${colors.pink}33`,
                    borderWidth: 1,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Ionicons name="time-outline" size={16} color={colors.pink} />
                      <Text style={{ color: colors.pink, fontWeight: '700', fontSize: 14 }}>Payment Pending</Text>
                    </View>
                    <Text style={{ color: colors.muted, fontSize: 13 }}>
                      Complete payment to confirm your spot. Tap "Pay Now" on any pending reservation.
                    </Text>
                  </View>
                  {pendingTickets.map((ticket: any) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onViewQR={handleViewQR}
                      onPayNow={handlePayNow}
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
                    <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', marginHorizontal: 16, marginBottom: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Confirmed
                    </Text>
                  )}
                  {confirmedTickets.map((ticket: any) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onViewQR={handleViewQR}
                      onPayNow={handlePayNow}
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

      {/* QR Code Modal */}
      <Modal visible={qrModal.visible} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <View
            style={{
              backgroundColor: colors.bg,
              borderRadius: 24,
              padding: 28,
              width: '100%',
              alignItems: 'center',
              borderColor: colors.border,
              borderWidth: 1,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 6, textAlign: 'center' }}>
              {qrModal.title}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 24 }}>
              Show this at the door
            </Text>

            {/* QR Code */}
            <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 16 }}>
              {qrModal.code ? (
                <QRCode
                  value={qrModal.code}
                  size={220}
                  backgroundColor="white"
                  color="black"
                />
              ) : null}
            </View>

            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 16, letterSpacing: 1, textAlign: 'center' }}>
              {qrModal.code}
            </Text>

            <TouchableOpacity
              onPress={() => setQrModal({ visible: false, code: '', title: '' })}
              style={{
                marginTop: 24,
                paddingVertical: 14,
                paddingHorizontal: 40,
                borderRadius: 14,
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: 1,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
