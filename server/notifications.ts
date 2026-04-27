/**
 * Unified Notification Service
 * 
 * Supports three channels:
 * - In-app: Always active, stored in DB
 * - Email: Via SendGrid, activates when SENDGRID_API_KEY is set
 * - SMS: Via Twilio, activates when TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN are set
 */

import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./db";
import { ENV } from "./_core/env";
import { broadcastToUser } from "./_core/websocket";
import {
  notifications,
  notificationQueue,
  notificationPreferences,
  smsNotifications,
} from "../drizzle/schema";

// ─── TYPES ──────────────────────────────────────────────────────────────────

export type NotificationChannel = "in_app" | "email" | "sms";

export type SendNotificationInput = {
  userId: number;
  type: string;
  category?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels?: NotificationChannel[];
  email?: string;
  phone?: string;
};

export type NotificationTemplate = {
  type: string;
  title: string;
  body: string;
  emailSubject?: string;
  emailHtml?: string;
  smsMessage?: string;
  data?: Record<string, unknown>;
};

// ─── CHANNEL AVAILABILITY ───────────────────────────────────────────────────

export function isEmailEnabled(): boolean {
  return !!process.env.SENDGRID_API_KEY && !!process.env.SENDGRID_FROM_EMAIL;
}

export function isSmsEnabled(): boolean {
  return !!ENV.twilioAccountSid && !!ENV.twilioAuthToken && !!ENV.twilioFromNumber;
}

export function getAvailableChannels(): NotificationChannel[] {
  const channels: NotificationChannel[] = ["in_app"];
  if (isEmailEnabled()) channels.push("email");
  if (isSmsEnabled()) channels.push("sms");
  return channels;
}

// ─── IN-APP NOTIFICATIONS ───────────────────────────────────────────────────

