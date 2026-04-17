/**
 * Party Chat
 * ----------
 * Automatically creates a "🎉 Party Chat" group conversation for each event
 * 7 days before it starts, and keeps its membership in sync with confirmed
 * ticket holders.
 *
 * Entry points:
 *   - `runPartyChatCron()`  — call daily (or on startup) to create/sync chats
 *   - `syncUserToPartyChat(eventId, userId)` — call after a reservation is confirmed
 */

import { getDb } from "./db";
import {
  conversations,
  conversationParticipants,
  events,
  reservations,
  users,
} from "../drizzle/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import * as notif from "./notifications";

const PARTY_CHAT_LEAD_DAYS = 7;

// ── DB helpers ───────────────────────────────────────────────────────────────

/** Find an existing party chat for an event (type=group, eventId set). */
async function getPartyChatForEvent(eventId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.eventId, eventId), eq(conversations.type, "group")))
    .limit(1);
  return rows[0]?.id ?? null;
}

/** Get all confirmed/checked-in reservation userIds for an event. */
async function getConfirmedUserIds(eventId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ userId: reservations.userId })
    .from(reservations)
    .where(
      and(
        eq(reservations.eventId, eventId),
        sql`${reservations.status} IN ('confirmed', 'checked_in')`,
      ),
    );
  return rows.map((r: any) => r.userId as number);
}

/** Get current participant userIds for a conversation. */
async function getParticipantIds(conversationId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ userId: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.conversationId, conversationId));
  return rows.map((r: any) => r.userId as number);
}

/** Add a user to a conversation if not already a participant. */
async function addParticipant(conversationId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  // Check if already a participant
  const existing = await db
    .select({ id: conversationParticipants.id })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ),
    )
    .limit(1);
  if (existing.length > 0) return false; // already in

  await db.insert(conversationParticipants).values({
    conversationId,
    userId,
    role: "member",
  });
  return true;
}

/** Create the party chat conversation for an event and seed participants. */
async function createPartyChat(
  eventId: number,
  eventTitle: string,
  communityId: string | null,
  participantIds: number[],
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("No DB");

  const name = `🎉 ${eventTitle} — Party Chat`;
  const description = "Pre-event group chat for confirmed ticket holders. See you there! 🥂";

  const result = await db.insert(conversations).values({
    type: "group",
    name,
    description,
    eventId,
    communityId: communityId ?? undefined,
    createdBy: null, // system-created
  });

  const convId = result[0].insertId;

  // Add all confirmed attendees
  for (const uid of participantIds) {
    await db.insert(conversationParticipants).values({
      conversationId: convId,
      userId: uid,
      role: "member",
    });
  }

  // Post a welcome system message
  const { messages } = await import("../drizzle/schema");
  await db.insert(messages).values({
    conversationId: convId,
    senderId: 0, // system sender (id=0, not a real user)
    content: `Welcome to the ${eventTitle} Party Chat! 🎉 All confirmed ticket holders are here. The fun starts soon — introduce yourself! 💗`,
  });

  console.log(`[PartyChat] Created party chat (convId=${convId}) for event "${eventTitle}" (${participantIds.length} members)`);
  return convId;
}

// ── Notify new additions ─────────────────────────────────────────────────────

