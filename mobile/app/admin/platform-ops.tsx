import React from 'react';
import {
  ActivityIndicator,
  Alert,
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

function MetricCard({
  label,
  value,
  theme,
}: {
  label: string;
  value: string | number;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View
      style={{
        minWidth: '47%',
        flexGrow: 1,
        backgroundColor: theme.colors.surfaceMuted,
        borderRadius: 14,
        padding: 14,
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
        {label}
      </Text>
      <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: '900', marginTop: 8 }}>
        {value}
      </Text>
    </View>
  );
}

function ActionCard({
  title,
  subtitle,
  onPress,
  theme,
  icon,
  tone = 'default',
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: 'default' | 'primary';
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        minWidth: '46%',
        backgroundColor: tone === 'primary' ? theme.colors.primary : theme.colors.surfaceMuted,
        borderRadius: 14,
        padding: 14,
        borderWidth: tone === 'primary' ? 0 : 1,
        borderColor: tone === 'primary' ? 'transparent' : theme.colors.border,
      }}
    >
      <Ionicons
        name={icon}
        size={18}
        color={tone === 'primary' ? theme.colors.white : theme.colors.text}
      />
      <Text
        style={{
          color: tone === 'primary' ? theme.colors.white : theme.colors.text,
          fontWeight: '800',
          fontSize: 14,
          marginTop: 10,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color:
            tone === 'primary' ? theme.alpha(theme.colors.white, 0.84) : theme.colors.textMuted,
          fontSize: 12,
          marginTop: 4,
          lineHeight: 18,
        }}
      >
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

function DetailRow({
  label,
  value,
  theme,
}: {
  label: string;
  value: React.ReactNode;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 14,
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' }}>
        {label}
      </Text>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        {typeof value === 'string' || typeof value === 'number' ? (
          <Text selectable style={{ color: theme.colors.text, fontSize: 12, textAlign: 'right' }}>
            {value}
          </Text>
        ) : (
          value
        )}
      </View>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  theme,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: active ? theme.colors.primary : theme.colors.surfaceMuted,
        borderWidth: 1,
        borderColor: active ? theme.colors.primary : theme.colors.border,
      }}
    >
      <Text
        style={{
          color: active ? theme.colors.white : theme.colors.text,
          fontSize: 11,
          fontWeight: '800',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
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
  const [actionFeedback, setActionFeedback] = React.useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);
  const [runFilter, setRunFilter] = React.useState<'all' | 'active' | 'failed' | 'passed'>('all');
  const [auditFilter, setAuditFilter] = React.useState<'all' | string>('all');

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
      const message = result?.message ?? 'Action completed.';
      setActionFeedback({ tone: 'success', message });
      Alert.alert('Done', message);
      refetch();
    },
    onError: (err: any) => {
      const message = err.message ?? 'Please try again.';
      setActionFeedback({ tone: 'error', message });
      Alert.alert('Action failed', message);
    },
  });

  if (isCheckingAdmin) return <AdminAccessGate mode="loading" />;
  if (!isAdmin) return <AdminAccessGate mode="denied" onBack={() => router.back()} />;

  async function onRefresh() {
    setRefreshing(true);
    setActionFeedback(null);
    await refetch();
    setRefreshing(false);
  }

  function openRoute(route: string) {
    router.push(route as any);
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
  const configuredIntegrations = integrations.filter((item) =>
    ['connected', 'configured'].includes(item.status)
  ).length;
  const unhealthyServices = serviceHealth.filter((item) => item.status !== 'healthy').length;
  const totalBacklog = queueHealth.reduce((sum, item) => sum + (item.count ?? 0), 0);
  const activeWorkflowRuns = githubRuns.filter((run) => run.status !== 'completed').length;
  const filteredRuns = githubRuns.filter((run) => {
    if (runFilter === 'active') return run.status !== 'completed';
    if (runFilter === 'failed') return run.conclusion === 'failure';
    if (runFilter === 'passed') return run.conclusion === 'success';
    return true;
  });
  const auditFilterOptions = [
    'all',
    ...new Set(auditLogs.map((item) => item.targetType).filter(Boolean)),
  ];
  const filteredAuditLogs = auditLogs.filter((item) =>
    auditFilter === 'all' ? true : item.targetType === auditFilter
  );
  const queueRouteMap: Record<string, string> = {
    applications: '/admin/applications',
    venmo: '/admin/reservations',
    tests: '/admin/members',
  };
  const quickControls = [
    {
      title: 'Applications',
      subtitle: 'Review pending member applications and interviews.',
      route: '/admin/applications',
      icon: 'person-add-outline' as const,
    },
    {
      title: 'Reservations',
      subtitle: 'Process Venmo confirmations and event queue cleanup.',
      route: '/admin/reservations',
      icon: 'card-outline' as const,
    },
    {
      title: 'Push Center',
      subtitle: 'Send member-targeted push notifications or test comms.',
      route: '/admin/push-notifications',
      icon: 'notifications-outline' as const,
    },
    {
      title: 'Members',
      subtitle: 'Inspect member roles, signals, and admin follow-ups.',
      route: '/admin/members',
      icon: 'people-outline' as const,
    },
  ];
  const nextSteps = [
    alerts.length > 0
      ? {
          title: `Resolve ${alerts[0]?.title}`,
          subtitle: alerts[0]?.message ?? 'There is an active platform alert to investigate.',
          onPress: () =>
            alerts[0]?.title === 'Pending Applications'
              ? openRoute('/admin/applications')
              : alerts[0]?.title === 'Pending Venmo Reviews'
                ? openRoute('/admin/reservations')
                : alerts[0]?.title === 'Pending Test Reviews'
                  ? openRoute('/admin/members')
                  : onRefresh(),
          icon: 'alert-circle-outline' as const,
        }
      : null,
    totalBacklog > 0
      ? {
          title: 'Work the hottest queue',
          subtitle: `${totalBacklog} items are waiting across admin queues.`,
          onPress: () => openRoute('/admin/applications'),
          icon: 'list-outline' as const,
        }
      : null,
    {
      title: 'Refresh live snapshot',
      subtitle: `Last generated ${formatDateTime(summary.generatedAt)}. Pull a fresh operational read.`,
      onPress: onRefresh,
      icon: 'refresh-outline' as const,
    },
  ].filter(Boolean) as {
    title: string;
    subtitle: string;
    onPress: () => void;
    icon: keyof typeof Ionicons.glyphMap;
  }[];

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
            <Text style={{ color: theme.colors.textMuted, fontSize: 11, marginTop: 6 }}>
              Last updated {formatDateTime(summary.generatedAt)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 8 }}>
            <StatusBadge
              label={overview.overallStatus ?? 'unknown'}
              tone={overview.overallStatus ?? 'unknown'}
              theme={theme}
            />
            <TouchableOpacity
              onPress={onRefresh}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: theme.alpha(theme.colors.white, 0.14),
              }}
            >
              <Text style={{ color: theme.colors.text, fontSize: 11, fontWeight: '800' }}>
                Refresh
              </Text>
            </TouchableOpacity>
          </View>
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
          title="Ops Snapshot"
          subtitle="High-signal counts to orient quickly before drilling into details."
          theme={theme}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <MetricCard label="Active alerts" value={alerts.length} theme={theme} />
            <MetricCard label="Queue backlog" value={totalBacklog} theme={theme} />
            <MetricCard label="Unhealthy services" value={unhealthyServices} theme={theme} />
            <MetricCard label="Live workflow runs" value={activeWorkflowRuns} theme={theme} />
            <MetricCard
              label="Configured integrations"
              value={`${configuredIntegrations}/${integrations.length}`}
              theme={theme}
            />
          </View>
        </SectionCard>

        <SectionCard
          title="Recommended Next Steps"
          subtitle="Fastest actions to take based on the current platform state."
          theme={theme}
        >
          <View style={{ gap: 10 }}>
            {nextSteps.map((item) => (
              <TouchableOpacity
                key={item.title}
                onPress={item.onPress}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 12,
                  backgroundColor: theme.colors.surfaceMuted,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 14,
                  padding: 13,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.alpha(theme.colors.primary, 0.14),
                  }}
                >
                  <Ionicons name={item.icon} size={18} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '800' }}>
                    {item.title}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      fontSize: 12,
                      lineHeight: 18,
                      marginTop: 4,
                    }}
                  >
                    {item.subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </SectionCard>

        <SectionCard
          title="Quick Controls"
          subtitle="Jump directly into the operational areas admins actually need to work."
          theme={theme}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {quickControls.map((item) => (
              <ActionCard
                key={item.title}
                title={item.title}
                subtitle={item.subtitle}
                onPress={() => openRoute(item.route)}
                theme={theme}
                icon={item.icon}
              />
            ))}
          </View>
        </SectionCard>

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
          subtitle="External platforms and operational dependencies, rendered directly in-app."
          theme={theme}
        >
          {integrations.map((item) => (
            <View
              key={item.id}
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
              <View style={{ marginTop: 10 }}>
                {item.id === 'github' ? (
                  <>
                    <DetailRow label="Repo" value={summary.github?.repo ?? '-'} theme={theme} />
                    <DetailRow
                      label="Tracked branch"
                      value={summary.github?.branch ?? '-'}
                      theme={theme}
                    />
                    <DetailRow
                      label="PR tracked"
                      value={
                        summary.github?.prNumber ? `#${summary.github.prNumber}` : 'Not pinned'
                      }
                      theme={theme}
                    />
                  </>
                ) : null}
                {item.id === 'digitalocean' ? (
                  <>
                    <DetailRow
                      label="App"
                      value={summary.deployment?.app?.name ?? '-'}
                      theme={theme}
                    />
                    <DetailRow
                      label="Region"
                      value={summary.deployment?.app?.region ?? '-'}
                      theme={theme}
                    />
                    <DetailRow
                      label="App ID"
                      value={summary.deployment?.app?.id ?? '-'}
                      theme={theme}
                    />
                  </>
                ) : null}
                {item.id === 'expo' ? (
                  <>
                    <DetailRow
                      label="Project ID"
                      value={summary.mobileRelease?.projectId ?? '-'}
                      theme={theme}
                    />
                    <DetailRow
                      label="Runtime"
                      value={summary.mobileRelease?.runtimeVersion ?? '-'}
                      theme={theme}
                    />
                    <DetailRow
                      label="Build profiles"
                      value={(summary.mobileRelease?.buildProfiles ?? []).join(', ') || '-'}
                      theme={theme}
                    />
                  </>
                ) : null}
                {item.id === 'storage' ? (
                  <DetailRow
                    label="Bucket"
                    value={item.summary.replace('Bucket ', '')}
                    theme={theme}
                  />
                ) : null}
                {item.id === 'notifications' ? (
                  <DetailRow label="Channels" value={item.summary} theme={theme} />
                ) : null}
              </View>
            </View>
          ))}
        </SectionCard>

        <SectionCard
          title="GitHub / CI"
          subtitle="Latest PR and workflow status for the active release branch."
          theme={theme}
        >
          {summary.github?.pullRequest ? (
            <View>
              <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '800' }}>
                PR #{overview.prNumber}: {summary.github.pullRequest.title}
              </Text>
              <Text style={{ color: theme.colors.textMuted, marginTop: 4 }}>
                {summary.github.pullRequest.state} • updated{' '}
                {formatDateTime(summary.github.pullRequest.updatedAt)}
              </Text>
            </View>
          ) : (
            <Text style={{ color: theme.colors.textMuted }}>
              PR metadata unavailable. Live CI data below is still rendered in-app.
            </Text>
          )}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {[
              { key: 'all', label: `All (${githubRuns.length})` },
              { key: 'active', label: `Active (${activeWorkflowRuns})` },
              {
                key: 'failed',
                label: `Failed (${githubRuns.filter((run) => run.conclusion === 'failure').length})`,
              },
              {
                key: 'passed',
                label: `Passed (${githubRuns.filter((run) => run.conclusion === 'success').length})`,
              },
            ].map((item) => (
              <FilterChip
                key={item.key}
                label={item.label}
                active={runFilter === item.key}
                onPress={() => setRunFilter(item.key as typeof runFilter)}
                theme={theme}
              />
            ))}
          </View>

          <View style={{ marginTop: 14 }}>
            {filteredRuns.length === 0 ? (
              <Text style={{ color: theme.colors.textMuted }}>
                No workflow runs match this filter.
              </Text>
            ) : (
              filteredRuns.slice(0, 6).map((run) => {
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
                    <View style={{ marginTop: 10 }}>
                      <DetailRow label="Run ID" value={run.id} theme={theme} />
                      <DetailRow
                        label="Updated"
                        value={formatDateTime(run.updatedAt ?? run.createdAt)}
                        theme={theme}
                      />
                      <DetailRow
                        label="Commit"
                        value={run.commitSha ? String(run.commitSha).slice(0, 7) : '-'}
                        theme={theme}
                      />
                    </View>
                    {failed && summary.actions?.rerunGithubRun ? (
                      <TouchableOpacity
                        onPress={() => confirmRerun(run.id, run.name)}
                        disabled={runAction.isPending}
                        style={{
                          marginTop: 10,
                          alignSelf: 'flex-start',
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
                );
              })
            )}
          </View>
        </SectionCard>

        <SectionCard
          title="Deployment"
          subtitle="Current backend hosting and deployment state, fully visible in-app."
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
            <View
              style={{
                backgroundColor: theme.colors.surfaceMuted,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.colors.border,
                padding: 12,
              }}
            >
              <DetailRow
                label="Region"
                value={summary.deployment?.app?.region ?? '-'}
                theme={theme}
              />
              <DetailRow label="App URL" value={summary.deployment?.url ?? '-'} theme={theme} />
              <DetailRow
                label="Updated"
                value={formatDateTime(summary.deployment?.app?.updatedAt)}
                theme={theme}
              />
              <DetailRow
                label="Deployment ID"
                value={summary.deployment?.latestDeployment?.id ?? '-'}
                theme={theme}
              />
              <DetailRow
                label="Phase"
                value={summary.deployment?.latestDeployment?.phase ?? '-'}
                theme={theme}
              />
              <DetailRow
                label="Cause"
                value={summary.deployment?.latestDeployment?.cause ?? '-'}
                theme={theme}
              />
              <DetailRow
                label="Progress"
                value={summary.deployment?.latestDeployment?.progress ?? '-'}
                theme={theme}
              />
              <DetailRow
                label="Started"
                value={formatDateTime(summary.deployment?.latestDeployment?.createdAt)}
                theme={theme}
              />
            </View>
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
            <View
              style={{
                backgroundColor: theme.colors.surfaceMuted,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.colors.border,
                padding: 12,
              }}
            >
              <DetailRow
                label="Project ID"
                value={summary.mobileRelease?.projectId ?? '-'}
                theme={theme}
              />
              <DetailRow
                label="Runtime"
                value={summary.mobileRelease?.runtimeVersion ?? '-'}
                theme={theme}
              />
              <DetailRow
                label="iOS bundle"
                value={summary.mobileRelease?.bundleId ?? '-'}
                theme={theme}
              />
              <DetailRow
                label="Android package"
                value={summary.mobileRelease?.packageName ?? '-'}
                theme={theme}
              />
              <DetailRow
                label="Profiles"
                value={(summary.mobileRelease?.buildProfiles ?? []).join(', ') || '-'}
                theme={theme}
              />
            </View>
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
            {queueHealth.map((item) => {
              const route = queueRouteMap[item.id];
              const isWarning = item.severity === 'warning';
              return (
                <TouchableOpacity
                  key={item.id}
                  disabled={!route}
                  onPress={() => route && openRoute(route)}
                  style={{
                    width: '47%',
                    backgroundColor: theme.colors.surfaceMuted,
                    borderRadius: 14,
                    padding: 14,
                    borderColor: isWarning ? theme.colors.warningBorder : theme.colors.border,
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
                  <Text
                    style={{
                      color: route ? theme.colors.primary : theme.colors.textMuted,
                      fontSize: 12,
                      fontWeight: '700',
                      marginTop: 6,
                    }}
                  >
                    {route ? 'Open queue' : 'No linked workflow'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SectionCard>

        <SectionCard
          title="Safe Actions"
          subtitle="Approved admin ops actions plus fast links to the underlying control surfaces."
          theme={theme}
        >
          {actionFeedback ? (
            <View
              style={{
                backgroundColor:
                  actionFeedback.tone === 'success'
                    ? theme.colors.successSoft
                    : theme.colors.dangerSoft,
                borderColor:
                  actionFeedback.tone === 'success'
                    ? theme.colors.successBorder
                    : theme.colors.dangerBorder,
                borderWidth: 1,
                borderRadius: 14,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 13 }}>
                {actionFeedback.tone === 'success' ? 'Last action succeeded' : 'Last action failed'}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 4 }}>
                {actionFeedback.message}
              </Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <ActionCard
              title="Send test push to self"
              subtitle="Verify this admin device can receive push notifications."
              onPress={() => runAction.mutate({ action: 'send_test_push_to_self' })}
              theme={theme}
              icon="phone-portrait-outline"
              tone="primary"
            />
            <ActionCard
              title="Create test in-app alert"
              subtitle="Confirm admin notification and real-time UI wiring."
              onPress={() => runAction.mutate({ action: 'create_test_in_app_notification' })}
              theme={theme}
              icon="notifications-outline"
            />
            <ActionCard
              title="Refresh snapshot"
              subtitle="Pull the latest deployment, queue, and service state into this dashboard."
              onPress={onRefresh}
              theme={theme}
              icon="refresh-outline"
            />
            <ActionCard
              title="Review applications"
              subtitle="Jump directly into the highest-value admin backlog from here."
              onPress={() => openRoute('/admin/applications')}
              theme={theme}
              icon="checkmark-done-outline"
            />
          </View>
        </SectionCard>

        <SectionCard
          title="Recent Admin Actions"
          subtitle="Filter the audit trail in-app to focus on the kinds of ops activity you care about."
          theme={theme}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {auditFilterOptions.map((item) => (
              <FilterChip
                key={item}
                label={item}
                active={auditFilter === item}
                onPress={() => setAuditFilter(item)}
                theme={theme}
              />
            ))}
          </View>
          {filteredAuditLogs.length === 0 ? (
            <Text style={{ color: theme.colors.textMuted }}>
              No recent audit log entries available for this filter.
            </Text>
          ) : (
            filteredAuditLogs.map((item) => (
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