export async function createInAppNotification(input: {
  userId: number;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    data: input.data ?? null,
    isRead: false,
  });

  const notifId = result[0].insertId;

  // Queue for in_app channel
  await db.insert(notificationQueue).values({
    notificationId: notifId,
    channel: "in_app",
    status: "sent",
  });

  // Push real-time notification via WebSocket so the bell updates instantly
  broadcastToUser(input.userId, "notification", {
    id: notifId,
    type: input.type,
    title: input.title,
    body: input.body,
    data: input.data ?? null,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  return notifId;
}

export async function getUserNotifications(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  return result.length;
}

export async function markNotificationRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllRead(userId: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

// ─── EMAIL (SENDGRID) ──────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!isEmailEnabled()) {
    console.log("[Notification] Email not configured, skipping email send");
    return false;
  }

  try {
    const sgMail = await import("@sendgrid/mail");
    sgMail.default.setApiKey(process.env.SENDGRID_API_KEY!);

    await sgMail.default.send({
      to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL!,
        name: process.env.SENDGRID_FROM_NAME || "Soapies",
      },
      subject,
      html,
    });

    console.log(`[Notification] Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error("[Notification] Email send failed:", error);
    return false;
  }
}

// ─── SMS (TWILIO) ───────────────────────────────────────────────────────────

async function sendSms(to: string, message: string, userId?: number): Promise<boolean> {
  if (!isSmsEnabled()) {
    console.log("[Notification] SMS not configured, skipping SMS send");
    return false;
  }

  const db = await getDb();

  try {
    const twilio = await import("twilio");
    const client = twilio.default(ENV.twilioAccountSid, ENV.twilioAuthToken);

    const result = await client.messages.create({
      body: message,
      from: ENV.twilioFromNumber,
      to,
    });

    // Log to sms_notifications table
    if (db) {
      await db.insert(smsNotifications).values({
        userId: userId ?? null,
        phone: to,
        message,
        status: "sent",
        externalId: result.sid,
        sentAt: new Date(),
      });
    }

    console.log(`[Notification] SMS sent to ${to}: ${result.sid}`);
    return true;
  } catch (error) {
    console.error("[Notification] SMS send failed:", error);

    // Log failure
    if (db) {
      await db.insert(smsNotifications).values({
        userId: userId ?? null,
        phone: to,
        message,
        status: "failed",
        externalId: null,
      });
    }

    return false;
  }
}

// ─── UNIFIED SEND ───────────────────────────────────────────────────────────

export async function sendNotification(input: SendNotificationInput): Promise<{
  inApp: boolean;
  email: boolean;
  sms: boolean;
}> {
  const channels = input.channels ?? ["in_app", "email", "sms"];
  const results = { inApp: false, email: false, sms: false };
  const prefs = input.category ? await getChannelPreferences(input.userId, input.category) : null;

  const allowChannel = (channel: NotificationChannel | "push") => {
    if (!prefs) return true;
    if (channel === "in_app") return prefs.inApp;
    if (channel === "email") return prefs.email;
    if (channel === "sms") return prefs.sms;
    return prefs.push;
  };

  // In-app notification (always)
  if (channels.includes("in_app") && allowChannel("in_app")) {
    try {
      await createInAppNotification({
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data,
      });
      results.inApp = true;
    } catch (error) {
      console.error("[Notification] In-app notification failed:", error);
    }
  }

  // Email notification
  if (channels.includes("email") && input.email && allowChannel("email")) {
    const emailHtml = (input.data as any)?.emailHtml || buildDefaultEmailHtml(input.title, input.body);
    const emailSubject = (input.data as any)?.emailSubject || input.title;
    results.email = await sendEmail(input.email, emailSubject, emailHtml);

    // Queue record
    const db = await getDb();
    if (db) {
      await db.insert(notificationQueue).values({
        channel: "email",
        status: results.email ? "sent" : "failed",
      });
    }
  }

  // SMS notification
  if (channels.includes("sms") && input.phone && allowChannel("sms")) {
    const smsMessage = (input.data as any)?.smsMessage || `${input.title}: ${input.body}`;
    results.sms = await sendSms(input.phone, smsMessage, input.userId);

    // Queue record
    const db = await getDb();
    if (db) {
      await db.insert(notificationQueue).values({
        channel: "sms",
        status: results.sms ? "sent" : "failed",
      });
    }
  }

  // Web push notifications
  try {
    const { sendPushNotification } = await import("./services/webpush");
    const dbInstance = await getDb();
    if (dbInstance) {
      const { getPushSubscriptions, deletePushSubscription } = await import("./db");
      const subs = await getPushSubscriptions(input.userId);
      for (const sub of subs) {
        if (!sub.p256dh || !sub.auth || !allowChannel("push")) continue;
        try {
          await sendPushNotification(sub.endpoint, sub.p256dh, sub.auth, input.title, input.body);
        } catch (err: any) {
          if (err.message === 'SUBSCRIPTION_EXPIRED') {
            await deletePushSubscription(sub.endpoint);
          }
        }
      }
    }
  } catch (err) {
    console.error("[Notification] Web push failed:", err);
  }

  return results;
}

async function getChannelPreferences(userId: number, category: string): Promise<{
  inApp: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
}> {
  const db = await getDb();
  if (!db) {
    return { inApp: true, email: true, sms: false, push: true };
  }

  const existing = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.category, category)
      )
    )
    .limit(1);

  const pref = existing[0];
  if (!pref) {
    return { inApp: true, email: true, sms: false, push: true };
  }

  return {
    inApp: pref.inApp !== false,
    email: pref.email !== false,
    sms: pref.sms === true,
    push: pref.push !== false,
  };
}

// ─── NOTIFICATION PREFERENCES ───────────────────────────────────────────────

export async function getUserPreferences(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));
}

export async function upsertPreference(
  userId: number,
  category: string,
  prefs: { inApp?: boolean; email?: boolean; sms?: boolean; push?: boolean }
) {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.category, category)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(notificationPreferences)
      .set(prefs)
      .where(eq(notificationPreferences.id, existing[0].id));
  } else {
    await db.insert(notificationPreferences).values({
      userId,
      category,
      inApp: prefs.inApp ?? true,
      email: prefs.email ?? true,
      sms: prefs.sms ?? false,
      push: prefs.push ?? true,
    });
  }
}

// ─── EMAIL TEMPLATES ────────────────────────────────────────────────────────

function buildDefaultEmailHtml(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fdf2f8; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(236, 72, 153, 0.1); }
    .logo { text-align: center; margin-bottom: 24px; }
    .logo img { width: 120px; height: auto; }
    .brand { text-align: center; font-size: 28px; font-weight: 800; color: #7c3aed; margin-bottom: 8px; }
    h1 { color: #1f2937; font-size: 22px; margin: 0 0 16px 0; text-align: center; }
    p { color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
    .divider { height: 3px; background: linear-gradient(to right, #ec4899, #7c3aed); border-radius: 2px; margin: 24px 0; }
    .footer { text-align: center; color: #9ca3af; font-size: 13px; margin-top: 32px; }
    .footer a { color: #ec4899; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="brand">Soapies</div>
      <div class="divider"></div>
      <h1>${title}</h1>
      <p>${body}</p>
      <div class="divider"></div>
      <div class="footer">
        <p>This is an automated message from Soapies.</p>
        <p><a href="#">Manage notification preferences</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── APPLICATION-SPECIFIC TEMPLATES ─────────────────────────────────────────

export function buildStaffAssignmentNotification(userName: string, eventTitle: string, shiftName: string): NotificationTemplate {
  return {
    type: "event_staff",
    title: "You've been assigned as event staff! 🎉",
    body: `Hi ${userName}, you've been assigned to help at "${eventTitle}" as a volunteer/staff member for the "${shiftName}" shift.`,
    emailSubject: `Staff Assignment — ${eventTitle}`,
    emailHtml: `<p>Hi ${userName},</p><p>You've been assigned as staff/volunteer for <strong>${eventTitle}</strong>, shift: <strong>${shiftName}</strong>.</p><p>Please arrive on time and check in with the event coordinator. Failure to show up without notice may affect your future event access.</p><p>See you there! 💕</p>`,
    smsMessage: `Hi ${userName}! You're assigned as staff for "${eventTitle}" (${shiftName} shift). Please arrive on time!`,
    data: { type: "event_staff" },
  };
}

