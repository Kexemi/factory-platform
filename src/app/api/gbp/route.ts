// Google Business Profile integration API
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: Request) {
  const biz = new URL(req.url).searchParams.get('business_id');
  if (!biz) return NextResponse.json({ error: 'business_id required' }, { status: 400 });
  const { data } = await getDb().from('gbp_posts').select('*').eq('business_id', biz).order('created_at', { ascending: false }).limit(20);
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await getDb().from('gbp_posts').insert({
    business_id: body.business_id, content: body.content,
    media_url: body.media_url || null, cta_type: body.cta_type || null,
    cta_url: body.cta_url || null, status: 'draft',
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
