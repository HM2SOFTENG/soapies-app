import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  json,
  bigint,
  decimal,
} from "drizzle-orm/mysql-core";

// ─── USERS ───────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 256 }),
  phone: varchar("phone", { length: 20 }).unique(),
  emailVerified: boolean("emailVerified").default(false),
  phoneVerified: boolean("phoneVerified").default(false),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isSuspended: boolean("isSuspended").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── OTP CODES ───────────────────────────────────────────────────────────────

export const otpCodes = mysqlTable("otp_codes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  target: varchar("target", { length: 320 }).notNull(), // email or phone
  code: varchar("code", { length: 6 }).notNull(),
  type: mysqlEnum("type", ["email_verify", "phone_verify", "phone_login", "password_reset"]).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = typeof otpCodes.$inferInsert;

// ─── PROFILES ────────────────────────────────────────────────────────────────

export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  displayName: varchar("displayName", { length: 100 }),
  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
  dateOfBirth: timestamp("dateOfBirth"),
  gender: varchar("gender", { length: 32 }),
  orientation: varchar("orientation", { length: 64 }),
  location: varchar("location", { length: 200 }),
  phone: varchar("phone", { length: 20 }),
  memberRole: mysqlEnum("memberRole", ["pending", "member", "angel", "admin"]).default("pending").notNull(),
  applicationStatus: mysqlEnum("applicationStatus", ["draft", "submitted", "under_review", "approved", "rejected", "waitlisted"]).default("draft").notNull(),
  applicationPhase: varchar("applicationPhase", { length: 32 }),
  communityId: varchar("communityId", { length: 32 }),
  preferences: json("preferences"),
  isProfileComplete: boolean("isProfileComplete").default(false),
  approvedAt: timestamp("approvedAt"),
  approvedBy: int("approvedBy"),
  // ─── Waiver & profile setup ──────────────────────────────────────────────
  waiverSignedAt: timestamp("waiverSignedAt"),
  waiverVersion: varchar("waiverVersion", { length: 16 }),
  profileSetupComplete: boolean("profileSetupComplete").default(false),
  // ─── Referral tracking ───────────────────────────────────────────────────
  referredByCode: varchar("referredByCode", { length: 32 }),
  referredByUserId: int("referredByUserId"),
  referralConverted: boolean("referralConverted").default(false),
  referralConvertedAt: timestamp("referralConvertedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

// ─── APPLICATION PHOTOS ──────────────────────────────────────────────────────

export const applicationPhotos = mysqlTable("application_photos", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  photoUrl: text("photoUrl").notNull(),
  sortOrder: int("sortOrder").default(0),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── APPLICATION LOGS ────────────────────────────────────────────────────────

export const applicationLogs = mysqlTable("application_logs", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  performedBy: int("performedBy"),
  notes: text("notes"),
  previousStatus: varchar("previousStatus", { length: 32 }),
  newStatus: varchar("newStatus", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── RELATIONSHIP GROUPS ─────────────────────────────────────────────────────

export const relationshipGroups = mysqlTable("relationship_groups", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }),
  type: varchar("type", { length: 32 }).default("couple"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const relationshipGroupMembers = mysqlTable("relationship_group_members", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  profileId: int("profileId").notNull(),
  role: varchar("role", { length: 32 }).default("member"),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

// ─── PARTNER INVITATIONS ─────────────────────────────────────────────────────

export const partnerInvitations = mysqlTable("partner_invitations", {
  id: int("id").autoincrement().primaryKey(),
  inviterId: int("inviterId").notNull(),
  inviteeEmail: varchar("inviteeEmail", { length: 320 }),
  inviteePhone: varchar("inviteePhone", { length: 20 }),
  token: varchar("token", { length: 128 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "accepted", "expired", "cancelled"]).default("pending").notNull(),
  relationshipGroupId: int("relationshipGroupId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
});

// ─── USER GROUPS (membership in community groups) ────────────────────────────

export const userGroups = mysqlTable("user_groups", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  groupId: int("groupId").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

// ─── EVENTS ──────────────────────────────────────────────────────────────────

export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  coverImageUrl: text("coverImageUrl"),
  eventType: mysqlEnum("eventType", ["regular", "festival"]).default("regular").notNull(),
  communityId: varchar("communityId", { length: 32 }),
  venue: varchar("venue", { length: 300 }),
  address: text("address"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  doorsOpen: timestamp("doorsOpen"),
  capacity: int("capacity"),
  currentAttendees: int("currentAttendees").default(0),
  priceSingleMale: decimal("priceSingleMale", { precision: 10, scale: 2 }),
  priceSingleFemale: decimal("priceSingleFemale", { precision: 10, scale: 2 }),
  priceCouple: decimal("priceCouple", { precision: 10, scale: 2 }),
  priceGroup: decimal("priceGroup", { precision: 10, scale: 2 }),
  isPublished: boolean("isPublished").default(false),
  requiresTestResults: boolean("requiresTestResults").default(false),
  requiresWaiver: boolean("requiresWaiver").default(false),
  status: mysqlEnum("status", ["draft", "published", "cancelled", "completed"]).default("draft").notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

// ─── RESERVATIONS ────────────────────────────────────────────────────────────

export const reservations = mysqlTable("reservations", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  userId: int("userId").notNull(),
  profileId: int("profileId"),
  ticketType: varchar("ticketType", { length: 32 }),
  quantity: int("quantity").default(1),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }),
  amountPaid: decimal("amountPaid", { precision: 10, scale: 2 }),
  creditsUsed: decimal("creditsUsed", { precision: 10, scale: 2 }).default("0"),
  paymentMethod: varchar("paymentMethod", { length: 32 }),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "refunded", "partial", "failed"]).default("pending").notNull(),
  stripeSessionId: varchar("stripeSessionId", { length: 256 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 256 }),
  status: mysqlEnum("status", ["pending", "confirmed", "checked_in", "cancelled", "no_show"]).default("pending").notNull(),
  checkedInAt: timestamp("checkedInAt"),
  checkedInBy: int("checkedInBy"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Reservation = typeof reservations.$inferSelect;

// ─── TICKETS ─────────────────────────────────────────────────────────────────

export const tickets = mysqlTable("tickets", {
  id: int("id").autoincrement().primaryKey(),
  reservationId: int("reservationId").notNull(),
  userId: int("userId").notNull(),
  qrCode: varchar("qrCode", { length: 256 }).notNull().unique(),
  isUsed: boolean("isUsed").default(false),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── EVENT ADDONS ────────────────────────────────────────────────────────────

export const eventAddons = mysqlTable("event_addons", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  maxQuantity: int("maxQuantity"),
  currentSold: int("currentSold").default(0),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const reservationAddons = mysqlTable("reservation_addons", {
  id: int("id").autoincrement().primaryKey(),
  reservationId: int("reservationId").notNull(),
  addonId: int("addonId").notNull(),
  quantity: int("quantity").default(1),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── EVENT PROMOTIONAL PRICING ───────────────────────────────────────────────

export const eventPromotionalPricing = mysqlTable("event_promotional_pricing", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  code: varchar("code", { length: 64 }).notNull(),
  discountType: mysqlEnum("discountType", ["percentage", "fixed"]).notNull(),
  discountValue: decimal("discountValue", { precision: 10, scale: 2 }).notNull(),
  maxUses: int("maxUses"),
  currentUses: int("currentUses").default(0),
  validFrom: timestamp("validFrom"),
  validUntil: timestamp("validUntil"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── EVENT OPERATORS ─────────────────────────────────────────────────────────

export const eventOperators = mysqlTable("event_operators", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  userId: int("userId").notNull(),
  role: varchar("role", { length: 32 }).default("operator"),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  assignedBy: int("assignedBy"),
});

// ─── EVENT SHIFTS ────────────────────────────────────────────────────────────

export const eventShifts = mysqlTable("event_shifts", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  maxVolunteers: int("maxVolunteers").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const shiftAssignments = mysqlTable("shift_assignments", {
  id: int("id").autoincrement().primaryKey(),
  shiftId: int("shiftId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["assigned", "confirmed", "checked_in", "completed", "no_show"]).default("assigned").notNull(),
  checkedInAt: timestamp("checkedInAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── EVENT SETUP CHECKLIST ───────────────────────────────────────────────────

export const eventSetupChecklist = mysqlTable("event_setup_checklist", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  task: varchar("task", { length: 200 }).notNull(),
  isCompleted: boolean("isCompleted").default(false),
  completedBy: int("completedBy"),
  completedAt: timestamp("completedAt"),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── EVENT FEEDBACK ──────────────────────────────────────────────────────────

export const eventFeedback = mysqlTable("event_feedback", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  userId: int("userId").notNull(),
  rating: int("rating").notNull(),
  comment: text("comment"),
  isAnonymous: boolean("isAnonymous").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── CANCELLATION REQUESTS ───────────────────────────────────────────────────

export const cancellationRequests = mysqlTable("cancellation_requests", {
  id: int("id").autoincrement().primaryKey(),
  reservationId: int("reservationId").notNull(),
  userId: int("userId").notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "approved", "denied"]).default("pending").notNull(),
  refundAmount: decimal("refundAmount", { precision: 10, scale: 2 }),
  refundMethod: varchar("refundMethod", { length: 32 }),
  processedBy: int("processedBy"),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── CONVERSATIONS ───────────────────────────────────────────────────────────

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["dm", "group", "channel"]).default("dm").notNull(),
  name: varchar("name", { length: 100 }),
  description: text("description"),
  avatarUrl: text("avatarUrl"),
  eventId: int("eventId"),
  communityId: varchar("communityId", { length: 32 }),
  createdBy: int("createdBy"),
  isArchived: boolean("isArchived").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;

// ─── CONVERSATION PARTICIPANTS ───────────────────────────────────────────────

export const conversationParticipants = mysqlTable("conversation_participants", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["member", "admin", "moderator"]).default("member").notNull(),
  lastReadAt: timestamp("lastReadAt"),
  isMuted: boolean("isMuted").default(false),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

// ─── MESSAGES ────────────────────────────────────────────────────────────────

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  senderId: int("senderId").notNull(),
  content: text("content"),
  attachmentUrl: text("attachmentUrl"),
  attachmentType: varchar("attachmentType", { length: 32 }),
  replyToId: int("replyToId"),
  isEdited: boolean("isEdited").default(false),
  isDeleted: boolean("isDeleted").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Message = typeof messages.$inferSelect;

// ─── MESSAGE REACTIONS ───────────────────────────────────────────────────────

export const messageReactions = mysqlTable("message_reactions", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("messageId").notNull(),
  userId: int("userId").notNull(),
  emoji: varchar("emoji", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── MESSAGE READS ───────────────────────────────────────────────────────────

export const messageReads = mysqlTable("message_reads", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("messageId").notNull(),
  userId: int("userId").notNull(),
  readAt: timestamp("readAt").defaultNow().notNull(),
});

// ─── PINNED MESSAGES ─────────────────────────────────────────────────────────

export const pinnedMessages = mysqlTable("pinned_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  messageId: int("messageId").notNull(),
  pinnedBy: int("pinnedBy").notNull(),
  pinnedAt: timestamp("pinnedAt").defaultNow().notNull(),
});

// ─── TYPING INDICATORS ──────────────────────────────────────────────────────

export const typingIndicators = mysqlTable("typing_indicators", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  userId: int("userId").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
});

// ─── USER PRESENCE ───────────────────────────────────────────────────────────

export const userPresence = mysqlTable("user_presence", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  status: mysqlEnum("status", ["online", "away", "offline"]).default("offline").notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
});

// ─── BLOCKED USERS ───────────────────────────────────────────────────────────

export const blockedUsers = mysqlTable("blocked_users", {
  id: int("id").autoincrement().primaryKey(),
  blockerId: int("blockerId").notNull(),
  blockedId: int("blockedId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── WALL POSTS ──────────────────────────────────────────────────────────────

export const wallPosts = mysqlTable("wall_posts", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),
  communityId: varchar("communityId", { length: 32 }),
  content: text("content"),
  mediaUrl: text("mediaUrl"),
  mediaType: varchar("mediaType", { length: 32 }),
  visibility: mysqlEnum("visibility", ["public", "members", "community"]).default("members").notNull(),
  isPinned: boolean("isPinned").default(false),
  eventId: int("eventId"),
  likesCount: int("likesCount").default(0),
  commentsCount: int("commentsCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WallPost = typeof wallPosts.$inferSelect;

// ─── WALL POST LIKES ─────────────────────────────────────────────────────────

export const wallPostLikes = mysqlTable("wall_post_likes", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── WALL POST COMMENTS ──────────────────────────────────────────────────────

export const wallPostComments = mysqlTable("wall_post_comments", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  authorId: int("authorId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── ANNOUNCEMENTS ───────────────────────────────────────────────────────────

export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  communityId: varchar("communityId", { length: 32 }),
  authorId: int("authorId").notNull(),
  isPinned: boolean("isPinned").default(false),
  publishedAt: timestamp("publishedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body"),
  data: json("data"),
  isRead: boolean("isRead").default(false),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── NOTIFICATION QUEUE ──────────────────────────────────────────────────────

export const notificationQueue = mysqlTable("notification_queue", {
  id: int("id").autoincrement().primaryKey(),
  notificationId: int("notificationId"),
  channel: mysqlEnum("channel", ["in_app", "push", "sms", "email"]).notNull(),
  status: mysqlEnum("status", ["queued", "processing", "sent", "failed"]).default("queued").notNull(),
  attempts: int("attempts").default(0),
  lastAttemptAt: timestamp("lastAttemptAt"),
  scheduledFor: timestamp("scheduledFor"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── NOTIFICATION BATCHES ────────────────────────────────────────────────────

export const notificationBatches = mysqlTable("notification_batches", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  channel: varchar("channel", { length: 32 }).notNull(),
  itemCount: int("itemCount").default(0),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── NOTIFICATION PREFERENCES ────────────────────────────────────────────────

export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  inApp: boolean("inApp").default(true),
  push: boolean("push").default(true),
  sms: boolean("sms").default(false),
  email: boolean("email").default(true),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const adminNotificationPreferences = mysqlTable("admin_notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  isEnabled: boolean("isEnabled").default(true),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── NOTIFICATION DELIVERY RULES ─────────────────────────────────────────────

export const notificationDeliveryRules = mysqlTable("notification_delivery_rules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 64 }),
  quietHoursStart: varchar("quietHoursStart", { length: 8 }),
  quietHoursEnd: varchar("quietHoursEnd", { length: 8 }),
  maxPerHour: int("maxPerHour"),
  batchWindow: int("batchWindow"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── NOTIFICATION ANALYTICS ──────────────────────────────────────────────────

export const notificationAnalytics = mysqlTable("notification_analytics", {
  id: int("id").autoincrement().primaryKey(),
  notificationId: int("notificationId"),
  channel: varchar("channel", { length: 32 }).notNull(),
  event: varchar("event", { length: 32 }).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── PUSH SUBSCRIPTIONS ─────────────────────────────────────────────────────

export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh"),
  auth: text("auth"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── SMS NOTIFICATIONS ───────────────────────────────────────────────────────

export const smsNotifications = mysqlTable("sms_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  phone: varchar("phone", { length: 20 }).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["queued", "sent", "delivered", "failed"]).default("queued").notNull(),
  externalId: varchar("externalId", { length: 128 }),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── ADMIN AUDIT LOGS ────────────────────────────────────────────────────────

export const adminAuditLogs = mysqlTable("admin_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("targetType", { length: 64 }),
  targetId: int("targetId"),
  details: json("details"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── APP SETTINGS ────────────────────────────────────────────────────────────

export const appSettings = mysqlTable("app_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("settingKey", { length: 100 }).notNull().unique(),
  value: text("value"),
  type: varchar("type", { length: 32 }).default("string"),
  description: text("description"),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── GROUPS (communities) ────────────────────────────────────────────────────

export const groups = mysqlTable("groups", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  primaryColor: varchar("primaryColor", { length: 64 }),
  logoUrl: text("logoUrl"),
  coverImageUrl: text("coverImageUrl"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Group = typeof groups.$inferSelect;

// ─── PRE-APPROVED PHONES ─────────────────────────────────────────────────────

export const preApprovedPhones = mysqlTable("pre_approved_phones", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  communityId: varchar("communityId", { length: 32 }),
  addedBy: int("addedBy"),
  isUsed: boolean("isUsed").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── SINGLE MALE INVITE CODES ────────────────────────────────────────────────

export const singleMaleInviteCodes = mysqlTable("single_male_invite_codes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  createdBy: int("createdBy"),
  usedBy: int("usedBy"),
  isUsed: boolean("isUsed").default(false),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── INTRO CALL SLOTS ────────────────────────────────────────────────────────

export const introCallSlots = mysqlTable("intro_call_slots", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId"),
  scheduledAt: timestamp("scheduledAt").notNull(),
  duration: int("duration").default(30),
  status: mysqlEnum("status", ["available", "booked", "completed", "cancelled"]).default("available").notNull(),
  notes: text("notes"),
  conductedBy: int("conductedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── PROFILE CHANGE REQUESTS ─────────────────────────────────────────────────

export const profileChangeRequests = mysqlTable("profile_change_requests", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  fieldName: varchar("fieldName", { length: 64 }).notNull(),
  currentValue: text("currentValue"),
  requestedValue: text("requestedValue"),
  status: mysqlEnum("status", ["pending", "approved", "denied"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── GROUP CHANGE REQUESTS ───────────────────────────────────────────────────

export const groupChangeRequests = mysqlTable("group_change_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  currentGroupId: int("currentGroupId"),
  requestedGroupId: int("requestedGroupId").notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "approved", "denied"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── SIGNED WAIVERS ──────────────────────────────────────────────────────────

export const signedWaivers = mysqlTable("signed_waivers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  eventId: int("eventId"),
  waiverType: varchar("waiverType", { length: 64 }).notNull(),
  waiverVersion: varchar("waiverVersion", { length: 16 }),
  signedAt: timestamp("signedAt").defaultNow().notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  signature: text("signature"),
});

// ─── MEMBER CREDITS ──────────────────────────────────────────────────────────

export const memberCredits = mysqlTable("member_credits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: mysqlEnum("type", ["referral", "cancellation", "admin_grant", "promo", "debit"]).notNull(),
  description: text("description"),
  referenceId: int("referenceId"),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── REFERRAL CODES ──────────────────────────────────────────────────────────

export const referralCodes = mysqlTable("referral_codes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  totalReferrals: int("totalReferrals").default(0),
  totalEarned: decimal("totalEarned", { precision: 10, scale: 2 }).default("0"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── EXPENSES ────────────────────────────────────────────────────────────────

export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId"),
  category: varchar("category", { length: 64 }).notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  receiptUrl: text("receiptUrl"),
  paidBy: int("paidBy"),
  approvedBy: int("approvedBy"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── RESOURCE ACKNOWLEDGMENTS ────────────────────────────────────────────────

export const resourceAcknowledgments = mysqlTable("resource_acknowledgments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  resourceId: varchar("resourceId", { length: 64 }).notNull(),
  acknowledgedAt: timestamp("acknowledgedAt").defaultNow().notNull(),
});
