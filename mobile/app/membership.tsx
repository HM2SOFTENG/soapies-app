import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ThemedScreen from '../components/ThemedScreen';
import { useTheme } from '../lib/theme';
import { trpc } from '../lib/trpc';

function formatMoney(amount?: number | null) {
  if (!amount || amount <= 0) return 'Included';
  return `$${amount.toFixed(0)}`;
}

function formatStatus(status?: string | null) {
  switch (status) {
    case 'active':
      return 'Active';
    case 'trialing':
      return 'Trialing';
    case 'past_due':
      return 'Past due';
    case 'canceled':
      return 'Canceled';
    case 'complimentary':
      return 'Complimentary';
    default:
      return 'Inactive';
  }
}

export default function MembershipScreen() {
  const router = useRouter();
  const theme = useTheme();
  const membershipQuery = trpc.membership.me.useQuery();
  const checkoutMutation = trpc.membership.createCheckoutSession.useMutation();
  const portalMutation = trpc.membership.createBillingPortalSession.useMutation();

  const data = membershipQuery.data as any;
  const membership = data?.membership;
  const catalog = data?.catalog;
  const tiers = (catalog?.tiers ?? []) as any[];
  const featureEntries = Object.entries(catalog?.features ?? {}) as [string, any][];

  async function openUrl(url?: string) {
    if (!url) return;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Could not open billing link');
      return;
    }
    await Linking.openURL(url);
  }

  async function handleUpgrade(tierKey: string, interval: 'month' | 'year') {
    try {
      const result = await checkoutMutation.mutateAsync({ tierKey, interval });
      await openUrl((result as any)?.url);
    } catch (error: any) {
      Alert.alert('Upgrade unavailable', error?.message ?? 'Please try again.');
    }
  }

  async function handleManageBilling() {
    try {
      const result = await portalMutation.mutateAsync();
      await openUrl((result as any)?.url);
    } catch (error: any) {
      Alert.alert('Billing unavailable', error?.message ?? 'Please try again.');
    }
  }

  return (
    <ThemedScreen scroll contentContainerStyle={{ paddingBottom: 32 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 18,
          paddingBottom: 8,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800' }}>
          Membership
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {membershipQuery.isLoading ? (
        <View style={{ paddingTop: 80, alignItems: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : membershipQuery.isError ? (
        <View style={{ margin: 20, padding: 18, borderRadius: 18, backgroundColor: theme.colors.card }}>
          <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 16 }}>
            Could not load membership
          </Text>
          <Text style={{ color: theme.colors.textMuted, marginTop: 6 }}>
            Please try again in a moment.
          </Text>
        </View>
      ) : (
        <>
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 12,
              padding: 20,
              borderRadius: 24,
              backgroundColor: theme.colors.card,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' }}>
              CURRENT PLAN
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
              <Text style={{ fontSize: 28, marginRight: 10 }}>{membership?.effectiveTier?.badge ?? '✨'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: '900' }}>
                  {membership?.effectiveTier?.name ?? 'Community'}
                </Text>
                <Text style={{ color: theme.colors.textMuted, marginTop: 2 }}>
                  {formatStatus(membership?.status)}
                  {membership?.currentPeriodEnd
                    ? ` · renews ${new Date(membership.currentPeriodEnd).toLocaleDateString()}`
                    : ''}
                </Text>
              </View>
            </View>
            <Text style={{ color: theme.colors.textMuted, marginTop: 12, lineHeight: 20 }}>
              {membership?.effectiveTier?.description}
            </Text>

            {!!membership?.stripeCustomerId && (
              <TouchableOpacity
                onPress={handleManageBilling}
                disabled={portalMutation.isPending}
                style={{
                  marginTop: 16,
                  alignSelf: 'flex-start',
                  backgroundColor: theme.colors.primary,
                  borderRadius: 999,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  opacity: portalMutation.isPending ? 0.7 : 1,
                }}
              >
                <Text style={{ color: theme.colors.white, fontWeight: '800' }}>
                  {portalMutation.isPending ? 'Opening…' : 'Manage billing'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ marginTop: 26, paddingHorizontal: 20 }}>
            <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '900' }}>
              Upgrade tiers
            </Text>
            <Text style={{ color: theme.colors.textMuted, marginTop: 6 }}>
              Monetize with clear tiers and server-enforced feature access.
            </Text>
          </View>

          {tiers.map((tier) => {
            const isCurrent = membership?.effectiveTierKey === tier.key;
            const hasMonthlyPrice = Number(tier.monthlyPriceUsd ?? 0) > 0;
            const hasYearlyPrice = Number(tier.yearlyPriceUsd ?? 0) > 0;
            const monthlyReady = !hasMonthlyPrice || !!tier.stripePriceIdMonthly;
            const yearlyReady = !hasYearlyPrice || !!tier.stripePriceIdYearly;
            return (
              <View
                key={tier.key}
                style={{
                  marginHorizontal: 20,
                  marginTop: 16,
                  padding: 18,
                  borderRadius: 22,
                  backgroundColor: theme.colors.card,
                  borderWidth: 1,
                  borderColor: isCurrent ? theme.colors.primary : theme.colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 24, marginRight: 10 }}>{tier.badge}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900' }}>
                        {tier.name}
                      </Text>
                      <Text style={{ color: theme.colors.textMuted, marginTop: 2 }}>{tier.tagline}</Text>
                    </View>
                  </View>
                  {tier.featured ? (
                    <View
                      style={{
                        backgroundColor: theme.alpha(theme.colors.primary, 0.16),
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                      }}
                    >
                      <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 11 }}>
                        POPULAR
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text style={{ color: theme.colors.textMuted, marginTop: 12, lineHeight: 20 }}>
                  {tier.description}
                </Text>

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>
                      {formatMoney(Number(tier.monthlyPriceUsd ?? 0))}
                    </Text>
                    <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>per month</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>
                      {hasYearlyPrice ? formatMoney(Number(tier.yearlyPriceUsd ?? 0)) : '—'}
                    </Text>
                    <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>per year</Text>
                  </View>
                </View>

                <View style={{ marginTop: 16, gap: 10 }}>
                  {(tier.features ?? []).map((featureKey: string) => {
                    const feature = catalog?.features?.[featureKey];
                    return (
                      <View key={featureKey} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={theme.colors.primary}
                          style={{ marginTop: 1, marginRight: 10 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
                            {feature?.label ?? featureKey}
                          </Text>
                          <Text style={{ color: theme.colors.textMuted, marginTop: 2, lineHeight: 18 }}>
                            {feature?.description}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {!isCurrent && hasMonthlyPrice ? (
                  <>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                      <TouchableOpacity
                        onPress={() => handleUpgrade(tier.key, 'month')}
                        disabled={checkoutMutation.isPending || !monthlyReady}
                        style={{
                          flex: 1,
                          backgroundColor: theme.colors.primary,
                          borderRadius: 14,
                          paddingVertical: 12,
                          alignItems: 'center',
                          opacity: checkoutMutation.isPending || !monthlyReady ? 0.55 : 1,
                        }}
                      >
                        <Text style={{ color: theme.colors.white, fontWeight: '800' }}>
                          {monthlyReady ? 'Choose monthly' : 'Monthly unavailable'}
                        </Text>
                      </TouchableOpacity>
                      {hasYearlyPrice ? (
                        <TouchableOpacity
                          onPress={() => handleUpgrade(tier.key, 'year')}
                          disabled={checkoutMutation.isPending || !yearlyReady}
                          style={{
                            flex: 1,
                            borderRadius: 14,
                            paddingVertical: 12,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                            opacity: checkoutMutation.isPending || !yearlyReady ? 0.55 : 1,
                          }}
                        >
                          <Text style={{ color: theme.colors.text, fontWeight: '800' }}>
                            {yearlyReady ? 'Choose yearly' : 'Yearly unavailable'}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    {(!monthlyReady || (hasYearlyPrice && !yearlyReady)) && (
                      <Text style={{ color: theme.colors.textMuted, marginTop: 10, fontSize: 12 }}>
                        Billing for this tier is not fully configured yet.
                      </Text>
                    )}
                  </>
                ) : isCurrent ? (
                  <View
                    style={{
                      marginTop: 18,
                      borderRadius: 14,
                      paddingVertical: 12,
                      alignItems: 'center',
                      backgroundColor: theme.alpha(theme.colors.primary, 0.12),
                    }}
                  >
                    <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>Current plan</Text>
                  </View>
                ) : null}
              </View>
            );
          })}

          <View style={{ marginHorizontal: 20, marginTop: 24, padding: 18, borderRadius: 20, backgroundColor: theme.colors.card }}>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '800' }}>
              Feature matrix
            </Text>
            <View style={{ marginTop: 14, gap: 12 }}>
              {featureEntries.map(([featureKey, feature]) => (
                <View key={featureKey} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Ionicons
                    name={membership?.featureAccess?.[featureKey] ? 'lock-open' : 'lock-closed'}
                    size={16}
                    color={membership?.featureAccess?.[featureKey] ? theme.colors.primary : theme.colors.textMuted}
                    style={{ marginTop: 2, marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{feature?.label}</Text>
                    <Text style={{ color: theme.colors.textMuted, marginTop: 2 }}>{feature?.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </ThemedScreen>
  );
}
