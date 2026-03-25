import { eq, and, sql } from "drizzle-orm";
import { getDb } from "./db";
import { conversations, conversationParticipants } from "../drizzle/schema";

const DEFAULT_CHANNELS = [
  {
    name: "Mens Chat",
    type: "channel" as const,
    communityId: "soapies",
    description: "A space for men in the community to chat",
  },
  {
    name: "Womens Chat",
    type: "channel" as const,
    communityId: "soapies",
    description: "A space for women in the community to chat",
  },
  {
    name: "Community Chat - Soapies",
    type: "channel" as const,
    communityId: "soapies",
    description: "General chat for all Soapies members",
  },
  {
    name: "Community Chat - Groupus",
    type: "channel" as const,
    communityId: "groupus",
    description: "General chat for all Groupus members",
  },
  {
    name: "Community Chat - Gaypeez",
    type: "channel" as const,
    communityId: "gaypeez",
    description: "General chat for all Gaypeez members",
  },
  {
    name: "Admins Chat",
    type: "channel" as const,
    communityId: null,
    description: "Private chat for administrators",
  },
  {
    name: "Soapies Angels Chat",
    type: "channel" as const,
    communityId: null,
    description: "Chat for Soapies Angels members",
  },
];

export async function ensureDefaultChannels() {
  const db = await getDb();
  if (!db) return;

  console.log("[Seed] Ensuring default channels exist...");

  try {
    // ── Step 1: De-duplicate existing channels ──────────────────────────────
    // For each channel name, keep only the oldest (lowest id), delete the rest.
    for (const ch of DEFAULT_CHANNELS) {
      const communityCondition = ch.communityId
        ? eq(conversations.communityId, ch.communityId)
        : sql`${conversations.communityId} IS NULL`;

      const existing = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.name, ch.name),
            eq(conversations.type, "channel"),
            communityCondition
          )
        )
        .orderBy(conversations.id); // oldest first

      if (existing.length > 1) {
        // Keep the first (oldest), delete the rest
        const keepId = existing[0].id;
        const deleteIds = existing.slice(1).map((r) => r.id);

        console.log(
          `[Seed] De-duplicating "${ch.name}": keeping id=${keepId}, removing ids=${deleteIds.join(",")}`
        );

        for (const dupId of deleteIds) {
          // Remove participants first (FK constraint)
          await db
            .delete(conversationParticipants)
            .where(eq(conversationParticipants.conversationId, dupId));
          // Remove conversation
          await db
            .delete(conversations)
            .where(eq(conversations.id, dupId));
        }
      }
    }

    // ── Step 2: Create any channels that don't exist yet ───────────────────
    for (const ch of DEFAULT_CHANNELS) {
      const communityCondition = ch.communityId
        ? eq(conversations.communityId, ch.communityId)
        : sql`${conversations.communityId} IS NULL`;

      const existing = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.name, ch.name),
            eq(conversations.type, "channel"),
            communityCondition
          )
        )
        .limit(1);

      if (existing.length === 0) {
        const result = await db.insert(conversations).values({
          name: ch.name,
          type: ch.type,
          communityId: ch.communityId ?? null,
          description: ch.description,
          createdBy: null,
          updatedAt: new Date(),
        });
        console.log(`[Seed] Created channel: "${ch.name}" (id=${result[0].insertId})`);
      } else {
        console.log(`[Seed] Channel already exists: "${ch.name}" (id=${existing[0].id})`);
      }
    }

    console.log("[Seed] Default channels seeding complete");
  } catch (err) {
    console.error("[Seed] Error seeding channels:", err);
  }
}
