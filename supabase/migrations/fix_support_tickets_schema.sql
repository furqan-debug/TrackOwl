-- Fix support_tickets schema by adding missing columns if they don't exist
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'Bug Report' CHECK (type IN ('Live Chat', 'Email Ticket', 'Bug Report', 'Feature Request'));
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS system_info JSONB;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
