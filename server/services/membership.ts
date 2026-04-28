import { TRPCError } from "@trpc/server";
import * as db from "../db";
import {
  DEFAULT_MEMBERSHIP_CATALOG,
  MEMBERSHIP_FEATURES,
  buildFeatureAccessMap,
  getBaseTier,
  getEffectiveTier,
  getRequiredTierForFeature,
  type MembershipCatalog,
  type MembershipFeatureKey,
  type MembershipInterval,
  type MembershipStatus,
  type MembershipTier,
} from "../../shared/membership";

const MEMBERSHIP_SETTINGS_KEY = "membership_catalog";

const MEMBERSHIP_SETTING_OVERRIDES = {
  connect: {
    monthlyPriceUsd: "membership_connect_monthly_price_usd",
    yearlyPriceUsd: "membership_connect_yearly_price_usd",
    stripePriceIdMonthly: "membership_connect_monthly_price_id",
    stripePriceIdYearly: "membership_connect_yearly_price_id",
  },
  inner_circle: {
    monthlyPriceUsd: "membership_inner_circle_monthly_price_usd",
    yearlyPriceUsd: "membership_inner_circle_yearly_price_usd",
    stripePriceIdMonthly: "membership_inner_circle_monthly_price_id",
    stripePriceIdYearly: "membership_inner_circle_yearly_price_id",
  },
} as const;

export type StoredMembershipState = {
  tierKey?: string | null;
  status?: MembershipStatus | null;
  interval?: MembershipInterval | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  lastCheckoutSessionId?: string | null;
  activatedAt?: string | null;
  updatedAt?: string | null;
};

function isObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeCatalog(input?: unknown): MembershipCatalog {
  if (!input || !isObject(input) || !Array.isArray((input as any).tiers)) {
    return DEFAULT_MEMBERSHIP_CATALOG;
  }

  const tiers = (input as any).tiers
    .filter((tier: any) => isObject(tier) && typeof tier.key === "string")
    .map((tier: any, index: number) => ({
      key: String(tier.key),
      rank: Number.isFinite(Number(tier.rank)) ? Number(tier.rank) : index,
      name: String(tier.name ?? tier.key),
      badge: String(tier.badge ?? "✨"),
      tagline: String(tier.tagline ?? ""),
      description: String(tier.description ?? ""),
      featured: Boolean(tier.featured),
      monthlyPriceUsd: Number(tier.monthlyPriceUsd ?? 0),
      yearlyPriceUsd:
        tier.yearlyPriceUsd == null ? null : Number(tier.yearlyPriceUsd),
      stripePriceIdMonthly:
        tier.stripePriceIdMonthly == null ? null : String(tier.stripePriceIdMonthly),
      stripePriceIdYearly:
        tier.stripePriceIdYearly == null ? null : String(tier.stripePriceIdYearly),
      features: Array.isArray(tier.features)
        ? tier.features.filter((feature: any) => feature in MEMBERSHIP_FEATURES)
        : [],
    }))
    .sort((a: MembershipTier, b: MembershipTier) => a.rank - b.rank);

  return tiers.length ? { tiers } : DEFAULT_MEMBERSHIP_CATALOG;
}

async function ensureMembershipCatalog(): Promise<void> {
  const settings = await db.getAppSettings();
  const existing = settings.find((row: any) => row.key === MEMBERSHIP_SETTINGS_KEY);
  if (!existing?.value) {
    await db.upsertAppSetting(
      MEMBERSHIP_SETTINGS_KEY,
      JSON.stringify(DEFAULT_MEMBERSHIP_CATALOG, null, 2)
    );
  }
}

