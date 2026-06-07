-- Factory Platform Database Schema
-- Run this in Supabase SQL Editor on first setup

-- Businesses table
CREATE TABLE businesses (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,           -- e.g. "schiff-air-conditioning-heating-inc"
  name TEXT NOT NULL,                   -- "Schiff Air Conditioning & Heating Inc"
  category TEXT NOT NULL,               -- "HVAC", "Plumbing", etc.
  phone TEXT,                           -- "(812) 423-0056"
  email TEXT,                           -- "info@schiffair.com"
  website TEXT,                         -- "schiffair.com"
  address TEXT,                         -- "1315 W Columbia St, Evansville, IN 47710"
  notes TEXT,
  cal_event_slug TEXT,                  -- "hvac-service" — matches Cal.com event type
  design_score INTEGER DEFAULT 5,       -- From competitive audit
  brand_colors JSONB DEFAULT '[]',      -- ["#003366", "#FFFFFF", "#CC0000"]
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bookings table
CREATE TABLE bookings (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  service TEXT NOT NULL,
  booking_time TIMESTAMPTZ,
  notes TEXT,
  source TEXT DEFAULT 'website',        -- 'website', 'voice_agent', 'sms', 'manual'
  cal_booking_id TEXT,                  -- Cal.com booking UID
  notified_via JSONB DEFAULT '[]',      -- ["sms", "email"]
  raw_payload JSONB,                    -- Raw webhook data for debugging
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_bookings_business_id ON bookings(business_id);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX idx_businesses_slug ON businesses(slug);
CREATE INDEX idx_businesses_category ON businesses(category);

-- Seed: insert all 71 businesses from the factory
-- (Run the seed script instead of manual inserts)
