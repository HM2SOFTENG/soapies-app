import { eq, desc, and, sql, asc, inArray, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, profiles, events, reservations, tickets,
  wallPosts, wallPostLikes, wallPostComments, conversations,
  conversationParticipants, messages, notifications, announcements,
  groups, appSettings, memberCredits, referralCodes, eventAddons,
  eventFeedback, expenses, adminAuditLogs, cancellationRequests,
  applicationPhotos, applicationLogs, otpCodes,
  // New imports for missing features
  reservationAddons, eventPromotionalPricing, eventOperators,
  eventShifts, shiftAssignments, eventSetupChecklist,
  relationshipGroups, relationshipGroupMembers, partnerInvitations,
  messageReactions, pinnedMessages, blockedUsers, userPresence,
  introCallSlots, singleMaleInviteCodes, preApprovedPhones,
  profileChangeRequests, groupChangeRequests,
  signedWaivers, resourceAcknowledgments,
  testResultSubmissions,
  waitlist as waitlistTable,
  pushSubscriptions,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

// ─── USER ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  (["name", "email", "loginMethod"] as const).forEach(f => {
    const v = user[f]; if (v === undefined) return;
    values[f] = v ?? null; updateSet[f] = v ?? null;
  });
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return null;
  const r = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return r[0] ?? null;
}

export async function getAllUsers() {
  const db = await getDb(); if (!db) return [];
  // Return all users with profile data (includes application status for filtering in UI)
  return db
    .select({ user: users, profile: profiles })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .orderBy(desc(users.createdAt))
    .then(rows => rows.map(r => ({ ...r.user, profile: r.profile })));
}

export async function getApprovedUsers() {
  const db = await getDb(); if (!db) return [];
  return db
    .select({ user: users, profile: profiles })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(profiles.applicationStatus, "approved"))
    .orderBy(desc(users.createdAt))
    .then(rows => rows.map(r => ({ ...r.user, profile: r.profile })));
}

export async function deactivateUser(userId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(users).set({ isSuspended: true }).where(eq(users.id, userId));
  return { success: true };
}

export async function suspendUser(userId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(users).set({ isSuspended: true }).where(eq(users.id, userId));
}

export async function unsuspendUser(userId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(users).set({ isSuspended: false }).where(eq(users.id, userId));
}

