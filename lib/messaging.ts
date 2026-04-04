import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { app } from './firebase';

let _messaging: Messaging | null = null;

function getMsg(): Messaging | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!_messaging) _messaging = getMessaging(app);
    return _messaging;
  } catch {
    return null;
  }
}

/**
 * Request notification permission and return an FCM token for this device.
 * Returns null if permission is denied, not supported, or VAPID key is missing.
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) return null;
    if (!('serviceWorker' in navigator)) return null;

    // Register the FCM service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    const msg = getMsg();
    if (!msg) return null;

    const token = await getToken(msg, { vapidKey, serviceWorkerRegistration: registration });
    return token || null;
  } catch (e) {
    console.error('FCM token error:', e);
    return null;
  }
}

/**
 * Listen for push messages while the app is in the foreground.
 * Returns an unsubscribe function.
 */
export function onForegroundMessage(
  callback: (payload: { notification?: { title?: string; body?: string } }) => void
): () => void {
  const msg = getMsg();
  if (!msg) return () => {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return onMessage(msg, callback as any);
}
