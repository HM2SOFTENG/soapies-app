import { useState, useEffect } from 'react';
import { trpc } from '../lib/trpc';

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { data: vapidKey } = trpc.notifications.getVapidPublicKey.useQuery();
  const saveSubMut = trpc.notifications.savePushSubscription.useMutation();

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window);
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
  }, []);

  async function subscribe() {
    if (!vapidKey || !supported) return;

    const reg = await navigator.serviceWorker.register('/sw.js');
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== 'granted') return;

    // Convert VAPID key from base64url to Uint8Array
    const key = Uint8Array.from(
      atob(vapidKey.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0)
    );

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key,
    });

    const json = sub.toJSON();
    const endpoint = json.endpoint ?? '';
    const p256dh = json.keys?.p256dh ?? '';
    const auth = json.keys?.auth ?? '';

    await saveSubMut.mutateAsync({ endpoint, p256dh, auth });
  }

  return { supported, permission, subscribe, isPending: saveSubMut.isPending };
}
