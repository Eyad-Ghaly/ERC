-- Add supervisor modification tracking columns to missions table
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS supervisor_modified BOOLEAN DEFAULT false;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS supervisor_modified_at TIMESTAMPTZ;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS supervisor_edit_note TEXT;
