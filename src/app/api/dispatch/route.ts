// Dispatch API — multi-tech scheduling and route management
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const biz = searchParams.get('business_id');
  const date = searchParams.get('date');
  if (!biz) return NextResponse.json({ error: 'business_id required' }, { status: 400 });

  let query = getDb().from('dispatch').select('*, technicians(*), bookings(*)').eq('business_id', biz);
  if (date) query = query.gte('scheduled_start', date + 'T00:00:00').lte('scheduled_start', date + 'T23:59:59');
  const { data } = await query.order('scheduled_start');
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await getDb().from('dispatch').insert({
    business_id: body.business_id, booking_id: body.booking_id,
    technician_id: body.technician_id, scheduled_start: body.scheduled_start,
    scheduled_end: body.scheduled_end, customer_notes: body.customer_notes,
    status: 'pending',
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify technician via SMS
  if (body.technician_id) {
    const tech = await (await getDb().from('technicians').select('*').eq('id', body.technician_id).single()).data;
    if (tech?.phone) {
      const { sendSMS } = await import('@/lib/sms');
      await sendSMS(tech.phone, `New job assigned: ${body.scheduled_start?.slice(0, 16) || 'TBD'}. Check dashboard for details.`);
    }
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { data, error } = await getDb().from('dispatch').update(body).eq('id', body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If completed, auto-request review
  if (body.status === 'completed' && data.booking_id) {
    const booking = await (await getDb().from('bookings').select('*').eq('id', data.booking_id).single()).data;
    if (booking?.customer_phone) {
      const { sendSMS } = await import('@/lib/sms');
      await sendSMS(booking.customer_phone, `How was your service? Leave a review: ${process.env.NEXT_PUBLIC_SITE_URL}/review?biz=${data.business_id}&booking=${data.booking_id}`);
    }
  }

  return NextResponse.json({ data });
}
