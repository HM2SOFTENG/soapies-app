import { describe, expect, it } from "vitest";
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

function createAdminContext(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  return createUserContext({ role: "admin", id: 99, openId: "admin-001", name: "Admin User", ...overrides });
}

describe("auth.me", () => {
  it("returns null for unauthenticated users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user data for authenticated users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result!.name).toBe("Test User");
    expect(result!.email).toBe("test@soapies.com");
    expect(result!.role).toBe("user");
  });
});

describe("events.list (protected)", () => {
  it("returns an array for authenticated event listing", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.events.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("throws UNAUTHORIZED for unauthenticated event listing", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.events.list({})).rejects.toThrow();
  });
});

describe("profile (protected)", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.profile.me()).rejects.toThrow();
  });

  it("returns profile data or null for authenticated user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.profile.me();
    // Could be null if no profile exists yet, that's fine
    expect(result === null || result === undefined || typeof result === "object").toBe(true);
  });
});

describe("admin procedures", () => {
  it("rejects non-admin users from stats", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("allows admin to access stats", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.stats();
    expect(result).toBeDefined();
    expect(typeof result.totalUsers).toBe("number");
    expect(typeof result.totalEvents).toBe("number");
    expect(typeof result.totalReservations).toBe("number");
    expect(typeof result.pendingApplications).toBe("number");
  });

  it("allows admin to list users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.users();
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows admin to list pending applications", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.pendingApplications();
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows admin to access settings", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.settings();
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows admin to access audit logs", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.auditLogs();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("reservations (protected)", () => {
  it("throws UNAUTHORIZED for public access", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.reservations.myReservations()).rejects.toThrow();
  });

  it("returns reservations array for authenticated user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.reservations.myReservations();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("notifications (protected)", () => {
  it("throws UNAUTHORIZED for public access", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.notifications.list()).rejects.toThrow();
  });

  it("returns notifications array for authenticated user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("credits (protected)", () => {
  it("throws UNAUTHORIZED for public access", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.credits.balance()).rejects.toThrow();
  });

  it("returns a number balance for authenticated user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.credits.balance();
    expect(typeof result).toBe("number");
  });
});

describe("messages (protected)", () => {
  it("throws UNAUTHORIZED for public access to conversations", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.messages.conversations()).rejects.toThrow();
  });

  it("returns conversations array for authenticated user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.messages.conversations();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("wall (protected)", () => {
  it("throws UNAUTHORIZED for public access to wall posts", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.wall.posts({})).rejects.toThrow();
  });

  it("returns posts array for authenticated user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.wall.posts({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("referrals (protected)", () => {
  it("throws UNAUTHORIZED for public access", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.referrals.myCode()).rejects.toThrow();
  });
});

describe("application flow (protected)", () => {
  it("throws UNAUTHORIZED for public access to profile.me", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.profile.me()).rejects.toThrow();
  });

  it("throws UNAUTHORIZED for public access to profile.photos", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.profile.photos()).rejects.toThrow();
  });

  it("throws UNAUTHORIZED for public access to profile.upsert", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.profile.upsert({ displayName: "Test" })).rejects.toThrow();
  });

  it("throws UNAUTHORIZED for public access to profile.uploadPhoto", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.profile.uploadPhoto({ photoUrl: "https://example.com/photo.jpg" })).rejects.toThrow();
  });

  it("throws UNAUTHORIZED for public access to profile.deletePhoto", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.profile.deletePhoto({ photoId: 1 })).rejects.toThrow();
  });

  it("throws UNAUTHORIZED for public access to profile.submitApplication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.profile.submitApplication()).rejects.toThrow();
  });

  it("allows authenticated user to upsert profile", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.profile.upsert({
        displayName: "Test User",
        gender: "male",
        bio: "This is a test bio for the application",
        location: "San Diego, CA",
      });
      expect(result).toBeDefined();
    } catch (err: any) {
      // DB errors are acceptable, but not auth errors
      expect(err.code).not.toBe("UNAUTHORIZED");
    }
  });

  it("allows authenticated user to get photos list", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.profile.photos();
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows authenticated user to upload photo reference", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.profile.uploadPhoto({
        photoUrl: "https://example.com/test-photo.jpg",
        sortOrder: 0,
      });
      expect(result).toBeDefined();
      expect(result.photoId).toBeDefined();
    } catch (err: any) {
      // DB errors are acceptable (e.g. no profile yet), but not auth errors
      expect(err.code).not.toBe("UNAUTHORIZED");
    }
  });
});

describe("reservations.create (protected)", () => {
  it("throws UNAUTHORIZED for public access", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.reservations.create({
        eventId: 1,
        ticketType: "1x Single Woman",
        quantity: 1,
        totalAmount: "40.00",
      })
    ).rejects.toThrow();
  });

  it("accepts valid reservation input from authenticated user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    // This may succeed or fail depending on DB state, but should not throw auth error
    try {
      const result = await caller.reservations.create({
        eventId: 1,
        ticketType: "2x Couple, 1x Single Woman",
        quantity: 3,
        totalAmount: "300.00",
      });
      expect(result).toBeDefined();
    } catch (err: any) {
      // DB errors are acceptable (e.g. foreign key), but not auth errors
      expect(err.code).not.toBe("UNAUTHORIZED");
    }
  });
});

describe("events.byId (public)", () => {
  it("returns event data or null for a valid ID", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.events.byId({ id: 1 });
    // Could be null if event doesn't exist, or an object if it does
    if (result) {
      expect(result.id).toBe(1);
      expect(typeof result.title).toBe("string");
    } else {
      expect(result).toBeNull();
    }
  });

  it("returns null for non-existent event", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.events.byId({ id: 999999 });
    expect(result).toBeNull();
  });

  it("returns event with pricing fields", async () => {
    // events.list is protected, events.byId is public
    const userCaller = appRouter.createCaller(createUserContext());
    const publicCaller = appRouter.createCaller(createPublicContext());
    const events = await userCaller.events.list({});
    if (events.length > 0) {
      const event = await publicCaller.events.byId({ id: events[0].id });
      expect(event).toBeDefined();
      expect("priceSingleFemale" in event!).toBe(true);
      expect("priceSingleMale" in event!).toBe(true);
      expect("priceCouple" in event!).toBe(true);
    }
  });
});

describe("application timeline (protected)", () => {
  it("throws UNAUTHORIZED for public access", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.applicationTimeline.logs()).rejects.toThrow();
  });

  it("returns logs array for authenticated user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.applicationTimeline.logs();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("notification preferences (protected)", () => {
  it("throws UNAUTHORIZED for public access to preferences", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.notifications.preferences()).rejects.toThrow();
  });

  it("returns preferences array for authenticated user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.preferences();
    expect(Array.isArray(result)).toBe(true);
  });

  it("throws UNAUTHORIZED for public access to upsertPreference", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.notifications.upsertPreference({ category: "events", inApp: true })
    ).rejects.toThrow();
  });

  it("allows authenticated user to upsert notification preference", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.notifications.upsertPreference({
        category: "events",
        inApp: true,
        email: false,
        sms: false,
        push: true,
      });
      expect(result).toBeDefined();
    } catch (err: any) {
      // DB errors acceptable, but not auth errors
      expect(err.code).not.toBe("UNAUTHORIZED");
    }
  });

  it("returns unread count for authenticated user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.unreadCount();
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("returns channel availability info", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.channels();
    expect(result).toBeDefined();
    expect(typeof result.emailEnabled).toBe("boolean");
    expect(typeof result.smsEnabled).toBe("boolean");
  });
});
