/**
 * Business management API endpoints.
 * CRUD for the 71 businesses in our system.
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

// GET /api/businesses — list all or filter by category
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const slug = searchParams.get('slug');
  
  const db = getDb();
  let query = db.from('businesses').select('*');
  
  if (slug) query = query.eq('slug', slug);
  if (category) query = query.eq('category', category);
  
  query = query.order('name');
  
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST /api/businesses — create a new business entry
export async function POST(request: Request) {
  const body = await request.json();
  const db = getDb();
  
  const { data, error } = await db.from('businesses').insert({
    slug: body.slug,
    name: body.name,
    category: body.category,
    phone: body.phone || null,
    email: body.email || null,
    website: body.website || null,
    address: body.address || null,
    notes: body.notes || null,
    cal_event_slug: body.cal_event_slug || null,
    is_active: true,
  }).select().single();
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
