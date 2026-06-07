-- Factory Platform v2 — Full Database Schema
-- Covers all 14 features: booking, voice, reviews, analytics, estimates, GBP, plans, dispatch, etc.

-- ============================================================
-- CORE
-- ============================================================

-- Already exists: businesses, bookings
-- Extend businesses with new columns for all features

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Chicago';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{"en"}';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_place_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS twilio_phone TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS retell_agent_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS dispatch_enabled BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'basic'; -- basic|pro|premium
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- ============================================================
-- 4. REAL REVIEWS (Google Reviews + review generation)
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  source TEXT DEFAULT 'website',  -- website|google|yelp|facebook
  google_review_url TEXT,
  is_published BOOLEAN DEFAULT false,
  review_requested_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  response_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_business ON reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- ============================================================
-- 7. REVIEW GENERATION (auto-request after service)
-- ============================================================

CREATE TABLE IF NOT EXISTS review_requests (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  booking_id BIGINT REFERENCES bookings(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending|sent|opened|completed|skipped
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 8. MARKETING / RETENTION
-- ============================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- seasonal|renewal|winback|referral
  title TEXT NOT NULL,
  message_template TEXT NOT NULL,
  trigger_days INTEGER, -- days after last service
  channel TEXT DEFAULT 'sms', -- sms|email|both
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_sends (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id BIGINT,
  customer_phone TEXT,
  status TEXT DEFAULT 'queued',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 9. SPANISH / MULTI-LANGUAGE
-- ============================================================

CREATE TABLE IF NOT EXISTS translations (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  locale TEXT NOT NULL, -- 'es', 'en'
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  UNIQUE(business_id, locale, key)
);

-- ============================================================
-- 10. PHOTO ESTIMATES
-- ============================================================

CREATE TABLE IF NOT EXISTS estimates (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  service_category TEXT,
  photo_urls TEXT[],
  ai_description TEXT,
  suggested_price DECIMAL(10,2),
  status TEXT DEFAULT 'pending', -- pending|quoted|accepted|rejected|converted
  owner_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  converted_at TIMESTAMPTZ,
  converted_booking_id BIGINT REFERENCES bookings(id)
);

CREATE INDEX IF NOT EXISTS idx_estimates_business ON estimates(business_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);

-- ============================================================
-- 11. FINANCING FLOW
-- ============================================================

CREATE TABLE IF NOT EXISTS financing_applications (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  service TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  stripe_payment_link TEXT,
  status TEXT DEFAULT 'pending', -- pending|approved|declined|completed
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 12. GOOGLE BUSINESS PROFILE INTEGRATION
-- ============================================================

CREATE TABLE IF NOT EXISTS gbp_posts (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  google_post_id TEXT,
  content TEXT NOT NULL,
  media_url TEXT,
  cta_type TEXT, -- book|call|learn_more|sign_up
  cta_url TEXT,
  status TEXT DEFAULT 'draft', -- draft|posted|failed
  posted_at TIMESTAMPTZ,
  performance_metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 13. RECURRING BILLING
-- ============================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 'Weekly Lawn', 'Quarterly Pest', 'Annual HVAC'
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  interval TEXT NOT NULL, -- weekly|monthly|quarterly|annual
  stripe_price_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  plan_id BIGINT REFERENCES subscription_plans(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  stripe_subscription_id TEXT,
  status TEXT DEFAULT 'active', -- active|paused|cancelled|expired
  next_billing_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  cancelled_at TIMESTAMPTZ
);

-- ============================================================
-- 14. MULTI-TECH DISPATCH
-- ============================================================

CREATE TABLE IF NOT EXISTS technicians (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  specialties TEXT[], -- '["HVAC","Plumbing"]'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dispatch (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  booking_id BIGINT REFERENCES bookings(id) ON DELETE CASCADE,
  technician_id BIGINT REFERENCES technicians(id),
  status TEXT DEFAULT 'pending', -- pending|assigned|en_route|on_site|completed|cancelled
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  customer_notes TEXT,
  tech_notes TEXT,
  travel_distance_km DECIMAL(8,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_technician ON dispatch(technician_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_status ON dispatch(status);
CREATE INDEX IF NOT EXISTS idx_dispatch_date ON dispatch(scheduled_start);

-- ============================================================
-- 6. ANALYTICS
-- ============================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- page_view|booking|call|review|estimate|quote
  source TEXT, -- website|voice|google|direct
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_business ON analytics_events(business_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_events(created_at);
