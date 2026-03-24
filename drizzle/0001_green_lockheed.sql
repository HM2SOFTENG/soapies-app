CREATE TABLE `admin_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`targetType` varchar(64),
	`targetId` int,
	`details` json,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` varchar(64) NOT NULL,
	`isEnabled` boolean DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_notification_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`communityId` varchar(32),
	`authorId` int NOT NULL,
	`isPinned` boolean DEFAULT false,
	`publishedAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `app_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(100) NOT NULL,
	`value` text,
	`type` varchar(32) DEFAULT 'string',
	`description` text,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_settings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
CREATE TABLE `application_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`action` varchar(64) NOT NULL,
	`performedBy` int,
	`notes` text,
	`previousStatus` varchar(32),
	`newStatus` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `application_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `application_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`photoUrl` text NOT NULL,
	`sortOrder` int DEFAULT 0,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `application_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blocked_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blockerId` int NOT NULL,
	`blockedId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blocked_users_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cancellation_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reservationId` int NOT NULL,
	`userId` int NOT NULL,
	`reason` text,
	`status` enum('pending','approved','denied') NOT NULL DEFAULT 'pending',
	`refundAmount` decimal(10,2),
	`refundMethod` varchar(32),
	`processedBy` int,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cancellation_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversation_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('member','admin','moderator') NOT NULL DEFAULT 'member',
	`lastReadAt` timestamp,
	`isMuted` boolean DEFAULT false,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversation_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('dm','group','channel') NOT NULL DEFAULT 'dm',
	`name` varchar(100),
	`description` text,
	`avatarUrl` text,
	`eventId` int,
	`communityId` varchar(32),
	`createdBy` int,
	`isArchived` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_addons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`maxQuantity` int,
	`currentSold` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `event_addons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`userId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`isAnonymous` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `event_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_operators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`userId` int NOT NULL,
	`role` varchar(32) DEFAULT 'operator',
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`assignedBy` int,
	CONSTRAINT `event_operators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_promotional_pricing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`code` varchar(64) NOT NULL,
	`discountType` enum('percentage','fixed') NOT NULL,
	`discountValue` decimal(10,2) NOT NULL,
	`maxUses` int,
	`currentUses` int DEFAULT 0,
	`validFrom` timestamp,
	`validUntil` timestamp,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `event_promotional_pricing_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_setup_checklist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`task` varchar(200) NOT NULL,
	`isCompleted` boolean DEFAULT false,
	`completedBy` int,
	`completedAt` timestamp,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `event_setup_checklist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_shifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`maxVolunteers` int DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `event_shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`coverImageUrl` text,
	`eventType` enum('regular','festival') NOT NULL DEFAULT 'regular',
	`communityId` varchar(32),
	`venue` varchar(300),
	`address` text,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`doorsOpen` timestamp,
	`capacity` int,
	`currentAttendees` int DEFAULT 0,
	`priceSingleMale` decimal(10,2),
	`priceSingleFemale` decimal(10,2),
	`priceCouple` decimal(10,2),
	`priceGroup` decimal(10,2),
	`isPublished` boolean DEFAULT false,
	`requiresTestResults` boolean DEFAULT false,
	`requiresWaiver` boolean DEFAULT false,
	`status` enum('draft','published','cancelled','completed') NOT NULL DEFAULT 'draft',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int,
	`category` varchar(64) NOT NULL,
	`description` text,
	`amount` decimal(10,2) NOT NULL,
	`receiptUrl` text,
	`paidBy` int,
	`approvedBy` int,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_change_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`currentGroupId` int,
	`requestedGroupId` int NOT NULL,
	`reason` text,
	`status` enum('pending','approved','denied') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_change_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(32) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`primaryColor` varchar(64),
	`logoUrl` text,
	`coverImageUrl` text,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `groups_id` PRIMARY KEY(`id`),
	CONSTRAINT `groups_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `intro_call_slots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int,
	`scheduledAt` timestamp NOT NULL,
	`duration` int DEFAULT 30,
	`status` enum('available','booked','completed','cancelled') NOT NULL DEFAULT 'available',
	`notes` text,
	`conductedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `intro_call_slots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `member_credits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`type` enum('referral','cancellation','admin_grant','promo','debit') NOT NULL,
	`description` text,
	`referenceId` int,
	`balance` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `member_credits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `message_reactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` int NOT NULL,
	`userId` int NOT NULL,
	`emoji` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `message_reactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `message_reads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` int NOT NULL,
	`userId` int NOT NULL,
	`readAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `message_reads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`senderId` int NOT NULL,
	`content` text,
	`attachmentUrl` text,
	`attachmentType` varchar(32),
	`replyToId` int,
	`isEdited` boolean DEFAULT false,
	`isDeleted` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notificationId` int,
	`channel` varchar(32) NOT NULL,
	`event` varchar(32) NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`channel` varchar(32) NOT NULL,
	`itemCount` int DEFAULT 0,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_delivery_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`category` varchar(64),
	`quietHoursStart` varchar(8),
	`quietHoursEnd` varchar(8),
	`maxPerHour` int,
	`batchWindow` int,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_delivery_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` varchar(64) NOT NULL,
	`inApp` boolean DEFAULT true,
	`push` boolean DEFAULT true,
	`sms` boolean DEFAULT false,
	`email` boolean DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notificationId` int,
	`channel` enum('in_app','push','sms','email') NOT NULL,
	`status` enum('queued','processing','sent','failed') NOT NULL DEFAULT 'queued',
	`attempts` int DEFAULT 0,
	`lastAttemptAt` timestamp,
	`scheduledFor` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(64) NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` text,
	`data` json,
	`isRead` boolean DEFAULT false,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partner_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inviterId` int NOT NULL,
	`inviteeEmail` varchar(320),
	`inviteePhone` varchar(20),
	`token` varchar(128) NOT NULL,
	`status` enum('pending','accepted','expired','cancelled') NOT NULL DEFAULT 'pending',
	`relationshipGroupId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `partner_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `partner_invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `pinned_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`messageId` int NOT NULL,
	`pinnedBy` int NOT NULL,
	`pinnedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pinned_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pre_approved_phones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`communityId` varchar(32),
	`addedBy` int,
	`isUsed` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pre_approved_phones_id` PRIMARY KEY(`id`),
	CONSTRAINT `pre_approved_phones_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `profile_change_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`fieldName` varchar(64) NOT NULL,
	`currentValue` text,
	`requestedValue` text,
	`status` enum('pending','approved','denied') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `profile_change_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(100),
	`bio` text,
	`avatarUrl` text,
	`dateOfBirth` timestamp,
	`gender` varchar(32),
	`orientation` varchar(64),
	`location` varchar(200),
	`phone` varchar(20),
	`memberRole` enum('pending','member','angel','admin') NOT NULL DEFAULT 'pending',
	`applicationStatus` enum('draft','submitted','under_review','approved','rejected','waitlisted') NOT NULL DEFAULT 'draft',
	`communityId` varchar(32),
	`preferences` json,
	`isProfileComplete` boolean DEFAULT false,
	`approvedAt` timestamp,
	`approvedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text,
	`auth` text,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referral_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`code` varchar(32) NOT NULL,
	`totalReferrals` int DEFAULT 0,
	`totalEarned` decimal(10,2) DEFAULT '0',
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referral_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `referral_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `relationship_group_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`profileId` int NOT NULL,
	`role` varchar(32) DEFAULT 'member',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `relationship_group_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `relationship_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100),
	`type` varchar(32) DEFAULT 'couple',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `relationship_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reservation_addons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reservationId` int NOT NULL,
	`addonId` int NOT NULL,
	`quantity` int DEFAULT 1,
	`unitPrice` decimal(10,2) NOT NULL,
	`totalPrice` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reservation_addons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`userId` int NOT NULL,
	`profileId` int,
	`ticketType` varchar(32),
	`quantity` int DEFAULT 1,
	`totalAmount` decimal(10,2),
	`amountPaid` decimal(10,2),
	`creditsUsed` decimal(10,2) DEFAULT '0',
	`paymentMethod` varchar(32),
	`paymentStatus` enum('pending','paid','refunded','partial','failed') NOT NULL DEFAULT 'pending',
	`stripeSessionId` varchar(256),
	`stripePaymentIntentId` varchar(256),
	`status` enum('pending','confirmed','checked_in','cancelled','no_show') NOT NULL DEFAULT 'pending',
	`checkedInAt` timestamp,
	`checkedInBy` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resource_acknowledgments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`resourceId` varchar(64) NOT NULL,
	`acknowledgedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `resource_acknowledgments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shift_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shiftId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('assigned','confirmed','checked_in','completed','no_show') NOT NULL DEFAULT 'assigned',
	`checkedInAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shift_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `signed_waivers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventId` int,
	`waiverType` varchar(64) NOT NULL,
	`waiverVersion` varchar(16),
	`signedAt` timestamp NOT NULL DEFAULT (now()),
	`ipAddress` varchar(45),
	`signature` text,
	CONSTRAINT `signed_waivers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `single_male_invite_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`createdBy` int,
	`usedBy` int,
	`isUsed` boolean DEFAULT false,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `single_male_invite_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `single_male_invite_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `sms_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`phone` varchar(20) NOT NULL,
	`message` text NOT NULL,
	`status` enum('queued','sent','delivered','failed') NOT NULL DEFAULT 'queued',
	`externalId` varchar(128),
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sms_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reservationId` int NOT NULL,
	`userId` int NOT NULL,
	`qrCode` varchar(256) NOT NULL,
	`isUsed` boolean DEFAULT false,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `tickets_qrCode_unique` UNIQUE(`qrCode`)
);
--> statement-breakpoint
CREATE TABLE `typing_indicators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`userId` int NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `typing_indicators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`groupId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_presence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('online','away','offline') NOT NULL DEFAULT 'offline',
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_presence_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_presence_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `wall_post_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`authorId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wall_post_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wall_post_likes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wall_post_likes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wall_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`communityId` varchar(32),
	`content` text,
	`mediaUrl` text,
	`mediaType` varchar(32),
	`visibility` enum('public','members','community') NOT NULL DEFAULT 'members',
	`isPinned` boolean DEFAULT false,
	`eventId` int,
	`likesCount` int DEFAULT 0,
	`commentsCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wall_posts_id` PRIMARY KEY(`id`)
);
