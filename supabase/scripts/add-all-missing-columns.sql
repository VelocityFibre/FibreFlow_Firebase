-- Add all missing columns to status_changes table in Supabase
-- to match exactly what the sync script expects

ALTER TABLE status_changes 
ADD COLUMN IF NOT EXISTS agent_name TEXT,
ADD COLUMN IF NOT EXISTS connected_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS permission_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pole_planted_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stringing_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS signup_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS drop_date TIMESTAMP WITH TIME ZONE;