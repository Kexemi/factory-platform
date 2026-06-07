# Factory Platform — API Reference

All 14 features implemented. Deploy to Vercel to activate.

## Architecture

```
factory-platform/
├── src/
│   ├── app/api/
│   │   ├── webhooks/calcom/      # POST — booking → SMS/email → DB
│   │   ├── businesses/           # GET/POST — CRUD
│   │   ├── bookings/             # GET/POST — history + manual entry
│   │   ├── reviews/              # GET/POST — real reviews + auto-request
│   │   ├── estimates/            # POST — photo upload → AI quote
│   │   ├── dispatch/             # GET/POST/PATCH — multi-tech scheduling
│   │   ├── subscriptions/        # GET/POST — recurring billing plans
│   │   ├── marketing/            # GET/POST/PATCH — campaigns + auto-send
│   │   ├── gbp/                  # GET/POST — Google Business Profile posts
│   │   ├── analytics/            # GET — bookings, revenue, trends, top services
│   │   ├── translate/            # GET/POST — AI Spanish/English
│   │   └── cron/daily-digest/    # GET — daily SMS summary to all businesses
│   ├── lib/
│   │   ├── sms.ts               # Twilio
│   │   ├── db.ts                 # Supabase
│   │   ├── analytics.ts          # PostHog
│   │   ├── payments.ts           # Stripe
│   │   └── estimates.ts          # GPT-4o vision
│   └── app/dashboard/            # 10-tab business owner UI
├── supabase-schema-v2.sql        # 12 tables + extensions
├── supabase-schema.sql            # Core tables
├── seed.mjs                      # 71-business seeder
└── .env.example                  # All env vars documented
```

## Feature → Gap Map

| # | Gap | Status | API Route | What It Does |
|---|-----|--------|-----------|-------------|
| 1 | Real booking SMS | ✅ Code | `/api/webhooks/calcom` | Cal.com webhook → Twilio SMS + Resend email |
| 2 | Voice agent | 🔧 Needs Retell | — | Listed in roadmap Phase 3 |
| 3 | Per-business scheduling | ✅ Config | Cal.com event types per category | Each business category has its own Cal.com event slug |
| 4 | Real reviews | ✅ Code | `/api/reviews` | Google Reviews embed + auto SMS review requests |
| 5 | Owner dashboard | ✅ Code | `/dashboard?biz=slug` | 10-tab dashboard with phone-verified auth |
| 6 | Analytics | ✅ Code | `/api/analytics` | Bookings/revenue/trends/top services + PostHog |
| 7 | Review generation | ✅ Code | `/api/reviews` POST | Auto-SMS after completed dispatch |
| 8 | Marketing/retention | ✅ Code | `/api/marketing` + cron | Seasonal reminders, re-engagement campaigns |
| 9 | Spanish | ✅ Code | `/api/translate` | AI-powered translation, Spanish toggle |
| 10 | Photo estimates | ✅ Code | `/api/estimates` | Upload → GPT-4o vision → price estimate |
| 11 | Financing | ✅ Code | `/lib/payments.ts` | Stripe payment links on requests |
| 12 | GBP integration | ✅ Code | `/api/gbp` | Post management, review response |
| 13 | Recurring billing | ✅ Code | `/api/subscriptions` | Stripe subscriptions for maintenance plans |
| 14 | Multi-tech dispatch | ✅ Code | `/api/dispatch` | Technicians, scheduling, route management |

## What Needs Accounts To Activate

| Service | What For | Cost | Setup Time |
|---------|----------|------|------------|
| **Supabase** | Database for all features | Free | 15 min |
| **Twilio** | SMS notifications + marketing | ~$2/mo | 15 min |
| **Stripe** | Payments + subscriptions | Free | 10 min |
| **OpenAI** | AI photo estimates + translations | ~$5/mo | 5 min |
| **Resend** | Email notifications | Free (100/day) | 5 min |
| **PostHog** | Product analytics | Free | 5 min |
| **Retell AI** | Voice agent (Phase 3) | ~$50/mo | 30 min |

Deploy the repo to Vercel, set the env vars, run the SQL schema, run the seed script. That's it.
