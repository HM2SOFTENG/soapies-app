import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { useTheme } from '../../lib/theme';
import AdminAccessGate from '../../components/AdminAccessGate';
import { useAdminAccess } from '../../lib/useAdminAccess';

function StatusBadge({
  label,
  tone,
  theme,
}: {
  label: string;
  tone:
    | 'healthy'
    | 'warning'
    | 'critical'
    | 'unknown'
    | 'connected'
    | 'configured'
    | 'missing'
    | 'error';
  theme: ReturnType<typeof useTheme>;
}) {
  const toneMap: Record<string, { bg: string; border: string; text: string }> = {
    healthy: {
      bg: theme.colors.successSoft,
      border: theme.colors.successBorder,
      text: theme.colors.success,
    },
    connected: {
      bg: theme.colors.successSoft,
      border: theme.colors.successBorder,
      text: theme.colors.success,
    },
    configured: {
      bg: theme.colors.infoSoft,
      border: theme.colors.infoBorder,
      text: '#22C7F2',
    },
    warning: {
      bg: theme.colors.warningSoft,
      border: theme.colors.warningBorder,
      text: theme.colors.warning,
    },
    missing: {
      bg: theme.colors.warningSoft,
      border: theme.colors.warningBorder,
      text: theme.colors.warning,
    },
    critical: {
      bg: theme.colors.dangerSoft,
      border: theme.colors.dangerBorder,
      text: theme.colors.danger,
    },
    error: {
      bg: theme.colors.dangerSoft,
      border: theme.colors.dangerBorder,
      text: theme.colors.danger,
    },
    unknown: {
      bg: theme.colors.surfaceMuted,
      border: theme.colors.border,
      text: theme.colors.textMuted,
    },
  };
  const colors = toneMap[tone] ?? toneMap.unknown;

  return (
    <View
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}
    >
      <Text
        style={{ color: colors.text, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}
      >
        {label}
      </Text>
    </View>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  theme,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: 16,
        marginBottom: 14,
      }}
    >
      <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '800' }}>{title}</Text>
      {subtitle ? (
        <Text style={{ color: theme.colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 4 }}>
          {subtitle}
        </Text>
      ) : null}
      <View style={{ marginTop: 14 }}>{children}</View>
    </View>
  );
}

