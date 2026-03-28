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
        const reservationId = parseInt(session.metadata.reservationId);
        const userId = parseInt(session.metadata.userId);

        const db = await import("../db");

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
      console.log("[Startup] Seeded default app setting: venmo_handle");
    }
  } catch (err) {
    console.warn("[Startup] App settings seed skipped:", err);
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
  // Photo upload API
  app.post("/api/upload-photo", async (req, res) => {
    try {
      const { storagePut } = await import("../storage");
      const { nanoid } = await import("nanoid");
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", async () => {
        try {
          const body = Buffer.concat(chunks);
          const contentType = req.headers["content-type"] || "image/jpeg";
          const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
          const key = `photos/${nanoid()}.${ext}`;
          const { url } = await storagePut(key, body, contentType);
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
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
