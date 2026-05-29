-- =============================================
-- TrackOwl Migration: Add current_period_end to organizations
-- =============================================

-- Add current_period_end column to store next billing/renewal date from Stripe
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- Backfill the current org's seats to 2 (1 paid + 1 free owner) and refresh renewal date
-- This corrects the row that was created before the webhook seat-counting fix.
-- The webhook will keep this in sync on every future billing event.
UPDATE organizations
SET seats_purchased = 2
WHERE stripe_subscription_id IS NOT NULL
  AND seats_purchased = 1;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
