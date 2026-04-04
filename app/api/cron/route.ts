/**
 * Vercel Cron Job — Daily Email Reminders
 *
 * Runs once per day at 8am UTC (configured in vercel.json).
 * Queries Firestore for planned interactions due today or in 2 days,
 * then sends targeted reminder emails via Resend.
 *
 * Auth: protected by CRON_SECRET env var (set in Vercel dashboard).
 * Users can opt out via emailNotificationsEnabled in their AppSettings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Resend } from 'resend';

// ── Firebase Admin init (server-side only) ──────────────────────────
function getAdminDB() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Vercel env vars can't have newlines — replace \\n with \n
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return getFirestore();
}

// ── Email HTML template ─────────────────────────────────────────────
function buildEmailHtml(items: { contactName: string; description: string; date: string; daysAway: number }[]) {
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const rows = items.map((item) => {
    const label = item.daysAway === 0 ? 'Today' : 'In 2 days';
    const dateStr = new Date(item.date + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
          <strong style="color:#111;">${item.contactName}</strong><br/>
          <span style="color:#555;font-size:14px;">${item.description}</span><br/>
          <span style="color:#8B7355;font-size:13px;font-weight:600;">${label} — ${dateStr}</span>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"/></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9f9f7;margin:0;padding:20px;">
      <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee;">
        <div style="background:#111;padding:20px 24px;">
          <span style="color:#C8B89A;font-size:20px;font-weight:700;letter-spacing:-0.5px;">InTouch</span>
        </div>
        <div style="padding:24px;">
          <p style="color:#555;font-size:14px;margin:0 0 4px;">
            ${today}
          </p>
          <h2 style="color:#111;font-size:18px;font-weight:700;margin:0 0 20px;">
            Upcoming ${items.length === 1 ? 'Interaction' : 'Interactions'}
          </h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0;">
            ${rows}
          </table>
          <p style="color:#999;font-size:12px;margin:20px 0 0;line-height:1.6;">
            You're receiving this because you enabled email reminders in InTouch.<br/>
            To turn these off, open <strong>Settings → Features → Email Notifications</strong>.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ── Route handler ───────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const secret = req.headers.get('authorization');
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
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

  // Group notifications by user email
  const byEmail: Record<string, {
    contactName: string;
    description: string;
    date: string;
    daysAway: number;
  }[]> = {};

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();

    // Check if user has email notifications enabled
    // We store this preference in users/{uid}/settings
    const settingsSnap = await db.doc(`users/${data.uid}/settings/app`).get();
    const emailEnabled = settingsSnap.exists
      ? settingsSnap.data()?.emailNotificationsEnabled !== false
      : true; // default to true if no setting stored

    if (!emailEnabled) continue;

    const email = data.userEmail as string;
    if (!byEmail[email]) byEmail[email] = [];
    byEmail[email].push({
      contactName: data.contactName,
      description: data.description,
      date: data.date,
      daysAway: data.date === todayStr ? 0 : 2,
    });
  }

  // Send one email per user (digest of all their due items)
  let sent = 0;
  for (const [email, items] of Object.entries(byEmail)) {
    // Sort: today first, then 2-day reminders
    items.sort((a, b) => a.daysAway - b.daysAway);

    const subject = items.length === 1
      ? `InTouch reminder: ${items[0].contactName} ${items[0].daysAway === 0 ? 'today' : 'in 2 days'}`
      : `InTouch: ${items.length} upcoming interactions`;

    await resend.emails.send({
      from: 'InTouch <onboarding@resend.dev>', // swap for your verified domain when ready
      to: email,
      subject,
      html: buildEmailHtml(items),
    });

    sent++;
  }

  return NextResponse.json({ sent, message: `Sent ${sent} reminder email(s)` });
}
