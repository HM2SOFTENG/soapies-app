import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as db from "../db";
import * as notif from "../notifications";
import { ENV } from "../_core/env";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const MOBILE_DIR = resolve(REPO_ROOT, "mobile");

type PlatformStatus = "healthy" | "warning" | "critical" | "unknown";
type IntegrationStatus = "connected" | "configured" | "missing" | "error";

type GithubRun = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  workflowName: string | null;
  url: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  branch: string | null;
  commitSha: string | null;
};

type PlatformActionInput =
  | { action: "send_test_push_to_self"; actorUserId: number }
  | { action: "create_test_in_app_notification"; actorUserId: number }
  | { action: "rerun_github_run"; actorUserId: number; runId: number };

function readJsonSafe<T = any>(path: string): T | null {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

function hasValue(value: string | undefined | null) {
  return !!value && value.trim().length > 0;
}

function configuredStatus(isConfigured: boolean): IntegrationStatus {
  return isConfigured ? "configured" : "missing";
}

function toHealth(ok: boolean): PlatformStatus {
  return ok ? "healthy" : "critical";
}

function formatError(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error ?? "Unknown error");
}

function githubHeaders() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${ENV.githubToken}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

function getGithubConfig() {
  const repo =
    ENV.githubRepo || process.env.GITHUB_REPOSITORY || "HM2SOFTENG/soapies-app";
  const branch = ENV.githubBranch || process.env.GITHUB_REF_NAME || "main";
  const parsedPrNumber = ENV.githubPrNumber
    ? Number(ENV.githubPrNumber)
    : undefined;
  const prNumber = parsedPrNumber && Number.isFinite(parsedPrNumber) ? parsedPrNumber : null;
  return { repo, branch, prNumber };
}

async function getGithubStatus() {
  const { repo, branch, prNumber } = getGithubConfig();
  const repoUrl = `https://github.com/${repo}`;
  if (!hasValue(ENV.githubToken)) {
    return {
      status: configuredStatus(false),
      summary: "GitHub API token not configured",
      repo,
      branch,
      prNumber,
      repoUrl,
      pullRequest: null,
      runs: [] as GithubRun[],
      actions: { canRerun: false },
    };
  }

  try {
    const [pullRequest, workflowRuns] = await Promise.all([
      prNumber
        ? fetchJson(`https://api.github.com/repos/${repo}/pulls/${prNumber}`, {
            headers: githubHeaders(),
          }).catch(() => null)
        : Promise.resolve(null),
      fetchJson(
        `https://api.github.com/repos/${repo}/actions/runs?branch=${encodeURIComponent(branch)}&per_page=8`,
        { headers: githubHeaders() }
      ),
    ]);

    const runs = ((workflowRuns as any)?.workflow_runs ?? []).map(
      (run: any) =>
        ({
          id: run.id,
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
          workflowName: run.display_title ?? run.name,
          url: run.html_url ?? null,
          createdAt: run.created_at ?? null,
          updatedAt: run.updated_at ?? null,
          branch: run.head_branch ?? null,
          commitSha: run.head_sha ?? null,
        }) satisfies GithubRun
    );

    const latestFailed = runs.find(
      (run: GithubRun) => run.conclusion === "failure"
    );
    const hasPending = runs.some(
      (run: GithubRun) => run.status !== "completed"
    );
    const allSuccessful =
      runs.length > 0 &&
      runs.every((run: GithubRun) => run.conclusion === "success");

    return {
      status: latestFailed ? "error" : "connected",
      summary: latestFailed
        ? `Latest failing workflow: ${latestFailed.name}`
        : hasPending
          ? "GitHub checks in progress"
          : allSuccessful
            ? "Recent GitHub checks are green"
            : "GitHub connected",
      repo,
      branch,
      prNumber,
      repoUrl,
      pullRequest: pullRequest
        ? {
            title: (pullRequest as any).title,
            state: (pullRequest as any).state,
            url: (pullRequest as any).html_url,
            mergeable: (pullRequest as any).mergeable,
            draft: (pullRequest as any).draft,
            updatedAt: (pullRequest as any).updated_at,
          }
        : null,
      runs,
      actions: { canRerun: true },
    };
  } catch (error) {
    return {
      status: "error",
      summary: `GitHub monitoring failed: ${formatError(error)}`,
      repo,
      branch,
      prNumber,
      repoUrl,
      pullRequest: null,
      runs: [] as GithubRun[],
      actions: { canRerun: false },
    };
  }
}

