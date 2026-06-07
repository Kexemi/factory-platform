/**
 * Booking history API — returns bookings for a business.
 */
import { NextResponse } from 'next/server';

let supabase: any = null;
function getDb() {
  if (supabase) return supabase;
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  return supabase;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get('business_id');
  
  if (!businessId) {
    return NextResponse.json({ error: 'business_id required' }, { status: 400 });
  }

  const db = getDb();
  const { data, error } = await db
    .from('bookings')
    .select('*')
    .eq('business_id', parseInt(businessId))
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const body = await request.json();
  const db = getDb();
  
  const { data, error } = await db.from('bookings').insert({
    business_id: body.business_id,
    customer_name: body.customer_name,
    customer_phone: body.customer_phone,
    customer_email: body.customer_email || null,
    service: body.service,
    booking_time: body.booking_time || null,
    notes: body.notes || null,
    source: body.source || 'website',
  }).select().single();
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
