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
