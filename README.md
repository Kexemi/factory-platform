# Factory Platform

Backend for the Local Business App Factory. Handles booking webhooks, SMS/email notifications, business management, and the admin dashboard.

## Deploy to Vercel (one click)

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Kexemi/factory-platform)

## Environment Variables

```env
# Supabase (free tier at supabase.com)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Twilio (for SMS — free trial credits available)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Resend (for email — free tier: 100 emails/day)
RESEND_API_KEY=re_...

# Cal.com (for booking webhooks)
CALCOM_API_KEY=cal_...
```

## Quick Start

```bash
npm install
cp .env.example .env  # Fill in your keys
npm run dev            # http://localhost:3000
npm run deploy         # Deploy to Vercel
```

## Key Endpoints

| Path | Method | Purpose |
|------|--------|---------|
| `/api/webhooks/calcom` | POST | Receives Cal.com booking notifications |
| `/api/businesses` | GET/POST | List/create businesses |
| `/api/businesses/[slug]` | GET/PUT | Get/update business settings |
| `/api/bookings` | GET | Get bookings for a business |
| `/dashboard` | GET | Business owner admin dashboard |

## Architecture

```
Cal.com booking → webhook POST → /api/webhooks/calcom
    → Look up business by event type → Send SMS via Twilio
    → Send email via Resend → Log to Supabase
    → Owner sees in dashboard
```

## Deploy

```bash
npx vercel --prod
```

Set all environment variables in the Vercel dashboard after deploy.
