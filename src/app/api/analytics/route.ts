// Business analytics API — bookings, revenue, conversions, traffic
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const biz = searchParams.get('business_id');
  const days = parseInt(searchParams.get('days') || '30');
  if (!biz) return NextResponse.json({ error: 'business_id required' }, { status: 400 });

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Bookings over time
  const { data: bookings } = await getDb()
    .from('bookings').select('created_at, service, customer_name')
    .eq('business_id', biz)
    .gte('created_at', since.toISOString())
    .order('created_at');

  // Estimates
  const { data: estimates } = await getDb()
    .from('estimates').select('created_at, suggested_price, status')
    .eq('business_id', biz)
    .gte('created_at', since.toISOString());

  // Reviews
  const { data: reviews } = await getDb()
    .from('reviews').select('rating, created_at')
    .eq('business_id', biz)
    .gte('created_at', since.toISOString());

  // Active subscriptions
  const { data: subscriptions } = await getDb()
    .from('customer_subscriptions').select('count')
    .eq('business_id', biz)
    .eq('status', 'active');

  // Top services
  const serviceCount: Record<string, number> = {};
  for (const b of bookings || []) {
    serviceCount[b.service] = (serviceCount[b.service] || 0) + 1;
  }
  const topServices = Object.entries(serviceCount).sort((a: any, b: any) => b[1] - a[1]).slice(0, 10).map(([service, count]) => ({ service, count }));

  // Revenue from bookings (estimated if price available)
  const totalEstimates = estimates?.reduce((sum: number, e: any) => sum + (e.suggested_price || 0), 0) || 0;

  return NextResponse.json({
    period_days: days,
    total_bookings: bookings?.length || 0,
    total_estimates: estimates?.length || 0,
    estimates_value: totalEstimates,
    total_reviews: reviews?.length || 0,
    avg_rating: reviews?.length ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1) : null,
    active_subscriptions: (subscriptions as any)?.[0]?.count || 0,
    top_services: topServices,
    bookings_by_day: groupByDate(bookings),
  });
}

function groupByDate(items: any[] | null) {
  if (!items) return {};
  const groups: Record<string, number> = {};
  for (const item of items) {
    const day = item.created_at?.slice(0, 10);
    if (day) groups[day] = (groups[day] || 0) + 1;
  }
  return groups;
}
