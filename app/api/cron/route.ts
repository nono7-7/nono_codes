/**
 * Vercel Cron Job — Daily Push Notification Reminders
 *
 * Runs once per day at 8am UTC (configured in vercel.json).
 * Queries Firestore for planned interactions due today or in 2 days,
 * then sends FCM push notifications to all of the user's registered devices.
 *
 * Auth: protected by CRON_SECRET env var (set in Vercel dashboard).
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// ── Firebase Admin init ─────────────────────────────────────────────
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

// ── Route handler ───────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization');
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminDB();

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const twoDaysStr = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Query all non-completed notifications due today or in 2 days
  const snapshot = await db.collection('notifications')
    .where('completed', '==', false)
    .where('date', 'in', [todayStr, twoDaysStr])
    .get();

  if (snapshot.empty) {
    return NextResponse.json({ sent: 0, message: 'No reminders due' });
  }

  // Group notifications by uid
  const byUid: Record<string, {
    contactName: string;
    description: string;
    date: string;
    daysAway: number;
  }[]> = {};

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const uid = data.uid as string;

    // Check if user has notifications enabled
    const settingsSnap = await db.doc(`users/${uid}/settings/app`).get();
    const notifsEnabled = settingsSnap.exists
      ? settingsSnap.data()?.emailNotificationsEnabled !== false
      : true;
    if (!notifsEnabled) continue;

    if (!byUid[uid]) byUid[uid] = [];
    byUid[uid].push({
      contactName: data.contactName,
      description: data.description,
      date: data.date,
      daysAway: data.date === todayStr ? 0 : 2,
    });
  }

  // Send push notification to each user's registered devices
  let sent = 0;
  for (const [uid, items] of Object.entries(byUid)) {
    // Get all FCM tokens for this user (one per device)
    const tokensSnap = await db.collection(`users/${uid}/tokens`).get();
    const tokens = tokensSnap.docs.map((d) => d.data().token as string).filter(Boolean);
    if (tokens.length === 0) continue;

    // Sort: today first
    items.sort((a, b) => a.daysAway - b.daysAway);

    const title = 'InTouch Reminder';
    const body = items.length === 1
      ? `${items[0].contactName}: ${items[0].description} — ${items[0].daysAway === 0 ? 'today' : 'in 2 days'}`
      : `${items.length} upcoming interactions`;

    try {
      await getMessaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        webpush: {
          notification: {
            title,
            body,
            icon: '/icons/icon-192.svg',
            badge: '/icons/icon-192.svg',
          },
          fcmOptions: { link: '/' },
        },
      });
      sent++;
    } catch (e) {
      console.error(`Push failed for uid ${uid}:`, e);
    }
  }

  return NextResponse.json({ sent, message: `Sent push to ${sent} user(s)` });
}
