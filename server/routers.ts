import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as notif from "./notifications";
import * as auth from "./auth";
import { sdk } from "./_core/sdk";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // Register with email
    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const existing = await auth.getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists" });
        }
        const user = await auth.createUserWithEmail(input);
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create account" });

        // Send verification email
        const code = auth.generateOtp();
        await auth.saveOtp({ userId: user.id, target: input.email, code, type: "email_verify" });
        await auth.sendEmailOtp(input.email, code);

        // Auto-login: create session so user stays logged in through the application flow
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true, userId: user.id, message: "Account created. Please verify your email." };
      }),

    // Login with email/password
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await auth.getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        }
        const valid = await auth.verifyPassword(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        }

        await auth.updateLastSignedIn(user.id);

        // Create session
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified } };
      }),

    // Send phone OTP (for login or registration)
    sendPhoneOtp: publicProcedure
      .input(z.object({
        phone: z.string().min(10),
      }))
      .mutation(async ({ input }) => {
        const code = auth.generateOtp();
        const existing = await auth.getUserByPhone(input.phone);
        const type = existing ? "phone_login" : "phone_verify";
        await auth.saveOtp({ userId: existing?.id, target: input.phone, code, type });
        await auth.sendSmsOtp(input.phone, code);
        return { success: true, isNewUser: !existing };
      }),

    // Verify phone OTP (login or register)
    verifyPhoneOtp: publicProcedure
      .input(z.object({
        phone: z.string().min(10),
        code: z.string().length(6),
        name: z.string().optional(), // Required for new users
      }))
      .mutation(async ({ input, ctx }) => {
        // Try phone_login first, then phone_verify
        let otp = await auth.verifyOtp({ target: input.phone, code: input.code, type: "phone_login" });
        if (!otp) {
          otp = await auth.verifyOtp({ target: input.phone, code: input.code, type: "phone_verify" });
        }
        if (!otp) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired code" });
        }

        let user = await auth.getUserByPhone(input.phone);
        if (!user) {
          // New user — name is required
          if (!input.name) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Name is required for new users" });
          }
          user = await auth.createUserWithPhone({ phone: input.phone, name: input.name });
        } else {
          await auth.markPhoneVerified(user.id);
          await auth.updateLastSignedIn(user.id);
        }

        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create account" });

        // Create session
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } };
      }),

    // Verify email with OTP
    verifyEmail: publicProcedure
      .input(z.object({
        email: z.string().email(),
        code: z.string().length(6),
      }))
      .mutation(async ({ input, ctx }) => {
        const otp = await auth.verifyOtp({ target: input.email, code: input.code, type: "email_verify" });
        if (!otp) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired code" });
        }

        const user = await auth.getUserByEmail(input.email);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

        await auth.markEmailVerified(user.id);
        await auth.updateLastSignedIn(user.id);

        // Auto-login after verification
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true };
      }),

    // Resend email verification
    resendEmailVerification: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const user = await auth.getUserByEmail(input.email);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        if (user.emailVerified) return { success: true, message: "Email already verified" };

        const code = auth.generateOtp();
        await auth.saveOtp({ userId: user.id, target: input.email, code, type: "email_verify" });
        await auth.sendEmailOtp(input.email, code);
        return { success: true, message: "Verification code sent" };
      }),

    // Request password reset
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const user = await auth.getUserByEmail(input.email);
        // Don't reveal if user exists
        if (user) {
          const code = auth.generateOtp();
          await auth.saveOtp({ userId: user.id, target: input.email, code, type: "password_reset" });
          await auth.sendEmailOtp(input.email, code);
        }
        return { success: true, message: "If an account exists, a reset code has been sent." };
      }),

    // Reset password with OTP
    resetPassword: publicProcedure
      .input(z.object({
        email: z.string().email(),
        code: z.string().length(6),
        newPassword: z.string().min(8),
      }))
      .mutation(async ({ input }) => {
        const otp = await auth.verifyOtp({ target: input.email, code: input.code, type: "password_reset" });
        if (!otp) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired code" });
        }
        const user = await auth.getUserByEmail(input.email);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

        await auth.updatePassword(user.id, input.newPassword);
        return { success: true };
      }),
  }),

  // ─── PROFILE ─────────────────────────────────────────────────────────────
  profile: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      return db.getProfileByUserId(ctx.user.id);
    }),
    upsert: protectedProcedure.input(z.object({
      displayName: z.string().optional(),
      bio: z.string().optional(),
      avatarUrl: z.string().optional(),
      gender: z.string().optional(),
      orientation: z.string().optional(),
      location: z.string().optional(),
      phone: z.string().optional(),
      communityId: z.string().optional(),
      dateOfBirth: z.string().optional(),
      referredByCode: z.string().max(32).optional(),
    })).mutation(async ({ ctx, input }) => {
      const data: any = { ...input, userId: ctx.user.id };
      if (input.dateOfBirth) data.dateOfBirth = new Date(input.dateOfBirth);
      const result = await db.upsertProfile(data);
      // Apply referral code if provided
      if (input.referredByCode) {
        const profile = await db.getProfileByUserId(ctx.user.id);
        if (profile) {
          await db.applyReferralToProfile(profile.id, input.referredByCode);
        }
      }
      return result;
    }),
    submitApplication: protectedProcedure.mutation(async ({ ctx }) => {
      const profile = await db.getProfileByUserId(ctx.user.id);
      if (!profile) throw new Error("Profile not found");
      await db.markProfileComplete(profile.id);
      await db.createApplicationLog({ profileId: profile.id, action: "submitted", performedBy: ctx.user.id });
      return { success: true };
    }),
    photos: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getProfileByUserId(ctx.user.id);
      if (!profile) return [];
      return db.getApplicationPhotos(profile.id);
    }),
    uploadPhoto: protectedProcedure.input(z.object({
      photoUrl: z.string(),
      sortOrder: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      let profile = await db.getProfileByUserId(ctx.user.id);
      if (!profile) {
        const id = await db.upsertProfile({ userId: ctx.user.id });
        profile = await db.getProfileByUserId(ctx.user.id);
      }
      if (!profile) throw new Error("Could not create profile");
      const photoId = await db.createApplicationPhoto({ profileId: profile.id, ...input });
      return { photoId };
    }),
    deletePhoto: protectedProcedure.input(z.object({ photoId: z.number() })).mutation(async ({ ctx, input }) => {
      const profile = await db.getProfileByUserId(ctx.user.id);
      if (!profile) throw new Error("Profile not found");
      await db.deleteApplicationPhoto(input.photoId, profile.id);
      return { success: true };
    }),
  }),

  // ─── EVENTS ──────────────────────────────────────────────────────────────
  events: router({
    list: publicProcedure.input(z.object({ communityId: z.string().optional() }).optional()).query(async ({ input }) => {
      return db.getPublishedEvents();
    }),
    all: adminProcedure.query(async () => {
      return db.getEvents();
    }),
    byId: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getEventById(input.id);
    }),
    create: adminProcedure.input(z.object({
      title: z.string(),
      description: z.string().optional(),
      coverImageUrl: z.string().optional(),
      eventType: z.enum(["regular", "festival"]).optional(),
      communityId: z.string().optional(),
      venue: z.string().optional(),
      address: z.string().optional(),
      startDate: z.string(),
      endDate: z.string().optional(),
      capacity: z.number().optional(),
      priceSingleMale: z.string().optional(),
      priceSingleFemale: z.string().optional(),
      priceCouple: z.string().optional(),
      status: z.enum(["draft", "published", "cancelled", "completed"]).optional(),
    })).mutation(async ({ ctx, input }) => {
      const data: any = { ...input, createdBy: ctx.user.id, startDate: new Date(input.startDate) };
      if (input.endDate) data.endDate = new Date(input.endDate);
      return db.createEvent(data);
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      coverImageUrl: z.string().optional(),
      venue: z.string().optional(),
      address: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      capacity: z.number().optional(),
      status: z.enum(["draft", "published", "cancelled", "completed"]).optional(),
      priceSingleMale: z.string().optional(),
      priceSingleFemale: z.string().optional(),
      priceCouple: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      if (data.startDate) (data as any).startDate = new Date(data.startDate);
      if (data.endDate) (data as any).endDate = new Date(data.endDate);
      await db.updateEvent(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteEvent(input.id);
      return { success: true };
    }),
    addons: publicProcedure.input(z.object({ eventId: z.number() })).query(async ({ input }) => {
      return db.getEventAddons(input.eventId);
    }),
    feedback: protectedProcedure.input(z.object({ eventId: z.number() })).query(async ({ input }) => {
      return db.getEventFeedback(input.eventId);
    }),
    submitFeedback: protectedProcedure.input(z.object({
      eventId: z.number(),
      rating: z.number().min(1).max(5),
      comment: z.string().optional(),
      isAnonymous: z.boolean().optional(),
    })).mutation(async ({ ctx, input }) => {
      return db.createEventFeedback({ ...input, userId: ctx.user.id });
    }),
  }),

  // ─── RESERVATIONS ────────────────────────────────────────────────────────
  reservations: router({
    myReservations: protectedProcedure.query(async ({ ctx }) => {
      return db.getReservationsByUser(ctx.user.id);
    }),
    byEvent: adminProcedure.input(z.object({ eventId: z.number() })).query(async ({ input }) => {
      return db.getReservationsByEvent(input.eventId);
    }),
    create: protectedProcedure.input(z.object({
      eventId: z.number(),
      ticketType: z.string().optional(),
      quantity: z.number().optional(),
      totalAmount: z.string().optional(),
      paymentMethod: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const reservationId = await db.createReservation({ ...input, userId: ctx.user.id, status: "pending", paymentStatus: "pending" });
      // Process referral conversion on first reservation (fires only if not already converted)
      if (reservationId) {
        try {
          await db.processReferralConversion(ctx.user.id, reservationId as number);
        } catch (err) {
          console.error("[Referral] Failed to process conversion:", err);
        }
      }
      return reservationId;
    }),
    updateStatus: adminProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["pending", "confirmed", "checked_in", "cancelled", "no_show"]),
      paymentStatus: z.enum(["pending", "paid", "refunded", "partial", "failed"]).optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateReservation(id, data);
      return { success: true };
    }),
  }),

  // ─── WALL POSTS ──────────────────────────────────────────────────────────
  wall: router({
    posts: protectedProcedure.input(z.object({ communityId: z.string().optional(), limit: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.getWallPosts(input?.communityId, input?.limit);
    }),
    create: protectedProcedure.input(z.object({
      content: z.string(),
      communityId: z.string().optional(),
      mediaUrl: z.string().optional(),
      mediaType: z.string().optional(),
      visibility: z.enum(["public", "members", "community"]).optional(),
    })).mutation(async ({ ctx, input }) => {
      return db.createWallPost({ ...input, authorId: ctx.user.id });
    }),
    like: protectedProcedure.input(z.object({ postId: z.number() })).mutation(async ({ ctx, input }) => {
      const liked = await db.toggleWallPostLike(input.postId, ctx.user.id);
      return { liked };
    }),
    comments: protectedProcedure.input(z.object({ postId: z.number() })).query(async ({ input }) => {
      return db.getWallPostComments(input.postId);
    }),
    addComment: protectedProcedure.input(z.object({
      postId: z.number(),
      content: z.string(),
    })).mutation(async ({ ctx, input }) => {
      await db.createWallPostComment({ ...input, authorId: ctx.user.id });
      return { success: true };
    }),
    myLikes: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserLikedPosts(ctx.user.id);
    }),
  }),

  // ─── MESSAGING ───────────────────────────────────────────────────────────
  messages: router({
    conversations: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserConversations(ctx.user.id);
    }),
    messages: protectedProcedure.input(z.object({ conversationId: z.number(), limit: z.number().optional() })).query(async ({ input }) => {
      return db.getConversationMessages(input.conversationId, input.limit);
    }),
    send: protectedProcedure.input(z.object({
      conversationId: z.number(),
      content: z.string(),
      attachmentUrl: z.string().optional(),
      attachmentType: z.string().optional(),
      replyToId: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      return db.createMessage({ ...input, senderId: ctx.user.id });
    }),
    createConversation: protectedProcedure.input(z.object({
      type: z.enum(["dm", "group", "channel"]).optional(),
      name: z.string().optional(),
      participantIds: z.array(z.number()),
    })).mutation(async ({ ctx, input }) => {
      const { participantIds, ...data } = input;
      const allParticipants = Array.from(new Set([ctx.user.id, ...participantIds]));
      return db.createConversation({ ...data, createdBy: ctx.user.id }, allParticipants);
    }),
  }),

  // ─── APPLICATION TIMELINE ────────────────────────────────────────────────
  applicationTimeline: router({
    logs: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getProfileByUserId(ctx.user.id);
      if (!profile) return [];
      return db.getApplicationLogs(profile.id);
    }),
  }),

  // ─── NOTIFICATIONS ───────────────────────────────────────────────────────
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserNotifications(ctx.user.id);
    }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return notif.getUnreadCount(ctx.user.id);
    }),
    markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await notif.markNotificationRead(input.id, ctx.user.id);
      return { success: true };
    }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await notif.markAllRead(ctx.user.id);
      return { success: true };
    }),
    channels: publicProcedure.query(() => {
      return {
        available: notif.getAvailableChannels(),
        emailEnabled: notif.isEmailEnabled(),
        smsEnabled: notif.isSmsEnabled(),
      };
    }),
    preferences: protectedProcedure.query(async ({ ctx }) => {
      return notif.getUserPreferences(ctx.user.id);
    }),
    upsertPreference: protectedProcedure.input(z.object({
      category: z.string(),
      inApp: z.boolean().optional(),
      email: z.boolean().optional(),
      sms: z.boolean().optional(),
      push: z.boolean().optional(),
    })).mutation(async ({ ctx, input }) => {
      await notif.upsertPreference(ctx.user.id, input.category, {
        inApp: input.inApp,
        email: input.email,
        sms: input.sms,
        push: input.push,
      });
      return { success: true };
    }),
  }),

  // ─── COMMUNITIES / GROUPS ────────────────────────────────────────────────
  groups: router({
    list: publicProcedure.query(async () => {
      return db.getGroups();
    }),
    bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ input }) => {
      return db.getGroupBySlug(input.slug);
    }),
    create: adminProcedure.input(z.object({
      slug: z.string(),
      name: z.string(),
      description: z.string().optional(),
      primaryColor: z.string().optional(),
      logoUrl: z.string().optional(),
      coverImageUrl: z.string().optional(),
    })).mutation(async ({ input }) => {
      return db.createGroup(input);
    }),
  }),

  // ─── ANNOUNCEMENTS ───────────────────────────────────────────────────────
  announcements: router({
    list: protectedProcedure.input(z.object({ communityId: z.string().optional() }).optional()).query(async ({ input }) => {
      return db.getAnnouncements(input?.communityId);
    }),
    create: adminProcedure.input(z.object({
      title: z.string(),
      content: z.string(),
      communityId: z.string().optional(),
      isPinned: z.boolean().optional(),
    })).mutation(async ({ ctx, input }) => {
      return db.createAnnouncement({ ...input, authorId: ctx.user.id, publishedAt: new Date() });
    }),
  }),

  // ─── REFERRALS ───────────────────────────────────────────────────────────
  referrals: router({
    myCode: protectedProcedure.query(async ({ ctx }) => {
      return db.getReferralCode(ctx.user.id);
    }),
    generate: protectedProcedure.mutation(async ({ ctx }) => {
      const existing = await db.getReferralCode(ctx.user.id);
      if (existing) return existing;
      const code = `SOAP${ctx.user.id}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      await db.createReferralCode({ userId: ctx.user.id, code });
      return db.getReferralCode(ctx.user.id);
    }),
    validate: publicProcedure.input(z.object({ code: z.string() })).query(async ({ input }) => {
      const refCode = await db.validateReferralCode(input.code.toUpperCase());
      if (!refCode) return { valid: false };
      // Get the referrer's display name
      const referrerProfile = await db.getProfileByUserId(refCode.userId);
      return {
        valid: true,
        referrerName: referrerProfile?.displayName ?? undefined,
      };
    }),
    adminList: adminProcedure.query(async () => {
      return db.getReferralPipeline();
    }),
  }),

  // ─── CREDITS ─────────────────────────────────────────────────────────────
  credits: router({
    balance: protectedProcedure.query(async ({ ctx }) => {
      return db.getCreditBalance(ctx.user.id);
    }),
    history: protectedProcedure.query(async ({ ctx }) => {
      return db.getMemberCredits(ctx.user.id);
    }),
  }),

  // ─── EVENT ADDONS (CRUD) ────────────────────────────────────────────────
  eventAddons: router({
    list: publicProcedure.input(z.object({ eventId: z.number() })).query(async ({ input }) => {
      return db.getEventAddons(input.eventId);
    }),
    create: adminProcedure.input(z.object({
      eventId: z.number(),
      name: z.string(),
      description: z.string().optional(),
      price: z.string(),
      maxQuantity: z.number().optional(),
      isActive: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      return db.createEventAddon(input);
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      price: z.string().optional(),
      maxQuantity: z.number().optional(),
      isActive: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateEventAddon(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteEventAddon(input.id);
      return { success: true };
    }),
    addToReservation: protectedProcedure.input(z.object({
      reservationId: z.number(),
      addonId: z.number(),
      quantity: z.number().default(1),
      unitPrice: z.string(),
      totalPrice: z.string(),
    })).mutation(async ({ input }) => {
      return db.addReservationAddon(input);
    }),
    reservationAddons: protectedProcedure.input(z.object({ reservationId: z.number() })).query(async ({ input }) => {
      return db.getReservationAddons(input.reservationId);
    }),
  }),

  // ─── PROMO CODES ──────────────────────────────────────────────────────────
  promoCodes: router({
    list: adminProcedure.input(z.object({ eventId: z.number() })).query(async ({ input }) => {
      return db.getEventPromoCodes(input.eventId);
    }),
    validate: protectedProcedure.input(z.object({ code: z.string() })).query(async ({ input }) => {
      const promo = await db.getPromoCodeByCode(input.code);
      if (!promo) return { valid: false, reason: "Code not found" };
      if (!promo.isActive) return { valid: false, reason: "Code is inactive" };
      if (promo.maxUses && (promo.currentUses ?? 0) >= promo.maxUses) return { valid: false, reason: "Code has reached max uses" };
      if (promo.validFrom && new Date() < new Date(promo.validFrom)) return { valid: false, reason: "Code is not yet active" };
      if (promo.validUntil && new Date() > new Date(promo.validUntil)) return { valid: false, reason: "Code has expired" };
      return { valid: true, promo };
    }),
    create: adminProcedure.input(z.object({
      eventId: z.number(),
      code: z.string(),
      discountType: z.enum(["percentage", "fixed"]),
      discountValue: z.string(),
      maxUses: z.number().optional(),
      validFrom: z.string().optional(),
      validUntil: z.string().optional(),
      isActive: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      const data: any = { ...input };
      if (input.validFrom) data.validFrom = new Date(input.validFrom);
      if (input.validUntil) data.validUntil = new Date(input.validUntil);
      return db.createPromoCode(data);
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      code: z.string().optional(),
      discountType: z.enum(["percentage", "fixed"]).optional(),
      discountValue: z.string().optional(),
      maxUses: z.number().optional(),
      validFrom: z.string().optional(),
      validUntil: z.string().optional(),
      isActive: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      const update: any = { ...data };
      if (data.validFrom) update.validFrom = new Date(data.validFrom);
      if (data.validUntil) update.validUntil = new Date(data.validUntil);
      await db.updatePromoCode(id, update);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deletePromoCode(input.id);
      return { success: true };
    }),
    redeem: protectedProcedure.input(z.object({ code: z.string() })).mutation(async ({ input }) => {
      const promo = await db.getPromoCodeByCode(input.code);
      if (!promo || !promo.isActive) throw new Error("Invalid promo code");
      if (promo.maxUses && (promo.currentUses ?? 0) >= promo.maxUses) throw new Error("Code has reached max uses");
      await db.incrementPromoCodeUsage(promo.id);
      return { discountType: promo.discountType, discountValue: promo.discountValue };
    }),
  }),

  // ─── EVENT SHIFTS & VOLUNTEERS ────────────────────────────────────────────
  shifts: router({
    list: protectedProcedure.input(z.object({ eventId: z.number() })).query(async ({ input }) => {
      return db.getEventShifts(input.eventId);
    }),
    create: adminProcedure.input(z.object({
      eventId: z.number(),
      name: z.string(),
      description: z.string().optional(),
      startTime: z.string(),
      endTime: z.string(),
      maxVolunteers: z.number().optional(),
    })).mutation(async ({ input }) => {
      const data: any = { ...input, startTime: new Date(input.startTime), endTime: new Date(input.endTime) };
      return db.createEventShift(data);
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      maxVolunteers: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      const update: any = { ...data };
      if (data.startTime) update.startTime = new Date(data.startTime);
      if (data.endTime) update.endTime = new Date(data.endTime);
      await db.updateEventShift(id, update);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteEventShift(input.id);
      return { success: true };
    }),
    assignments: protectedProcedure.input(z.object({ shiftId: z.number() })).query(async ({ input }) => {
      return db.getShiftAssignments(input.shiftId);
    }),
    volunteer: protectedProcedure.input(z.object({ shiftId: z.number() })).mutation(async ({ ctx, input }) => {
      return db.assignToShift({ shiftId: input.shiftId, userId: ctx.user.id, status: "assigned" });
    }),
    assignUser: adminProcedure.input(z.object({ shiftId: z.number(), userId: z.number() })).mutation(async ({ input }) => {
      return db.assignToShift({ ...input, status: "assigned" });
    }),
    updateAssignment: adminProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["assigned", "confirmed", "checked_in", "completed", "no_show"]),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      if (input.status === "checked_in") (data as any).checkedInAt = new Date();
      await db.updateShiftAssignment(id, data);
      return { success: true };
    }),
    removeAssignment: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.removeShiftAssignment(input.id);
      return { success: true };
    }),
  }),

  // ─── EVENT OPERATORS ──────────────────────────────────────────────────────
  operators: router({
    list: adminProcedure.input(z.object({ eventId: z.number() })).query(async ({ input }) => {
      return db.getEventOperators(input.eventId);
    }),
    assign: adminProcedure.input(z.object({
      eventId: z.number(),
      userId: z.number(),
      role: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      return db.assignEventOperator({ ...input, assignedBy: ctx.user.id });
    }),
    remove: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.removeEventOperator(input.id);
      return { success: true };
    }),
  }),

  // ─── EVENT CHECKLIST ──────────────────────────────────────────────────────
  checklist: router({
    list: protectedProcedure.input(z.object({ eventId: z.number() })).query(async ({ input }) => {
      return db.getEventChecklist(input.eventId);
    }),
    add: adminProcedure.input(z.object({
      eventId: z.number(),
      task: z.string(),
      sortOrder: z.number().optional(),
    })).mutation(async ({ input }) => {
      return db.addChecklistItem(input);
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      task: z.string().optional(),
      isCompleted: z.boolean().optional(),
      sortOrder: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const update: any = { ...data };
      if (input.isCompleted) { update.completedBy = ctx.user.id; update.completedAt = new Date(); }
      await db.updateChecklistItem(id, update);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteChecklistItem(input.id);
      return { success: true };
    }),
  }),

  // ─── PARTNER / RELATIONSHIP GROUPS ────────────────────────────────────────
  partners: router({
    myGroups: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getProfileByUserId(ctx.user.id);
      if (!profile) return [];
      return db.getRelationshipGroupsByProfile(profile.id);
    }),
    groupMembers: protectedProcedure.input(z.object({ groupId: z.number() })).query(async ({ input }) => {
      return db.getRelationshipGroupMembers(input.groupId);
    }),
    createGroup: protectedProcedure.input(z.object({
      name: z.string().optional(),
      type: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const profile = await db.getProfileByUserId(ctx.user.id);
      if (!profile) throw new Error("Profile required");
      const groupId = await db.createRelationshipGroup(input);
      if (groupId) await db.addRelationshipGroupMember({ groupId, profileId: profile.id, role: "primary" });
      return groupId;
    }),
    deleteGroup: protectedProcedure.input(z.object({ groupId: z.number() })).mutation(async ({ input }) => {
      await db.deleteRelationshipGroup(input.groupId);
      return { success: true };
    }),
    invite: protectedProcedure.input(z.object({
      email: z.string().optional(),
      phone: z.string().optional(),
      relationshipGroupId: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      const token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      return db.createPartnerInvitation({
        inviterId: ctx.user.id,
        inviteeEmail: input.email,
        inviteePhone: input.phone,
        token,
        relationshipGroupId: input.relationshipGroupId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });
    }),
    myInvitations: protectedProcedure.query(async ({ ctx }) => {
      return db.getPartnerInvitationsByInviter(ctx.user.id);
    }),
    acceptInvitation: protectedProcedure.input(z.object({ token: z.string() })).mutation(async ({ ctx, input }) => {
      const invitation = await db.getPartnerInvitationByToken(input.token);
      if (!invitation || invitation.status !== "pending") throw new Error("Invalid or expired invitation");
      if (invitation.expiresAt && new Date() > new Date(invitation.expiresAt)) throw new Error("Invitation has expired");
      await db.updatePartnerInvitation(invitation.id, { status: "accepted" });
      // Add acceptor to relationship group if specified
      if (invitation.relationshipGroupId) {
        const profile = await db.getProfileByUserId(ctx.user.id);
        if (profile) await db.addRelationshipGroupMember({ groupId: invitation.relationshipGroupId, profileId: profile.id, role: "member" });
      }
      return { success: true };
    }),
    cancelInvitation: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.updatePartnerInvitation(input.id, { status: "cancelled" });
      return { success: true };
    }),
  }),

  // ─── BLOCKED USERS ────────────────────────────────────────────────────────
  blocking: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getBlockedUsers(ctx.user.id);
    }),
    block: protectedProcedure.input(z.object({ userId: z.number() })).mutation(async ({ ctx, input }) => {
      await db.blockUser(ctx.user.id, input.userId);
      return { success: true };
    }),
    unblock: protectedProcedure.input(z.object({ userId: z.number() })).mutation(async ({ ctx, input }) => {
      await db.unblockUser(ctx.user.id, input.userId);
      return { success: true };
    }),
    isBlocked: protectedProcedure.input(z.object({ userId: z.number() })).query(async ({ ctx, input }) => {
      return db.isUserBlocked(ctx.user.id, input.userId);
    }),
  }),

  // ─── MESSAGE REACTIONS & PINS ─────────────────────────────────────────────
  messageExtras: router({
    reactions: protectedProcedure.input(z.object({ messageId: z.number() })).query(async ({ input }) => {
      return db.getMessageReactions(input.messageId);
    }),
    toggleReaction: protectedProcedure.input(z.object({
      messageId: z.number(),
      emoji: z.string(),
    })).mutation(async ({ ctx, input }) => {
      const added = await db.toggleMessageReaction(input.messageId, ctx.user.id, input.emoji);
      return { added };
    }),
    pinnedMessages: protectedProcedure.input(z.object({ conversationId: z.number() })).query(async ({ input }) => {
      return db.getPinnedMessages(input.conversationId);
    }),
    pin: protectedProcedure.input(z.object({
      conversationId: z.number(),
      messageId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      await db.pinMessage({ ...input, pinnedBy: ctx.user.id });
      return { success: true };
    }),
    unpin: protectedProcedure.input(z.object({
      conversationId: z.number(),
      messageId: z.number(),
    })).mutation(async ({ input }) => {
      await db.unpinMessage(input.conversationId, input.messageId);
      return { success: true };
    }),
  }),

  // ─── INTRO CALLS ──────────────────────────────────────────────────────────
  introCalls: router({
    available: protectedProcedure.query(async () => {
      return db.getAvailableIntroSlots();
    }),
    all: adminProcedure.query(async () => {
      return db.getAllIntroSlots();
    }),
    create: adminProcedure.input(z.object({
      scheduledAt: z.string(),
      duration: z.number().optional(),
      conductedBy: z.number().optional(),
    })).mutation(async ({ input }) => {
      return db.createIntroSlot({ ...input, scheduledAt: new Date(input.scheduledAt) });
    }),
    book: protectedProcedure.input(z.object({ slotId: z.number() })).mutation(async ({ ctx, input }) => {
      const profile = await db.getProfileByUserId(ctx.user.id);
      if (!profile) throw new Error("Profile required to book intro call");
      await db.bookIntroSlot(input.slotId, profile.id);
      return { success: true };
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["available", "booked", "completed", "cancelled"]).optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateIntroSlot(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteIntroSlot(input.id);
      return { success: true };
    }),
  }),

  // ─── INVITE CODES (Single Male) ──────────────────────────────────────────
  inviteCodes: router({
    list: adminProcedure.query(async () => {
      return db.getSingleMaleInviteCodes();
    }),
    generate: adminProcedure.input(z.object({
      count: z.number().default(1),
      expiresAt: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const codes: string[] = [];
      for (let i = 0; i < input.count; i++) {
        const code = `SM${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        await db.createSingleMaleInviteCode({
          code,
          createdBy: ctx.user.id,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        });
        codes.push(code);
      }
      return { codes };
    }),
    redeem: protectedProcedure.input(z.object({ code: z.string() })).mutation(async ({ ctx, input }) => {
      const result = await db.redeemSingleMaleInviteCode(input.code, ctx.user.id);
      if (!result) throw new Error("Invalid or already used invite code");
      return { success: true };
    }),
  }),

  // ─── PRE-APPROVED PHONES ──────────────────────────────────────────────────
  preApprovedPhones: router({
    list: adminProcedure.query(async () => {
      return db.getPreApprovedPhones();
    }),
    add: adminProcedure.input(z.object({
      phone: z.string(),
      communityId: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      return db.addPreApprovedPhone({ ...input, addedBy: ctx.user.id });
    }),
    check: protectedProcedure.input(z.object({ phone: z.string() })).query(async ({ input }) => {
      return db.checkPhonePreApproved(input.phone);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deletePreApprovedPhone(input.id);
      return { success: true };
    }),
  }),

  // ─── PHOTO MODERATION ─────────────────────────────────────────────────────
  photoModeration: router({
    pending: adminProcedure.query(async () => {
      return db.getPendingPhotos();
    }),
    review: adminProcedure.input(z.object({
      photoId: z.number(),
      status: z.enum(["approved", "rejected"]),
    })).mutation(async ({ ctx, input }) => {
      await db.updateApplicationPhotoStatus(input.photoId, input.status);
      await db.createAuditLog({ adminId: ctx.user.id, action: `photo_${input.status}`, targetType: "photo", targetId: input.photoId });
      return { success: true };
    }),
  }),

  // ─── PROFILE CHANGE REQUESTS ──────────────────────────────────────────────
  changeRequests: router({
    submitProfile: protectedProcedure.input(z.object({
      fieldName: z.string(),
      currentValue: z.string().optional(),
      requestedValue: z.string(),
    })).mutation(async ({ ctx, input }) => {
      const profile = await db.getProfileByUserId(ctx.user.id);
      if (!profile) throw new Error("Profile not found");
      return db.createProfileChangeRequest({ profileId: profile.id, ...input });
    }),
    submitGroup: protectedProcedure.input(z.object({
      currentGroupId: z.number().optional(),
      requestedGroupId: z.number(),
      reason: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      return db.createGroupChangeRequest({ userId: ctx.user.id, ...input });
    }),
    pendingProfile: adminProcedure.query(async () => {
      return db.getPendingProfileChangeRequests();
    }),
    pendingGroup: adminProcedure.query(async () => {
      return db.getPendingGroupChangeRequests();
    }),
    reviewProfile: adminProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["approved", "denied"]),
    })).mutation(async ({ ctx, input }) => {
      await db.reviewProfileChangeRequest(input.id, input.status, ctx.user.id);
      return { success: true };
    }),
    reviewGroup: adminProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["approved", "denied"]),
    })).mutation(async ({ ctx, input }) => {
      await db.reviewGroupChangeRequest(input.id, input.status, ctx.user.id);
      return { success: true };
    }),
  }),

  // ─── ADMIN ───────────────────────────────────────────────────────────────
  admin: router({
    stats: adminProcedure.query(async () => {
      return db.getDashboardStats();
    }),
    users: adminProcedure.query(async () => {
      return db.getAllUsers();
    }),
    profiles: adminProcedure.query(async () => {
      return db.getAllProfiles();
    }),
    pendingApplications: adminProcedure.query(async () => {
      return db.getPendingApplications();
    }),
    reviewApplication: adminProcedure.input(z.object({
      profileId: z.number(),
      status: z.enum(["approved", "rejected", "waitlisted"]),
    })).mutation(async ({ ctx, input }) => {
      await db.updateProfileStatus(input.profileId, input.status, ctx.user.id);
      await db.createAuditLog({ adminId: ctx.user.id, action: `application_${input.status}`, targetType: "profile", targetId: input.profileId });

      // Send notifications to the user
      try {
        const profile = await db.getProfileByProfileId(input.profileId);
        if (profile) {
          const user = await db.getUserById(profile.userId);
          const userName = profile.displayName || user?.name || "Member";

          let template: notif.NotificationTemplate;
          if (input.status === "approved") {
            template = notif.buildApprovalNotification(userName);
          } else if (input.status === "rejected") {
            template = notif.buildRejectionNotification(userName);
          } else {
            template = notif.buildWaitlistNotification(userName);
          }

          await notif.sendNotification({
            userId: profile.userId,
            type: template.type,
            title: template.title,
            body: template.body,
            email: user?.email ?? undefined,
            phone: profile.phone ?? undefined,
            data: {
              ...template.data,
              emailSubject: template.emailSubject,
              emailHtml: template.emailHtml,
              smsMessage: template.smsMessage,
            },
          });
        }
      } catch (err) {
        console.error("[Notification] Failed to send application notification:", err);
        // Don't fail the approval if notification fails
      }

      return { success: true };
    }),
    settings: adminProcedure.query(async () => {
      return db.getAppSettings();
    }),
    updateSetting: adminProcedure.input(z.object({ key: z.string(), value: z.string() })).mutation(async ({ ctx, input }) => {
      await db.upsertAppSetting(input.key, input.value, ctx.user.id);
      return { success: true };
    }),
    auditLogs: adminProcedure.query(async () => {
      return db.getAuditLogs();
    }),
    expenses: adminProcedure.input(z.object({ eventId: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.getExpenses(input?.eventId);
    }),
    createExpense: adminProcedure.input(z.object({
      eventId: z.number().optional(),
      category: z.string(),
      description: z.string().optional(),
      amount: z.string(),
    })).mutation(async ({ ctx, input }) => {
      return db.createExpense({ ...input, paidBy: ctx.user.id, status: "approved" });
    }),
    cancellations: adminProcedure.query(async () => {
      return db.getCancellationRequests();
    }),
    processCancellation: adminProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["approved", "denied"]),
      refundAmount: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateCancellationRequest(id, { ...data, processedBy: ctx.user.id, processedAt: new Date() });
      return { success: true };
    }),
    suspendUser: adminProcedure.input(z.object({ userId: z.number() })).mutation(async ({ ctx, input }) => {
      await db.suspendUser(input.userId);
      await db.createAuditLog({ adminId: ctx.user.id, action: "user_suspended", targetType: "user", targetId: input.userId });
      return { success: true };
    }),
    unsuspendUser: adminProcedure.input(z.object({ userId: z.number() })).mutation(async ({ ctx, input }) => {
      await db.unsuspendUser(input.userId);
      await db.createAuditLog({ adminId: ctx.user.id, action: "user_unsuspended", targetType: "user", targetId: input.userId });
      return { success: true };
    }),
    deleteUser: adminProcedure.input(z.object({ userId: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteUser(input.userId);
      await db.createAuditLog({ adminId: ctx.user.id, action: "user_deleted", targetType: "user", targetId: input.userId });
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
