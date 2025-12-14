-- Migration: Setup Archive CSV Storage
-- Description: Add CSV storage capabilities for AI chatbot analysis
-- - Add csv_files column to archives table
-- - Setup storage bucket for CSV files
-- - Add RLS policies for archive storage access

-- ============================================
-- 1. Update Archives Table Schema
-- ============================================

-- Add csv_files column to store CSV file paths
ALTER TABLE archives ADD COLUMN IF NOT EXISTS csv_files JSONB;

-- Add comment for documentation
COMMENT ON COLUMN archives.csv_files IS 'JSONB object storing CSV file paths in Supabase Storage for AI analysis. Format: {"activity_logs": "path/to/file.csv", "sales": "path/to/file.csv", "staff_attendance": "path/to/file.csv"}';

-- ============================================
-- 2. Create Storage Bucket (via SQL)
-- ============================================

-- Note: Storage buckets are typically created via Supabase Dashboard or API
-- This is the SQL representation for reference
-- Bucket name: 'archives'
-- Settings: private, 50MB file limit

-- To create bucket via SQL, use Supabase's storage.buckets table:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'archives',
  'archives',
  false, -- Private bucket
  52428800, -- 50MB limit
  ARRAY['text/csv', 'text/plain']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. Storage RLS Policies
-- ============================================

-- Policy 1: Owners can upload CSV files
CREATE POLICY "Owners can upload archive CSV files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'archives' 
  AND (
    SELECT role 
    FROM staff 
    WHERE id = auth.uid()
  ) = 'owner'
);

-- Policy 2: Owners can view/download CSV files
CREATE POLICY "Owners can view archive CSV files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'archives'
  AND (
    SELECT role 
    FROM staff 
    WHERE id = auth.uid()
  ) = 'owner'
);

-- Policy 3: Owners can delete old CSV files
CREATE POLICY "Owners can delete archive CSV files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'archives'
  AND (
    SELECT role 
    FROM staff 
    WHERE id = auth.uid()
  ) = 'owner'
);

-- Policy 4: Owners can update CSV files (re-upload)
CREATE POLICY "Owners can update archive CSV files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'archives'
  AND (
    SELECT role 
    FROM staff 
    WHERE id = auth.uid()
  ) = 'owner'
)
WITH CHECK (
  bucket_id = 'archives'
  AND (
    SELECT role 
    FROM staff 
    WHERE id = auth.uid()
  ) = 'owner'
);

-- ============================================
-- 4. Create Function to Cleanup Orphaned Files
-- ============================================

-- Function to delete CSV files when archive is soft deleted
CREATE OR REPLACE FUNCTION cleanup_archive_csv_files()
RETURNS TRIGGER AS $$
BEGIN
  -- Only cleanup if archive is being soft deleted (deleted_at is set)
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    -- Log the cleanup attempt
    RAISE NOTICE 'Archive % soft deleted, CSV files should be cleaned up by application', NEW.archive_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to cleanup CSV files on soft delete
DROP TRIGGER IF EXISTS trigger_cleanup_archive_csv ON archives;
CREATE TRIGGER trigger_cleanup_archive_csv
  AFTER UPDATE ON archives
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_archive_csv_files();

-- ============================================
-- 5. Add Index for Better Performance
-- ============================================

-- Index for searching archives with CSV files
CREATE INDEX IF NOT EXISTS idx_archives_csv_files 
ON archives USING gin(csv_files);

-- ============================================
-- 6. Verification Query
-- ============================================

-- View archives with CSV file information
COMMENT ON TABLE archives IS 'Stores monthly archive metadata and CSV file paths for AI-powered analysis';

-- Example query to check CSV files:
-- SELECT archive_id, period_month, period_year, csv_files 
-- FROM archives 
-- WHERE csv_files IS NOT NULL AND deleted_at IS NULL;
