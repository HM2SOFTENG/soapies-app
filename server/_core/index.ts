import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./static";
import { initializeWebSocket } from "./websocket";
import { sdk } from "./sdk";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Trust reverse proxy (DigitalOcean App Platform) for correct protocol/IP detection
  app.set("trust proxy", 1);

  // ── SECURITY HEADERS ─────────────────────────────────────────────────────
  app.use(helmet({
    // Allow inline scripts/styles needed by Vite + React
    // TODO: Re-enable CSP once Vite inline scripts are refactored
    // For now disabled to support Vite HMR in development
    contentSecurityPolicy: false,
    // Allow embedding in iframes from same origin only (blocks clickjacking)
    frameguard: { action: "sameorigin" },
    // Force HTTPS for 1 year (DigitalOcean App Platform always uses HTTPS)
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    // Hide server tech fingerprint
    hidePoweredBy: true,
    // Block MIME-type sniffing
    noSniff: true,
    // Prevent IE from opening downloads in-page
    ieNoOpen: true,
    // Basic XSS protection for old browsers
    xssFilter: true,
    // Disable cross-origin opener (prevents tab-napping)
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    // Referrer: send origin only, not full URL (hides page paths on external nav)
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }));

  // ── RATE LIMITING ────────────────────────────────────────────────────────
  // Auth endpoints — strict limit to prevent brute force
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many attempts. Please try again in 15 minutes." },
    skip: (req) => process.env.NODE_ENV === "development",
  });

  // API general limit — generous, just prevents abuse
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please slow down." },
    skip: (req) => process.env.NODE_ENV === "development",
  });

  // Apply rate limits
  app.use("/api/trpc/auth.login", authLimiter);
  app.use("/api/trpc/auth.register", authLimiter);
  app.use("/api/trpc/auth.sendPhoneOtp", authLimiter);
  app.use("/api/trpc/auth.verifyPhoneOtp", authLimiter);
  app.use("/api/trpc/auth.requestPasswordReset", authLimiter);
  app.use("/api/trpc/auth.resetPassword", authLimiter);
  app.use("/api/trpc/auth.verifyEmail", authLimiter);
  app.use("/api/trpc/auth.resendEmailVerification", authLimiter);
  app.use("/api/trpc", apiLimiter);
  app.use("/api/upload-photo", apiLimiter);

  // ── ROBOTS / SEARCH ENGINE BLOCKING ──────────────────────────────────────
  // Prevent search engines from indexing any page (private community app)
  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain");
    res.send("User-agent: *\nDisallow: /\n");
  });

  // Stripe webhook — must use raw body, registered BEFORE express.json()
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const { getStripe } = await import("../services/stripe");
      const { ENV: envCfg } = await import("./env");
      const stripe = getStripe();
      if (!stripe) return res.status(400).send("Stripe not configured");

      const sig = req.headers["stripe-signature"] as string;
      let event: any;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          envCfg.stripeWebhookSecret
        );
      } catch (err: any) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const kind = session.metadata?.kind;

        if (kind === "membership") {
          const userId = parseInt(session.metadata?.userId ?? "0");
          if (userId) {
            const { saveMembershipStateForUser } = await import(
              "../services/membership"
            );
            const notif = await import("../notifications");
            const subscriptionId =
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription?.id;
            let periodEndIso: string | null = null;
            if (subscriptionId) {
              try {
                const subscription = await stripe.subscriptions.retrieve(
                  subscriptionId
                );
                const currentPeriodEnd = (subscription as any).current_period_end;
                if (currentPeriodEnd) {
                  periodEndIso = new Date(
                    Number(currentPeriodEnd) * 1000
                  ).toISOString();
                }
              } catch {}
            }

            await saveMembershipStateForUser(userId, {
              tierKey: session.metadata?.tierKey ?? null,
              status: "active",
              interval:
                session.metadata?.interval === "year" ? "year" : "month",
              stripeCustomerId:
                typeof session.customer === "string" ? session.customer : null,
              stripeSubscriptionId: subscriptionId ?? null,
              lastCheckoutSessionId: session.id,
              activatedAt: new Date().toISOString(),
              currentPeriodEnd: periodEndIso,
            });

            try {
              await notif.sendNotification({
                userId,
                type: "system",
                title: "💎 Membership active",
                body: `Your ${session.metadata?.tierKey?.replace(/_/g, " ") ?? "membership"} subscription is now active.`,
              });
            } catch {}
          }
        } else {
          const reservationId = parseInt(session.metadata.reservationId);
          const userId = parseInt(session.metadata.userId);

          const db = await import("../db");
          const notif = await import("../notifications");

          // Mark reservation paid
          await db.updateReservation(reservationId, {
            paymentStatus: "paid",
            status: "confirmed",
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent,
          });

          // Generate QR ticket
          try {
            const { generateTicketQR } = await import("../services/tickets");
            const qrCode = await generateTicketQR(reservationId);
            await db.createTicketForReservation(reservationId, userId, qrCode);
          } catch {}

          // Assign wristband color
          try {
            await db.updateReservationWristband(reservationId);
          } catch {}

          // Notify user
          try {
            await notif.sendNotification({
              userId,
              type: "system",
              title: "🎉 Payment Confirmed!",
              body: "Your Stripe payment was successful. Your ticket QR code is ready in the Tickets tab.",
            });
          } catch {}

          // Sync to party chat if event is within 7 days
          try {
            const dbConn = await db.getDb();
            if (dbConn) {
              const { reservations: resTable } = await import("../../drizzle/schema");
              const { eq: eqOp } = await import("drizzle-orm");
              const rows = await dbConn
                .select()
                .from(resTable)
                .where(eqOp(resTable.id, reservationId))
                .limit(1);
              if (rows[0]?.eventId) {
                const { syncUserToPartyChat } = await import("../partyChat");
                await syncUserToPartyChat(rows[0].eventId, userId);
              }
            }
          } catch {}

          // Log audit
          try {
            await db.createAuditLog({
              adminId: userId,
              action: "stripe_payment_confirmed",
              targetType: "reservation",
              targetId: reservationId,
            });
          } catch {}
        }
      }

      if (
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.deleted"
      ) {
        const subscription = event.data.object;
        const userId = parseInt(subscription.metadata?.userId ?? "0");
        if (userId) {
          const { saveMembershipStateForUser } = await import(
            "../services/membership"
          );
          const stripeStatus = String(subscription.status ?? "inactive");
          const mappedStatus =
            stripeStatus === "active" || stripeStatus === "trialing"
              ? stripeStatus
              : stripeStatus === "past_due"
                ? "past_due"
                : stripeStatus === "canceled" || event.type === "customer.subscription.deleted"
                  ? "canceled"
                  : "inactive";
          const currentPeriodEnd = (subscription as any).current_period_end;
          await saveMembershipStateForUser(userId, {
            tierKey: subscription.metadata?.tierKey ?? null,
            status: mappedStatus as any,
            interval:
              subscription.metadata?.interval === "year" ? "year" : "month",
            stripeCustomerId:
              typeof subscription.customer === "string"
                ? subscription.customer
                : null,
            stripeSubscriptionId: subscription.id ?? null,
            cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
            currentPeriodEnd: currentPeriodEnd
              ? new Date(Number(currentPeriodEnd) * 1000).toISOString()
              : null,
          });
        }
      }

      // Handle abandoned Stripe checkout — cancel ghost reservations
      if (event.type === "checkout.session.expired") {
        const session = event.data.object;
        const reservationId = parseInt(session.metadata?.reservationId ?? '0');
        if (reservationId) {
          const db = await import("../db");
          try {
            const reservation = await db.getReservationById(reservationId);
            const alreadyFinalized = reservation && (
              reservation.status === 'cancelled'
              || reservation.status === 'confirmed'
              || reservation.status === 'checked_in'
              || reservation.paymentStatus === 'paid'
            );

            if (!alreadyFinalized) {
              await db.updateReservation(reservationId, { status: 'cancelled', paymentStatus: 'failed' });
            }
          } catch {}
        }
      }

      res.json({ received: true });
    }
  );

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Seed default admin account if ADMIN_PASSWORD is configured
  try {
    const { seedAdminAccount } = await import("../auth");
    await seedAdminAccount();
  } catch (err) {
    console.warn("[Startup] Admin seed skipped:", err);
  }

  // Seed default channels
  try {
    const { ensureDefaultChannels } = await import("../seedChannels");
    await ensureDefaultChannels();
  } catch (err) {
    console.warn("[Startup] Channel seed skipped:", err);
  }

  // Seed default app settings
  try {
    const db = await import("../db");
    const settings = await db.getAppSettings();
    const keys = settings.map((s: any) => s.key);
    if (!keys.includes("venmo_handle")) {
      await db.upsertAppSetting("venmo_handle", "@SoapiesEvents");
      // console.log("[Startup] Seeded default app setting: venmo_handle");
    }
  } catch (err) {
    console.warn("[Startup] App settings seed skipped:", err);
  }
  // Migrate: member_signals table for Zone/Pulse feature
  // Uses raw mysql2 (not drizzle) to avoid ORM template issues
  try {
    if (process.env.DATABASE_URL) {
      const mysql2 = await import('mysql2/promise');
      const migConn = await mysql2.createConnection({
        uri: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      });
      await migConn.execute(`
        CREATE TABLE IF NOT EXISTS member_signals (
          id INT AUTO_INCREMENT PRIMARY KEY,
          userId INT NOT NULL,
          signalType ENUM('available', 'looking', 'busy', 'offline') DEFAULT 'offline',
          seekingGender VARCHAR(64),
          seekingDynamic VARCHAR(128),
          message VARCHAR(200),
          isQueerFriendly TINYINT(1) DEFAULT 0,
          latitude DECIMAL(10,7),
          longitude DECIMAL(10,7),
          expiresAt DATETIME NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_user (userId)
        )
      `);
      await migConn.end();
      // console.log('[Migration] member_signals table ready');
    }
  } catch (err) {
    console.warn('[Migration] member_signals skipped:', err);
  }

  // Initialize Web Push
  try {
    const { initWebPush } = await import("../services/webpush");
    initWebPush();
  } catch (err) {
    console.warn("[Startup] Web push init skipped:", err);
  }
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Photo upload API — requires valid session
  app.post("/api/upload-photo", async (req, res) => {
    // Verify session token (x-session-token header or app_session_id cookie)
    let sessionToken: string | undefined = req.headers["x-session-token"] as string | undefined;
    if (!sessionToken) {
      const cookieHeader = req.headers.cookie;
      if (cookieHeader) {
        const { parse } = await import("cookie");
        const parsed = parse(cookieHeader);
        sessionToken = parsed["app_session_id"];
      }
    }
    if (!sessionToken) return res.status(401).json({ error: "Unauthorized" });
    const session = await sdk.verifySession(sessionToken);
    if (!session) return res.status(401).json({ error: "Invalid session" });
    try {
      const { storagePut } = await import("../storage");
      const { nanoid } = await import("nanoid");
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", async () => {
        try {
          const body = Buffer.concat(chunks);
          // Client sends raw binary with X-Image-Type header (or falls back to content-type)
          // This avoids multipart/form-data parsing complexity
          const imageType = (req.headers["x-image-type"] as string) || "image/jpeg";
          const ext = imageType.includes("png") ? "png" : imageType.includes("webp") ? "webp" : "jpg";
          const key = `photos/${nanoid()}.${ext}`;
          const { url } = await storagePut(key, body, imageType);
          res.json({ url });
        } catch (err: any) {
          res.status(500).json({ error: err.message });
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Initialize WebSocket server
  await initializeWebSocket(server);

  // Startup cleanup: remove OTP codes older than 24 hours
  const { cleanupExpiredOtps } = await import("../auth");
  cleanupExpiredOtps().catch(() => {});

  // ── 24h Event Reminder Cron ────────────────────────────────────────────────────────────────
  // Runs every hour, finds events starting in 22-26h, notifies pending-payment holders
  const runEventReminderCron = async () => {
    try {
      const db = await import('../db');
      const notif = await import('../notifications');
      const settingRows = await db.getAppSettings();
      const remindersEnabled = (settingRows as any[]).find((s: any) => s.key === 'notification_reminders')?.value === '1';
      if (!remindersEnabled) return;
      const venmoHandle = (settingRows as any[]).find((s: any) => s.key === 'venmo_handle')?.value ?? '@SoapiesEvents';
      const pool = await db.getRawPool();
      if (!pool) return;
      // Find events starting in 22–26 hours
      const [eventRows] = await pool.execute(
        `SELECT id, title FROM events WHERE startDate BETWEEN DATE_ADD(NOW(), INTERVAL 22 HOUR) AND DATE_ADD(NOW(), INTERVAL 26 HOUR) AND status = 'published'`
      );
      for (const event of eventRows as any[]) {
        const [resRows] = await pool.execute(
          `SELECT r.userId FROM reservations r WHERE r.eventId = ? AND r.paymentStatus = 'pending' AND r.status != 'cancelled'`,
          [event.id]
        );
        for (const res of resRows as any[]) {
          await notif.sendNotification({
            userId: res.userId,
            type: 'system',
            title: `⏰ Event Tomorrow: ${event.title}`,
            body: `Your spot is reserved but payment is still pending. Please send payment via Venmo ${venmoHandle} to confirm your attendance.`,
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[EventReminder] cron failed:', err);
    }
  };
  runEventReminderCron().catch(() => {});
  setInterval(runEventReminderCron, 60 * 60 * 1000); // every hour

  // Party Chat cron — run on startup then every 24 hours
  const { runPartyChatCron } = await import("../partyChat");
  runPartyChatCron().catch((e) => console.error("[PartyChat] startup run failed:", e));
  setInterval(() => {
    runPartyChatCron().catch((e) => console.error("[PartyChat] cron failed:", e));
  }, 24 * 60 * 60 * 1000);

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.warn(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.warn(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
