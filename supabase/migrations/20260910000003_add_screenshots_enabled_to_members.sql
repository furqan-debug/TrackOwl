-- Add screenshots_enabled column to members table (default true)
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS screenshots_enabled boolean DEFAULT true;
