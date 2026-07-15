-- ==============================================================
-- Migration: Create Composite Indexes for Reports Performance
-- Speeds up reports page queries for activity samples and screenshots
-- ==============================================================

-- 1. Create a composite index on activity_samples for organization-wide range queries
CREATE INDEX IF NOT EXISTS idx_activity_samples_org_recorded 
ON public.activity_samples (organization_id, recorded_at DESC);

-- 2. Create a composite index on screenshots for organization-wide range count queries
CREATE INDEX IF NOT EXISTS idx_screenshots_org_recorded 
ON public.screenshots (organization_id, recorded_at DESC);
