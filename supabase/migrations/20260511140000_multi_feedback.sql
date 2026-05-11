-- Remove UNIQUE constraint on mission_id to allow multiple feedbacks per mission
ALTER TABLE public.mission_feedback DROP CONSTRAINT IF EXISTS mission_feedback_mission_id_key;

-- Add feedback_closed flag to missions table to mark when feedback collection is done
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS feedback_closed BOOLEAN DEFAULT false;
