-- ====================================================================
-- FILE: 16_hybrid_recipe_system.sql
-- PURPOSE: Implement Hybrid Recipe System (Default Modifier + Override)
-- ====================================================================

-- Step 1: Add new columns to recipes table
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS is_override BOOLEAN DEFAULT false;

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS modifier_percentage DECIMAL(10,2) DEFAULT 0;

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS modifier_type VARCHAR(20) DEFAULT 'percentage';
-- modifier_type: 'percentage' (+50%), 'fixed' (+5g), 'absolute' (exactly 15g)

-- Step 2: Add recipe_scope to distinguish global vs product-specific
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS recipe_scope VARCHAR(20) DEFAULT 'product';
-- recipe_scope: 'product' (base recipe), 'global-modifier' (default modifier), 'product-override' (override)

-- Step 3: Add is_active column
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Step 3.5: Update recipe_type constraint to allow 'variant-modifier'
ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_recipe_type_check;
ALTER TABLE recipes ADD CONSTRAINT recipes_recipe_type_check 
CHECK (recipe_type IN ('base', 'variant-specific', 'variant-modifier'));

-- Step 4: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_recipes_scope ON recipes(recipe_scope);
CREATE INDEX IF NOT EXISTS idx_recipes_override ON recipes(product_id, variant_name, is_override);

-- Step 5: Insert default modifiers for existing variants
DO $$
DECLARE
    v_variant_group RECORD;
    v_variant_option RECORD;
BEGIN
    -- Loop through variant groups (Size, Milk Type, etc.)
    FOR v_variant_group IN 
        SELECT id, name FROM variant_groups WHERE is_active = true
    LOOP
        -- Loop through options in each group
        FOR v_variant_option IN
            SELECT id, name, price_modifier FROM variant_options 
            WHERE variant_group_id = v_variant_group.id AND is_active = true
        LOOP
            -- Check if default modifier already exists
            IF NOT EXISTS (
                SELECT 1 FROM recipes 
                WHERE recipe_scope = 'global-modifier'
                AND variant_name = v_variant_option.name
            ) THEN
                -- Create default modifier based on price_modifier as hint
                INSERT INTO recipes (
                    product_id,
                    product_name,
                    recipe_type,
                    recipe_scope,
                    variant_name,
                    variant_combination,
                    modifier_percentage,
                    modifier_type,
                    is_override,
                    is_active
                ) VALUES (
                    NULL,
                    v_variant_group.name || ' - ' || v_variant_option.name,
                    'variant-modifier',
                    'global-modifier',
                    v_variant_option.name,
                    jsonb_build_object(v_variant_group.id::text, v_variant_option.id::text),
                    CASE 
                        WHEN LOWER(v_variant_option.name) LIKE '%large%' THEN 50
                        WHEN LOWER(v_variant_option.name) LIKE '%small%' THEN -20
                        ELSE 0
                    END,
                    'percentage',
                    false,
                    true
                );
                
                RAISE NOTICE 'Created default modifier for: % - %', 
                    v_variant_group.name, 
                    v_variant_option.name;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- Step 6: Mark old global variant recipes with proper scope
UPDATE recipes 
SET recipe_scope = 'global-modifier'
WHERE recipe_type = 'variant-specific' 
AND product_id IS NULL
AND recipe_scope = 'product';

-- Step 7: Verification
SELECT 
    recipe_scope,
    recipe_type,
    product_name,
    variant_name,
    modifier_percentage,
    modifier_type,
    is_override
FROM recipes
ORDER BY recipe_scope, product_name;

-- Show summary
DO $$
DECLARE
    v_base_count INT;
    v_modifier_count INT;
    v_override_count INT;
BEGIN
    SELECT COUNT(*) INTO v_base_count FROM recipes WHERE recipe_scope = 'product' AND recipe_type = 'base';
    SELECT COUNT(*) INTO v_modifier_count FROM recipes WHERE recipe_scope = 'global-modifier';
    SELECT COUNT(*) INTO v_override_count FROM recipes WHERE recipe_scope = 'product-override';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'HYBRID RECIPE SYSTEM SETUP COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Base Recipes: %', v_base_count;
    RAISE NOTICE 'Global Modifiers: %', v_modifier_count;
    RAISE NOTICE 'Product Overrides: %', v_override_count;
    RAISE NOTICE '========================================';
END $$;
