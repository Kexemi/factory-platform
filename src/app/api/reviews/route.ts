// Reviews API — real Google Reviews + auto review requests
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const biz = searchParams.get('business_id');
  if (!biz) return NextResponse.json({ error: 'business_id required' }, { status: 400 });
  const { data } = await getDb().from('reviews').select('*').eq('business_id', biz).order('created_at', { ascending: false }).limit(50);
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await getDb().from('reviews').insert({
    business_id: body.business_id, customer_name: body.customer_name,
    customer_phone: body.customer_phone, rating: body.rating, text: body.text,
    source: 'website', is_published: false,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-generate review request SMS
  if (body.customer_phone && body.business_id) {
    const biz = await getDb().from('businesses').select('*').eq('id', body.business_id).single();
    if (biz.data?.phone) {
      const { sendSMS } = await import('@/lib/sms');
      await sendSMS(biz.data.phone, `New review from ${body.customer_name}: ${body.rating}★ "${body.text.slice(0, 100)}"`);
    }
  }

  return NextResponse.json({ data }, { status: 201 });
}
