-- Fix the ID column to auto-generate values
-- First check if the id column exists and its type

-- If the table uses a serial/identity column for id, we don't need to do anything
-- If it uses uuid, we need to set a default

-- Option 1: If using integer IDs (recommended for compatibility with SQLite)
ALTER TABLE status_changes 
ALTER COLUMN id SET DEFAULT nextval('status_changes_id_seq'::regclass);

-- If the sequence doesn't exist, create it:
-- CREATE SEQUENCE IF NOT EXISTS status_changes_id_seq;
-- ALTER TABLE status_changes ALTER COLUMN id SET DEFAULT nextval('status_changes_id_seq');
-- ALTER SEQUENCE status_changes_id_seq OWNED BY status_changes.id;

-- Option 2: If using UUID (modern Supabase default)
-- ALTER TABLE status_changes 
-- ALTER COLUMN id SET DEFAULT gen_random_uuid();