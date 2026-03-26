import webpush from 'web-push';
import { ENV } from '../_core/env';

let initialized = false;

export function initWebPush() {
  if (!ENV.vapidPublicKey || !ENV.vapidPrivateKey || initialized) return;
  webpush.setVapidDetails(`mailto:${ENV.vapidEmail}`, ENV.vapidPublicKey, ENV.vapidPrivateKey);
  initialized = true;
}

export async function sendPushNotification(
  endpoint: string,
  p256dh: string,
  auth: string,
  title: string,
  body: string,
  url?: string
) {
  initWebPush();
  if (!ENV.vapidPublicKey) return; // not configured

  const subscription = {
    endpoint,
    keys: { p256dh, auth },
  };

  try {
    await webpush.sendNotification(subscription, JSON.stringify({ title, body, url }));
  } catch (err: any) {
    if (err.statusCode === 410) {
      // Subscription expired — caller should delete it
      throw new Error('SUBSCRIPTION_EXPIRED');
    }
    throw err;
  }
}