export function buildApprovalNotification(userName: string): NotificationTemplate {
  return {
    type: "application_approved",
    title: "Welcome to Soapies! 🎉",
    body: `Congratulations ${userName}! Your application has been approved. You now have full access to all Soapies events, community features, and messaging. We can't wait to see you at our next event!`,
    emailSubject: "🎉 You're In! Welcome to Soapies",
    emailHtml: buildApprovalEmailHtml(userName),
    smsMessage: `🎉 ${userName}, your Soapies application is APPROVED! You now have full access. Check your dashboard for upcoming events!`,
    data: { status: "approved" },
  };
}

export function buildRejectionNotification(userName: string): NotificationTemplate {
  return {
    type: "application_rejected",
    title: "Application Update",
    body: `Hi ${userName}, thank you for your interest in Soapies. Unfortunately, we're unable to approve your application at this time. Feel free to reach out if you have any questions.`,
    emailSubject: "Soapies Application Update",
    emailHtml: buildRejectionEmailHtml(userName),
    smsMessage: `Hi ${userName}, your Soapies application has been reviewed. Please check your dashboard for details.`,
    data: { status: "rejected" },
  };
}

export function buildWaitlistNotification(userName: string): NotificationTemplate {
  return {
    type: "application_waitlisted",
    title: "You're on the Waitlist! ⏳",
    body: `Hi ${userName}, thanks for applying to Soapies! We've placed you on our waitlist. We'll notify you as soon as a spot opens up. In the meantime, keep an eye on our upcoming events!`,
    emailSubject: "⏳ You're on the Soapies Waitlist",
    emailHtml: buildWaitlistEmailHtml(userName),
    smsMessage: `Hi ${userName}, you're on the Soapies waitlist! We'll notify you when a spot opens. Stay tuned!`,
    data: { status: "waitlisted" },
  };
}

