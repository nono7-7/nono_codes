/**
 * Native Web Push — no Firebase SDK imports.
 *
 * Uses the standard PushManager API directly, which is supported on:
 * - Chrome/Edge/Firefox on all platforms
 * - Safari 16+ on macOS
 * - Safari 16.4+ on iOS (when installed as a PWA)
 *
 * Crucially, this does NOT import firebase/messaging, which caused
 * iOS Safari crashes due to module-level side effects.
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Request notification permission and subscribe to Web Push.
 * Returns the full PushSubscription object, or null if not supported / denied.
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  try {
    if (typeof window === 'undefined') return null;
    if (!('serviceWorker' in navigator)) return null;
    if (!('PushManager' in window)) return null;

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) return null;

    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    const existing = await registration.pushManager.getSubscription();
    if (existing) return existing;

    // Subscribe
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as ArrayBuffer,
    });

    return subscription;
  } catch {
    return null;
  }
}

/**
 * Unsubscribe from Web Push for this device.
 */
export async function unsubscribeFromPush(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
  } catch { /* non-fatal */ }
}

/**
 * Listen for push messages forwarded from the service worker while the app
 * is in the foreground. Returns an unsubscribe function.
 */
export function onForegroundMessage(
  callback: (payload: { notification?: { title?: string; body?: string } }) => void
): () => void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => {};

  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'PUSH_RECEIVED') {
      callback({ notification: event.data.notification });
    }
  };

  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}
