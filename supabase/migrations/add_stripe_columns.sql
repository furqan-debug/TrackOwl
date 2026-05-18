-- =============================================
-- TrackOwl Migration: Add Stripe & Offline Billing Support
-- Run this in your Supabase SQL Editor
-- =============================================

-- Add stripe columns to the organizations table if they do not exist
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_period TEXT DEFAULT 'Monthly';

-- Refresh the PostgREST schema cache to ensure columns are visible instantly to APIs
NOTIFY pgrst, 'reload schema';