async function getDigitalOceanStatus() {
  const appId = ENV.digitalOceanAppId;
  if (!hasValue(ENV.digitalOceanToken) || !hasValue(appId)) {
    return {
      status: configuredStatus(false),
      summary: "DigitalOcean App Platform token/app id not configured",
      app: null,
      latestDeployment: null,
      url: null,
      actions: { canOpen: false },
    };
  }

  try {
    const headers = {
      Authorization: `Bearer ${ENV.digitalOceanToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    const [appPayload, deploymentsPayload] = await Promise.all([
      fetchJson(`https://api.digitalocean.com/v2/apps/${appId}`, { headers }),
      fetchJson(
        `https://api.digitalocean.com/v2/apps/${appId}/deployments?per_page=5`,
        { headers }
      ),
    ]);

    const app = (appPayload as any)?.app;
    const latestDeployment =
      ((deploymentsPayload as any)?.deployments ?? [])[0] ?? null;
    const appUrl = app?.live_url ?? app?.default_ingress ?? null;
    const phase =
      latestDeployment?.phase ?? app?.active_deployment?.phase ?? "UNKNOWN";
    const normalizedPhase = String(phase).toUpperCase();
    const status: IntegrationStatus =
      normalizedPhase.includes("ERROR") || normalizedPhase.includes("FAILED")
        ? "error"
        : "connected";

    return {
      status,
      summary:
        status === "error"
          ? `Latest deployment in ${normalizedPhase}`
          : `DigitalOcean app ${app?.spec?.name ?? app?.id ?? "connected"} is ${normalizedPhase}`,
      app: app
        ? {
            id: app.id,
            name: app.spec?.name ?? "Soapies",
            region: app.region?.slug ?? null,
            url: appUrl,
            updatedAt: app.updated_at ?? null,
          }
        : null,
      latestDeployment: latestDeployment
        ? {
            id: latestDeployment.id,
            phase: latestDeployment.phase,
            cause: latestDeployment.cause,
            progress: latestDeployment.progress,
            createdAt: latestDeployment.created_at,
            updatedAt: latestDeployment.updated_at,
          }
        : null,
      url: appUrl,
      actions: { canOpen: !!appUrl },
    };
  } catch (error) {
    return {
      status: "error",
      summary: `DigitalOcean monitoring failed: ${formatError(error)}`,
      app: null,
      latestDeployment: null,
      url: null,
      actions: { canOpen: false },
    };
  }
}

async function getExpoStatus() {
  const appJson = readJsonSafe<any>(resolve(MOBILE_DIR, "app.json"));
  const easJson = readJsonSafe<any>(resolve(MOBILE_DIR, "eas.json"));
  const mobilePackage = readJsonSafe<any>(resolve(MOBILE_DIR, "package.json"));
  const projectId =
    appJson?.expo?.extra?.eas?.projectId ?? ENV.expoProjectId ?? null;
  const bundleId = appJson?.expo?.ios?.bundleIdentifier ?? null;
  const packageName = appJson?.expo?.android?.package ?? null;
  const hasRemoteMonitoring = hasValue(ENV.expoToken) && hasValue(projectId);

  return {
    status: hasRemoteMonitoring
      ? "connected"
      : easJson || appJson
        ? "configured"
        : "missing",
    summary: hasRemoteMonitoring
      ? "Expo/EAS integration configured for remote monitoring"
      : easJson || appJson
        ? "Expo/EAS build configuration detected locally"
        : "Expo/EAS configuration not detected",
    appVersion: mobilePackage?.version ?? appJson?.expo?.version ?? null,
    runtimeVersion: appJson?.expo?.runtimeVersion ?? null,
    projectId,
    bundleId,
    packageName,
    buildProfiles: easJson?.build ? Object.keys(easJson.build) : [],
    actions: {
      hasBuildConfig: !!easJson,
      remoteMonitoring: hasRemoteMonitoring,
    },
  };
}

