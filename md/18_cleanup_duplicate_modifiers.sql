-- ====================================================================
-- FILE: 18_cleanup_duplicate_modifiers.sql
-- PURPOSE: Remove duplicate global modifiers
-- ====================================================================

-- Step 1: View duplicates
SELECT variant_name, COUNT(*) as count
FROM recipes
WHERE recipe_scope = 'global-modifier'
GROUP BY variant_name
HAVING COUNT(*) > 1;

-- Step 2: Keep only ONE modifier per variant_name (the newest one)
DELETE FROM recipes
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY variant_name ORDER BY created_at DESC) as rn
        FROM recipes
        WHERE recipe_scope = 'global-modifier'
    ) sub
    WHERE rn > 1
);

-- Step 3: Also clean up old variant-specific recipes that are now global-modifiers
-- Keep only global-modifiers, remove duplicates with same variant_name
DELETE FROM recipes
WHERE recipe_type = 'variant-specific' 
AND product_id IS NULL
AND recipe_scope != 'global-modifier'
AND variant_name IN (
    SELECT variant_name FROM recipes WHERE recipe_scope = 'global-modifier'
);

-- Step 4: Verify - should show no duplicates
SELECT 
    recipe_scope,
    variant_name, 
    modifier_percentage,
    product_name,
    COUNT(*) as count
FROM recipes
WHERE recipe_scope = 'global-modifier'
GROUP BY recipe_scope, variant_name, modifier_percentage, product_name
ORDER BY variant_name;

-- Step 5: Show final count
DO $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM recipes WHERE recipe_scope = 'global-modifier';
    RAISE NOTICE 'Total global modifiers after cleanup: %', v_count;
END $$;
