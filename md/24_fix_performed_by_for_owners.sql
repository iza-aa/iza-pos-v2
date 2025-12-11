-- ====================================================================
-- FILE: 24_fix_performed_by_for_owners.sql
-- PURPOSE: Allow owners/managers to be tracked in usage_transactions
-- ISSUE: performed_by has FK constraint to staff table, but owners login with different auth
-- SOLUTION: Make performed_by nullable and add performed_by_name for display
-- ====================================================================

-- Add new column for storing name directly (for non-staff users like owners)
ALTER TABLE usage_transactions 
ADD COLUMN IF NOT EXISTS performed_by_name TEXT;

-- Update existing records to populate performed_by_name from staff
UPDATE usage_transactions ut
SET performed_by_name = s.name
FROM staff s
WHERE ut.performed_by = s.id
  AND ut.performed_by_name IS NULL;

-- Add comment
COMMENT ON COLUMN usage_transactions.performed_by_name IS 'Name of person who performed transaction. Used when performed_by (FK to staff) is null.';

-- ====================================================================
-- VERIFICATION
-- ====================================================================

-- Check column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'usage_transactions'
  AND column_name = 'performed_by_name';

-- Check existing data
SELECT 
  id,
  transaction_type,
  performed_by,
  performed_by_name,
  notes,
  created_at
FROM usage_transactions
ORDER BY created_at DESC
LIMIT 10;

-- ====================================================================
-- NOTES
-- ====================================================================
-- After running this:
-- 1. Frontend can now insert performed_by = NULL and performed_by_name = 'Owner Name'
-- 2. For staff operations, use performed_by (FK) as before
-- 3. Display logic: Use performed_by_name if exists, else lookup staff name
-- 
-- Frontend changes needed:
-- - Get user name from session (not just ID)
-- - Insert: performed_by_name = user.email or user metadata
-- - Display: Show performed_by_name || staff.name || 'System'
