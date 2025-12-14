-- Storage RLS Policies for Archives Bucket
-- IMPORTANT: Run this AFTER creating 'archives' bucket via Supabase Dashboard

-- Enable RLS on storage.objects (should already be enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Owners can upload archive CSV files" ON storage.objects;
DROP POLICY IF EXISTS "Owners can view archive CSV files" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete archive CSV files" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update archive CSV files" ON storage.objects;

-- Policy 1: INSERT (Upload)
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

-- Policy 2: SELECT (Download/View)
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

-- Policy 3: DELETE
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

-- Policy 4: UPDATE (optional - for re-upload)
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

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%archive%';
