import { eq, and, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { users, otpCodes } from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";

// Password hashing using Node.js built-in crypto (no bcrypt needed)
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${buf.toString("hex")}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(":");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(buf, Buffer.from(key, "hex"));
}

// OTP generation
export function generateOtp(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return num.toString();
}

// Get user by email
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const r = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return r[0] ?? null;
}

// Get user by phone
export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return null;
  const r = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return r[0] ?? null;
}

// Get user by ID
export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const r = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return r[0] ?? null;
}

// Create user with email/password
export async function createUserWithEmail(data: {
  email: string;
  password: string;
  name: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const passwordHash = await hashPassword(data.password);
  const openId = `local_${nanoid(24)}`;
  const result = await db.insert(users).values({
    openId,
    email: data.email,
    name: data.name,
    passwordHash,
    loginMethod: "email",
    lastSignedIn: new Date(),
  });
  return getUserByEmail(data.email);
}

// Create user with phone
export async function createUserWithPhone(data: {
  phone: string;
  name: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const openId = `local_${nanoid(24)}`;
  const result = await db.insert(users).values({
    openId,
    phone: data.phone,
    name: data.name,
    phoneVerified: true,
    loginMethod: "phone",
    lastSignedIn: new Date(),
  });
  return getUserByPhone(data.phone);
}

// Save OTP to database
export async function saveOtp(data: {
  userId?: number;
  target: string;
  code: string;
  type: "email_verify" | "phone_verify" | "phone_login" | "password_reset";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await db.insert(otpCodes).values({
    userId: data.userId ?? null,
    target: data.target,
    code: data.code,
    type: data.type,
    expiresAt,
  });
}

// Verify OTP
export async function verifyOtp(data: {
  target: string;
  code: string;
  type: "email_verify" | "phone_verify" | "phone_login" | "password_reset";
}) {
  const db = await getDb();
  if (!db) return null;
  const now = new Date();
  const results = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.target, data.target),
        eq(otpCodes.code, data.code),
        eq(otpCodes.type, data.type),
        gt(otpCodes.expiresAt, now)
      )
    )
    .orderBy(otpCodes.createdAt)
    .limit(1);

  const otp = results[0];
  if (!otp || otp.usedAt) return null;

  // Mark as used
  await db.update(otpCodes).set({ usedAt: now }).where(eq(otpCodes.id, otp.id));
  return otp;
}

// Send email OTP via SendGrid
export async function sendEmailOtp(email: string, code: string) {
  if (!ENV.sendgridApiKey) {
    console.warn("[Auth] SendGrid not configured, OTP:", code);
    return;
  }
  const sgMail = await import("@sendgrid/mail");
  sgMail.default.setApiKey(ENV.sendgridApiKey);
  await sgMail.default.send({
    to: email,
    from: ENV.sendgridFromEmail,
    subject: "Soapies Playgroup - Verify your email",
    html: `<div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
      <h2>Welcome to Soapies Playgroup!</h2>
      <p>Your verification code is:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px; margin: 16px 0;">${code}</div>
      <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
    </div>`,
  });
}

// Send SMS OTP via Twilio
export async function sendSmsOtp(phone: string, code: string) {
  if (!ENV.twilioAccountSid || !ENV.twilioAuthToken) {
    console.warn("[Auth] Twilio not configured, OTP:", code);
    return;
  }
  const twilio = await import("twilio");
  const client = twilio.default(ENV.twilioAccountSid, ENV.twilioAuthToken);
  await client.messages.create({
    to: phone,
    from: ENV.twilioFromNumber,
    body: `Your Soapies Playgroup verification code is: ${code}. It expires in 10 minutes.`,
  });
}

// Mark email as verified
export async function markEmailVerified(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ emailVerified: true }).where(eq(users.id, userId));
}

// Mark phone as verified
export async function markPhoneVerified(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ phoneVerified: true }).where(eq(users.id, userId));
}

// Update password
export async function updatePassword(userId: number, newPassword: string) {
  const db = await getDb();
  if (!db) return;
  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

// Update last signed in
export async function updateLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

// ─── ADMIN SEED ────────────────────────────────────────────────────────────
/**
 * Creates a default admin account on first startup if ADMIN_PASSWORD is set
 * and the account doesn't already exist. Safe to call multiple times.
 */
export async function seedAdminAccount(): Promise<void> {
  const adminEmail = ENV.adminEmail;
  const adminPassword = ENV.adminPassword;

  if (!adminPassword) {
    console.log("[Seed] ADMIN_PASSWORD not set, skipping admin seed.");
    return;
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Seed] Database not available, skipping admin seed.");
    return;
  }

  const existing = await getUserByEmail(adminEmail);
  if (existing) {
    // Ensure existing account has admin role
    if (existing.role !== "admin") {
      await db.update(users).set({ role: "admin" }).where(eq(users.id, existing.id));
      console.log(`[Seed] Promoted ${adminEmail} to admin role.`);
    } else {
      console.log(`[Seed] Admin account ${adminEmail} already exists.`);
    }
    return;
  }

  // Create the admin account
  const passwordHash = await hashPassword(adminPassword);
  const openId = `admin_${nanoid(24)}`;
  await db.insert(users).values({
    openId,
    email: adminEmail,
    name: "Admin",
    passwordHash,
    loginMethod: "email",
    emailVerified: true,
    role: "admin",
    lastSignedIn: new Date(),
  });
  console.log(`[Seed] Admin account created: ${adminEmail}`);
}
