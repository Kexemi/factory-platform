/**
 * PostHog analytics — event tracking for business owner dashboards.
 */
export function getAnalytics() {
  const { PostHog } = require('posthog-node');
  return new PostHog(process.env.POSTHOG_API_KEY || 'phc_placeholder');
}

export async function trackBooking(businessId: number, data: any) {
  try {
    const client = getAnalytics();
    client.capture({
      distinctId: `biz_${businessId}`,
      event: 'booking_created',
      properties: { business_id: businessId, service: data.service, ...data },
    });
    await client.shutdown();
  } catch (e) {
    // Analytics failure is non-blocking
  }
}

export async function trackPageView(businessSlug: string, source?: string) {
  try {
    const client = getAnalytics();
    client.capture({
      distinctId: `site_${businessSlug}`,
      event: 'page_view',
      properties: { slug: businessSlug, source: source || 'direct' },
    });
    await client.shutdown();
  } catch (e) {}
}