export async function deleteUser(userId: number) {
  const db = await getDb(); if (!db) return;
  // Delete related records
  await db.delete(profiles).where(eq(profiles.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

export async function updateUserMemberRole(userId: number, memberRole: "member" | "angel" | "admin") {
  const db = await getDb(); if (!db) return;
  // Update profile memberRole
  await db.update(profiles).set({ memberRole }).where(eq(profiles.userId, userId));
  // Also sync users.role for admin access
  const role = memberRole === "admin" ? "admin" : "user";
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function bulkDeleteUsers(userIds: number[]) {
  const db = await getDb(); if (!db) return;
  for (const id of userIds) {
    await db.delete(profiles).where(eq(profiles.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }
}

// ─── PROFILE ─────────────────────────────────────────────────────────────────

export async function getProfileByUserId(userId: number) {
  const db = await getDb(); if (!db) return null;
  const r = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return r[0] ?? null;
}

export async function getProfileByProfileId(profileId: number) {
  const db = await getDb(); if (!db) return null;
  const r = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  return r[0] ?? null;
}

export async function getUserById(userId: number) {
  const db = await getDb(); if (!db) return null;
  const r = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return r[0] ?? null;
}

export async function upsertProfile(data: any) {
  const db = await getDb(); if (!db) return;
  const existing = await db.select().from(profiles).where(eq(profiles.userId, data.userId)).limit(1);
  if (existing.length > 0) {
    await db.update(profiles).set(data).where(eq(profiles.userId, data.userId));
    return existing[0].id;
  }
  const r = await db.insert(profiles).values(data);
  return r[0].insertId;
}

export async function getPendingApplications() {
  const db = await getDb(); if (!db) return [];
  // Return submitted + under_review + interview phases with photos
  const rows = await db.select().from(profiles)
    .where(sql`${profiles.applicationStatus} IN ('submitted', 'under_review') OR ${profiles.applicationPhase} IN ('interview_scheduled', 'interview_complete')`)
    .orderBy(asc(profiles.createdAt));

  // Attach photos to each profile
  const result = await Promise.all(rows.map(async (p) => {
    const photos = await db!.select({ photoUrl: applicationPhotos.photoUrl })
      .from(applicationPhotos).where(eq(applicationPhotos.profileId, p.id))
      .orderBy(asc(applicationPhotos.sortOrder));
    return { ...p, applicationPhotos: photos.map(ph => ph.photoUrl) };
  }));
  return result;
}

export async function getAllProfiles() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(profiles).orderBy(desc(profiles.createdAt));
}

export async function updateProfileStatus(profileId: number, status: string, approvedBy?: number) {
  const db = await getDb(); if (!db) return;
  const data: any = { applicationStatus: status };
  if (status === "approved") { data.memberRole = "member"; data.approvedAt = new Date(); data.approvedBy = approvedBy; }
  await db.update(profiles).set(data).where(eq(profiles.id, profileId));
}

export async function updateProfilePhase(profileId: number, phase: string) {
  const db = await getDb(); if (!db) return;
  await db.update(profiles).set({ applicationPhase: phase }).where(eq(profiles.id, profileId));
}

export async function getApplicationDetail(profileId: number) {
  const db = await getDb(); if (!db) return null;

  const profileRows = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!profileRows.length) return null;
  const profile = profileRows[0];

  const user = await getUserById(profile.userId);
  const photos = await db.select({ photoUrl: applicationPhotos.photoUrl })
    .from(applicationPhotos).where(eq(applicationPhotos.profileId, profileId))
    .orderBy(asc(applicationPhotos.sortOrder));
  const logs = await db.select().from(applicationLogs)
    .where(eq(applicationLogs.profileId, profileId)).orderBy(desc(applicationLogs.createdAt));
  const slots = await db.select().from(introCallSlots)
    .where(eq(introCallSlots.profileId, profileId));

  return {
    ...profile,
    email: user?.email ?? null,
    applicationPhotos: photos.map(p => p.photoUrl),
    applicationLogs: logs,
    introCallSlots: slots,
  };
}

// ─── APPLICATION PHOTOS ──────────────────────────────────────────────────────

export async function getApplicationPhotos(profileId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(applicationPhotos).where(eq(applicationPhotos.profileId, profileId)).orderBy(asc(applicationPhotos.sortOrder));
}

export async function createApplicationPhoto(data: { profileId: number; photoUrl: string; sortOrder?: number }) {
  const db = await getDb(); if (!db) return null;
  const r = await db.insert(applicationPhotos).values(data);
  return r[0].insertId;
}

export async function deleteApplicationPhoto(photoId: number, profileId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(applicationPhotos).where(and(eq(applicationPhotos.id, photoId), eq(applicationPhotos.profileId, profileId)));
}

export async function createApplicationLog(data: { profileId: number; action: string; performedBy?: number; notes?: string }) {
  const db = await getDb(); if (!db) return;
  await db.insert(applicationLogs).values(data);
}

export async function getApplicationLogs(profileId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(applicationLogs).where(eq(applicationLogs.profileId, profileId)).orderBy(desc(applicationLogs.createdAt));
}

export async function markProfileComplete(profileId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(profiles).set({ isProfileComplete: true, applicationStatus: "submitted" }).where(eq(profiles.id, profileId));
}

export async function signWaiver(userId: number, version: string, signature: string, ip?: string) {
  const db = await getDb(); if (!db) return;
  await db.insert(signedWaivers).values({
    userId,
    waiverType: "community",
    waiverVersion: version,
    signature,
    ipAddress: ip ?? null,
    signedAt: new Date(),
  });
  await db.update(profiles).set({
    waiverSignedAt: new Date(),
    waiverVersion: version,
  }).where(eq(profiles.userId, userId));
}

export async function completeProfileSetup(userId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(profiles).set({ profileSetupComplete: true }).where(eq(profiles.userId, userId));
}

// ─── EVENTS ──────────────────────────────────────────────────────────────────

export async function getEvents(communityId?: string) {
  const db = await getDb(); if (!db) return [];
  if (communityId) {
    return db.select().from(events).where(and(eq(events.communityId, communityId), eq(events.status, "published"))).orderBy(desc(events.startDate));
  }
  return db.select().from(events).orderBy(desc(events.startDate));
}

export async function getPublishedEvents() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(events).where(eq(events.status, "published")).orderBy(asc(events.startDate));
}

export async function getEventById(id: number) {
  const db = await getDb(); if (!db) return null;
  const r = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return r[0] ?? null;
}

export async function createEvent(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(events).values(data);
  return r[0].insertId;
}

export async function updateEvent(id: number, data: any) {
  const db = await getDb(); if (!db) return;
  await db.update(events).set(data).where(eq(events.id, id));
}

export async function deleteEvent(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(events).where(eq(events.id, id));
}

export async function getEventAddons(eventId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(eventAddons).where(eq(eventAddons.eventId, eventId));
}

// ─── RESERVATIONS ────────────────────────────────────────────────────────────

export async function createReservation(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(reservations).values(data);
  return r[0].insertId;
}

export async function getReservationsByEvent(eventId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(reservations).where(eq(reservations.eventId, eventId)).orderBy(desc(reservations.createdAt));
}

export async function getReservationsByUser(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(reservations).where(eq(reservations.userId, userId)).orderBy(desc(reservations.createdAt));
}

export async function updateReservation(id: number, data: any) {
  const db = await getDb(); if (!db) return;
  await db.update(reservations).set(data).where(eq(reservations.id, id));
}

export async function getPendingVenmoReservations() {
  const db = await getDb(); if (!db) return [];
  return db
    .select({ reservation: reservations, user: users, event: events })
    .from(reservations)
    .innerJoin(users, eq(reservations.userId, users.id))
    .innerJoin(events, eq(reservations.eventId, events.id))
    .where(and(eq(reservations.paymentMethod, "venmo"), eq(reservations.paymentStatus, "pending")))
    .orderBy(desc(reservations.createdAt))
    .then(rows => rows.map(r => ({ ...r.reservation, user: r.user, event: r.event })));
}

// ─── WALL POSTS ──────────────────────────────────────────────────────────────

export async function getWallPosts(communityId?: string, limit = 50) {
  const db = await getDb(); if (!db) return [];
  const rows = await db
    .select({
      post: wallPosts,
      profile: {
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        memberRole: profiles.memberRole,
      },
    })
    .from(wallPosts)
    .leftJoin(profiles, eq(profiles.userId, wallPosts.authorId))
    .where(communityId ? eq(wallPosts.communityId, communityId) : undefined)
    .orderBy(desc(wallPosts.createdAt))
    .limit(limit);

  return rows.map(r => ({
    ...r.post,
    // authorName field takes priority, then profile displayName, then "Soapies Team" for null authorId
    resolvedAuthorName: r.post.authorName ?? r.profile?.displayName ?? (r.post.authorId ? undefined : "Soapies Team"),
    resolvedAvatarUrl: r.profile?.avatarUrl ?? null,
    resolvedMemberRole: r.profile?.memberRole ?? null,
  }));
}

export async function createWallPost(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(wallPosts).values(data);
  return r[0].insertId;
}

export async function getWallPostComments(postId: number) {
  const db = await getDb(); if (!db) return [];
  const rows = await db
    .select({ comment: wallPostComments, profile: { displayName: profiles.displayName, avatarUrl: profiles.avatarUrl } })
    .from(wallPostComments)
    .leftJoin(profiles, eq(profiles.userId, wallPostComments.authorId))
    .where(eq(wallPostComments.postId, postId))
    .orderBy(asc(wallPostComments.createdAt));
  return rows.map(r => ({ ...r.comment, resolvedAuthorName: r.profile?.displayName ?? "Member", resolvedAvatarUrl: r.profile?.avatarUrl ?? null }));
}

export async function createWallPostComment(data: any) {
  const db = await getDb(); if (!db) return;
  await db.insert(wallPostComments).values(data);
  await db.update(wallPosts).set({ commentsCount: sql`${wallPosts.commentsCount} + 1` }).where(eq(wallPosts.id, data.postId));
}

export async function updateWallPost(postId: number, userId: number, data: { content: string }) {
  const db = await getDb(); if (!db) return;
  await db.update(wallPosts).set({ content: data.content }).where(and(eq(wallPosts.id, postId), eq(wallPosts.authorId, userId)));
  return { success: true };
}

export async function deleteWallPost(postId: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(wallPosts).where(and(eq(wallPosts.id, postId), eq(wallPosts.authorId, userId)));
  return { success: true };
}

export async function toggleWallPostLike(postId: number, userId: number) {
  const db = await getDb(); if (!db) return false;
  const existing = await db.select().from(wallPostLikes).where(and(eq(wallPostLikes.postId, postId), eq(wallPostLikes.userId, userId))).limit(1);
  if (existing.length > 0) {
    await db.delete(wallPostLikes).where(eq(wallPostLikes.id, existing[0].id));
    await db.update(wallPosts).set({ likesCount: sql`GREATEST(${wallPosts.likesCount} - 1, 0)` }).where(eq(wallPosts.id, postId));
    return false;
  }
  await db.insert(wallPostLikes).values({ postId, userId });
  await db.update(wallPosts).set({ likesCount: sql`${wallPosts.likesCount} + 1` }).where(eq(wallPosts.id, postId));
  return true;
}

export async function getPublicProfile(userId: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db
    .select({
      id: profiles.id,
      userId: profiles.userId,
      displayName: profiles.displayName,
      bio: profiles.bio,
      avatarUrl: profiles.avatarUrl,
      location: profiles.location,
      orientation: profiles.orientation,
      memberRole: profiles.memberRole,
      communityId: profiles.communityId,
      createdAt: profiles.createdAt,
      applicationStatus: profiles.applicationStatus,
    })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  const profile = rows[0];
  if (!profile) return null;
  // Only return approved profiles (or profiles with no status set for safety)
  if (profile.applicationStatus && profile.applicationStatus !== 'approved') return null;

  // Count posts
  const postCountResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(wallPosts)
    .where(eq(wallPosts.authorId, userId));
  const photoCount = Number(postCountResult[0]?.count ?? 0);

  const { applicationStatus, ...safeProfile } = profile;
  return { ...safeProfile, photoCount };
}

export async function getUserWallPosts(userId: number, limit = 20) {
  const db = await getDb(); if (!db) return [];
  const rows = await db
    .select({
      post: wallPosts,
      profile: {
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(wallPosts)
    .leftJoin(profiles, eq(profiles.userId, wallPosts.authorId))
    .where(eq(wallPosts.authorId, userId))
    .orderBy(desc(wallPosts.createdAt))
    .limit(limit);

  return rows.map(r => ({
    ...r.post,
    resolvedAuthorName: r.post.authorName ?? r.profile?.displayName ?? "Member",
    resolvedAvatarUrl: r.profile?.avatarUrl ?? null,
  }));
}

export async function getUserLikedPosts(userId: number) {
  const db = await getDb(); if (!db) return [];
  const likes = await db.select().from(wallPostLikes).where(eq(wallPostLikes.userId, userId));
  return likes.map(l => l.postId);
}

// ─── MESSAGING ───────────────────────────────────────────────────────────────

export async function getUserConversations(userId: number) {
  const db = await getDb(); if (!db) return [];

  // Get conversations the user is explicitly a participant of
  const parts = await db.select().from(conversationParticipants).where(eq(conversationParticipants.userId, userId));
  const participantIds = new Set(parts.map(p => p.conversationId));

  // Get the user's communityId from their profile
  const profile = await db.select({ communityId: profiles.communityId }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  const communityId = profile[0]?.communityId ?? null;

  // Fetch all channels (type = 'channel') that match the user's community or are global (null communityId)
  const channelConditions = communityId
    ? sql`(${conversations.type} = 'channel' AND (${conversations.communityId} = ${communityId} OR ${conversations.communityId} IS NULL))`
    : sql`(${conversations.type} = 'channel' AND ${conversations.communityId} IS NULL)`;

  const communityChannels = await db.select().from(conversations).where(channelConditions);

  // Auto-join user to any community channels they're not yet in
  for (const channel of communityChannels) {
    if (!participantIds.has(channel.id)) {
      try {
        await db.insert(conversationParticipants).values({ conversationId: channel.id, userId });
        participantIds.add(channel.id);
      } catch {
        // Ignore duplicate key errors (already joined via race condition)
      }
    }
  }

  // Return all conversations the user participates in, enriched with other-participant info for DMs
  const allIds = Array.from(participantIds);
  if (allIds.length === 0) return [];
  const rawConvs = await db.select().from(conversations)
    .where(sql`${conversations.id} IN (${sql.join(allIds.map(id => sql`${id}`), sql`, `)})`)
    .orderBy(desc(conversations.updatedAt));

  // For DMs, fetch the other participant's display name and avatar
  const enriched = await Promise.all(rawConvs.map(async (conv) => {
    if (conv.type !== 'dm') return conv;
    try {
      // Find the other participant
      const others = await db.select({
        userId: conversationParticipants.userId,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        name: users.name,
      })
        .from(conversationParticipants)
        .leftJoin(profiles, eq(conversationParticipants.userId, profiles.userId))
        .leftJoin(users, eq(conversationParticipants.userId, users.id))
        .where(and(
          eq(conversationParticipants.conversationId, conv.id),
          sql`${conversationParticipants.userId} != ${userId}`
        ))
        .limit(1);
      const other = others[0];
      if (other) {
        return {
          ...conv,
          name: other.displayName || other.name || conv.name || `Chat #${conv.id}`,
          otherUserAvatarUrl: other.avatarUrl ?? null,
          otherUserId: other.userId,
        };
      }
    } catch { /* fallback to raw */ }
    return conv;
  }));

  return enriched;
}

export async function getConversationMessages(conversationId: number, limit = 100) {
  const db = await getDb(); if (!db) return [];
  const rows = await db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      senderId: messages.senderId,
      content: messages.content,
      attachmentUrl: messages.attachmentUrl,
      attachmentType: messages.attachmentType,
      replyToId: messages.replyToId,
      isEdited: messages.isEdited,
      isDeleted: messages.isDeleted,
      createdAt: messages.createdAt,
      updatedAt: messages.updatedAt,
      senderName: profiles.displayName,
      senderFallbackName: users.name,
    })
    .from(messages)
    .leftJoin(users, eq(messages.senderId, users.id))
    .leftJoin(profiles, eq(messages.senderId, profiles.userId))
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt))
    .limit(limit);
  return rows.map(r => ({
    ...r,
    senderName: r.senderName || r.senderFallbackName || "Unknown",
  }));
}

export async function createMessage(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(messages).values(data);
  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, data.conversationId));
  return r[0].insertId;
}

export async function createConversation(data: any, participantIds: number[]) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(conversations).values(data);
  const convId = r[0].insertId;
  for (const uid of participantIds) {
    await db.insert(conversationParticipants).values({ conversationId: convId, userId: uid });
  }
  return convId;
}

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

