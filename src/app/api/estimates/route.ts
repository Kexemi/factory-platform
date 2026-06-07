// Photo estimates API — upload photos, AI generates estimate
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendSMS } from '@/lib/sms';

export async function POST(req: Request) {
  const body = await req.json();
  const { business_id, customer_name, customer_phone, service_category, photo_urls } = body;
  if (!business_id || !customer_name || !customer_phone) {
    return NextResponse.json({ error: 'business_id, customer_name, customer_phone required' }, { status: 400 });
  }

  // Generate AI estimate
  const { generateEstimateFromPhotos } = await import('@/lib/estimates');
  const estimate = await generateEstimateFromPhotos(photo_urls || [], service_category || 'General');

  // Save to DB
  const { data, error } = await getDb().from('estimates').insert({
    business_id, customer_name, customer_phone,
    service_category: service_category || null,
    photo_urls: photo_urls || [],
    ai_description: estimate.description,
    suggested_price: estimate.suggested,
    status: 'pending',
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify business owner
  const biz = await (await getDb().from('businesses').select('*').eq('id', business_id).single()).data;
  if (biz?.phone) {
    await sendSMS(biz.phone,
      `New estimate request from ${customer_name}! ${customer_phone} — ${service_category || 'General'}${estimate.suggested ? ' ~$' + estimate.suggested : ''}`);
  }

  return NextResponse.json({ data, estimate }, { status: 201 });
}
