-- Add csv_files column to archives table
-- This stores the paths of CSV files in Supabase Storage

ALTER TABLE archives ADD COLUMN IF NOT EXISTS csv_files JSONB;

-- Add comment for documentation
COMMENT ON COLUMN archives.csv_files IS 'JSONB object storing CSV file paths in Supabase Storage for AI analysis. Format: {"activity_logs": "path/to/file.csv", "sales": "path/to/file.csv", "staff_attendance": "path/to/file.csv"}';

-- Add GIN index for better JSONB query performance
CREATE INDEX IF NOT EXISTS idx_archives_csv_files 
ON archives USING gin(csv_files);

-- Verify column added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'archives' AND column_name = 'csv_files';
