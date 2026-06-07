// Daily digest cron — sends each business a summary of yesterday's activity
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendSMS } from '@/lib/sms';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Verify cron secret
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const start = yesterday.toISOString().slice(0, 10) + 'T00:00:00';
  const end = yesterday.toISOString().slice(0, 10) + 'T23:59:59';

  const { data: businesses } = await getDb().from('businesses').select('*').eq('is_active', true);
  let sent = 0;

  for (const biz of businesses || []) {
    const { data: bookings } = await getDb()
      .from('bookings').select('*')
      .eq('business_id', biz.id)
      .gte('created_at', start).lte('created_at', end);

    const { data: estimates } = await getDb()
      .from('estimates').select('*')
      .eq('business_id', biz.id)
      .gte('created_at', start).lte('created_at', end);

    if (!bookings?.length && !estimates?.length) continue; // skip quiet days

    const msg = `📊 ${biz.name} — Yesterday's Summary
• Bookings: ${bookings?.length || 0}
• Estimates: ${estimates?.length || 0}
${bookings?.length ? '• Latest: ' + bookings[0]?.customer_name + ' — ' + bookings[0]?.service : ''}

View all: ${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?biz=${biz.slug}`;

    if (biz.phone) {
      await sendSMS(biz.phone, msg);
      sent++;
    }
  }

  return NextResponse.json({ ok: true, digests_sent: sent });
}