function formatDateTime(value: unknown) {
  if (!value) return '-';

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function PlatformOpsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { isAdmin, isCheckingAdmin } = useAdminAccess();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data, isLoading, isError, error, refetch } = trpc.admin.platformOpsSummary.useQuery(
    undefined,
    {
      enabled: isAdmin,
      staleTime: 15_000,
      refetchOnWindowFocus: false,
    }
  );

  const runAction = trpc.admin.platformOpsRunAction.useMutation({
    onSuccess: (result: any) => {
      Alert.alert('Done', result?.message ?? 'Action completed.');
      refetch();
    },
    onError: (err: any) => Alert.alert('Action failed', err.message ?? 'Please try again.'),
  });

  if (isCheckingAdmin) return <AdminAccessGate mode="loading" />;
  if (!isAdmin) return <AdminAccessGate mode="denied" onBack={() => router.back()} />;

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function openUrl(url?: string | null) {
    if (!url) return;
    Linking.openURL(url).catch(() => {
      Alert.alert('Could not open link', url);
    });
  }

  function confirmRerun(runId: number, name: string) {
    Alert.alert('Rerun workflow', `Request a rerun for "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Rerun',
        onPress: () => runAction.mutate({ action: 'rerun_github_run', runId }),
      },
    ]);
  }

  if (isLoading && !data) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={{ color: theme.colors.text, marginTop: 14, fontWeight: '700' }}>
          Loading Platform Ops…
        </Text>
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <Ionicons name="cloud-offline-outline" size={46} color={theme.colors.textMuted} />
        <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '800', marginTop: 16 }}>
          Could not load Platform Ops
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: 14,
            lineHeight: 21,
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          {(error as any)?.message ?? 'Please try again in a moment.'}
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          style={{
            marginTop: 18,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const summary = data as any;
  const overview = summary.overview ?? {};
  const githubRuns = (summary.github?.runs ?? []) as any[];
  const alerts = (summary.alerts ?? []) as any[];
  const integrations = (summary.integrations ?? []) as any[];
  const serviceHealth = (summary.serviceHealth ?? []) as any[];
  const queueHealth = (summary.queueHealth ?? []) as any[];
  const auditLogs = (summary.recentAuditLogs ?? []) as any[];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['bottom']}>
      <LinearGradient
        colors={[
          theme.alpha(theme.colors.secondary, 0.22),
          theme.alpha(theme.colors.primary, 0.12),
          theme.colors.background,
        ]}
        style={{ paddingTop: insets.top + 10, paddingBottom: 18, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: theme.alpha(theme.colors.white, 0.12),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>
              Platform Ops
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 3 }}>
              Monitor platform health, release state, and safe admin actions.
            </Text>
          </View>
          <StatusBadge
            label={overview.overallStatus ?? 'unknown'}
            tone={overview.overallStatus ?? 'unknown'}
            theme={theme}
          />
        </View>
      </LinearGradient>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
      >
        <SectionCard
          title="Environment"
          subtitle="Live app/release context for the currently connected environment."
          theme={theme}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[
              { label: 'Env', value: overview.environment ?? '-' },
              { label: 'API', value: overview.apiVersion ?? '-' },
              { label: 'Mobile', value: overview.mobileVersion ?? '-' },
              { label: 'Branch', value: overview.branch ?? '-' },
              { label: 'PR', value: overview.prNumber ? `#${overview.prNumber}` : '-' },
            ].map((item) => (
              <View
                key={item.label}
                style={{
                  minWidth: '30%',
                  flexGrow: 1,
                  backgroundColor: theme.colors.surfaceMuted,
                  borderRadius: 14,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: 11,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.label}
                </Text>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: 14,
                    fontWeight: '800',
                    marginTop: 4,
                  }}
                >
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard title="Alerts" subtitle="Things that need attention right now." theme={theme}>
          {alerts.length === 0 ? (
            <Text style={{ color: theme.colors.textMuted }}>No active alerts. Nice ✨</Text>
          ) : (
            alerts.map((alert, index) => (
              <View
                key={`${alert.title}-${index}`}
                style={{
                  backgroundColor:
                    alert.severity === 'critical'
                      ? theme.colors.dangerSoft
                      : theme.colors.warningSoft,
                  borderColor:
                    alert.severity === 'critical'
                      ? theme.colors.dangerBorder
                      : theme.colors.warningBorder,
                  borderWidth: 1,
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 14 }}>
                    {alert.title}
                  </Text>
                  <StatusBadge label={alert.severity} tone={alert.severity} theme={theme} />
                </View>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: 13,
                    lineHeight: 19,
                    marginTop: 6,
                  }}
                >
                  {alert.message}
                </Text>
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard
          title="Integrations"
          subtitle="External platforms and operational dependencies."
          theme={theme}
        >
          {integrations.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={item.url ? 0.8 : 1}
              onPress={() => openUrl(item.url)}
              style={{
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
                borderWidth: 1,
                borderRadius: 14,
                padding: 13,
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 14 }}>
                    {item.label}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      fontSize: 13,
                      lineHeight: 19,
                      marginTop: 4,
                    }}
                  >
                    {item.summary}
                  </Text>
                </View>
                <StatusBadge label={item.status} tone={item.status} theme={theme} />
              </View>
            </TouchableOpacity>
          ))}
        </SectionCard>

        <SectionCard
          title="GitHub / CI"
          subtitle="Latest PR and workflow status for the active release branch."
          theme={theme}
        >
          {summary.github?.pullRequest ? (
            <TouchableOpacity
              onPress={() => openUrl(summary.github.pullRequest.url)}
              activeOpacity={0.8}
            >
              <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '800' }}>
                PR #{overview.prNumber}: {summary.github.pullRequest.title}
              </Text>
              <Text style={{ color: theme.colors.textMuted, marginTop: 4 }}>
                {summary.github.pullRequest.state} • updated{' '}
                {formatDateTime(summary.github.pullRequest.updatedAt)}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={{ color: theme.colors.textMuted }}>PR metadata unavailable.</Text>
          )}

          <View style={{ marginTop: 14 }}>
            {githubRuns.length === 0 ? (
              <Text style={{ color: theme.colors.textMuted }}>No workflow runs available.</Text>
            ) : (
              githubRuns.slice(0, 5).map((run) => {
                const failed = run.conclusion === 'failure';
                const pending = run.status !== 'completed';
                const tone = failed ? 'critical' : pending ? 'warning' : 'healthy';
                return (
                  <View
                    key={run.id}
                    style={{
                      backgroundColor: theme.colors.surfaceMuted,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      padding: 12,
                      marginBottom: 10,
                    }}
                  >
                    <View
                      style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 14 }}>
                          {run.name}
                        </Text>
                        <Text
                          style={{
                            color: theme.colors.textMuted,
                            fontSize: 12,
                            lineHeight: 18,
                            marginTop: 4,
                          }}
                        >
                          {run.status}
                          {run.conclusion ? ` • ${run.conclusion}` : ''}
                          {run.branch ? ` • ${run.branch}` : ''}
                        </Text>
                      </View>
                      <StatusBadge
                        label={failed ? 'failed' : pending ? 'pending' : 'passed'}
                        tone={tone as any}
                        theme={theme}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                      {run.url ? (
                        <TouchableOpacity
                          onPress={() => openUrl(run.url)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 9,
                            borderRadius: 10,
                            backgroundColor: theme.colors.background,
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                          }}
                        >
                          <Text
                            style={{ color: theme.colors.text, fontWeight: '700', fontSize: 12 }}
                          >
                            Open
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      {failed && summary.actions?.rerunGithubRun ? (
                        <TouchableOpacity
                          onPress={() => confirmRerun(run.id, run.name)}
                          disabled={runAction.isPending}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 9,
                            borderRadius: 10,
                            backgroundColor: theme.colors.primary,
                          }}
                        >
                          <Text
                            style={{ color: theme.colors.white, fontWeight: '800', fontSize: 12 }}
                          >
                            Rerun
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </SectionCard>

        <SectionCard
          title="Deployment"
          subtitle="Current backend hosting and deployment state."
          theme={theme}
        >
          <View style={{ gap: 10 }}>
            <View>
              <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 15 }}>
                {summary.deployment?.app?.name ?? 'DigitalOcean App Platform'}
              </Text>
              <Text style={{ color: theme.colors.textMuted, marginTop: 4, lineHeight: 19 }}>
                {summary.deployment?.summary}
              </Text>
            </View>
            {summary.deployment?.latestDeployment ? (
              <View
                style={{
                  backgroundColor: theme.colors.surfaceMuted,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  padding: 12,
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
                  Latest deployment: {summary.deployment.latestDeployment.phase}
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 4 }}>
                  {formatDateTime(summary.deployment.latestDeployment.createdAt)}
                </Text>
              </View>
            ) : null}
            {summary.deployment?.url ? (
              <TouchableOpacity
                onPress={() => openUrl(summary.deployment.url)}
                style={{
                  alignSelf: 'flex-start',
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  backgroundColor: theme.colors.background,
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 12 }}>
                  Open app URL
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </SectionCard>

        <SectionCard
          title="Mobile Release"
          subtitle="Expo/EAS configuration and release context."
          theme={theme}
        >
          <View style={{ gap: 8 }}>
            <Text style={{ color: theme.colors.text, fontWeight: '800' }}>
              Version {summary.mobileRelease?.appVersion ?? '-'}
            </Text>
            <Text style={{ color: theme.colors.textMuted, lineHeight: 19 }}>
              {summary.mobileRelease?.summary}
            </Text>
            {summary.mobileRelease?.bundleId ? (
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                iOS bundle: {summary.mobileRelease.bundleId}
              </Text>
            ) : null}
            {summary.mobileRelease?.packageName ? (
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                Android package: {summary.mobileRelease.packageName}
              </Text>
            ) : null}
            {!!summary.mobileRelease?.buildProfiles?.length && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {summary.mobileRelease.buildProfiles.map((profile: string) => (
                  <View
                    key={profile}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      borderRadius: 999,
                      backgroundColor: theme.colors.surfaceMuted,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 11 }}>
                      {profile}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </SectionCard>

        <SectionCard
          title="Service Health"
          subtitle="Core dependencies and provider readiness."
          theme={theme}
        >
          {serviceHealth.map((item) => (
            <View
              key={item.id}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{item.label}</Text>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: 12,
                    lineHeight: 18,
                    marginTop: 3,
                  }}
                >
                  {item.summary}
                </Text>
              </View>
              <StatusBadge label={item.status} tone={item.status} theme={theme} />
            </View>
          ))}
        </SectionCard>

        <SectionCard
          title="Operational Queues"
          subtitle="Backlogs that most directly affect admins and members."
          theme={theme}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {queueHealth.map((item) => (
              <View
                key={item.id}
                style={{
                  width: '47%',
                  backgroundColor: theme.colors.surfaceMuted,
                  borderRadius: 14,
                  padding: 14,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: 11,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.label}
                </Text>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: 28,
                    fontWeight: '900',
                    marginTop: 8,
                  }}
                >
                  {item.count}
                </Text>
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard
          title="Safe Actions"
          subtitle="Approved admin ops actions exposed inside the app."
          theme={theme}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <TouchableOpacity
              onPress={() => runAction.mutate({ action: 'send_test_push_to_self' })}
              disabled={runAction.isPending}
              style={{
                flex: 1,
                minWidth: '46%',
                backgroundColor: theme.colors.primary,
                borderRadius: 14,
                padding: 14,
              }}
            >
              <Text style={{ color: theme.colors.white, fontWeight: '800', fontSize: 14 }}>
                Send test push to self
              </Text>
              <Text
                style={{ color: theme.alpha(theme.colors.white, 0.84), fontSize: 12, marginTop: 4 }}
              >
                Verifies your current admin device can receive push notifications.
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => runAction.mutate({ action: 'create_test_in_app_notification' })}
              disabled={runAction.isPending}
              style={{
                flex: 1,
                minWidth: '46%',
                backgroundColor: theme.colors.surfaceMuted,
                borderRadius: 14,
                padding: 14,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 14 }}>
                Create test in-app alert
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 4 }}>
                Confirms admin notification and real-time UI wiring.
              </Text>
            </TouchableOpacity>
          </View>
        </SectionCard>

        <SectionCard
          title="Recent Admin Actions"
          subtitle="Latest audit trail entries for ops and admin activity."
          theme={theme}
        >
          {auditLogs.length === 0 ? (
            <Text style={{ color: theme.colors.textMuted }}>
              No recent audit log entries available.
            </Text>
          ) : (
            auditLogs.map((item) => (
              <View
                key={item.id}
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                  paddingBottom: 10,
                  marginBottom: 10,
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{item.action}</Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 3 }}>
                  {item.targetType} #{item.targetId} • admin {item.adminId} •{' '}
                  {formatDateTime(item.createdAt)}
                </Text>
              </View>
            ))
          )}
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}
