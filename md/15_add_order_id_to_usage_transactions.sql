-- ====================================================================
-- FILE: 15_add_order_id_to_usage_transactions.sql
-- PURPOSE: Add order_id column to usage_transactions table
-- REQUIRED FOR: Auto-deduct inventory trigger system
-- ====================================================================

-- Add order_id column to usage_transactions
ALTER TABLE usage_transactions 
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id);

-- Add transaction_type column (replacing old 'type' column pattern)
ALTER TABLE usage_transactions 
ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(50);

-- Update transaction_type from existing type column if exists
UPDATE usage_transactions 
SET transaction_type = type 
WHERE transaction_type IS NULL AND type IS NOT NULL;

-- Make old 'type' column nullable (if it exists)
ALTER TABLE usage_transactions 
ALTER COLUMN type DROP NOT NULL;

-- Add variant_name column to recipes for easier querying
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS variant_name VARCHAR(50);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_usage_transactions_order_id 
ON usage_transactions(order_id);

-- Verification
DO $$
BEGIN

    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Added columns to usage_transactions:';
    RAISE NOTICE '- order_id (UUID, references orders)';
    RAISE NOTICE '- transaction_type (VARCHAR)';
    RAISE NOTICE '========================================';
END $$;
