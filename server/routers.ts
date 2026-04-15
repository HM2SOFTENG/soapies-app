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
import { createCheckoutSession } from "./services/stripe";
import { notifyMessageCreated, broadcastToUser, broadcastToConversation } from "./_core/websocket";
import { ENV } from "./_core/env";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => {
      const u = opts.ctx.user;
      if (!u) return null;
      const { passwordHash, ...safe } = u as any;
      return safe;
    }),
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

        // Also return token in body for native mobile clients that can't read httpOnly cookies
        return { success: true, sessionToken, user: { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified } };
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

        return { success: true, sessionToken, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } };
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

    changePassword: protectedProcedure.input(z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8),
    })).mutation(async ({ ctx, input }) => {
      const user = await auth.getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      if (!user.passwordHash) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Password login not set up for this account' });
      const valid = await auth.verifyPassword(input.currentPassword, user.passwordHash);
      if (!valid) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Current password is incorrect' });
      await auth.updatePassword(ctx.user.id, input.newPassword);
      return { success: true };
    }),

    requestDeactivation: protectedProcedure.mutation(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user?.email) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No email address on account' });
      const code = auth.generateOtp();
      await auth.saveOtp({ userId: user.id, target: user.email, code, type: 'password_reset' });
      await auth.sendEmailOtp(user.email, code);
      return { success: true };
    }),

    confirmDeactivation: protectedProcedure.input(z.object({ code: z.string().min(4) })).mutation(async ({ ctx, input }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user?.email) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No email address on account' });
      const otp = await auth.verifyOtp({ target: user.email, code: input.code, type: 'password_reset' });
      if (!otp) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or expired code' });
      await db.deactivateUser(ctx.user.id);
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
    signWaiver: protectedProcedure.input(z.object({
      signature: z.string().min(1),
      version: z.string(),
    })).mutation(async ({ ctx, input }) => {
      const ip = (ctx.req as any).ip ?? undefined;
      await db.signWaiver(ctx.user.id, input.version, input.signature, ip);
      return { success: true };
    }),
    completeProfileSetup: protectedProcedure.mutation(async ({ ctx }) => {
      await db.completeProfileSetup(ctx.user.id);
      return { success: true };
    }),
    search: protectedProcedure.input(z.object({ query: z.string() })).query(async ({ input }) => {
      return db.searchProfiles(input.query);
    }),
  }),

  // ─── EVENTS ──────────────────────────────────────────────────────────────
  events: router({
    list: publicProcedure.input(z.object({ communityId: z.string().optional() }).nullish()).query(async ({ input }) => {
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
    bulkDelete: adminProcedure.input(z.object({ ids: z.array(z.number()) })).mutation(async ({ input }) => {
      for (const id of input.ids) await db.deleteEvent(id);
      return { success: true };
    }),
    bulkUpdateStatus: adminProcedure.input(z.object({
      ids: z.array(z.number()),
      status: z.enum(["draft", "published", "cancelled", "completed"]),
    })).mutation(async ({ input }) => {
      for (const id of input.ids) await db.updateEvent(id, { status: input.status });
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
    myTickets: protectedProcedure.query(async ({ ctx }) => {
      const tickets = await db.getUserReservations(ctx.user.id);
      // Auto-generate QR for confirmed/paid tickets missing one
      const result = await Promise.all(tickets.map(async (t: any) => {
        if ((t.status === 'confirmed' || t.paymentStatus === 'paid') && !t.qrCode) {
          try {
            const { generateTicketQR } = await import("./services/tickets");
            const qrCode = await generateTicketQR(t.id);
            await db.createTicketForReservation(t.id, ctx.user.id, qrCode);
            return { ...t, qrCode };
          } catch (err) {
            console.error(`[Tickets] Failed to generate QR for reservation ${t.id}:`, err);
            return t;
          }
        }
        return t;
      }));
      return result;
    }),
    byEvent: adminProcedure.input(z.object({ eventId: z.number() })).query(async ({ input }) => {
      return db.getReservationsByEventWithUsers(input.eventId);
    }),
    create: protectedProcedure.input(z.object({
      eventId: z.number(),
      ticketType: z.enum(["single_female", "couple", "single_male", "volunteer"]).optional(),
      quantity: z.number().optional(),
      totalAmount: z.string().optional(),
      paymentMethod: z.enum(["venmo", "credits", "volunteer", "cash", "card", "stripe"]).optional(),
      paymentStatus: z.enum(["pending", "paid", "refunded", "partial", "failed"]).optional(),
      orientationSignal: z.enum(["straight", "queer"]).optional(),
      isQueerPlay: z.boolean().optional(),
      isVolunteer: z.boolean().optional(),
      partnerUserId: z.number().optional(),
      testResultUrl: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      // Verify user is approved before allowing reservation
      const reservingProfile = await db.getProfileByUserId(ctx.user.id);
      if (ctx.user.role !== 'admin' && (!reservingProfile || reservingProfile.applicationStatus !== 'approved')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You must be an approved member to reserve tickets.' });
      }

      // Gender-based ticket enforcement (skip for admins and when gender is not set)
      if (ctx.user.role !== 'admin' && input.ticketType && reservingProfile?.gender) {
        const gender = reservingProfile.gender.toLowerCase().trim();
        const maleGenders = ["male", "man", "trans male", "transmale", "trans man", "transman", "non-binary", "nonbinary", "non binary", "enby"];
        const femaleGenders = ["female", "woman", "trans female", "transfemale", "trans woman", "transwoman", "transgender woman"];
        const isMale = maleGenders.includes(gender);
        const isFemale = femaleGenders.includes(gender);

        if (isMale && input.ticketType === "single_female") {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'This ticket type is not available for your gender. Please select Single Man, Volunteer, or Couple.' });
        }
        if (isFemale && input.ticketType === "single_male") {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'This ticket type is not available for your gender. Please select Single Woman, Volunteer, or Couple.' });
        }
      }

      // Check for duplicate reservation
      const existingRes = await db.getReservationsByUser(ctx.user.id);
      const alreadyReserved = existingRes.some((r: any) => r.eventId === input.eventId && r.status !== 'cancelled');
      if (alreadyReserved) {
        throw new TRPCError({ code: 'CONFLICT', message: 'You already have a reservation for this event.' });
      }
      // Check capacity before creating reservation
      const cap = await db.getEventCapacity(input.eventId);
      if (cap && cap.capacity && cap.capacity > 0 && (cap.currentAttendees ?? 0) >= cap.capacity) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: `This event is at capacity (${cap.capacity} attendees).` });
      }
      const reservationId = await db.createReservation({ ...input, userId: ctx.user.id, status: "pending", paymentStatus: "pending", notes: input.isVolunteer ? 'volunteer' : undefined });
      // Increment attendee count after successful reservation
      if (reservationId) {
        try { await db.incrementEventAttendees(input.eventId); } catch (err) { console.error("[Capacity] Failed to increment attendees:", err); }
      }
      // Process referral conversion on first reservation (fires only if not already converted)
      if (reservationId) {
        // Update wristband color based on reservation data
        try {
          await db.updateReservationWristband(reservationId as number);
        } catch (err) {
          console.error("[Wristband] Failed to update wristband:", err);
        }

        // Auto-assign volunteer to shift if volunteer ticket
        if (input.ticketType === "volunteer") {
          try {
            const shifts = await db.getEventShifts(input.eventId);
            let resolvedShiftId: number | undefined = shifts[0]?.id;
            if (!resolvedShiftId) {
              const newShift = await db.createEventShift({
                eventId: input.eventId,
                name: "General Volunteer",
                startTime: new Date(),
                endTime: new Date(),
                maxVolunteers: 99,
              });
              resolvedShiftId = typeof newShift === "number" ? newShift : undefined;
            }
            if (typeof resolvedShiftId === "number") {
              await db.createShiftAssignment({ shiftId: resolvedShiftId, userId: ctx.user.id, status: "confirmed" });
            }
          } catch (err) {
            console.error("[Volunteer] Failed to auto-assign shift:", err);
          }
        }

        try {
          await db.processReferralConversion(ctx.user.id, reservationId as number);
        } catch (err) {
          console.error("[Referral] Failed to process conversion:", err);
        }
        // Auto-wall-post disabled — clutters the feed with system noise

        // ── Couple ticket: create partner reservation + notify ─────────────
        if (input.ticketType === 'couple' && input.partnerUserId) {
          try {
            await db.createReservation({
              userId: input.partnerUserId,
              eventId: input.eventId,
              ticketType: 'couple',
              status: 'pending',
              paymentStatus: 'pending',
              paymentMethod: input.paymentMethod ?? 'venmo',
              partnerUserId: ctx.user.id,
            });
            await db.incrementEventAttendees(input.eventId);
          } catch (err) {
            console.error('[Couple] Failed to create partner reservation:', err);
          }

          // Notify partner via push/in-app
          try {
            const requesterProfile = await db.getProfileByUserId(ctx.user.id);
            const eventData = await db.getEventById(input.eventId);
            await notif.sendNotification({
              userId: input.partnerUserId,
              type: 'system',
              title: '\u{1F491} Couple Ticket Invitation',
              body: `${requesterProfile?.displayName ?? 'A member'} has linked you as their partner for ${(eventData as any)?.title ?? 'an upcoming event'}. Complete your reservation by paying via Venmo @KELLEN-BRENNAN.`,
            }).catch(() => {});

            // Send a DM to partner
            try {
              const convs = await db.getUserConversations(ctx.user.id);
              let dmConv = (convs as any[]).find((c: any) => c.type === 'dm' && c.otherUserId === input.partnerUserId);
              if (!dmConv) {
                const dmId = await db.createConversation(
                  { type: 'dm', createdBy: ctx.user.id },
                  [ctx.user.id, input.partnerUserId],
                );
                dmConv = { id: dmId };
              }
              await db.createMessage({
                conversationId: dmConv.id,
                senderId: ctx.user.id,
                content: `\u{1F491} I've linked you as my partner for **${(eventData as any)?.title ?? 'our next event'}**! Please send your payment to @KELLEN-BRENNAN on Venmo to confirm your spot. See you there! \u{1F389}`,
              });
            } catch (err) {
              console.error('[Couple] Failed to send partner DM:', err);
            }
          } catch (err) {
            console.error('[Couple] Failed to notify partner:', err);
          }
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

    checkInByQR: adminProcedure.input(z.object({
      qrCode: z.string(),
      eventId: z.number(),
    })).mutation(async ({ input }) => {
      const ticket = await db.getTicketByQRCode(input.qrCode);
      if (!ticket) throw new TRPCError({ code: 'NOT_FOUND', message: 'QR code not found' });
      const reservation = await db.getReservationById(ticket.reservationId);
      if (!reservation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reservation not found' });
      if (reservation.eventId !== input.eventId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'QR code is for a different event' });
      if (reservation.status === 'checked_in') {
        const profile = (reservation as any).userId ? await db.getProfileByUserId((reservation as any).userId).catch(() => null) : null;
        return {
          success: true,
          alreadyCheckedIn: true,
          guestName: (profile as any)?.displayName ?? (reservation as any).displayName ?? null,
          avatarUrl: (profile as any)?.avatarUrl ?? null,
          ticketType: (reservation as any).ticketType,
          wristbandColor: (reservation as any).wristbandColor ?? 'purple',
          isQueerPlay: Boolean((reservation as any).isQueerPlay),
        };
      }
      if (reservation.status === 'cancelled') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Reservation is cancelled' });
      await db.updateReservation(reservation.id, { status: 'checked_in' });
      const profile = (reservation as any).userId ? await db.getProfileByUserId((reservation as any).userId).catch(() => null) : null;
      const updatedRes = await db.getReservationById(reservation.id);
      return {
        success: true,
        alreadyCheckedIn: false,
        guestName: (reservation as any).displayName ?? (profile as any)?.displayName ?? null,
        avatarUrl: (profile as any)?.avatarUrl ?? null,
        ticketType: (reservation as any).ticketType,
        wristbandColor: (updatedRes as any)?.wristbandColor ?? (reservation as any).wristbandColor ?? 'purple',
        isQueerPlay: Boolean((reservation as any).isQueerPlay),
      };
    }),

    createCheckoutSession: protectedProcedure
      .input(z.object({ reservationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn)
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        const { reservations: resTable, events: evTable } = await import("../drizzle/schema");
        const { eq: eqOp } = await import("drizzle-orm");

        const rows = await dbConn
          .select({ res: resTable, event: evTable })
          .from(resTable)
          .innerJoin(evTable, eqOp(resTable.eventId, evTable.id))
          .where(eqOp(resTable.id, input.reservationId))
          .limit(1);

        if (!rows.length) throw new TRPCError({ code: "NOT_FOUND" });
        const { res, event } = rows[0];

        // Ticket price in cents — use live event prices when available
        const amounts: Record<string, number> = {
          single_female: Math.round(parseFloat(event.priceSingleFemale ?? "40") * 100),
          couple: Math.round(parseFloat(event.priceCouple ?? "130") * 100),
          single_male: Math.round(parseFloat(event.priceSingleMale ?? "145") * 100),
          volunteer: 0,
        };
        const amount = amounts[res.ticketType ?? ""] ?? 0;
        if (amount === 0)
          throw new TRPCError({ code: "BAD_REQUEST", message: "No payment required for this ticket type" });

        const baseUrl = process.env.APP_URL ?? "https://soapiesplaygrp.club";
        const result = await createCheckoutSession({
          reservationId: input.reservationId,
          eventTitle: event.title,
          ticketType: res.ticketType ?? "",
          amount,
          userId: ctx.user.id,
          successUrl: `${baseUrl}/tickets?payment=success`,
          cancelUrl: `${baseUrl}/events/${event.id}?payment=cancelled`,
        });

        if (!result)
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe not configured" });
        return result;
      }),


    joinWaitlist: protectedProcedure.input(z.object({ eventId: z.number() })).mutation(async ({ ctx, input }) => {
      // Verify user is approved before allowing waitlist join
      const waitlistProfile = await db.getProfileByUserId(ctx.user.id);
      if (ctx.user.role !== 'admin' && (!waitlistProfile || waitlistProfile.applicationStatus !== 'approved')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You must be an approved member to join the waitlist.' });
      }
      return db.joinWaitlist(input.eventId, ctx.user.id);
    }),

    getWaitlistPosition: protectedProcedure.input(z.object({ eventId: z.number() })).query(async ({ ctx, input }) => {
      return db.getWaitlistPosition(input.eventId, ctx.user.id);
    }),
  }),

  // ─── WALL POSTS ──────────────────────────────────────────────────────────
  wall: router({
    posts: protectedProcedure.input(z.object({ communityId: z.string().optional(), limit: z.number().optional() }).nullish()).query(async ({ input }) => {
      return db.getWallPosts(input?.communityId, input?.limit);
    }),
    create: protectedProcedure.input(z.object({
      content: z.string(),
      communityId: z.string().optional(),
      mediaUrl: z.string().optional(),
      mediaType: z.string().optional(),
      linkUrl: z.string().url().optional(),
      visibility: z.enum(["public", "members", "community"]).optional(),
    })).mutation(async ({ ctx, input }) => {
      const { linkUrl, ...rest } = input;
      return db.createWallPost({
        ...rest,
        mediaUrl: rest.mediaUrl ?? linkUrl,
        mediaType: linkUrl ? 'link' : rest.mediaType,
        authorId: ctx.user.id,
      });
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
    updatePost: protectedProcedure.input(z.object({ postId: z.number(), content: z.string() })).mutation(async ({ ctx, input }) => {
      return db.updateWallPost(input.postId, ctx.user.id, { content: input.content });
    }),
    deletePost: protectedProcedure.input(z.object({ postId: z.number() })).mutation(async ({ ctx, input }) => {
      return db.deleteWallPost(input.postId, ctx.user.id);
    }),
  }),

  // ─── MESSAGING ───────────────────────────────────────────────────────────
  messages: router({
    conversations: protectedProcedure.query(async ({ ctx }) => {
      const convs = await db.getUserConversations(ctx.user.id);
      const userProfile = await db.getProfileByUserId(ctx.user.id);
      const userGender = (userProfile as any)?.gender?.toLowerCase() ?? '';
      const userRole = ctx.user.role;
      return convs.filter((c: any) => {
        if (c.type !== 'channel') return true;
        const name = (c.name || '').toLowerCase();
        if ((name.includes('mens') || name === "mens chat") && !name.includes('women')) {
          if (userRole === 'admin') return true;
          return userGender === 'male' || userGender === 'man';
        }
        if (name.includes('women') || name.includes('ladies')) {
          if (userRole === 'admin') return true;
          return userGender === 'female' || userGender === 'woman';
        }
        if (name.includes('admin')) return userRole === 'admin';
        if (name.includes('angel')) return userRole === 'admin' || (userRole as string) === 'angel';
        return true;
      });
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
      const msgId = await db.createMessage({ ...input, senderId: ctx.user.id });
      // Broadcast new message to all conversation watchers via WebSocket
      notifyMessageCreated(input.conversationId, {
        id: msgId,
        conversationId: input.conversationId,
        senderId: ctx.user.id,
        content: input.content,
        attachmentUrl: input.attachmentUrl ?? null,
        attachmentType: input.attachmentType ?? null,
        createdAt: new Date().toISOString(),
      });
      // Send push + in-app notification to all conversation participants except sender
      try {
        const participants = await db.getConversationParticipants(input.conversationId);
        const recipients = participants.filter((p: any) => p.userId !== ctx.user.id);
        // Get sender display name
        const senderProfile = await db.getProfileByUserId(ctx.user.id);
        const senderUser = await db.getUserById(ctx.user.id);
        const senderName = (senderProfile as any)?.displayName || (senderUser as any)?.name || "Someone";
        for (const recipient of recipients) {
          await notif.sendNotification({
            userId: recipient.userId,
            type: "message",
            title: `New message from ${senderName}`,
            body: input.content.length > 100 ? input.content.slice(0, 97) + "..." : input.content,
            data: {
              conversationId: input.conversationId,
              link: "/messages",
            },
          });
        }
      } catch (err) {
        console.error("[Notification] Failed to send message notification:", err);
      }
      return msgId;
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

    addReaction: protectedProcedure.input(z.object({
      messageId: z.number(),
      emoji: z.string(),
    })).mutation(async ({ ctx, input }) => {
      const added = await db.toggleMessageReaction(input.messageId, ctx.user.id, input.emoji);
      return { added };
    }),

    removeReaction: protectedProcedure.input(z.object({
      messageId: z.number(),
      emoji: z.string(),
    })).mutation(async ({ ctx, input }) => {
      await db.toggleMessageReaction(input.messageId, ctx.user.id, input.emoji);
      return { success: true };
    }),

    markRead: protectedProcedure.input(z.object({
      conversationId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      await db.markConversationRead(input.conversationId, ctx.user.id);
      broadcastToConversation(input.conversationId, "message_read", {
        userId: ctx.user.id,
        conversationId: input.conversationId,
      });
      return { success: true };
    }),

    markAllConversationsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllConversationsRead(ctx.user.id);
      return { success: true };
    }),

    deleteMessage: protectedProcedure.input(z.object({
      messageId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      await db.softDeleteMessage(input.messageId, ctx.user.id);
      return { success: true };
    }),

    pinMessage: protectedProcedure.input(z.object({
      conversationId: z.number(),
      messageId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      await db.pinMessage({ conversationId: input.conversationId, messageId: input.messageId, pinnedBy: ctx.user.id });
      return { success: true };
    }),

    unpinMessage: protectedProcedure.input(z.object({
      conversationId: z.number(),
      messageId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      await db.unpinMessage(input.conversationId, input.messageId);
      return { success: true };
    }),

    messageReactions: protectedProcedure.input(z.object({
      messageId: z.number(),
    })).query(async ({ input }) => {
      return db.getMessageReactions(input.messageId);
    }),

    unreadCounts: protectedProcedure.query(async ({ ctx }) => {
      return db.getUnreadCounts(ctx.user.id);
    }),

    presence: protectedProcedure.input(z.object({
      conversationId: z.number(),
    })).query(async ({ input }) => {
      return db.getConversationPresence(input.conversationId);
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

    savePushSubscription: protectedProcedure.input(z.object({
      endpoint: z.string(),
      p256dh: z.string(),
      auth: z.string(),
    })).mutation(async ({ ctx, input }) => {
      await db.savePushSubscription(ctx.user.id, input.endpoint, input.p256dh, input.auth);
      return { success: true };
    }),

    getVapidPublicKey: publicProcedure.query(() => {
      return ENV.vapidPublicKey || null;
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
    active: publicProcedure.query(async ({ ctx }) => {
      const userId = ctx.user?.id;
      return db.getActiveAnnouncements(userId);
    }),
    dismiss: protectedProcedure.input(z.object({ announcementId: z.number() })).mutation(async ({ ctx, input }) => {
      await db.dismissAnnouncement(ctx.user.id, input.announcementId);
      return { success: true };
    }),
    create: adminProcedure.input(z.object({
      title: z.string(),
      content: z.string(),
      communityId: z.string().optional(),
      isPinned: z.boolean().optional(),
      isActive: z.boolean().optional(),
      expiresAt: z.string().optional(),
      targetAudience: z.string().optional(),
      dismissible: z.boolean().optional(),
    })).mutation(async ({ ctx, input }) => {
      const data: any = { ...input, authorId: ctx.user.id, publishedAt: new Date() };
      if (input.expiresAt) data.expiresAt = new Date(input.expiresAt);
      return db.createAnnouncement(data);
    }),
    deactivate: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deactivateAnnouncement(input.id);
      return { success: true };
    }),
  }),

  // ─── REFERRALS ───────────────────────────────────────────────────────────
  referrals: router({
    myCode: protectedProcedure.query(async ({ ctx }) => {
      return db.getReferralCode(ctx.user.id);
    }),
    myCodes: protectedProcedure.query(async ({ ctx }) => {
      return db.getReferralCodes(ctx.user.id);
    }),
    generate: protectedProcedure.mutation(async ({ ctx }) => {
      // Always create a new code so users can refer multiple people with different codes
      const suffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const code = `SOAP${suffix}`;
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
    myReferrals: protectedProcedure.query(async ({ ctx }) => {
      const pipeline = await db.getReferralPipeline();
      return (pipeline as any[]).filter((r: any) => r.referredByUserId === ctx.user.id);
    }),
  }),

  // ─── APP SETTINGS (public) ───────────────────────────────────────────────
  settings: router({
    get: publicProcedure.query(async () => {
      const rows = await db.getAppSettings();
      const map: Record<string, string> = {};
      for (const row of rows) { if (row.key && row.value) map[row.key] = row.value; }
      return map;
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
      const result = await db.assignToShift({ ...input, status: "assigned" });
      try {
        const shift = await db.getShiftById(input.shiftId);
        if (shift) {
          const event = await db.getEventById(shift.eventId);
          const assignedUser = await db.getUserById(input.userId);
          const assignedProfile = await db.getProfileByUserId(input.userId);
          const userName = assignedProfile?.displayName || assignedUser?.name || "Member";
          if (event) {
            const template = notif.buildStaffAssignmentNotification(userName, event.title, shift.name);
            await notif.sendNotification({
              userId: input.userId,
              type: template.type,
              title: template.title,
              body: template.body,
              email: assignedUser?.email ?? undefined,
              data: template.data,
            });
          }
        }
      } catch (err) {
        console.error("[Notification] Failed to send staff assignment notification:", err);
      }
      return result;
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
    getInvitation: publicProcedure.input(z.object({ token: z.string() })).query(async ({ input }) => {
      const inv = await db.getPartnerInvitationByToken(input.token);
      if (!inv) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid or expired invitation' });
      const inviter = await db.getUserById(inv.inviterId);
      return { ...inv, inviterName: inviter?.name ?? 'Someone' };
    }),
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
    bulkCreate: adminProcedure.input(z.object({
      slots: z.array(z.object({
        scheduledAt: z.string(),
        duration: z.number().optional(),
      })),
    })).mutation(async ({ input }) => {
      for (const slot of input.slots) {
        await db.createIntroSlot({ ...slot, scheduledAt: new Date(slot.scheduledAt) });
      }
      return { created: input.slots.length };
    }),
    book: protectedProcedure.input(z.object({ slotId: z.number() })).mutation(async ({ ctx, input }) => {
      const profile = await db.getProfileByUserId(ctx.user.id);
      if (!profile) throw new Error("Profile required to book intro call");
      await db.bookIntroSlot(input.slotId, profile.id);

      // Notify admins that a slot was booked
      try {
        const slot = await db.getIntroSlotById(input.slotId);
        const applicantName = profile.displayName || ctx.user.name || "An applicant";
        const slotTime = slot ? new Date(slot.scheduledAt).toLocaleString("en-US", {
          weekday: "short", month: "short", day: "numeric",
          hour: "numeric", minute: "2-digit", timeZoneName: "short"
        }) : "a scheduled time";
        const admins = await db.getAdminUsers();
        for (const admin of admins) {
          await notif.sendNotification({
            userId: admin.id,
            type: "system",
            title: "Interview Slot Booked",
            body: `${applicantName} has booked an interview slot for ${slotTime}.`,
            email: admin.email ?? undefined,
            data: { link: "https://soapiesplaygrp.club/admin/interview-slots" },
          }).catch(() => {}); // non-blocking
        }
      } catch {
        // Don't fail booking if notification fails
      }

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
      // Auto-post to wall when photo is approved
      if (input.status === "approved") {
        try {
          const photo = await db.getApplicationPhotoById(input.photoId);
          if (photo) {
            const profile = await db.getProfileByProfileId(photo.profileId);
            if (profile) {
              const user = await db.getUserById(profile.userId);
              const userName = profile.displayName || user?.name || "A member";
              await db.createWallPost({
                authorId: null,
                authorName: "Soapies Team",
                communityId: profile.communityId ?? "soapies",
                content: `${userName} just added new photos to their profile! 📸`,
                visibility: "members",
              });
            }
          }
        } catch (err) {
          console.error("[Wall] Failed to post photo approved message:", err);
        }
      }
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

  // ─── TEST RESULTS ────────────────────────────────────────────────────────
  members: router({
    browse: protectedProcedure.input(z.object({
      page: z.number().default(0),
      search: z.string().optional(),
      orientation: z.string().optional(),
      community: z.string().optional(),
    })).query(async ({ ctx, input }) => {
      return db.browseMembers({ userId: ctx.user.id, ...input });
    }),
    byId: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return db.getPublicProfile(input.userId);
      }),
    wall: protectedProcedure
      .input(z.object({ userId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getUserWallPosts(input.userId, input.limit ?? 20);
      }),
  }),
  communities: router({
    landing: publicProcedure.input(z.object({ communityId: z.string() })).query(async ({ input }) => {
      return db.getCommunityLanding(input.communityId);
    }),
  }),
  testResults: router({
    submit: protectedProcedure.input(z.object({
      reservationId: z.number(),
      eventId: z.number(),
      resultUrl: z.string(),
    })).mutation(async ({ ctx, input }) => {
      await db.submitTestResult({ ...input, userId: ctx.user.id });
      await db.updateReservation(input.reservationId, {
        testResultSubmitted: true,
        testResultSubmittedAt: new Date(),
        testResultUrl: input.resultUrl,
      });
      // Notify admins
      const admins = await db.getAdminUsers();
      for (const admin of admins) {
        await notif.sendNotification({
          userId: admin.id,
          type: "system",
          title: "New Test Result Submission",
          body: "A member has submitted a test result for review.",
          email: admin.email ?? undefined,
          data: { link: "https://soapiesplaygrp.club/admin/test-results" },
        }).catch(() => {});
      }
      return { success: true };
    }),
    pending: adminProcedure.input(z.object({ eventId: z.number().optional() })).query(async ({ input }) => {
      return db.getPendingTestResults(input.eventId);
    }),
    review: adminProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["approved", "rejected"]),
      notes: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      await db.reviewTestResult(input.id, input.status, ctx.user.id, input.notes);
      return { success: true };
    }),
  }),

  // ─── ADMIN ───────────────────────────────────────────────────────────────
  admin: router({
    analytics: adminProcedure.query(async () => ({
      revenueByEvent: await db.getRevenueByEvent(),
      ticketTypeBreakdown: await db.getTicketTypeBreakdown(),
      memberGrowth: await db.getMemberGrowthByMonth(),
      checkinRates: await db.getCheckinRates(),
    })),
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
    getApplicationDetail: adminProcedure.input(z.object({ profileId: z.number() })).query(async ({ input }) => {
      return db.getApplicationDetail(input.profileId);
    }),
    advanceApplication: adminProcedure.input(z.object({
      profileId: z.number(),
      phase: z.enum(["initial_review", "interview_scheduled", "interview_complete", "final_approved", "rejected"]),
      memberRole: z.enum(["member", "angel", "admin"]).optional(),
    })).mutation(async ({ ctx, input }) => {
      const profile = await db.getProfileByProfileId(input.profileId);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
      const user = await db.getUserById(profile.userId);
      const userName = profile.displayName || user?.name || "Member";

      if (input.phase === "interview_scheduled") {
        await db.updateProfilePhase(input.profileId, "interview_scheduled");
        await db.createApplicationLog({ profileId: input.profileId, action: "interview_scheduled", performedBy: ctx.user.id, notes: "Moved to interview phase" });
        await db.createAuditLog({ adminId: ctx.user.id, action: "interview_scheduled", targetType: "profile", targetId: input.profileId });

        // Send interview scheduling email
        try {
          const scheduleUrl = `https://soapiesplaygrp.club/schedule-interview`;
          const template = notif.buildInterviewScheduleNotification(userName, scheduleUrl);
          await notif.sendNotification({
            userId: profile.userId,
            type: template.type,
            title: template.title,
            body: template.body,
            email: user?.email ?? undefined,
            phone: profile.phone ?? undefined,
            data: { ...template.data, emailSubject: template.emailSubject, emailHtml: template.emailHtml, smsMessage: template.smsMessage },
          });
        } catch (err) {
          console.error("[Notification] Failed to send interview notification:", err);
        }

      } else if (input.phase === "interview_complete") {
        await db.updateProfilePhase(input.profileId, "interview_complete");
        await db.createApplicationLog({ profileId: input.profileId, action: "interview_complete", performedBy: ctx.user.id, notes: "Interview completed" });
        await db.createAuditLog({ adminId: ctx.user.id, action: "interview_complete", targetType: "profile", targetId: input.profileId });

      } else if (input.phase === "final_approved") {
        const role = input.memberRole || "member";
        await db.updateProfileStatus(input.profileId, "approved", ctx.user.id);
        await db.updateProfilePhase(input.profileId, "final_approved");
        // Set the member role
        const dbConn = await db.getDb();
        if (dbConn) {
          const { profiles: profilesTable } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          await dbConn.update(profilesTable).set({ memberRole: role as any }).where(eq(profilesTable.id, input.profileId));
        }
        await db.createApplicationLog({ profileId: input.profileId, action: "final_approved", performedBy: ctx.user.id, notes: `Approved as ${role}` });
        await db.createAuditLog({ adminId: ctx.user.id, action: "application_approved", targetType: "profile", targetId: input.profileId });

        // Auto-post welcome to community wall
        try {
          const displayName = profile.displayName || userName;
          const communityId = profile.communityId ?? "soapies";
          await db.createWallPost({
            authorId: null,
            authorName: "Soapies Team",
            communityId,
            content: `🎉 A new Soapi has joined the playgroup! Please welcome **${displayName}** — come say hi and show them some love! 💕`,
            visibility: "members",
          });
        } catch (err) {
          console.error("[Wall] Failed to post welcome message:", err);
        }

        try {
          const template = notif.buildApprovalNotification(userName);
          await notif.sendNotification({
            userId: profile.userId,
            type: template.type,
            title: template.title,
            body: template.body,
            email: user?.email ?? undefined,
            phone: profile.phone ?? undefined,
            data: { ...template.data, emailSubject: template.emailSubject, emailHtml: template.emailHtml, smsMessage: template.smsMessage },
          });
        } catch (err) {
          console.error("[Notification] Failed to send approval notification:", err);
        }

      } else if (input.phase === "rejected") {
        await db.updateProfileStatus(input.profileId, "rejected", ctx.user.id);
        await db.createApplicationLog({ profileId: input.profileId, action: "rejected", performedBy: ctx.user.id });
        await db.createAuditLog({ adminId: ctx.user.id, action: "application_rejected", targetType: "profile", targetId: input.profileId });

        try {
          const template = notif.buildRejectionNotification(userName);
          await notif.sendNotification({
            userId: profile.userId,
            type: template.type,
            title: template.title,
            body: template.body,
            email: user?.email ?? undefined,
            phone: profile.phone ?? undefined,
            data: { ...template.data, emailSubject: template.emailSubject, emailHtml: template.emailHtml, smsMessage: template.smsMessage },
          });
        } catch (err) {
          console.error("[Notification] Failed to send rejection notification:", err);
        }
      }

      return { success: true };
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
    auditLogs: adminProcedure.input(z.object({ page: z.number().default(0), action: z.string().optional() }).optional()).query(async ({ input }) => {
      return db.getAuditLogs(100);
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
    updateUserRole: adminProcedure.input(z.object({
      userId: z.number(),
      memberRole: z.enum(["member", "angel", "admin"]),
    })).mutation(async ({ ctx, input }) => {
      await db.updateUserMemberRole(input.userId, input.memberRole);
      await db.createAuditLog({ adminId: ctx.user.id, action: `role_changed_to_${input.memberRole}`, targetType: "user", targetId: input.userId });
      return { success: true };
    }),
    bulkDeleteUsers: adminProcedure.input(z.object({ userIds: z.array(z.number()) })).mutation(async ({ ctx, input }) => {
      await db.bulkDeleteUsers(input.userIds);
      await db.createAuditLog({ adminId: ctx.user.id, action: "bulk_users_deleted", targetType: "user", targetId: input.userIds[0] ?? 0 });
      return { success: true };
    }),
    pendingVenmoReservations: adminProcedure.query(async () => {
      return db.getPendingVenmoReservations();
    }),
    confirmReservation: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.updateReservation(input.id, { paymentStatus: "paid", status: "confirmed" });
      await db.createAuditLog({ adminId: ctx.user.id, action: "reservation_confirmed", targetType: "reservation", targetId: input.id });
      // Generate QR ticket for confirmed reservation
      try {
        const { generateTicketQR } = await import("./services/tickets");
        const dbConn = await db.getDb();
        if (dbConn) {
          const { reservations: resTableQR } = await import("../drizzle/schema");
          const { eq: eqQR } = await import("drizzle-orm");
          const qrRows = await dbConn.select().from(resTableQR).where(eqQR(resTableQR.id, input.id)).limit(1);
          if (qrRows.length > 0) {
            const qrCode = await generateTicketQR(input.id);
            await db.createTicketForReservation(input.id, qrRows[0].userId, qrCode);
          }
        }
      } catch (err) {
        console.error("[Tickets] Failed to generate QR:", err);
      }
      // Notify the user
      const resRows = await db.getReservationsByUser(0); // will query by id below
      try {
        const dbConn = await db.getDb();
        if (dbConn) {
          const { reservations: resTable } = await import("../drizzle/schema");
          const { eq: eqOp } = await import("drizzle-orm");
          const rows = await dbConn.select().from(resTable).where(eqOp(resTable.id, input.id)).limit(1);
          if (rows.length > 0) {
            const res = rows[0];
            await notif.sendNotification({
              userId: res.userId!,
              type: "system",
              title: "Payment Confirmed! 🎉",
              body: "Your Venmo payment has been verified. Your reservation is now confirmed!",
            }).catch(() => {});
          }
        }
      } catch {}
      return { success: true };
    }),
    allReservations: adminProcedure.input(z.object({
      eventId: z.number().optional(),
      status: z.string().optional(),
      page: z.number().default(0),
    })).query(async ({ input }) => {
      return db.getAllReservations(input);
    }),
    eventReservations: adminProcedure.input(z.object({ eventId: z.number() })).query(async ({ input }) => {
      return db.getAllReservations({ eventId: input.eventId });
    }),
    creditVolunteer: adminProcedure.input(z.object({ reservationId: z.number() })).mutation(async ({ ctx, input }) => {
      const res = await db.getReservationById(input.reservationId);
      if (!res) throw new TRPCError({ code: 'NOT_FOUND' });
      const amount = parseFloat((res as any).totalAmount?.toString() ?? '0');
      if (amount > 0) {
        await db.addCredit((res as any).userId!, amount, 'volunteer_refund', 'Volunteer duty completed — ticket refunded');
      }
      await db.updateReservation(input.reservationId, { notes: 'volunteer_completed' });
      await db.createAuditLog({ adminId: ctx.user.id, action: 'volunteer_credited', targetType: 'reservation', targetId: input.reservationId });
      await notif.sendNotification({ userId: (res as any).userId!, type: 'system', title: '🙌 Volunteer Credit Issued', body: `Your volunteer duties were confirmed! $${amount.toFixed(0)} has been credited to your account.` }).catch(() => {});
      return { success: true };
    }),
    markVolunteerNoShow: adminProcedure.input(z.object({ reservationId: z.number() })).mutation(async ({ ctx, input }) => {
      await db.updateReservation(input.reservationId, { notes: 'volunteer_noshow', status: 'no_show' });
      await db.createAuditLog({ adminId: ctx.user.id, action: 'volunteer_noshow', targetType: 'reservation', targetId: input.reservationId });
      const res = await db.getReservationById(input.reservationId);
      if ((res as any)?.userId) {
        await notif.sendNotification({ userId: (res as any).userId, type: 'system', title: '⚠️ Volunteer No-Show', body: 'You were marked as a volunteer no-show for the last event. No ticket credit will be issued. Please contact admin if this was an error.' }).catch(() => {});
      }
      return { success: true };
    }),
    sendEventReminders: adminProcedure.input(z.object({ eventId: z.number() })).mutation(async ({ input }) => {
      const allRes = await db.getAllReservations({ eventId: input.eventId });
      const pending = (allRes as any[]).filter((r: any) => r.paymentStatus === 'pending' && r.status !== 'cancelled');
      let count = 0;
      for (const r of pending) {
        if (r.userId) {
          await notif.sendNotification({ userId: r.userId, type: 'system', title: '⏰ Payment Reminder', body: 'You have a pending ticket payment. Please send payment via Venmo @KELLEN-BRENNAN to confirm your spot.' }).catch(() => {});
          count++;
        }
      }
      return { success: true, count };
    }),
    rejectReservation: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.updateReservation(input.id, { paymentStatus: "failed", status: "cancelled" });
      await db.createAuditLog({ adminId: ctx.user.id, action: "reservation_rejected", targetType: "reservation", targetId: input.id });
      try {
        const dbConn = await db.getDb();
        if (dbConn) {
          const { reservations: resTable } = await import("../drizzle/schema");
          const { eq: eqOp } = await import("drizzle-orm");
          const rows = await dbConn.select().from(resTable).where(eqOp(resTable.id, input.id)).limit(1);
          if (rows.length > 0) {
            const res = rows[0];
            await notif.sendNotification({
              userId: res.userId!,
              type: "system",
              title: "Reservation Rejected",
              body: "Unfortunately your reservation could not be confirmed. Please contact support.",
            }).catch(() => {});
          }
        }
      } catch {}
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