async function notifyAddedToPartyChat(
  userId: number,
  eventTitle: string,
  convId: number,
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const [userRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    await notif.sendNotification({
      userId,
      type: "message",
      title: `🎉 You're in the ${eventTitle} Party Chat!`,
      body: "All confirmed guests are here. Tap to say hi before the event!",
      email: (userRow as any)?.email ?? undefined,
      data: { conversationId: convId, screen: `/chat/${convId}` },
    });
  } catch (e) {
    console.warn(`[PartyChat] Failed to notify user ${userId}:`, e);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Run daily. Finds events starting in ~7 days and creates/syncs party chats.
 */
export async function runPartyChatCron(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  // Window: events starting between 6.5 and 7.5 days from now
  const windowStart = new Date(now.getTime() + (PARTY_CHAT_LEAD_DAYS - 0.5) * 86_400_000);
  const windowEnd   = new Date(now.getTime() + (PARTY_CHAT_LEAD_DAYS + 0.5) * 86_400_000);

  const upcomingEvents = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.status, "published"),
        gte(events.startDate, windowStart),
        lte(events.startDate, windowEnd),
      ),
    );

  console.log(`[PartyChat] Cron: checking ${upcomingEvents.length} events in 7-day window`);

  for (const event of upcomingEvents) {
    try {
      const existing = await getPartyChatForEvent(event.id);
      const confirmedIds = await getConfirmedUserIds(event.id);

      if (confirmedIds.length === 0) {
        console.log(`[PartyChat] Event "${event.title}" has no confirmed attendees yet — skipping`);
        continue;
      }

      if (!existing) {
        // Create new party chat
        const convId = await createPartyChat(
          event.id,
          event.title,
          (event as any).communityId ?? null,
          confirmedIds,
        );
        // Notify all attendees
        for (const uid of confirmedIds) {
          await notifyAddedToPartyChat(uid, event.title, convId);
        }
      } else {
        // Sync: add any newly confirmed attendees who aren't in the chat yet
        await syncPartyChat(existing, event.title, confirmedIds);
      }
    } catch (e) {
      console.error(`[PartyChat] Error processing event ${event.id}:`, e);
    }
  }

  // Also sync ALL existing party chats (for late confirmations on events within 7 days)
  await syncAllActivePartyChats();
}

/**
 * Sync an existing party chat — add any confirmed attendees not yet in it.
 */
async function syncPartyChat(
  convId: number,
  eventTitle: string,
  confirmedIds: number[],
): Promise<void> {
  const currentIds = new Set(await getParticipantIds(convId));
  const newIds = confirmedIds.filter((id) => !currentIds.has(id));

  for (const uid of newIds) {
    await addParticipant(convId, uid);
    await notifyAddedToPartyChat(uid, eventTitle, convId);
    console.log(`[PartyChat] Added user ${uid} to party chat ${convId} for "${eventTitle}"`);
  }
}

/**
 * Sync all active party chats (events in the next 7 days that already have a chat).
 */
async function syncAllActivePartyChats(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  const cutoff = new Date(now.getTime() + PARTY_CHAT_LEAD_DAYS * 86_400_000);

  // Get all group conversations with an eventId for events still in the future
  const activeChats = await db
    .select({ convId: conversations.id, eventId: conversations.eventId, eventTitle: events.title })
    .from(conversations)
    .innerJoin(events, eq(events.id, conversations.eventId))
    .where(
      and(
        eq(conversations.type, "group"),
        sql`${conversations.eventId} IS NOT NULL`,
        gte(events.startDate, now),
        lte(events.startDate, cutoff),
      ),
    );

  for (const chat of activeChats) {
    if (!chat.eventId) continue;
    const confirmedIds = await getConfirmedUserIds(chat.eventId);
    await syncPartyChat(chat.convId, chat.eventTitle ?? "Event", confirmedIds);
  }
}

/**
 * Call this immediately after a reservation is confirmed.
 * Adds the user to the party chat if one exists (or will be created soon).
 */
export async function syncUserToPartyChat(eventId: number, userId: number): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    // Get event details
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) return;

    const now = new Date();
    const daysUntil = (new Date(event.startDate).getTime() - now.getTime()) / 86_400_000;

    // Only act if event is within PARTY_CHAT_LEAD_DAYS
    if (daysUntil > PARTY_CHAT_LEAD_DAYS) return;

    let convId = await getPartyChatForEvent(eventId);

    if (!convId) {
      // Create the chat now (a late confirmation triggered it)
      const confirmedIds = await getConfirmedUserIds(eventId);
      convId = await createPartyChat(
        eventId,
        event.title,
        (event as any).communityId ?? null,
        confirmedIds,
      );
      for (const uid of confirmedIds) {
        await notifyAddedToPartyChat(uid, event.title, convId);
      }
    } else {
      // Just add this user
      const added = await addParticipant(convId, userId);
      if (added) {
        await notifyAddedToPartyChat(userId, event.title, convId);
      }
    }
  } catch (e) {
    console.error(`[PartyChat] syncUserToPartyChat error (event=${eventId}, user=${userId}):`, e);
  }
}