export async function getUserNotifications(userId: number, limit = 50) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function createNotification(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(notifications).values(data);
  return r[0].insertId;
}

export async function markNotificationRead(id: number) {
  const db = await getDb(); if (!db) return;
  await db.update(notifications).set({ isRead: true, readAt: new Date() }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(notifications).set({ isRead: true, readAt: new Date() }).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

// ─── ANNOUNCEMENTS ───────────────────────────────────────────────────────────

export async function getAnnouncements(communityId?: string) {
  const db = await getDb(); if (!db) return [];
  if (communityId) return db.select().from(announcements).where(eq(announcements.communityId, communityId)).orderBy(desc(announcements.createdAt));
  return db.select().from(announcements).orderBy(desc(announcements.createdAt));
}

export async function getActiveAnnouncements(userId?: number) {
  const db = await getDb(); if (!db) return [];
  const now = new Date();
  const rows = await db.select().from(announcements)
    .where(and(
      eq(announcements.isActive, true),
      sql`(${announcements.expiresAt} IS NULL OR ${announcements.expiresAt} > ${now})`
    ))
    .orderBy(desc(announcements.createdAt));

  if (!userId) return rows;

  // Filter out acknowledged ones
  const acks = await db.select().from(resourceAcknowledgments)
    .where(and(eq(resourceAcknowledgments.userId, userId)));
  const ackedIds = new Set(acks.filter(a => a.resourceId?.startsWith('ann_')).map(a => parseInt(a.resourceId.replace('ann_', ''))));
  return rows.filter(r => !ackedIds.has(r.id));
}

export async function createAnnouncement(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(announcements).values(data);
  return r[0].insertId;
}

export async function deactivateAnnouncement(id: number) {
  const db = await getDb(); if (!db) return;
  await db.update(announcements).set({ isActive: false }).where(eq(announcements.id, id));
}

export async function dismissAnnouncement(userId: number, announcementId: number) {
  const db = await getDb(); if (!db) return;
  const resourceId = `ann_${announcementId}`;
  const existing = await db.select().from(resourceAcknowledgments)
    .where(and(eq(resourceAcknowledgments.userId, userId), eq(resourceAcknowledgments.resourceId, resourceId))).limit(1);
  if (existing.length > 0) return;
  await db.insert(resourceAcknowledgments).values({ userId, resourceId, acknowledgedAt: new Date() });
}

// ─── GROUPS ──────────────────────────────────────────────────────────────────

export async function getGroups() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(groups);
}

export async function getGroupBySlug(slug: string) {
  const db = await getDb(); if (!db) return null;
  const r = await db.select().from(groups).where(eq(groups.slug, slug)).limit(1);
  return r[0] ?? null;
}

export async function createGroup(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(groups).values(data);
  return r[0].insertId;
}

// ─── REFERRALS & CREDITS ────────────────────────────────────────────────────

export async function getReferralCode(userId: number) {
  const db = await getDb(); if (!db) return null;
  const r = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId)).limit(1);
  return r[0] ?? null;
}

export async function createReferralCode(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(referralCodes).values(data);
  return r[0].insertId;
}

