// Marketing campaigns API — seasonal reminders, re-engagement, referrals
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendSMS } from '@/lib/sms';

export async function GET(req: Request) {
  const biz = new URL(req.url).searchParams.get('business_id');
  if (!biz) return NextResponse.json({ error: 'business_id required' }, { status: 400 });
  const { data } = await getDb().from('campaigns').select('*').eq('business_id', biz);
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await getDb().from('campaigns').insert({
    business_id: body.business_id, type: body.type, title: body.title,
    message_template: body.message_template, trigger_days: body.trigger_days || 90,
    channel: body.channel || 'sms', is_active: true,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  if (body.action === 'run') {
    // Execute campaign: find customers who haven't booked in trigger_days
    const campaign = (await getDb().from('campaigns').select('*').eq('id', body.id).single()).data;
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    const since = new Date();
    since.setDate(since.getDate() - campaign.trigger_days);

    const { data: customers } = await getDb()
      .from('bookings').select('customer_name, customer_phone')
      .eq('business_id', campaign.business_id)
      .lt('created_at', since.toISOString())
      .limit(50);

    let sent = 0;
    const seen = new Set();
    for (const c of customers || []) {
      if (seen.has(c.customer_phone)) continue;
      seen.add(c.customer_phone);
      const msg = campaign.message_template.replace('{{name}}', c.customer_name);
      await sendSMS(c.customer_phone, msg);
      await getDb().from('campaign_sends').insert({ campaign_id: campaign.id, customer_phone: c.customer_phone, status: 'sent', sent_at: new Date().toISOString() });
      sent++;
    }

    await getDb().from('campaigns').update({ last_run_at: new Date().toISOString() }).eq('id', campaign.id);
    return NextResponse.json({ ok: true, sent, total: customers?.length || 0 });
  }
}
