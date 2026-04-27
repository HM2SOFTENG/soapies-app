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
import { useTheme } from '../../lib/theme';
import AdminAccessGate from '../../components/AdminAccessGate';
import { useAdminAccess } from '../../lib/useAdminAccess';

interface ScanResult {
  success: boolean;
  guestName?: string;
  ticketType?: string;
  status?: string;
  message?: string;
  wristbandColor?: string;
  isQueerPlay?: boolean;
  alreadyCheckedIn?: boolean;
}

const WRISTBAND_CONFIG: Record<string, { color: string; label: string; emoji: string }> = {
  rainbow: { color: '#FF6B6B', label: 'Rainbow Wristband — Queer Play Zone', emoji: '🌈' },
  pink: { color: '#EC4899', label: 'Pink Wristband — Soapies Angel', emoji: '💗' },
  purple: { color: '#A855F7', label: 'Purple Wristband — Payment Confirmed', emoji: '💜' },
  blue: { color: '#3B82F6', label: 'Blue Wristband — Test Results Verified', emoji: '💙' },
  green: { color: '#10B981', label: 'Green Wristband — Standard Entry', emoji: '💚' },
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
  const theme = useTheme();
  const { isAdmin, isCheckingAdmin } = useAdminAccess();
  const numericEventId = Number(eventId);
  const hasValidEventId = Number.isFinite(numericEventId) && numericEventId > 0;
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const scanCooldown = useRef(false);

  const checkInMutation = trpc.reservations.checkInByQR.useMutation();

  if (isCheckingAdmin) return <AdminAccessGate mode="loading" />;
  if (!isAdmin) return <AdminAccessGate mode="denied" onBack={() => router.back()} />;

  async function processCheckIn(qrCode: string) {
    if (isCheckingIn || !qrCode.trim()) return;
    setIsCheckingIn(true);
    try {
      if (!hasValidEventId) {
        throw new Error('Missing event context for check-in');
      }

      const result = await checkInMutation.mutateAsync({
        qrCode: qrCode.trim(),
        eventId: numericEventId,
      });
      const res = result as any;
      setLastResult({
        success: true,
        guestName: res.guestName ?? res.name ?? 'Guest',
        ticketType: res.ticketType,
        status: res.status ?? 'checked_in',
        wristbandColor: res.wristbandColor,
        isQueerPlay: res.isQueerPlay,
        alreadyCheckedIn: res.alreadyCheckedIn ?? false,
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
    if (!hasValidEventId) {
      Alert.alert(
        'Check-In Unavailable',
        'Open this scanner from a specific event to check guests in.'
      );
      return;
    }
    if (!manualCode.trim()) {
      Alert.alert('Error', 'Please enter a QR code or ticket ID');
      return;
    }
    processCheckIn(manualCode);
    setManualCode('');
  }

  if (!permission) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator color={colors.pink} size="large" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 32,
        }}
      >
        <Ionicons
          name="camera-outline"
          size={64}
          color={theme.colors.textMuted}
          style={{ marginBottom: 16 }}
        />
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 18,
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          Camera Permission Required
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: 14,
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          We need camera access to scan QR codes at check-in.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={{
            backgroundColor: colors.pink,
            paddingHorizontal: 28,
            paddingVertical: 14,
            borderRadius: 14,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.colors.textMuted }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomColor: theme.colors.border,
          borderBottomWidth: 1,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800' }}>
            Check-In Scanner
          </Text>
          {eventTitle ? (
            <Text
              style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 2 }}
              numberOfLines={1}
            >
              {eventTitle}
            </Text>
          ) : null}
        </View>
        {isCheckingIn && <ActivityIndicator color={colors.pink} size="small" />}
      </View>

      {!hasValidEventId && (
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            padding: 14,
            borderRadius: 14,
            backgroundColor: theme.colors.warningSoft,
            borderColor: theme.colors.warningBorder,
            borderWidth: 1,
          }}
        >
          <Text style={{ color: theme.colors.warning, fontWeight: '800', fontSize: 14 }}>
            Open check-in from an event
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 4 }}>
            This scanner needs an event so it can prevent cross-event check-ins.
          </Text>
        </View>
      )}

      {/* Camera viewfinder */}
      <View style={{ flex: 1, position: 'relative', opacity: hasValidEventId ? 1 : 0.45 }}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned || !hasValidEventId ? undefined : handleBarCodeScanned}
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
            {scanned
              ? isCheckingIn
                ? 'Processing…'
                : 'Hold on…'
              : 'Align QR code within the frame'}
          </Text>
        </View>
      </View>

      {/* Bottom panel */}
      <View
        style={{
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          padding: 16,
          gap: 14,
        }}
      >
        {/* Last scan result */}
        {lastResult && (
          <View
            style={{
              borderRadius: 14,
              padding: 14,
              backgroundColor: lastResult.success ? '#10B98120' : '#EF444420',
              borderColor: lastResult.success ? '#10B98144' : '#EF444444',
              borderWidth: 1,
            }}
          >
            {lastResult.success ? (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: lastResult.alreadyCheckedIn ? '#F59E0B' : '#10B981',
                        fontWeight: '800',
                        fontSize: 16,
                      }}
                    >
                      {lastResult.alreadyCheckedIn ? '⚠️ Already Checked In' : '✅ Checked In!'}
                    </Text>
                    <Text
                      style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 2 }}
                    >
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
                  <View
                    style={{
                      marginTop: 12,
                      padding: 14,
                      borderRadius: 12,
                      backgroundColor: `${WRISTBAND_CONFIG[lastResult.wristbandColor]?.color ?? '#888'}22`,
                      borderColor: WRISTBAND_CONFIG[lastResult.wristbandColor]?.color ?? '#888',
                      borderWidth: 2,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 32, marginBottom: 4 }}>
                      {WRISTBAND_CONFIG[lastResult.wristbandColor]?.emoji ?? '⬜'}
                    </Text>
                    {lastResult.alreadyCheckedIn && (
                      <Text
                        style={{ color: theme.colors.textMuted, fontSize: 12, marginBottom: 6 }}
                      >
                        Guest was already marked in for this event.
                      </Text>
                    )}
                    <Text
                      style={{
                        color: WRISTBAND_CONFIG[lastResult.wristbandColor]?.color ?? '#888',
                        fontWeight: '800',
                        fontSize: 16,
                      }}
                    >
                      {WRISTBAND_CONFIG[lastResult.wristbandColor]?.label ?? 'Standard Wristband'}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="close-circle" size={28} color="#EF4444" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 15 }}>
                    Check-In Failed
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
                    {lastResult.message}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Manual entry */}
        <View>
          <Text
            style={{
              color: colors.muted,
              fontSize: 11,
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
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
              disabled={isCheckingIn || !manualCode.trim() || !hasValidEventId}
              style={{
                backgroundColor: colors.pink,
                borderRadius: 10,
                paddingHorizontal: 16,
                justifyContent: 'center',
                opacity: isCheckingIn || !manualCode.trim() || !hasValidEventId ? 0.5 : 1,
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