export async function validateReferralCode(code: string) {
  const db = await getDb(); if (!db) return null;
  const r = await db.select().from(referralCodes).where(and(eq(referralCodes.code, code), eq(referralCodes.isActive, true))).limit(1);
  return r[0] ?? null;
}

export async function applyReferralToProfile(profileId: number, code: string) {
  const db = await getDb(); if (!db) return;
  const refCode = await validateReferralCode(code);
  if (!refCode) return;
  await db.update(profiles).set({ referredByCode: code, referredByUserId: refCode.userId }).where(eq(profiles.id, profileId));
}

export async function processReferralConversion(userId: number, reservationId: number) {
  const db = await getDb(); if (!db) return;
  // Get the user's profile
  const profileRows = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  const profile = profileRows[0];
  if (!profile) return;
  // Only process if not already converted and has a referral code
  if (profile.referralConverted || !profile.referredByCode) return;

  // Get current balance of referrer to compute new balance
  const referrerId = profile.referredByUserId;
  if (!referrerId) return;

  const balanceRows = await db.select().from(memberCredits).where(eq(memberCredits.userId, referrerId)).orderBy(desc(memberCredits.createdAt)).limit(1);
  const currentBalance = balanceRows.length > 0 ? Number(balanceRows[0].balance) : 0;
  const newBalance = currentBalance + 3500;

  // Award 3500 credits ($35) to referrer
  await db.insert(memberCredits).values({
    userId: referrerId,
    amount: "3500",
    type: "referral",
    description: `Referral bonus — ${profile.displayName || "a member"} made their first reservation`,
    referenceId: reservationId,
    balance: String(newBalance),
  });

  // Mark profile as converted
  await db.update(profiles).set({ referralConverted: true, referralConvertedAt: new Date() }).where(eq(profiles.id, profile.id));

  // Increment referral_codes stats
  const refCodeRows = await db.select().from(referralCodes).where(eq(referralCodes.code, profile.referredByCode)).limit(1);
  if (refCodeRows.length > 0) {
    const refCode = refCodeRows[0];
    await db.update(referralCodes).set({
      totalReferrals: sql`${referralCodes.totalReferrals} + 1`,
      totalEarned: sql`${referralCodes.totalEarned} + 3500`,
    }).where(eq(referralCodes.id, refCode.id));
  }
}

export async function getReferralPipeline() {
  const db = await getDb(); if (!db) return [];
  // Join profiles (referred members) with referral_codes and the referrer's profile
  const referred = await db
    .select({
      referredProfileId: profiles.id,
      referredDisplayName: profiles.displayName,
      referredAppliedAt: profiles.createdAt,
      referralConverted: profiles.referralConverted,
      referralConvertedAt: profiles.referralConvertedAt,
      referredByCode: profiles.referredByCode,
      referredByUserId: profiles.referredByUserId,
    })
    .from(profiles)
    .where(sql`${profiles.referredByCode} IS NOT NULL`);

  // For each referred member, get the referrer's display name and code stats
  const result = await Promise.all(referred.map(async (row) => {
    const db2 = await getDb();
    if (!db2 || !row.referredByUserId) return { ...row, referrerName: null, codeStats: null };
    const referrerProfile = await db2.select({ displayName: profiles.displayName }).from(profiles).where(eq(profiles.userId, row.referredByUserId)).limit(1);
    const codeRows = await db2.select().from(referralCodes).where(eq(referralCodes.code, row.referredByCode!)).limit(1);
    return {
      ...row,
      referrerName: referrerProfile[0]?.displayName ?? null,
      codeStats: codeRows[0] ?? null,
    };
  }));
  return result;
}

export async function getCreditBalance(userId: number) {
  const db = await getDb(); if (!db) return 0;
  const r = await db.select().from(memberCredits).where(eq(memberCredits.userId, userId)).orderBy(desc(memberCredits.createdAt)).limit(1);
  return r.length > 0 ? Number(r[0].balance) : 0;
}

export async function getMemberCredits(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(memberCredits).where(eq(memberCredits.userId, userId)).orderBy(desc(memberCredits.createdAt));
}

// ─── APP SETTINGS ────────────────────────────────────────────────────────────

export async function getAppSettings() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(appSettings);
}

export async function upsertAppSetting(key: string, value: string, updatedBy?: number) {
  const db = await getDb(); if (!db) return;
  const existing = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  if (existing.length > 0) await db.update(appSettings).set({ value, updatedBy }).where(eq(appSettings.key, key));
  else await db.insert(appSettings).values({ key, value, updatedBy });
}

// ─── ADMIN ───────────────────────────────────────────────────────────────────

export async function createAuditLog(data: any) {
  const db = await getDb(); if (!db) return;
  await db.insert(adminAuditLogs).values(data);
}

export async function getAuditLogs(limit = 100) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(limit);
}

export async function getExpenses(eventId?: number) {
  const db = await getDb(); if (!db) return [];
  if (eventId) return db.select().from(expenses).where(eq(expenses.eventId, eventId)).orderBy(desc(expenses.createdAt));
  return db.select().from(expenses).orderBy(desc(expenses.createdAt));
}

export async function createExpense(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(expenses).values(data);
  return r[0].insertId;
}

// ─── CANCELLATIONS ───────────────────────────────────────────────────────────

export async function getCancellationRequests() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(cancellationRequests).orderBy(desc(cancellationRequests.createdAt));
}

export async function updateCancellationRequest(id: number, data: any) {
  const db = await getDb(); if (!db) return;
  await db.update(cancellationRequests).set(data).where(eq(cancellationRequests.id, id));
}

// ─── FEEDBACK ────────────────────────────────────────────────────────────────

export async function getEventFeedback(eventId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(eventFeedback).where(eq(eventFeedback.eventId, eventId)).orderBy(desc(eventFeedback.createdAt));
}

export async function createEventFeedback(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(eventFeedback).values(data);
  return r[0].insertId;
}

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { totalUsers: 0, totalEvents: 0, totalReservations: 0, pendingApplications: 0 };
  const [uc] = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
  const [ec] = await db.select({ count: sql<number>`COUNT(*)` }).from(events);
  const [rc] = await db.select({ count: sql<number>`COUNT(*)` }).from(reservations);
  const [pc] = await db.select({ count: sql<number>`COUNT(*)` }).from(profiles).where(eq(profiles.applicationStatus, "submitted"));
  return { totalUsers: Number(uc.count), totalEvents: Number(ec.count), totalReservations: Number(rc.count), pendingApplications: Number(pc.count) };
}

// ─── EVENT ADDONS (CRUD) ────────────────────────────────────────────────────

export async function createEventAddon(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(eventAddons).values(data);
  return r[0].insertId;
}

export async function updateEventAddon(id: number, data: any) {
  const db = await getDb(); if (!db) return;
  await db.update(eventAddons).set(data).where(eq(eventAddons.id, id));
}

export async function deleteEventAddon(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(eventAddons).where(eq(eventAddons.id, id));
}

// ─── RESERVATION ADDONS ────────────────────────────────────────────────────

export async function getReservationAddons(reservationId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(reservationAddons).where(eq(reservationAddons.reservationId, reservationId));
}

export async function addReservationAddon(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(reservationAddons).values(data);
  await db.update(eventAddons).set({ currentSold: sql`${eventAddons.currentSold} + ${data.quantity ?? 1}` }).where(eq(eventAddons.id, data.addonId));
  return r[0].insertId;
}

// ─── PROMOTIONAL PRICING (CRUD) ────────────────────────────────────────────

