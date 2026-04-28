export const MEMBERSHIP_FEATURES = {
  community_access: {
    label: "Community access",
    description: "Core member access to events, tickets, chats, and the private community feed.",
  },
  directory_search: {
    label: "Member directory search",
    description: "Search the member directory and discover people faster.",
  },
  relationship_tools: {
    label: "Connections & partner tools",
    description: "Create relationship groups, send partner invites, and manage deeper connections.",
  },
  priority_waitlist: {
    label: "Priority waitlist",
    description: "Get moved up faster when events sell out.",
  },
  vip_badge: {
    label: "VIP profile badge",
    description: "Stand out across the app with an elevated member badge.",
  },
  addon_discounts: {
    label: "Member add-on perks",
    description: "Unlock premium add-on discounts and special offers.",
  },
  concierge_support: {
    label: "Concierge support",
    description: "Faster support for booking questions and membership help.",
  },
  early_access: {
    label: "Early access drops",
    description: "Get first look access to select events and special releases.",
  },
} as const;

export type MembershipFeatureKey = keyof typeof MEMBERSHIP_FEATURES;
export type MembershipInterval = "month" | "year";
export type MembershipStatus =
  | "inactive"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "complimentary";

export type MembershipTier = {
  key: string;
  rank: number;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  featured?: boolean;
  monthlyPriceUsd: number;
  yearlyPriceUsd?: number | null;
  stripePriceIdMonthly?: string | null;
  stripePriceIdYearly?: string | null;
  features: MembershipFeatureKey[];
};

export type MembershipCatalog = {
  tiers: MembershipTier[];
};

export const DEFAULT_MEMBERSHIP_CATALOG: MembershipCatalog = {
  tiers: [
    {
      key: "community",
      rank: 0,
      name: "Community",
      badge: "✨",
      tagline: "Core member access",
      description: "The included membership layer for approved members who want the essentials.",
      monthlyPriceUsd: 0,
      yearlyPriceUsd: 0,
      features: ["community_access"],
    },
    {
      key: "connect",
      rank: 1,
      name: "Connect",
      badge: "💗",
      tagline: "Better discovery + connection tools",
      description: "Ideal for members who want stronger discovery, matching, and relationship workflows.",
      featured: true,
      monthlyPriceUsd: 29,
      yearlyPriceUsd: 290,
      stripePriceIdMonthly: null,
      stripePriceIdYearly: null,
      features: ["community_access", "directory_search", "relationship_tools"],
    },
    {
      key: "inner_circle",
      rank: 2,
      name: "Inner Circle",
      badge: "👑",
      tagline: "Priority perks + VIP treatment",
      description: "For power members who want priority access, premium support, and VIP perks.",
      monthlyPriceUsd: 79,
      yearlyPriceUsd: 790,
      stripePriceIdMonthly: null,
      stripePriceIdYearly: null,
      features: [
        "community_access",
        "directory_search",
        "relationship_tools",
        "priority_waitlist",
        "vip_badge",
        "addon_discounts",
        "concierge_support",
        "early_access",
      ],
    },
  ],
};

export function sortMembershipTiers(catalog: MembershipCatalog): MembershipCatalog {
  return {
    tiers: [...catalog.tiers].sort((a, b) => a.rank - b.rank),
  };
}

export function getTierByKey(catalog: MembershipCatalog, key?: string | null): MembershipTier | null {
  if (!key) return null;
  return catalog.tiers.find((tier) => tier.key === key) ?? null;
}

export function getBaseTier(catalog: MembershipCatalog): MembershipTier {
  return sortMembershipTiers(catalog).tiers[0] ?? DEFAULT_MEMBERSHIP_CATALOG.tiers[0];
}

export function getEffectiveTier(catalog: MembershipCatalog, key?: string | null): MembershipTier {
  return getTierByKey(catalog, key) ?? getBaseTier(catalog);
}

export function getRequiredTierForFeature(
  catalog: MembershipCatalog,
  feature: MembershipFeatureKey
): MembershipTier {
  return (
    sortMembershipTiers(catalog).tiers.find((tier) => tier.features.includes(feature)) ??
    getBaseTier(catalog)
  );
}

export function buildFeatureAccessMap(
  catalog: MembershipCatalog,
  tierKey?: string | null
): Record<MembershipFeatureKey, boolean> {
  const tier = getEffectiveTier(catalog, tierKey);
  const enabled = new Set<MembershipFeatureKey>(tier.features);
  return Object.keys(MEMBERSHIP_FEATURES).reduce(
    (acc, feature) => {
      acc[feature as MembershipFeatureKey] = enabled.has(feature as MembershipFeatureKey);
      return acc;
    },
    {} as Record<MembershipFeatureKey, boolean>
  );
}