export function buildInterviewScheduleNotification(userName: string, scheduleUrl: string): NotificationTemplate {
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fdf2f8; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(236, 72, 153, 0.1); }
    .brand { text-align: center; font-size: 28px; font-weight: 800; color: #7c3aed; margin-bottom: 8px; }
    .divider { height: 3px; background: linear-gradient(to right, #ec4899, #7c3aed); border-radius: 2px; margin: 24px 0; }
    h1 { color: #1f2937; font-size: 22px; margin: 0 0 16px 0; text-align: center; }
    p { color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
    .cta { display: block; text-align: center; background: linear-gradient(135deg, #ec4899, #7c3aed); color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; margin: 24px auto; max-width: 280px; }
    .footer { text-align: center; color: #9ca3af; font-size: 13px; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="brand">Soapies</div>
      <div class="divider"></div>
      <h1>🎉 Great News, ${userName}!</h1>
      <p>Your application passed our initial review! The next step is a short intro call so we can get to know you better.</p>
      <p>Please click the button below to schedule your intro call at a time that works for you:</p>
      <a href="${scheduleUrl}" class="cta">Schedule My Call</a>
      <p style="font-size: 14px; color: #9ca3af;">The call is quick (about 15-30 minutes) and gives us a chance to answer any questions you might have about the community.</p>
      <div class="divider"></div>
      <div class="footer"><p>Questions? Reply to this email. We're excited to meet you! 💖</p></div>
    </div>
  </div>
</body>
</html>`;

  return {
    type: "interview_scheduled",
    title: "Schedule Your Soapies Interview 🎉",
    body: `Great news ${userName}! Your application passed initial review. Please schedule your intro call to move to the next step.`,
    emailSubject: "Schedule Your Soapies Interview",
    emailHtml,
    smsMessage: `🎉 ${userName}, your Soapies app passed initial review! Schedule your intro call: ${scheduleUrl}`,
    data: { phase: "interview_scheduled", scheduleUrl },
  };
}

function buildApprovalEmailHtml(userName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fdf2f8; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(236, 72, 153, 0.1); }
    .brand { text-align: center; font-size: 32px; font-weight: 800; color: #7c3aed; margin-bottom: 8px; }
    .tagline { text-align: center; color: #ec4899; font-size: 14px; margin-bottom: 24px; letter-spacing: 2px; text-transform: uppercase; }
    .divider { height: 3px; background: linear-gradient(to right, #ec4899, #7c3aed); border-radius: 2px; margin: 24px 0; }
    .celebration { text-align: center; font-size: 48px; margin: 16px 0; }
    h1 { color: #1f2937; font-size: 24px; margin: 0 0 16px 0; text-align: center; }
    p { color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 16px 0; }
    .highlight { background: linear-gradient(135deg, #fdf2f8, #ede9fe); border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #ec4899; }
    .highlight p { margin: 0; font-weight: 600; color: #7c3aed; }
    .cta { display: block; text-align: center; background: linear-gradient(135deg, #ec4899, #7c3aed); color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; margin: 24px auto; max-width: 280px; }
    .features { display: flex; gap: 12px; margin: 20px 0; flex-wrap: wrap; }
    .feature { flex: 1; min-width: 140px; background: #fdf2f8; border-radius: 10px; padding: 16px; text-align: center; }
    .feature-icon { font-size: 24px; margin-bottom: 8px; }
    .feature-text { font-size: 13px; color: #6b7280; font-weight: 600; }
    .footer { text-align: center; color: #9ca3af; font-size: 13px; margin-top: 32px; }
    .footer a { color: #ec4899; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="brand">Soapies</div>
      <div class="tagline">Exclusive Community</div>
      <div class="divider"></div>
      <div class="celebration">🎉🥳🎊</div>
      <h1>Welcome to the Family, ${userName}!</h1>
      <p>Your application has been <strong style="color: #059669;">approved</strong>! You now have full access to everything Soapies has to offer.</p>
      <div class="highlight">
        <p>Your membership is now active. Explore events, connect with members, and join the community!</p>
      </div>
      <div style="display: flex; gap: 12px; margin: 20px 0; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 140px; background: #fdf2f8; border-radius: 10px; padding: 16px; text-align: center;">
          <div style="font-size: 24px; margin-bottom: 8px;">🎪</div>
          <div style="font-size: 13px; color: #6b7280; font-weight: 600;">Exclusive Events</div>
        </div>
        <div style="flex: 1; min-width: 140px; background: #ede9fe; border-radius: 10px; padding: 16px; text-align: center;">
          <div style="font-size: 24px; margin-bottom: 8px;">💬</div>
          <div style="font-size: 13px; color: #6b7280; font-weight: 600;">Private Messaging</div>
        </div>
        <div style="flex: 1; min-width: 140px; background: #fdf2f8; border-radius: 10px; padding: 16px; text-align: center;">
          <div style="font-size: 24px; margin-bottom: 8px;">🌟</div>
          <div style="font-size: 13px; color: #6b7280; font-weight: 600;">Community Wall</div>
        </div>
      </div>
      <p>Head to your dashboard to browse upcoming events and start connecting with other members.</p>
      <div class="divider"></div>
      <div class="footer">
        <p>Welcome aboard! 💖</p>
        <p><a href="#">Manage notification preferences</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildRejectionEmailHtml(userName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fdf2f8; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(236, 72, 153, 0.1); }
    .brand { text-align: center; font-size: 32px; font-weight: 800; color: #7c3aed; margin-bottom: 24px; }
    .divider { height: 3px; background: linear-gradient(to right, #ec4899, #7c3aed); border-radius: 2px; margin: 24px 0; }
    h1 { color: #1f2937; font-size: 22px; margin: 0 0 16px 0; text-align: center; }
    p { color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 16px 0; }
    .footer { text-align: center; color: #9ca3af; font-size: 13px; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="brand">Soapies</div>
      <div class="divider"></div>
      <h1>Application Update</h1>
      <p>Hi ${userName},</p>
      <p>Thank you for your interest in joining Soapies. After careful review, we're unable to approve your application at this time.</p>
      <p>We appreciate your understanding and encourage you to reach out if you have any questions.</p>
      <div class="divider"></div>
      <div class="footer">
        <p>Thank you for your interest in Soapies.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildWaitlistEmailHtml(userName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fdf2f8; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(236, 72, 153, 0.1); }
    .brand { text-align: center; font-size: 32px; font-weight: 800; color: #7c3aed; margin-bottom: 24px; }
    .divider { height: 3px; background: linear-gradient(to right, #ec4899, #7c3aed); border-radius: 2px; margin: 24px 0; }
    .icon { text-align: center; font-size: 48px; margin: 16px 0; }
    h1 { color: #1f2937; font-size: 22px; margin: 0 0 16px 0; text-align: center; }
    p { color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 16px 0; }
    .highlight { background: linear-gradient(135deg, #fef3c7, #fdf2f8); border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b; }
    .highlight p { margin: 0; font-weight: 600; color: #92400e; }
    .footer { text-align: center; color: #9ca3af; font-size: 13px; margin-top: 32px; }
    .footer a { color: #ec4899; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="brand">Soapies</div>
      <div class="divider"></div>
      <div class="icon">⏳</div>
      <h1>You're on the Waitlist!</h1>
      <p>Hi ${userName},</p>
      <p>Thanks for applying to Soapies! We've received your application and placed you on our waitlist.</p>
      <div class="highlight">
        <p>We'll notify you as soon as a spot opens up. Hang tight!</p>
      </div>
      <p>In the meantime, keep an eye on our upcoming events — you won't want to miss out!</p>
      <div class="divider"></div>
      <div class="footer">
        <p>Stay tuned! 💖</p>
        <p><a href="#">Manage notification preferences</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