export async function getEventPromoCodes(eventId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(eventPromotionalPricing).where(eq(eventPromotionalPricing.eventId, eventId));
}

export async function getPromoCodeByCode(code: string) {
  const db = await getDb(); if (!db) return null;
  const r = await db.select().from(eventPromotionalPricing).where(eq(eventPromotionalPricing.code, code)).limit(1);
  return r[0] ?? null;
}

export async function createPromoCode(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(eventPromotionalPricing).values(data);
  return r[0].insertId;
}

export async function updatePromoCode(id: number, data: any) {
  const db = await getDb(); if (!db) return;
  await db.update(eventPromotionalPricing).set(data).where(eq(eventPromotionalPricing.id, id));
}

export async function deletePromoCode(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(eventPromotionalPricing).where(eq(eventPromotionalPricing.id, id));
}

export async function incrementPromoCodeUsage(id: number) {
  const db = await getDb(); if (!db) return;
  await db.update(eventPromotionalPricing).set({ currentUses: sql`${eventPromotionalPricing.currentUses} + 1` }).where(eq(eventPromotionalPricing.id, id));
}

// ─── EVENT OPERATORS ────────────────────────────────────────────────────────

export async function getEventOperators(eventId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(eventOperators).where(eq(eventOperators.eventId, eventId));
}

export async function assignEventOperator(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(eventOperators).values(data);
  return r[0].insertId;
}

export async function removeEventOperator(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(eventOperators).where(eq(eventOperators.id, id));
}

// ─── EVENT SHIFTS & ASSIGNMENTS ─────────────────────────────────────────────

export async function getEventShifts(eventId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(eventShifts).where(eq(eventShifts.eventId, eventId)).orderBy(asc(eventShifts.startTime));
}

export async function createEventShift(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(eventShifts).values(data);
  return r[0].insertId;
}

export async function updateEventShift(id: number, data: any) {
  const db = await getDb(); if (!db) return;
  await db.update(eventShifts).set(data).where(eq(eventShifts.id, id));
}

export async function deleteEventShift(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(shiftAssignments).where(eq(shiftAssignments.shiftId, id));
  await db.delete(eventShifts).where(eq(eventShifts.id, id));
}

export async function getShiftAssignments(shiftId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(shiftAssignments).where(eq(shiftAssignments.shiftId, shiftId));
}

export async function assignToShift(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(shiftAssignments).values(data);
  return r[0].insertId;
}

export async function updateShiftAssignment(id: number, data: any) {
  const db = await getDb(); if (!db) return;
  await db.update(shiftAssignments).set(data).where(eq(shiftAssignments.id, id));
}

export async function removeShiftAssignment(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(shiftAssignments).where(eq(shiftAssignments.id, id));
}

// ─── EVENT SETUP CHECKLIST ──────────────────────────────────────────────────

export async function getEventChecklist(eventId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(eventSetupChecklist).where(eq(eventSetupChecklist.eventId, eventId)).orderBy(asc(eventSetupChecklist.sortOrder));
}

export async function addChecklistItem(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(eventSetupChecklist).values(data);
  return r[0].insertId;
}

export async function updateChecklistItem(id: number, data: any) {
  const db = await getDb(); if (!db) return;
  await db.update(eventSetupChecklist).set(data).where(eq(eventSetupChecklist.id, id));
}

export async function deleteChecklistItem(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(eventSetupChecklist).where(eq(eventSetupChecklist.id, id));
}

// ─── RELATIONSHIP GROUPS & PARTNERS ────────────────────────────────────────

export async function createRelationshipGroup(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(relationshipGroups).values(data);
  return r[0].insertId;
}

export async function getRelationshipGroupsByProfile(profileId: number) {
  const db = await getDb(); if (!db) return [];
  const memberships = await db.select().from(relationshipGroupMembers).where(eq(relationshipGroupMembers.profileId, profileId));
  if (memberships.length === 0) return [];
  const ids = memberships.map(m => m.groupId);
  return db.select().from(relationshipGroups).where(sql`${relationshipGroups.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`);
}

export async function getRelationshipGroupMembers(groupId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(relationshipGroupMembers).where(eq(relationshipGroupMembers.groupId, groupId));
}

export async function addRelationshipGroupMember(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(relationshipGroupMembers).values(data);
  return r[0].insertId;
}

export async function removeRelationshipGroupMember(groupId: number, profileId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(relationshipGroupMembers).where(and(eq(relationshipGroupMembers.groupId, groupId), eq(relationshipGroupMembers.profileId, profileId)));
}

export async function deleteRelationshipGroup(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(relationshipGroupMembers).where(eq(relationshipGroupMembers.groupId, id));
  await db.delete(relationshipGroups).where(eq(relationshipGroups.id, id));
}

// ─── PARTNER INVITATIONS ────────────────────────────────────────────────────

export async function createPartnerInvitation(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(partnerInvitations).values(data);
  return r[0].insertId;
}

export async function getPartnerInvitationsByInviter(inviterId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(partnerInvitations).where(eq(partnerInvitations.inviterId, inviterId)).orderBy(desc(partnerInvitations.createdAt));
}

export async function getPartnerInvitationByToken(token: string) {
  const db = await getDb(); if (!db) return null;
  const r = await db.select().from(partnerInvitations).where(eq(partnerInvitations.token, token)).limit(1);
  return r[0] ?? null;
}

export async function updatePartnerInvitation(id: number, data: any) {
  const db = await getDb(); if (!db) return;
  await db.update(partnerInvitations).set(data).where(eq(partnerInvitations.id, id));
}

// ─── BLOCKED USERS ──────────────────────────────────────────────────────────

export async function getBlockedUsers(blockerId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(blockedUsers).where(eq(blockedUsers.blockerId, blockerId));
}

export async function blockUser(blockerId: number, blockedId: number) {
  const db = await getDb(); if (!db) return;
  const existing = await db.select().from(blockedUsers).where(and(eq(blockedUsers.blockerId, blockerId), eq(blockedUsers.blockedId, blockedId))).limit(1);
  if (existing.length > 0) return existing[0].id;
  const r = await db.insert(blockedUsers).values({ blockerId, blockedId });
  return r[0].insertId;
}

export async function unblockUser(blockerId: number, blockedId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(blockedUsers).where(and(eq(blockedUsers.blockerId, blockerId), eq(blockedUsers.blockedId, blockedId)));
}

export async function isUserBlocked(blockerId: number, blockedId: number) {
  const db = await getDb(); if (!db) return false;
  const r = await db.select().from(blockedUsers).where(and(eq(blockedUsers.blockerId, blockerId), eq(blockedUsers.blockedId, blockedId))).limit(1);
  return r.length > 0;
}

// ─── MARK CONVERSATION READ ─────────────────────────────────────────────────

export async function markConversationRead(conversationId: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(conversationParticipants)
    .set({ lastReadAt: new Date() })
    .where(and(
      eq(conversationParticipants.conversationId, conversationId),
      eq(conversationParticipants.userId, userId),
    ));
}

// ─── SOFT DELETE MESSAGE ─────────────────────────────────────────────────────

export async function softDeleteMessage(messageId: number, userId: number) {
  const db = await getDb(); if (!db) return;
  // Only allow sender to delete their own message
  await db.update(messages)
    .set({ isDeleted: true, content: null })
    .where(and(eq(messages.id, messageId), eq(messages.senderId, userId)));
}

// ─── UNREAD COUNTS ───────────────────────────────────────────────────────────

