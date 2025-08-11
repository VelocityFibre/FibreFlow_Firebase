-- Add missing agent_name column to status_changes table in Supabase
ALTER TABLE status_changes 
ADD COLUMN IF NOT EXISTS agent_name TEXT;