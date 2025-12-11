-- ====================================================================
-- FILE: 23_fix_cascade_delete_inventory.sql
-- PURPOSE: Allow deletion of inventory items by removing FK constraint
-- SOLUTION: Remove usage_transaction_details records when deleting inventory_items
-- ====================================================================

-- Option 1: Drop foreign key constraint (allows orphaned records)
-- ====================================================================
-- This removes the constraint completely, but leaves orphaned records

-- Handle usage_transaction_details foreign key
DO $$
BEGIN
    -- Drop constraint from usage_transaction_details to inventory_items
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'usage_transaction_details_inventory_item_id_fkey'
    ) THEN
        ALTER TABLE usage_transaction_details 
        DROP CONSTRAINT usage_transaction_details_inventory_item_id_fkey;
        
        RAISE NOTICE 'Dropped usage_transaction_details FK constraint';
    END IF;
    
    -- Add back with CASCADE DELETE
    ALTER TABLE usage_transaction_details
    ADD CONSTRAINT usage_transaction_details_inventory_item_id_fkey
    FOREIGN KEY (inventory_item_id)
    REFERENCES inventory_items(id)
    ON DELETE CASCADE;
    
    RAISE NOTICE 'Added CASCADE DELETE to usage_transaction_details';
END $$;


-- Handle recipe_ingredients foreign key
DO $$
BEGIN
    -- Drop constraint from recipe_ingredients to inventory_items
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'recipe_ingredients_inventory_item_id_fkey'
    ) THEN
        ALTER TABLE recipe_ingredients 
        DROP CONSTRAINT recipe_ingredients_inventory_item_id_fkey;
        
        RAISE NOTICE 'Dropped recipe_ingredients FK constraint';
    END IF;
    
    -- Add back with CASCADE DELETE
    ALTER TABLE recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_inventory_item_id_fkey
    FOREIGN KEY (inventory_item_id)
    REFERENCES inventory_items(id)
    ON DELETE CASCADE;
    
    RAISE NOTICE 'Added CASCADE DELETE to recipe_ingredients';
END $$;


-- ====================================================================
-- VERIFICATION
-- ====================================================================

-- Check current constraints
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
LEFT JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name IN ('usage_transaction_details', 'recipe_ingredients')
  AND tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'inventory_items';


-- ====================================================================
-- NOTES
-- ====================================================================
-- After running this:
-- 1. Deleting inventory_item will CASCADE delete:
--    - All usage_transaction_details for that item
--    - All recipe_ingredients for that item
-- 2. Usage transactions (parent) will remain, but details will be gone
-- 3. This is irreversible - historical data will be lost
-- 
-- ALTERNATIVE (Better approach):
-- Add is_active column and do soft delete:
--   ALTER TABLE inventory_items ADD COLUMN is_active BOOLEAN DEFAULT true;
--   UPDATE inventory_items SET is_active = false WHERE id = 'xxx';
--   Then filter queries: WHERE is_active = true