export async function getMembershipCatalog(): Promise<MembershipCatalog> {
  await ensureMembershipCatalog();
  const settings = await db.getAppSettings();
  const settingsMap = new Map<string, string>(
    settings.map((item: any) => [String(item.key), String(item.value ?? "")])
  );
  const row = settings.find((item: any) => item.key === MEMBERSHIP_SETTINGS_KEY);
  const baseCatalog = (() => {
    if (!row?.value) return DEFAULT_MEMBERSHIP_CATALOG;
    try {
      return normalizeCatalog(JSON.parse(row.value));
    } catch {
      return DEFAULT_MEMBERSHIP_CATALOG;
    }
  })();

  return {
    tiers: baseCatalog.tiers.map((tier) => {
      const overrides =
        MEMBERSHIP_SETTING_OVERRIDES[
          tier.key as keyof typeof MEMBERSHIP_SETTING_OVERRIDES
        ];
      if (!overrides) return tier;
      const monthlyPriceUsd = settingsMap.get(overrides.monthlyPriceUsd);
      const yearlyPriceUsd = settingsMap.get(overrides.yearlyPriceUsd);
      const stripePriceIdMonthly = settingsMap.get(overrides.stripePriceIdMonthly);
      const stripePriceIdYearly = settingsMap.get(overrides.stripePriceIdYearly);
      return {
        ...tier,
        monthlyPriceUsd:
          monthlyPriceUsd && monthlyPriceUsd.trim().length > 0
            ? Number(monthlyPriceUsd)
            : tier.monthlyPriceUsd,
        yearlyPriceUsd:
          yearlyPriceUsd && yearlyPriceUsd.trim().length > 0
            ? Number(yearlyPriceUsd)
            : tier.yearlyPriceUsd,
        stripePriceIdMonthly:
          stripePriceIdMonthly && stripePriceIdMonthly.trim().length > 0
            ? stripePriceIdMonthly
            : tier.stripePriceIdMonthly,
        stripePriceIdYearly:
          stripePriceIdYearly && stripePriceIdYearly.trim().length > 0
            ? stripePriceIdYearly
            : tier.stripePriceIdYearly,
      };
    }),
  };
}

export function normalizeMembershipState(input: unknown): StoredMembershipState {
  if (!isObject(input)) {
    return {
      tierKey: getBaseTier(DEFAULT_MEMBERSHIP_CATALOG).key,
      status: "inactive",
      interval: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      lastCheckoutSessionId: null,
      activatedAt: null,
      updatedAt: null,
    };
  }

  return {
    tierKey: typeof input.tierKey === "string" ? input.tierKey : null,
    status:
      typeof input.status === "string"
        ? (input.status as MembershipStatus)
        : "inactive",
    interval:
      input.interval === "month" || input.interval === "year"
        ? input.interval
        : null,
    currentPeriodEnd:
      typeof input.currentPeriodEnd === "string" ? input.currentPeriodEnd : null,
    cancelAtPeriodEnd: Boolean(input.cancelAtPeriodEnd),
    stripeCustomerId:
      typeof input.stripeCustomerId === "string" ? input.stripeCustomerId : null,
    stripeSubscriptionId:
      typeof input.stripeSubscriptionId === "string"
        ? input.stripeSubscriptionId
        : null,
    lastCheckoutSessionId:
      typeof input.lastCheckoutSessionId === "string"
        ? input.lastCheckoutSessionId
        : null,
    activatedAt: typeof input.activatedAt === "string" ? input.activatedAt : null,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : null,
  };
}

export function membershipStatusIsEntitled(status?: string | null): boolean {
  return status === "active" || status === "trialing" || status === "complimentary";
}

async function getProfilePreferences(userId: number): Promise<Record<string, any>> {
  const profile = await db.getProfileByUserId(userId);
  return isObject((profile as any)?.preferences) ? ((profile as any).preferences as Record<string, any>) : {};
}

