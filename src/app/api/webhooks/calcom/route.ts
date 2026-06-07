/// <reference types="../../env.d.ts" />

/**
 * Webhook handler for Cal.com booking notifications.
 * Called when someone books a service on any of our 71 sites.
 * 
 * Steps:
 * 1. Receive Cal.com webhook payload
 * 2. Look up business by their unique event type slug
 * 3. Send SMS to business owner via Twilio
 * 4. Send email to business owner via Resend
 * 5. Log booking to Supabase
 * 6. Return 200 OK
 */
import { NextResponse } from 'next/server';

// Supabase client (lazy-loaded)
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

// Twilio client (lazy-loaded)
let twilio: any = null;
function getSms() {
  if (twilio) return twilio;
  const tw = require('twilio');
  twilio = tw(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return twilio;
}

// Resend client (lazy-loaded)
let resend: any = null;
function getEmail() {
  if (resend) return resend;
  const { Resend } = require('resend');
  resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

// In-memory business registry (loaded from Supabase on first request)
// Maps Cal.com event type slugs to business data
let businessRegistry: Record<string, any> | null = null;

async function loadBusinessRegistry() {
  if (businessRegistry) return businessRegistry;
  const db = getDb();
  const { data } = await db.from('businesses').select('*');
  businessRegistry = {};
  for (const biz of data || []) {
    if (biz.cal_event_slug) {
      businessRegistry[biz.cal_event_slug] = biz;
    }
  }
  return businessRegistry;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Cal.com webhook received:', JSON.stringify(body).slice(0, 500));

    // Extract booking info from Cal.com webhook payload
    // Format varies by trigger — handle both "BOOKING_CREATED" and standard payloads
    const trigger = body.triggerEvent || '';
    const payload = body.payload || body;
    
    if (trigger && !trigger.includes('BOOKING_CREATED') && !trigger.includes('MEETING_ENDED')) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const eventTypeSlug = payload.eventType?.slug || '';
    const attendeeName = payload.attendees?.[0]?.name || payload.responses?.name?.value || 'Customer';
    const attendeePhone = payload.attendees?.[0]?.phone || payload.responses?.phone?.value || '';
    const attendeeEmail = payload.attendees?.[0]?.email || payload.responses?.email?.value || '';
    const eventTitle = payload.eventType?.title || 'Service Booking';
    const startTime = payload.startTime || '';
    const endTime = payload.endTime || '';
    const bookingId = payload.uid || '';

    if (!eventTypeSlug) {
      console.log('No event type slug in webhook, skipping');
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Look up business
    const registry = await loadBusinessRegistry();
    const business = registry[eventTypeSlug];

    if (!business) {
      console.log(`No business found for event type: ${eventTypeSlug}`);
      return NextResponse.json({ ok: true, warning: 'unknown_event_type' });
    }

    // Format booking message
    const date = new Date(startTime);
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    
    const message = `New booking for ${business.name}!
${attendeeName} — ${eventTitle}
${dateStr} at ${timeStr}
Phone: ${attendeePhone}
${attendeeEmail ? 'Email: ' + attendeeEmail : ''}

View: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://factory-platform.vercel.app'}/dashboard?biz=${business.slug}`;

    // Send SMS
    if (business.phone && process.env.TWILIO_ACCOUNT_SID) {
      try {
        const sms = getSms();
        await sms.messages.create({
          body: message,
          to: business.phone,
          from: process.env.TWILIO_PHONE_NUMBER,
        });
        console.log(`SMS sent to ${business.phone}`);
      } catch (smsErr) {
        console.error('SMS failed:', smsErr);
      }
    }

    // Send email
    if (business.email && process.env.RESEND_API_KEY) {
      try {
        const email = getEmail();
        await email.emails.send({
          from: 'bookings@app-factory.io',
          to: business.email,
          subject: `New Booking — ${business.name}`,
          html: `
            <h2>New Service Booking</h2>
            <table style="border-collapse:collapse;width:100%">
              <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Business</td><td style="padding:8px;border:1px solid #ddd">${business.name}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Customer</td><td style="padding:8px;border:1px solid #ddd">${attendeeName}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Phone</td><td style="padding:8px;border:1px solid #ddd"><a href="tel:${attendeePhone}">${attendeePhone}</a></td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Service</td><td style="padding:8px;border:1px solid #ddd">${eventTitle}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Date</td><td style="padding:8px;border:1px solid #ddd">${dateStr}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Time</td><td style="padding:8px;border:1px solid #ddd">${timeStr}</td></tr>
            </table>
            <p style="margin-top:16px;color:#666;font-size:12px">Sent by your booking website · <a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/dashboard?biz=${business.slug}">View Dashboard</a></p>
          `,
        });
        console.log(`Email sent to ${business.email}`);
      } catch (emailErr) {
        console.error('Email failed:', emailErr);
      }
    }

    // Log to Supabase
    try {
      const db = getDb();
      await db.from('bookings').insert({
        business_id: business.id,
        customer_name: attendeeName,
        customer_phone: attendeePhone,
        customer_email: attendeeEmail,
        service: eventTitle,
        booking_time: startTime,
        cal_booking_id: bookingId,
        notified_via: ['sms', 'email'].filter(x => x),
        raw_payload: body,
      });
    } catch (logErr) {
      console.error('Logging failed:', logErr);
    }

    return NextResponse.json({ ok: true, business: business.slug, notified: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