async function getServiceHealth() {
  const dbConn = await db.getDb();
  return [
    {
      id: "database",
      label: "Database",
      status: toHealth(!!dbConn),
      summary: dbConn
        ? "Database connection available"
        : "Database unavailable",
    },
    {
      id: "storage",
      label: "Upload Storage",
      status: toHealth(
        hasValue(ENV.spacesKey) &&
          hasValue(ENV.spacesSecret) &&
          hasValue(ENV.spacesBucket)
      ),
      summary:
        hasValue(ENV.spacesKey) &&
        hasValue(ENV.spacesSecret) &&
        hasValue(ENV.spacesBucket)
          ? `Storage bucket ${ENV.spacesBucket} configured`
          : "Storage credentials incomplete",
    },
    {
      id: "email",
      label: "Email",
      status: notif.isEmailEnabled() ? "healthy" : "warning",
      summary: notif.isEmailEnabled()
        ? "SendGrid email delivery enabled"
        : "Email provider not configured",
    },
    {
      id: "sms",
      label: "SMS / OTP",
      status: notif.isSmsEnabled() ? "healthy" : "warning",
      summary: notif.isSmsEnabled()
        ? "Twilio SMS enabled"
        : "SMS provider not configured",
    },
    {
      id: "push",
      label: "Push Notifications",
      status:
        hasValue(ENV.vapidPublicKey) && hasValue(ENV.vapidPrivateKey)
          ? "healthy"
          : "warning",
      summary:
        hasValue(ENV.vapidPublicKey) && hasValue(ENV.vapidPrivateKey)
          ? "Web push keys configured"
          : "Push/webpush keys missing",
    },
    {
      id: "oauth",
      label: "OAuth / Sessions",
      status: hasValue(ENV.oAuthServerUrl) ? "healthy" : "warning",
      summary: hasValue(ENV.oAuthServerUrl)
        ? `OAuth server configured: ${ENV.oAuthServerUrl}`
        : "OAuth server URL missing",
    },
    {
      id: "payments",
      label: "Stripe Payments",
      status: hasValue(ENV.stripeSecretKey) ? "healthy" : "warning",
      summary: hasValue(ENV.stripeSecretKey)
        ? "Stripe secret configured"
        : "Stripe secret missing",
    },
  ];
}

async function getQueueHealth() {
  const [
    pendingApplications,
    pendingVenmoReservations,
    pendingTestResults,
    auditLogs,
  ] = await Promise.all([
    db.getPendingApplications(),
    db.getPendingVenmoReservations(),
    db.getPendingTestResults(),
    db.getAuditLogs(10),
  ]);

  return {
    queues: [
      {
        id: "applications",
        label: "Pending Applications",
        count: pendingApplications.length,
        severity: pendingApplications.length > 15 ? "warning" : "healthy",
      },
      {
        id: "venmo",
        label: "Pending Venmo Reviews",
        count: pendingVenmoReservations.length,
        severity: pendingVenmoReservations.length > 10 ? "warning" : "healthy",
      },
      {
        id: "tests",
        label: "Pending Test Reviews",
        count: pendingTestResults.length,
        severity: pendingTestResults.length > 10 ? "warning" : "healthy",
      },
    ],
    auditLogs: (auditLogs as any[]).map(item => ({
      id: item.id,
      action: item.action,
      targetType: item.targetType,
      targetId: item.targetId,
      createdAt: item.createdAt,
      adminId: item.adminId,
    })),
  };
}

function buildAlerts(input: {
  serviceHealth: Awaited<ReturnType<typeof getServiceHealth>>;
  github: Awaited<ReturnType<typeof getGithubStatus>>;
  digitalOcean: Awaited<ReturnType<typeof getDigitalOceanStatus>>;
  expo: Awaited<ReturnType<typeof getExpoStatus>>;
  queueHealth: Awaited<ReturnType<typeof getQueueHealth>>;
}) {
  const alerts: Array<{
    severity: PlatformStatus;
    title: string;
    message: string;
  }> = [];

  input.serviceHealth
    .filter(service => service.status !== "healthy")
    .forEach(service => {
      alerts.push({
        severity: service.status as PlatformStatus,
        title: service.label,
        message: service.summary,
      });
    });

  if (input.github.status === "error") {
    alerts.push({
      severity: "critical",
      title: "GitHub",
      message: input.github.summary,
    });
  }
  if (input.digitalOcean.status === "error") {
    alerts.push({
      severity: "critical",
      title: "DigitalOcean",
      message: input.digitalOcean.summary,
    });
  }
  if (input.expo.status === "missing") {
    alerts.push({
      severity: "warning",
      title: "Expo/EAS",
      message: input.expo.summary,
    });
  }

  input.queueHealth.queues
    .filter(queue => queue.count > 0 && queue.severity !== "healthy")
    .forEach(queue => {
      alerts.push({
        severity: queue.severity as PlatformStatus,
        title: queue.label,
        message: `${queue.count} item${queue.count === 1 ? "" : "s"} need attention`,
      });
    });

  return alerts.slice(0, 8);
}

function deriveOverallStatus(input: {
  alerts: Array<{ severity: PlatformStatus }>;
  github: Awaited<ReturnType<typeof getGithubStatus>>;
  digitalOcean: Awaited<ReturnType<typeof getDigitalOceanStatus>>;
}) {
  if (input.github.status === "error" || input.digitalOcean.status === "error")
    return "critical";
  if (input.alerts.some(alert => alert.severity === "critical"))
    return "critical";
  if (input.alerts.length > 0) return "warning";
  return "healthy";
}

