import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';

interface ScanResult {
  success: boolean;
  guestName?: string;
  ticketType?: string;
  status?: string;
  message?: string;
  wristbandColor?: string;
  isQueerPlay?: boolean;
}

const WRISTBAND_CONFIG: Record<string, { color: string; label: string; emoji: string }> = {
  rainbow: { color: '#FF6B6B', label: 'Rainbow Wristband — Queer Play Zone', emoji: '🌈' },
  pink:    { color: '#EC4899', label: 'Pink Wristband — Soapies Angel', emoji: '💗' },
  purple:  { color: '#A855F7', label: 'Purple Wristband — Payment Confirmed', emoji: '💜' },
  blue:    { color: '#3B82F6', label: 'Blue Wristband — Test Results Verified', emoji: '💙' },
  green:   { color: '#10B981', label: 'Green Wristband — Standard Entry', emoji: '💚' },
};

const TICKET_TYPE_LABELS: Record<string, string> = {
  single_female: 'Single Woman',
  single_male: 'Single Man',
  couple: 'Couple',
  volunteer: 'Volunteer',
};

export default function AdminCheckinScreen() {
  const { eventId, eventTitle } = useLocalSearchParams<{ eventId: string; eventTitle: string }>();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const scanCooldown = useRef(false);

  const checkInMutation = trpc.reservations.checkInByQR.useMutation();

  async function processCheckIn(qrCode: string) {
    if (isCheckingIn || !qrCode.trim()) return;
    setIsCheckingIn(true);
    try {
      const result = await checkInMutation.mutateAsync({
        qrCode: qrCode.trim(),
        eventId: Number(eventId),
      });
      const res = result as any;
      setLastResult({
        success: true,
        guestName: res.guestName ?? res.name ?? 'Guest',
        ticketType: res.ticketType,
        status: res.status ?? 'checked_in',
        wristbandColor: res.wristbandColor,
        isQueerPlay: res.isQueerPlay,
      });
    } catch (err: any) {
      setLastResult({
        success: false,
        message: err.message ?? 'Check-in failed',
      });
    } finally {
      setIsCheckingIn(false);
      setScanned(true);
      // Allow re-scan after 3 seconds
      setTimeout(() => {
        setScanned(false);
        scanCooldown.current = false;
      }, 3000);
    }
  }

  function handleBarCodeScanned({ data }: { data: string }) {
    if (scanned || scanCooldown.current) return;
    scanCooldown.current = true;
    processCheckIn(data);
  }

  function handleManualSubmit() {
    if (!manualCode.trim()) {
      Alert.alert('Error', 'Please enter a QR code or ticket ID');
      return;
    }
    processCheckIn(manualCode);
    setManualCode('');
  }

  if (!permission) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.pink} size="large" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Ionicons name="camera-outline" size={64} color={colors.muted} style={{ marginBottom: 16 }} />
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
          Camera Permission Required
        </Text>
        <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
          We need camera access to scan QR codes at check-in.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={{ backgroundColor: colors.pink, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.muted }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Check-In Scanner</Text>
          {eventTitle ? (
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }} numberOfLines={1}>{eventTitle}</Text>
          ) : null}
        </View>
        {isCheckingIn && <ActivityIndicator color={colors.pink} size="small" />}
      </View>

      {/* Camera viewfinder */}
      <View style={{ flex: 1, position: 'relative' }}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />

        {/* Scan overlay */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 240, height: 240, position: 'relative' }}>
            {/* Corner brackets */}
            {[
              { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
              { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
              { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
              { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
            ].map((style, i) => (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  width: 36,
                  height: 36,
                  borderColor: scanned && lastResult?.success ? '#10B981' : colors.pink,
                  ...style,
                }}
              />
            ))}
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: 20, fontSize: 14 }}>
            {scanned ? (isCheckingIn ? 'Processing…' : 'Hold on…') : 'Align QR code within the frame'}
          </Text>
        </View>
      </View>

      {/* Bottom panel */}
      <View style={{
        backgroundColor: colors.bg,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        padding: 16,
        gap: 14,
      }}>
        {/* Last scan result */}
        {lastResult && (
          <View style={{
            borderRadius: 14,
            padding: 14,
            backgroundColor: lastResult.success ? '#10B98120' : '#EF444420',
            borderColor: lastResult.success ? '#10B98144' : '#EF444444',
            borderWidth: 1,
          }}>
            {lastResult.success ? (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#10B981', fontWeight: '800', fontSize: 16 }}>
                      ✅ Checked In!
                    </Text>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 2 }}>
                      {lastResult.guestName}
                    </Text>
                    {lastResult.ticketType && (
                      <Text style={{ color: colors.muted, fontSize: 13, marginTop: 1 }}>
                        {TICKET_TYPE_LABELS[lastResult.ticketType] ?? lastResult.ticketType}
                      </Text>
                    )}
                  </View>
                </View>
                {lastResult.wristbandColor && (
                  <View style={{
                    marginTop: 12,
                    padding: 14,
                    borderRadius: 12,
                    backgroundColor: `${WRISTBAND_CONFIG[lastResult.wristbandColor]?.color ?? '#888'}22`,
                    borderColor: WRISTBAND_CONFIG[lastResult.wristbandColor]?.color ?? '#888',
                    borderWidth: 2,
                    alignItems: 'center',
                  }}>
                    <Text style={{ fontSize: 32, marginBottom: 4 }}>{WRISTBAND_CONFIG[lastResult.wristbandColor]?.emoji ?? '⬜'}</Text>
                    <Text style={{ color: WRISTBAND_CONFIG[lastResult.wristbandColor]?.color ?? '#888', fontWeight: '800', fontSize: 16 }}>
                      {WRISTBAND_CONFIG[lastResult.wristbandColor]?.label ?? 'Standard Wristband'}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="close-circle" size={28} color="#EF4444" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 15 }}>Check-In Failed</Text>
                  <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{lastResult.message}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Manual entry */}
        <View>
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Manual Entry
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="Enter QR code or ticket ID"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                flex: 1,
                backgroundColor: colors.card,
                color: colors.text,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 11,
                borderColor: colors.border,
                borderWidth: 1,
                fontSize: 14,
              }}
              onSubmitEditing={handleManualSubmit}
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={handleManualSubmit}
              disabled={isCheckingIn || !manualCode.trim()}
              style={{
                backgroundColor: colors.pink,
                borderRadius: 10,
                paddingHorizontal: 16,
                justifyContent: 'center',
                opacity: isCheckingIn || !manualCode.trim() ? 0.5 : 1,
              }}
            >
              {isCheckingIn ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
