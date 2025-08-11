-- Add final missing columns to status_changes table in Supabase

ALTER TABLE status_changes 
ADD COLUMN IF NOT EXISTS date_stamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS flow_name_groups TEXT,
ADD COLUMN IF NOT EXISTS project_name TEXT,
ADD COLUMN IF NOT EXISTS zone INTEGER;