export async function getUnreadCounts(userId: number): Promise<Record<number, number>> {
  const db = await getDb(); if (!db) return {};
  // Get user's participant records with lastReadAt
  const parts = await db.select().from(conversationParticipants).where(eq(conversationParticipants.userId, userId));
  const result: Record<number, number> = {};
  for (const part of parts) {
    const lastRead = part.lastReadAt;
    const count = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(messages)
      .where(and(
        eq(messages.conversationId, part.conversationId),
        sql`${messages.senderId} != ${userId}`,
        sql`${messages.isDeleted} = false`,
        lastRead
          ? sql`${messages.createdAt} > ${lastRead}`
          : sql`1=1`,
      ));
    result[part.conversationId] = Number(count[0]?.count ?? 0);
  }
  return result;
}

// ─── CONVERSATION PARTICIPANTS ──────────────────────────────────────────────

export async function getConversationParticipants(conversationId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(conversationParticipants).where(eq(conversationParticipants.conversationId, conversationId));
}

// ─── CONVERSATION PRESENCE ──────────────────────────────────────────────────

export async function getConversationPresence(conversationId: number) {
  const db = await getDb(); if (!db) return [];
  const parts = await db.select({ userId: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.conversationId, conversationId));
  const userIds = parts.map(p => p.userId);
  if (userIds.length === 0) return [];
  const rows = await db.select({
    userId: userPresence.userId,
    status: userPresence.status,
    lastSeenAt: userPresence.lastSeenAt,
  }).from(userPresence)
    .where(sql`${userPresence.userId} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);
  return rows;
}

// ─── MESSAGE REACTIONS ──────────────────────────────────────────────────────

export async function getMessageReactions(messageId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(messageReactions).where(eq(messageReactions.messageId, messageId));
}

export async function toggleMessageReaction(messageId: number, userId: number, emoji: string) {
  const db = await getDb(); if (!db) return false;
  const existing = await db.select().from(messageReactions).where(and(eq(messageReactions.messageId, messageId), eq(messageReactions.userId, userId), eq(messageReactions.emoji, emoji))).limit(1);
  if (existing.length > 0) {
    await db.delete(messageReactions).where(eq(messageReactions.id, existing[0].id));
    return false;
  }
  await db.insert(messageReactions).values({ messageId, userId, emoji });
  return true;
}

// ─── PINNED MESSAGES ────────────────────────────────────────────────────────

export async function getPinnedMessages(conversationId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(pinnedMessages).where(eq(pinnedMessages.conversationId, conversationId)).orderBy(desc(pinnedMessages.pinnedAt));
}

export async function pinMessage(data: { conversationId: number; messageId: number; pinnedBy: number }) {
  const db = await getDb(); if (!db) return;
  const existing = await db.select().from(pinnedMessages).where(and(eq(pinnedMessages.conversationId, data.conversationId), eq(pinnedMessages.messageId, data.messageId))).limit(1);
  if (existing.length > 0) return existing[0].id;
  const r = await db.insert(pinnedMessages).values(data);
  return r[0].insertId;
}

export async function unpinMessage(conversationId: number, messageId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(pinnedMessages).where(and(eq(pinnedMessages.conversationId, conversationId), eq(pinnedMessages.messageId, messageId)));
}

// ─── INTRO CALL SLOTS ──────────────────────────────────────────────────────

export async function getAvailableIntroSlots() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(introCallSlots).where(eq(introCallSlots.status, "available")).orderBy(asc(introCallSlots.scheduledAt));
}

export async function getAllIntroSlots() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(introCallSlots).orderBy(asc(introCallSlots.scheduledAt));
}

export async function createIntroSlot(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(introCallSlots).values(data);
  return r[0].insertId;
}

export async function bookIntroSlot(id: number, profileId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(introCallSlots).set({ profileId, status: "booked" }).where(and(eq(introCallSlots.id, id), eq(introCallSlots.status, "available")));
}

export async function updateIntroSlot(id: number, data: any) {
  const db = await getDb(); if (!db) return;
  await db.update(introCallSlots).set(data).where(eq(introCallSlots.id, id));
}

export async function deleteIntroSlot(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(introCallSlots).where(eq(introCallSlots.id, id));
}

export async function getIntroSlotById(id: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(introCallSlots).where(eq(introCallSlots.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getAdminUsers() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(users).where(eq(users.role, "admin"));
}

// ─── SINGLE MALE INVITE CODES ──────────────────────────────────────────────

export async function createSingleMaleInviteCode(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(singleMaleInviteCodes).values(data);
  return r[0].insertId;
}

export async function getSingleMaleInviteCodes() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(singleMaleInviteCodes).orderBy(desc(singleMaleInviteCodes.createdAt));
}

export async function redeemSingleMaleInviteCode(code: string, userId: number) {
  const db = await getDb(); if (!db) return null;
  const r = await db.select().from(singleMaleInviteCodes).where(and(eq(singleMaleInviteCodes.code, code), eq(singleMaleInviteCodes.isUsed, false))).limit(1);
  if (r.length === 0) return null;
  await db.update(singleMaleInviteCodes).set({ isUsed: true, usedBy: userId }).where(eq(singleMaleInviteCodes.id, r[0].id));
  return r[0];
}

// ─── PRE-APPROVED PHONES ────────────────────────────────────────────────────

export async function getPreApprovedPhones() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(preApprovedPhones).orderBy(desc(preApprovedPhones.createdAt));
}

export async function addPreApprovedPhone(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(preApprovedPhones).values(data);
  return r[0].insertId;
}

export async function checkPhonePreApproved(phone: string) {
  const db = await getDb(); if (!db) return false;
  const r = await db.select().from(preApprovedPhones).where(and(eq(preApprovedPhones.phone, phone), eq(preApprovedPhones.isUsed, false))).limit(1);
  return r.length > 0;
}

export async function markPhoneUsed(phone: string) {
  const db = await getDb(); if (!db) return;
  await db.update(preApprovedPhones).set({ isUsed: true }).where(eq(preApprovedPhones.phone, phone));
}

export async function deletePreApprovedPhone(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(preApprovedPhones).where(eq(preApprovedPhones.id, id));
}

// ─── APPLICATION PHOTO MODERATION ──────────────────────────────────────────

export async function updateApplicationPhotoStatus(photoId: number, status: string) {
  const db = await getDb(); if (!db) return;
  await db.update(applicationPhotos).set({ status: status as any }).where(eq(applicationPhotos.id, photoId));
}

export async function getPendingPhotos() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(applicationPhotos).where(eq(applicationPhotos.status, "pending")).orderBy(asc(applicationPhotos.createdAt));
}

export async function getApplicationPhotoById(photoId: number) {
  const db = await getDb(); if (!db) return null;
  const r = await db.select().from(applicationPhotos).where(eq(applicationPhotos.id, photoId)).limit(1);
  return r[0] ?? null;
}

// ─── PROFILE CHANGE REQUESTS ───────────────────────────────────────────────

export async function createProfileChangeRequest(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(profileChangeRequests).values(data);
  return r[0].insertId;
}

export async function getPendingProfileChangeRequests() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(profileChangeRequests).where(eq(profileChangeRequests.status, "pending")).orderBy(asc(profileChangeRequests.createdAt));
}

export async function reviewProfileChangeRequest(id: number, status: string, reviewedBy: number) {
  const db = await getDb(); if (!db) return;
  await db.update(profileChangeRequests).set({ status: status as any, reviewedBy, reviewedAt: new Date() }).where(eq(profileChangeRequests.id, id));
}

// ─── GROUP CHANGE REQUESTS ─────────────────────────────────────────────────

export async function createGroupChangeRequest(data: any) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(groupChangeRequests).values(data);
  return r[0].insertId;
}

export async function getPendingGroupChangeRequests() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(groupChangeRequests).where(eq(groupChangeRequests.status, "pending")).orderBy(asc(groupChangeRequests.createdAt));
}

export async function reviewGroupChangeRequest(id: number, status: string, reviewedBy: number) {
  const db = await getDb(); if (!db) return;
  await db.update(groupChangeRequests).set({ status: status as any, reviewedBy, reviewedAt: new Date() }).where(eq(groupChangeRequests.id, id));
}

// ─── ENRICHED RESERVATIONS ────────────────────────────────────────────────

export async function getReservationsByEventWithUsers(eventId: number) {
  const db = await getDb(); if (!db) return [];
  const rows = await db
    .select({
      reservation: reservations,
      user: users,
      profile: profiles,
    })
    .from(reservations)
    .innerJoin(users, eq(reservations.userId, users.id))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(reservations.eventId, eventId))
    .orderBy(desc(reservations.createdAt));

  return rows.map(r => ({
    ...r.reservation,
    user: {
      id: r.user.id,
      name: r.user.name,
      email: r.user.email,
    },
    profile: r.profile ? {
      id: r.profile.id,
      displayName: r.profile.displayName,
      memberRole: r.profile.memberRole,
      gender: r.profile.gender,
      orientation: r.profile.orientation,
      avatarUrl: r.profile.avatarUrl,
    } : null,
    displayName: r.profile?.displayName || r.user.name || "Unknown",
  }));
}

// ─── TEST RESULTS ────────────────────────────────────────────────────────────

export async function submitTestResult(data: {
  userId: number;
  reservationId: number;
  eventId: number;
  resultUrl: string;
}) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(testResultSubmissions).values({
    ...data,
    status: "pending",
    submittedAt: new Date(),
  });
  return r[0].insertId;
}

export async function getPendingTestResults(eventId?: number) {
  const db = await getDb(); if (!db) return [];
  const rows = await db
    .select({
      submission: testResultSubmissions,
      user: users,
      event: events,
    })
    .from(testResultSubmissions)
    .innerJoin(users, eq(testResultSubmissions.userId, users.id))
    .innerJoin(events, eq(testResultSubmissions.eventId, events.id))
    .where(
      eventId
        ? and(eq(testResultSubmissions.status, "pending"), eq(testResultSubmissions.eventId, eventId))
        : eq(testResultSubmissions.status, "pending")
    )
    .orderBy(desc(testResultSubmissions.submittedAt));

  return rows.map(r => ({
    ...r.submission,
    user: { id: r.user.id, name: r.user.name, email: r.user.email },
    event: { id: r.event.id, title: r.event.title },
  }));
}

export async function reviewTestResult(
  id: number,
  status: "approved" | "rejected",
  reviewedBy: number,
  notes?: string
) {
  const db = await getDb(); if (!db) return;
  await db.update(testResultSubmissions).set({
    status,
    reviewedAt: new Date(),
    reviewedBy,
    notes: notes ?? null,
  }).where(eq(testResultSubmissions.id, id));

  if (status === "approved") {
    // Find the reservation and update testResultApproved
    const rows = await db.select().from(testResultSubmissions).where(eq(testResultSubmissions.id, id)).limit(1);
    if (rows.length > 0) {
      const sub = rows[0];
      await db.update(reservations).set({ testResultApproved: true }).where(eq(reservations.id, sub.reservationId));
      await updateReservationWristband(sub.reservationId);
    }
  }
}

export async function updateReservationWristband(reservationId: number) {
  const db = await getDb(); if (!db) return;

  // Get reservation with profile
  const rows = await db
    .select({ reservation: reservations, profile: profiles, event: events })
    .from(reservations)
    .leftJoin(profiles, eq(profiles.userId, reservations.userId))
    .leftJoin(events, eq(events.id, reservations.eventId))
    .where(eq(reservations.id, reservationId))
    .limit(1);

  if (rows.length === 0) return;
  const { reservation, profile, event } = rows[0];

  let wristbandColor: string | null = null;

  // Priority 1: queer play or orientation
  if (reservation.isQueerPlay || reservation.orientationSignal === "queer") {
    wristbandColor = "rainbow";
  }
  // Priority 2: angel member role
  else if (profile?.memberRole === "angel") {
    wristbandColor = "pink";
  }
  // Priority 3: test result approved within 30 days of event
  else if (reservation.testResultApproved) {
    const testSub = await db
      .select()
      .from(testResultSubmissions)
      .where(and(eq(testResultSubmissions.reservationId, reservationId), eq(testResultSubmissions.status, "approved")))
      .limit(1);

    if (testSub.length > 0 && event) {
      const eventDate = new Date(event.startDate);
      const submittedAt = new Date(testSub[0].submittedAt);
      const daysDiff = Math.abs((eventDate.getTime() - submittedAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 30) {
        wristbandColor = "blue";
      }
    }
  }
  // Priority 4: paid
  else if (reservation.paymentStatus === "paid") {
    wristbandColor = "purple";
  }

  await db.update(reservations).set({ wristbandColor }).where(eq(reservations.id, reservationId));
}

// ─── PROFILE SEARCH ──────────────────────────────────────────────────────────

export async function searchProfiles(query: string) {
  const db = await getDb(); if (!db) return [];
  return db.select({
    id: profiles.id,
    userId: profiles.userId,
    displayName: profiles.displayName,
    gender: profiles.gender,
    avatarUrl: profiles.avatarUrl,
  })
  .from(profiles)
  .where(and(
    sql`${profiles.displayName} LIKE ${`%${query}%`}`,
    eq(profiles.applicationStatus, "approved")
  ))
  .limit(10);
}

export async function createShiftAssignment(data: { shiftId: number; userId: number; status: string }) {
  const db = await getDb(); if (!db) return;
  const r = await db.insert(shiftAssignments).values(data as any);
  return r[0].insertId;
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────

export async function getRevenueByEvent() {
  const db = await getDb(); if (!db) return [];
  const rows = await db.select({
    eventName: events.title,
    revenue: sql<number>`SUM(${reservations.totalAmount})`,
    ticketCount: sql<number>`COUNT(*)`,
  }).from(reservations)
    .innerJoin(events, eq(reservations.eventId, events.id))
    .where(inArray(reservations.paymentStatus, ['paid']))
    .groupBy(events.id, events.title);
  return rows;
}

export async function getTicketTypeBreakdown() {
  const db = await getDb(); if (!db) return [];
  const rows = await db.select({
    type: reservations.ticketType,
    count: sql<number>`COUNT(*)`,
    revenue: sql<number>`SUM(${reservations.totalAmount})`,
  }).from(reservations)
    .where(inArray(reservations.paymentStatus, ['paid']))
    .groupBy(reservations.ticketType);
  return rows;
}

export async function getMemberGrowthByMonth() {
  const db = await getDb(); if (!db) return [];
  const rows = await db.select({
    month: sql<string>`DATE_FORMAT(${profiles.createdAt}, '%Y-%m')`,
    count: sql<number>`COUNT(*)`,
  }).from(profiles)
    .where(and(
      eq(profiles.applicationStatus, 'approved'),
      gte(profiles.createdAt, sql`DATE_SUB(NOW(), INTERVAL 6 MONTH)`)
    ))
    .groupBy(sql`DATE_FORMAT(${profiles.createdAt}, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(${profiles.createdAt}, '%Y-%m')`);
  return rows;
}

export async function getCheckinRates() {
  const db = await getDb(); if (!db) return [];
  const rows = await db.select({
    eventName: events.title,
    total: sql<number>`COUNT(*)`,
    checkedIn: sql<number>`SUM(CASE WHEN ${reservations.status} = 'checked_in' THEN 1 ELSE 0 END)`,
  }).from(reservations)
    .innerJoin(events, eq(reservations.eventId, events.id))
    .where(inArray(reservations.paymentStatus, ['paid']))
    .groupBy(events.id, events.title);
  return rows;
}

// ─── USER TICKETS ────────────────────────────────────────────────────────────

export async function getUserReservations(userId: number) {
  const db = await getDb(); if (!db) return [];
  const rows = await db.select({
    id: reservations.id,
    eventId: reservations.eventId,
    ticketType: reservations.ticketType,
    paymentStatus: reservations.paymentStatus,
    checkinStatus: reservations.status,
    createdAt: reservations.createdAt,
    eventTitle: events.title,
    eventDate: events.startDate,
    eventVenue: events.venue,
    eventImageUrl: events.coverImageUrl,
  })
  .from(reservations)
  .innerJoin(events, eq(reservations.eventId, events.id))
  .where(and(eq(reservations.userId, userId), inArray(reservations.paymentStatus, ['paid', 'partial'])));

  // Attach QR codes from tickets table
  const result = await Promise.all(rows.map(async (r) => {
    const dbConn = await getDb();
    if (!dbConn) return { ...r, qrCode: null };
    const ticketRows = await dbConn
      .select({ qrCode: tickets.qrCode })
      .from(tickets)
      .where(eq(tickets.reservationId, r.id))
      .limit(1);
    return { ...r, qrCode: ticketRows[0]?.qrCode ?? null };
  }));
  return result;
}

export async function createTicketForReservation(reservationId: number, userId: number, qrCode: string) {
  const db = await getDb(); if (!db) return;
  // Upsert: only create if not already exists
  const existing = await db.select().from(tickets).where(eq(tickets.reservationId, reservationId)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const r = await db.insert(tickets).values({ reservationId, userId, qrCode });
  return r[0].insertId;
}

// ─── MEMBER DISCOVERY ────────────────────────────────────────────────────────

export async function browseMembers({ userId, page = 0, search, orientation, community }: {
  userId: number; page?: number; search?: string; orientation?: string; community?: string;
}) {
  const db = await getDb(); if (!db) return [];
  const conditions = [
    eq(profiles.applicationStatus, 'approved'),
    sql`${profiles.userId} != ${userId}`,
    sql`${profiles.userId} NOT IN (SELECT blockedId FROM blocked_users WHERE blockerId = ${userId})`,
  ];
  if (search) conditions.push(sql`${profiles.displayName} LIKE ${`%${search}%`}`);
  if (orientation) conditions.push(eq(profiles.orientation, orientation));
  if (community) conditions.push(eq(profiles.communityId, community));
  return db.select({
    id: profiles.userId,
    displayName: profiles.displayName,
    avatarUrl: profiles.avatarUrl,
    orientation: profiles.orientation,
    location: profiles.location,
    communityId: profiles.communityId,
    createdAt: profiles.createdAt,
  }).from(profiles)
    .where(and(...conditions))
    .limit(20).offset(page * 20)
    .orderBy(desc(profiles.createdAt));
}

export async function getCommunityLanding(communityId: string) {
  const db = await getDb(); if (!db) return { memberCount: 0, upcomingEvents: [], latestPosts: [] };
  const [memberCount, upcomingEvents, latestPosts] = await Promise.all([
    db.select({ count: sql<number>`COUNT(*)` }).from(profiles)
      .where(and(eq(profiles.applicationStatus, 'approved'), eq(profiles.communityId, communityId)))
      .then(r => Number(r[0]?.count ?? 0)),
    db.select().from(events)
      .where(and(eq(events.communityId, communityId), gte(events.startDate, new Date())))
      .orderBy(asc(events.startDate)).limit(3),
    db.select().from(wallPosts)
      .where(and(eq(wallPosts.communityId, communityId), eq(wallPosts.visibility, 'members')))
      .orderBy(desc(wallPosts.createdAt)).limit(5),
  ]);
  return { memberCount, upcomingEvents, latestPosts };
}

export async function getAllReservations({ eventId, status, page = 0 }: { eventId?: number; status?: string; page?: number } = {}) {
  const db = await getDb(); if (!db) return [];
  const conditions: any[] = [];
  if (eventId) conditions.push(eq(reservations.eventId, eventId));
  if (status) conditions.push(eq(reservations.paymentStatus, status as any));
  return db.select({
    id: reservations.id,
    eventId: reservations.eventId,
    userId: reservations.userId,
    ticketType: reservations.ticketType,
    paymentMethod: reservations.paymentMethod,
    paymentStatus: reservations.paymentStatus,
    status: reservations.status,
    totalAmount: reservations.totalAmount,
    createdAt: reservations.createdAt,
    eventTitle: events.title,
    memberName: profiles.displayName,
  }).from(reservations)
    .leftJoin(events, eq(reservations.eventId, events.id))
    .leftJoin(profiles, eq(reservations.userId, profiles.userId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(reservations.createdAt))
    .limit(20).offset(page * 20);
}

// ─── EVENT CAPACITY & WAITLIST ────────────────────────────────────────────────

export async function getEventCapacity(eventId: number) {
  const db = await getDb(); if (!db) return null;
  const r = await db.select({ capacity: events.capacity, currentAttendees: events.currentAttendees }).from(events).where(eq(events.id, eventId)).limit(1);
  return r[0] ?? null;
}

export async function incrementEventAttendees(eventId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(events).set({ currentAttendees: sql`${events.currentAttendees} + 1` }).where(eq(events.id, eventId));
}

export async function joinWaitlist(eventId: number, userId: number) {
  const db = await getDb(); if (!db) return null;
  const existing = await db.select().from(waitlistTable).where(and(eq(waitlistTable.eventId, eventId), eq(waitlistTable.userId, userId))).limit(1);
  if (existing.length > 0) return existing[0];
  const count = await db.select({ count: sql<number>`COUNT(*)` }).from(waitlistTable).where(and(eq(waitlistTable.eventId, eventId), eq(waitlistTable.status, 'waiting')));
  const position = Number(count[0]?.count ?? 0) + 1;
  await db.insert(waitlistTable).values({ eventId, userId, position });
  return { position };
}

export async function getWaitlistPosition(eventId: number, userId: number) {
  const db = await getDb(); if (!db) return null;
  const r = await db.select().from(waitlistTable).where(and(eq(waitlistTable.eventId, eventId), eq(waitlistTable.userId, userId))).limit(1);
  return r[0] ?? null;
}

// ─── PUSH SUBSCRIPTIONS ───────────────────────────────────────────────────────

export async function getPushSubscriptions(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

export async function savePushSubscription(userId: number, endpoint: string, p256dh: string, auth: string) {
  const db = await getDb(); if (!db) return;
  const existing = await db.select().from(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), sql`${pushSubscriptions.endpoint} = ${endpoint}`)).limit(1);
  if (existing.length > 0) return;
  await db.insert(pushSubscriptions).values({ userId, endpoint, p256dh, auth });
}

export async function deletePushSubscription(endpoint: string) {
  const db = await getDb(); if (!db) return;
  await db.delete(pushSubscriptions).where(sql`${pushSubscriptions.endpoint} = ${endpoint}`);
}