export async function saveMembershipStateForUser(
  userId: number,
  patch: Partial<StoredMembershipState>
) {
  const profile = await db.getProfileByUserId(userId);
  const existingPreferences = isObject((profile as any)?.preferences)
    ? ((profile as any).preferences as Record<string, any>)
    : {};
  const existingMembership = normalizeMembershipState(existingPreferences.membership);
  const nextMembership: StoredMembershipState = {
    ...existingMembership,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  const nextPreferences = {
    ...existingPreferences,
    membership: nextMembership,
  };
  await db.upsertProfile({ userId, preferences: nextPreferences });
  return nextMembership;
}

export async function getMembershipSnapshotForUser(userId: number) {
  const catalog = await getMembershipCatalog();
  const baseTier = getBaseTier(catalog);
  const preferences = await getProfilePreferences(userId);
  const stored = normalizeMembershipState(preferences.membership);
  const entitledTierKey = membershipStatusIsEntitled(stored.status)
    ? stored.tierKey ?? baseTier.key
    : baseTier.key;
  const effectiveTier = getEffectiveTier(catalog, entitledTierKey);
  const featureAccess = buildFeatureAccessMap(catalog, effectiveTier.key);
  const settings = await db.getAppSettings();
  const getNumberSetting = (key: string, fallback: number) => {
    const row = settings.find((item: any) => item.key === key);
    const value = Number(row?.value ?? fallback);
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    catalog: {
      tiers: catalog.tiers,
      features: MEMBERSHIP_FEATURES,
    },
    membership: {
      ...stored,
      effectiveTierKey: effectiveTier.key,
      effectiveTier,
      isEntitled: membershipStatusIsEntitled(stored.status),
      featureAccess,
      perkConfig: {
        addonDiscountPercentByTier: {
          connect: getNumberSetting("membership_connect_addon_discount_pct", 5),
          inner_circle: getNumberSetting("membership_inner_circle_addon_discount_pct", 15),
        },
        earlyAccessHoursByTier: {
          connect: getNumberSetting("membership_connect_early_access_hours", 12),
          inner_circle: getNumberSetting("membership_inner_circle_early_access_hours", 48),
        },
      },
    },
  };
}

export async function requireMembershipFeature(
  userId: number,
  feature: MembershipFeatureKey
) {
  const snapshot = await getMembershipSnapshotForUser(userId);
  if (snapshot.membership.featureAccess[feature]) return snapshot;
  const requiredTier = getRequiredTierForFeature(snapshot.catalog, feature);
  throw new TRPCError({
    code: "FORBIDDEN",
    message: `${requiredTier.name} membership required for ${MEMBERSHIP_FEATURES[feature].label.toLowerCase()}.`,
  });
}

export async function getMembershipSettingsMap() {
  const settings = await db.getAppSettings();
  return Object.fromEntries(
    settings.map((row: any) => [String(row.key), String(row.value ?? "")])
  ) as Record<string, string>;
}

export function getEarlyAccessHoursForTier(
  tierKey: string | null | undefined,
  settings: Record<string, string>
) {
  if (tierKey === "inner_circle") {
    return Number(settings.membership_inner_circle_early_access_hours ?? 48) || 48;
  }
  if (tierKey === "connect") {
    return Number(settings.membership_connect_early_access_hours ?? 12) || 12;
  }
  return 0;
}

export function computeEventVisibilityForMembership({
  event,
  membership,
  settings,
}: {
  event: any;
  membership?: { effectiveTierKey?: string | null; isEntitled?: boolean } | null;
  settings: Record<string, string>;
}) {
  const generalDelayHours = Number(settings.membership_general_release_delay_hours ?? 48) || 48;
  const releaseBaseMs = event?.publishedAt
    ? new Date(event.publishedAt).getTime()
    : event?.createdAt
      ? new Date(event.createdAt).getTime()
      : Date.now();
  const generalReleaseAtMs = releaseBaseMs + generalDelayHours * 60 * 60 * 1000;
  const tierHours = membership?.isEntitled
    ? getEarlyAccessHoursForTier(membership?.effectiveTierKey ?? null, settings)
    : 0;
  const accessAtMs = Math.max(releaseBaseMs, generalReleaseAtMs - tierHours * 60 * 60 * 1000);
  const now = Date.now();
  const visible = now >= accessAtMs;
  const exclusiveUntilMs = now < generalReleaseAtMs ? generalReleaseAtMs : null;
  return {
    visible,
    generalReleaseAt: new Date(generalReleaseAtMs).toISOString(),
    accessAt: new Date(accessAtMs).toISOString(),
    exclusiveUntil: exclusiveUntilMs ? new Date(exclusiveUntilMs).toISOString() : null,
    earlyAccessHoursApplied: tierHours,
  };
}