export async function getPlatformOpsSummary() {
  const rootPackage = readJsonSafe<any>(resolve(REPO_ROOT, "package.json"));
  const mobilePackage = readJsonSafe<any>(resolve(MOBILE_DIR, "package.json"));

  const [github, digitalOcean, expo, serviceHealth, queueHealth] =
    await Promise.all([
      getGithubStatus(),
      getDigitalOceanStatus(),
      getExpoStatus(),
      getServiceHealth(),
      getQueueHealth(),
    ]);

  const alerts = buildAlerts({
    serviceHealth,
    github,
    digitalOcean,
    expo,
    queueHealth,
  });
  const overallStatus = deriveOverallStatus({ alerts, github, digitalOcean });

  return {
    generatedAt: new Date().toISOString(),
    overview: {
      environment: ENV.isProduction ? "production" : "development",
      overallStatus,
      apiVersion: rootPackage?.version ?? null,
      mobileVersion: mobilePackage?.version ?? null,
      repo: github.repo,
      branch: github.branch,
      prNumber: github.prNumber,
    },
    integrations: [
      {
        id: "github",
        label: "GitHub / CI",
        status: github.status,
        summary: github.summary,
        url: github.pullRequest?.url ?? github.repoUrl,
      },
      {
        id: "digitalocean",
        label: "DigitalOcean App Platform",
        status: digitalOcean.status,
        summary: digitalOcean.summary,
        url: digitalOcean.url,
      },
      {
        id: "expo",
        label: "Expo / EAS",
        status: expo.status,
        summary: expo.summary,
        url: null,
      },
      {
        id: "storage",
        label: "Upload Storage",
        status: hasValue(ENV.spacesBucket) ? "configured" : "missing",
        summary: hasValue(ENV.spacesBucket)
          ? `Bucket ${ENV.spacesBucket}`
          : "Storage bucket missing",
        url: null,
      },
      {
        id: "notifications",
        label: "Notifications",
        status:
          notif.isEmailEnabled() || notif.isSmsEnabled()
            ? "configured"
            : "missing",
        summary: `Email ${notif.isEmailEnabled() ? "on" : "off"} • SMS ${notif.isSmsEnabled() ? "on" : "off"}`,
        url: null,
      },
    ],
    github,
    deployment: digitalOcean,
    mobileRelease: expo,
    serviceHealth,
    queueHealth: queueHealth.queues,
    alerts,
    recentAuditLogs: queueHealth.auditLogs,
    actions: {
      sendTestPushToSelf: true,
      createTestInAppNotification: true,
      rerunGithubRun: github.actions.canRerun,
    },
  };
}

export async function runPlatformAdminAction(input: PlatformActionInput) {
  if (input.action === "create_test_in_app_notification") {
    await notif.createInAppNotification({
      userId: input.actorUserId,
      type: "platform_ops_test",
      title: "Platform Ops test notification",
      body: "This is a test in-app notification from Platform Ops.",
      data: { source: "platform_ops" },
    });
    return {
      success: true,
      message: "Test in-app notification sent to your account.",
    };
  }

  if (input.action === "send_test_push_to_self") {
    const profile = await db.getProfileByUserId(input.actorUserId);
    const prefs =
      typeof (profile as any)?.preferences === "string"
        ? JSON.parse((profile as any).preferences)
        : ((profile as any)?.preferences ?? {});
    const token = prefs?.pushToken;
    if (!token) {
      throw new Error("No push token registered for this admin account.");
    }

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: token,
        title: "Soapies Platform Ops",
        body: "Test push from Platform Ops completed successfully.",
        data: { source: "platform_ops" },
      }),
    });

    if (!response.ok) {
      throw new Error(`Expo push API returned ${response.status}`);
    }

    return {
      success: true,
      message: "Test push sent to your current admin device.",
    };
  }

  if (input.action === "rerun_github_run") {
    const { repo } = getGithubConfig();
    if (!hasValue(ENV.githubToken)) {
      throw new Error("GitHub token is not configured.");
    }
    const response = await fetch(
      `https://api.github.com/repos/${repo}/actions/runs/${input.runId}/rerun`,
      {
        method: "POST",
        headers: githubHeaders(),
      }
    );
    if (!response.ok) {
      throw new Error(
        `GitHub rerun failed: ${response.status} ${response.statusText}`
      );
    }
    return {
      success: true,
      message: `Requested rerun for GitHub Actions run ${input.runId}.`,
    };
  }

  throw new Error("Unsupported platform action.");
}
