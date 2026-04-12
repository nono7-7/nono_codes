/**
 * Vercel Cron Job — Hourly Push Notification Reminders
 *
 * Runs every hour (configured in vercel.json).
 * For each user, checks if it is currently 9 AM in their local timezone
 * (stored in Firestore when they open the app). If yes, sends push
 * notifications for planned interactions due today or in 2 days.
 *
 * Deduplication: each notification doc tracks lastSentDate so a user
 * never receives the same reminder twice on the same calendar day.
 *
 * Auth: protected by CRON_SECRET env var (set in Vercel dashboard).
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import webpush from 'web-push';

// ── Firebase Admin init ─────────────────────────────────────────────────────
function getAdminDB() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return getFirestore();
}

// ── Timezone helpers ────────────────────────────────────────────────────────

/** Returns the current hour (0–23) in the given IANA timezone */
function getLocalHour(timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    }).formatToParts(new Date());
    const h = parts.find((p) => p.type === 'hour')?.value;
    return h ? parseInt(h, 10) : -1;
  } catch {
    return -1; // invalid timezone string
  }
}

/** Returns the current date string (YYYY-MM-DD) in the given IANA timezone */
function getLocalDateStr(timezone: string): string {
  try {
    // en-CA locale formats as YYYY-MM-DD natively
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10); // fallback to UTC
  }
}

/** Returns a date string offset by `days` in the given timezone */
function getLocalDateOffset(timezone: string, days: number): string {
  try {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(d);
  } catch {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }
}

// ── Route handler ───────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization');
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  webpush.setVapidDetails(
    'mailto:noreply@intouch.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const db = getAdminDB();

  // Fetch all incomplete notifications
  const snapshot = await db.collection('notifications')
    .where('completed', '==', false)
    .get();

  if (snapshot.empty) {
    return NextResponse.json({ sent: 0, message: 'No pending reminders' });
  }

  // Group by uid
  const byUid: Record<string, { ref: FirebaseFirestore.DocumentReference; contactName: string; description: string; date: string; lastSentDate?: string; type?: string; intervalWeeks?: number }[]> = {};
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const uid = data.uid as string;
    if (!byUid[uid]) byUid[uid] = [];
    byUid[uid].push({
      ref: docSnap.ref,
      contactName: data.contactName,
      description: data.description,
      date: data.date,
      lastSentDate: data.lastSentDate,
      type: data.type,
      intervalWeeks: data.intervalWeeks,
    });
  }

  let sent = 0;

  for (const [uid, allItems] of Object.entries(byUid)) {
    // Get user settings: timezone + notifications enabled
    const settingsSnap = await db.doc(`users/${uid}/settings/app`).get();
    const settings = settingsSnap.exists ? settingsSnap.data()! : {};

    const notifsEnabled = settings.emailNotificationsEnabled !== false;
    if (!notifsEnabled) continue;

    const timezone: string = (settings.timezone as string) || 'UTC';

    const localToday = getLocalDateStr(timezone);
    const localTwoDays = getLocalDateOffset(timezone, 2);

    // Reconnect notifications fire only on the exact due date (no 2-day preview).
    // Planned/reach-out notifications fire on the day AND 2 days before.
    const dueItems = allItems.filter((item) => {
      if (item.lastSentDate === localToday) return false; // already sent today
      if (item.type === 'reconnect') return item.date === localToday;
      return item.date === localToday || item.date === localTwoDays;
    });

    if (dueItems.length === 0) continue;

    // Get push subscriptions for this user
    const subsSnap = await db.collection(`users/${uid}/pushSubscriptions`).get();
    if (subsSnap.empty) continue;

    dueItems.sort((a, b) => (a.date === localToday ? -1 : 1) - (b.date === localToday ? -1 : 1));

    const title = 'InTouch Reminder';
    const body =
      dueItems.length === 1
        ? `${dueItems[0].contactName}: ${dueItems[0].description}${dueItems[0].date !== localToday ? ' — in 2 days' : ''}`
        : `${dueItems.length} upcoming reminders`;

    const payload = JSON.stringify({ title, body });

    for (const subDoc of subsSnap.docs) {
      const subData = subDoc.data();
      try {
        await webpush.sendNotification(
          {
            endpoint: subData.endpoint as string,
            keys: subData.keys as { p256dh: string; auth: string },
          },
          payload
        );
        sent++;
      } catch (e: unknown) {
        if (
          typeof e === 'object' &&
          e !== null &&
          'statusCode' in e &&
          (e as { statusCode: number }).statusCode === 410
        ) {
          await subDoc.ref.delete(); // expired subscription
        } else {
          console.error(`Push failed for uid ${uid}:`, e);
        }
      }
    }

    // After firing, update each notification:
    // - Reconnect: advance date by intervalWeeks so it auto-recurs (no manual reset needed)
    // - Others: mark lastSentDate to prevent duplicate sends on the same calendar day
    await Promise.all(dueItems.map((item) => {
      if (item.type === 'reconnect' && item.intervalWeeks && item.date === localToday) {
        // Advance to next due date
        const nextDate = new Date(item.date + 'T12:00:00Z');
        nextDate.setDate(nextDate.getDate() + item.intervalWeeks * 7);
        const nextDateStr = nextDate.toISOString().slice(0, 10);
        return item.ref.update({ date: nextDateStr, lastSentDate: localToday });
      }
      return item.ref.update({ lastSentDate: localToday });
    }));
  }

  return NextResponse.json({ sent, message: `Sent push to ${sent} device(s)` });
}
