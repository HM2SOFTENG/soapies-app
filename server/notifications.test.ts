import { describe, expect, it } from "vitest";
import {
  isEmailEnabled,
  isSmsEnabled,
  getAvailableChannels,
  buildApprovalNotification,
  buildRejectionNotification,
  buildWaitlistNotification,
} from "./notifications";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createUserContext(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-001",
    email: "test@soapies.com",
    name: "Test User",
    loginMethod: "email",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("notification channel availability", () => {
  it("in_app is always available", () => {
    const channels = getAvailableChannels();
    expect(channels).toContain("in_app");
  });

  it("email is disabled when SENDGRID_API_KEY is not set", () => {
    // In test environment, env vars are not set
    expect(isEmailEnabled()).toBe(false);
  });

  it("sms is disabled when TWILIO env vars are not set", () => {
    expect(isSmsEnabled()).toBe(false);
  });

  it("returns only in_app when no external services configured", () => {
    const channels = getAvailableChannels();
    expect(channels).toEqual(["in_app"]);
  });
});

describe("notification templates", () => {
  it("builds approval notification with correct structure", () => {
    const template = buildApprovalNotification("Alice");
    expect(template.type).toBe("application_approved");
    expect(template.title).toContain("Welcome");
    expect(template.body).toContain("Alice");
    expect(template.body).toContain("approved");
    expect(template.emailSubject).toBeDefined();
    expect(template.emailHtml).toBeDefined();
    expect(template.smsMessage).toBeDefined();
    expect(template.smsMessage).toContain("Alice");
    expect(template.data?.status).toBe("approved");
  });

  it("builds rejection notification with correct structure", () => {
    const template = buildRejectionNotification("Bob");
    expect(template.type).toBe("application_rejected");
    expect(template.title).toBe("Application Update");
    expect(template.body).toContain("Bob");
    expect(template.body).toContain("unable to approve");
    expect(template.emailSubject).toBeDefined();
    expect(template.emailHtml).toBeDefined();
    expect(template.smsMessage).toBeDefined();
    expect(template.data?.status).toBe("rejected");
  });

  it("builds waitlist notification with correct structure", () => {
    const template = buildWaitlistNotification("Charlie");
    expect(template.type).toBe("application_waitlisted");
    expect(template.title).toContain("Waitlist");
    expect(template.body).toContain("Charlie");
    expect(template.body).toContain("waitlist");
    expect(template.emailSubject).toBeDefined();
    expect(template.emailHtml).toBeDefined();
    expect(template.smsMessage).toBeDefined();
    expect(template.data?.status).toBe("waitlisted");
  });

  it("approval email HTML contains branded styling", () => {
    const template = buildApprovalNotification("Diana");
    expect(template.emailHtml).toContain("Soapies");
    expect(template.emailHtml).toContain("Diana");
    expect(template.emailHtml).toContain("approved");
    expect(template.emailHtml).toContain("<!DOCTYPE html>");
  });

  it("rejection email HTML contains branded styling", () => {
    const template = buildRejectionNotification("Eve");
    expect(template.emailHtml).toContain("Soapies");
    expect(template.emailHtml).toContain("Eve");
    expect(template.emailHtml).toContain("<!DOCTYPE html>");
  });

  it("waitlist email HTML contains branded styling", () => {
    const template = buildWaitlistNotification("Frank");
    expect(template.emailHtml).toContain("Soapies");
    expect(template.emailHtml).toContain("Frank");
    expect(template.emailHtml).toContain("<!DOCTYPE html>");
  });
});

describe("notification tRPC procedures", () => {
  it("throws UNAUTHORIZED for public access to unreadCount", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.notifications.unreadCount()).rejects.toThrow();
  });

  it("returns unread count for authenticated user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.unreadCount();
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("returns notification channel info from public channels query", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.channels();
    expect(result).toBeDefined();
    expect(Array.isArray(result.available)).toBe(true);
    expect(result.available).toContain("in_app");
    expect(typeof result.emailEnabled).toBe("boolean");
    expect(typeof result.smsEnabled).toBe("boolean");
  });

  it("throws UNAUTHORIZED for public access to markAllRead", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.notifications.markAllRead()).rejects.toThrow();
  });

  it("allows authenticated user to mark all read", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.markAllRead();
    expect(result).toEqual({ success: true });
  });
});
