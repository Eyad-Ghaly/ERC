-- Add new columns to volunteers_base table
ALTER TABLE public.volunteers_base 
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS education_status TEXT,
ADD COLUMN IF NOT EXISTS renewal_2026 TEXT;

-- Update RLS (Optional, usually columns inherit table policies, but good to be explicit if needed)
-- Based on previous standalone migration, all authenticated users can read/insert.
