// Subscription plans API — recurring billing for maintenance plans
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: Request) {
  const biz = new URL(req.url).searchParams.get('business_id');
  if (!biz) return NextResponse.json({ error: 'business_id required' }, { status: 400 });
  const { data } = await getDb().from('subscription_plans').select('*').eq('business_id', biz).eq('is_active', true);
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await getDb().from('subscription_plans').insert({
    business_id: body.business_id, name: body.name, description: body.description || '',
    price: body.price, interval: body.interval, is_active: true,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Create Stripe price if configured
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const Stripe = require('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const product = await stripe.products.create({ name: body.name, description: body.description });
      const price = await stripe.prices.create({ product: product.id, unit_amount: Math.round(body.price * 100), currency: 'usd', recurring: { interval: body.interval } });
      await getDb().from('subscription_plans').update({ stripe_price_id: price.id }).eq('id', data.id);
    } catch (e) { /* Stripe optional */ }
  }

  return NextResponse.json({ data }, { status: 201 });
}
