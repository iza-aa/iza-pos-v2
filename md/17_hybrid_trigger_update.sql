-- ====================================================================
-- FILE: 17_hybrid_trigger_update.sql
-- PURPOSE: Update trigger to use Hybrid Recipe System
-- FLOW: Check Override → Fallback to Base + Modifier
-- ====================================================================

-- Step 1: Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_deduct_inventory_on_item ON order_items;
DROP FUNCTION IF EXISTS deduct_inventory_on_order_item();

-- Step 2: Create new hybrid function
CREATE OR REPLACE FUNCTION deduct_inventory_on_order_item()
RETURNS TRIGGER AS $$
DECLARE
    v_order_status TEXT;
    v_payment_status TEXT;
    v_usage_tx_id UUID;
    v_recipe_id UUID;
    v_base_recipe_id UUID;
    v_ingredient RECORD;
    v_new_stock DECIMAL(10,2);
    v_product_name TEXT;
    v_variant_key TEXT;
    v_variant_value TEXT;
    v_modifier_percentage DECIMAL(10,2) := 0;
    v_has_override BOOLEAN := false;
    v_total_modifier DECIMAL(10,2) := 0;
BEGIN
    -- Get order payment status
    SELECT status, payment_status INTO v_order_status, v_payment_status
    FROM orders 
    WHERE id = NEW.order_id;
    
    -- Only process if order is completed and paid
    IF v_payment_status != 'paid' THEN
        RETURN NEW;
    END IF;
    
    -- Get or create usage transaction for this order
    SELECT id INTO v_usage_tx_id
    FROM usage_transactions
    WHERE order_id = NEW.order_id;
    
    IF v_usage_tx_id IS NULL THEN
        INSERT INTO usage_transactions (
            order_id,
            transaction_type,
            notes,
            created_at
        ) VALUES (
            NEW.order_id,
            'order_usage',
            'Auto-deduct from order #' || NEW.order_id,
            NOW()
        ) RETURNING id INTO v_usage_tx_id;
        
        RAISE NOTICE 'Created usage_transaction: %', v_usage_tx_id;
    END IF;
    
    -- Get product name for logging
    SELECT name INTO v_product_name
    FROM products
    WHERE id = NEW.product_id;
    
    RAISE NOTICE 'Processing order_item: product=%, variants=%', v_product_name, NEW.variants;
    
    -- ============================================
    -- HYBRID SYSTEM: Check Override → Base + Modifier
    -- ============================================
    
    -- Step A: Always get base recipe first
    SELECT id INTO v_base_recipe_id
    FROM recipes
    WHERE product_id = NEW.product_id
      AND recipe_type = 'base'
      AND recipe_scope = 'product'
    LIMIT 1;
    
    IF v_base_recipe_id IS NULL THEN
        RAISE NOTICE 'No base recipe found for product: %', v_product_name;
        RETURN NEW;
    END IF;
    
    RAISE NOTICE 'Found base recipe: %', v_base_recipe_id;
    
    -- Step B: Check if order has variants
    IF NEW.variants IS NOT NULL 
       AND NEW.variants != '{}'::jsonb 
       AND NEW.variants != '[]'::jsonb
       AND jsonb_typeof(NEW.variants) != 'null' THEN
        
        -- Loop through each variant in the order
        -- Format from POS: {"Size": ["Large"], "Milk Type": ["Oat Milk"]}
        FOR v_variant_key, v_variant_value IN 
            SELECT key, value->>0 
            FROM jsonb_each(NEW.variants)
        LOOP
            RAISE NOTICE 'Checking variant: % = %', v_variant_key, v_variant_value;
            
            -- Step B1: Check for product-specific override
            SELECT id INTO v_recipe_id
            FROM recipes
            WHERE product_id = NEW.product_id
              AND variant_name = v_variant_value
              AND recipe_scope = 'product-override'
              AND is_override = true
              AND is_active = true
            LIMIT 1;
            
            IF v_recipe_id IS NOT NULL THEN
                -- Found override! Use this recipe instead of base
                v_has_override := true;
                RAISE NOTICE 'Found OVERRIDE recipe for % - %: %', v_product_name, v_variant_value, v_recipe_id;
                
                -- Process override recipe ingredients
                FOR v_ingredient IN
                    SELECT 
                        ri.inventory_item_id,
                        ri.quantity_needed,
                        ii.name,
                        ii.current_stock,
                        ii.unit
                    FROM recipe_ingredients ri
                    JOIN inventory_items ii ON ii.id = ri.inventory_item_id
                    WHERE ri.recipe_id = v_recipe_id
                LOOP
                    DECLARE
                        v_total_qty_needed DECIMAL(10,2);
                    BEGIN
                        v_total_qty_needed := v_ingredient.quantity_needed * NEW.quantity;
                        v_new_stock := v_ingredient.current_stock - v_total_qty_needed;
                        
                        UPDATE inventory_items
                        SET current_stock = v_new_stock, updated_at = NOW()
                        WHERE id = v_ingredient.inventory_item_id;
                        
                        INSERT INTO usage_transaction_details (
                            usage_transaction_id, inventory_item_id, ingredient_name,
                            quantity_used, unit, previous_stock, new_stock
                        ) VALUES (
                            v_usage_tx_id, v_ingredient.inventory_item_id, v_ingredient.name,
                            v_total_qty_needed, v_ingredient.unit, v_ingredient.current_stock, v_new_stock
                        );
                        
                        RAISE NOTICE 'OVERRIDE: Deducted % % of % (stock: % → %)', 
                            v_total_qty_needed, v_ingredient.unit, v_ingredient.name,
                            v_ingredient.current_stock, v_new_stock;
                    END;
                END LOOP;
                
                -- Override found and processed, skip to next variant
                CONTINUE;
            END IF;
            
            -- Step B2: No override, accumulate modifier percentage
            SELECT modifier_percentage INTO v_modifier_percentage
            FROM recipes
            WHERE variant_name = v_variant_value
              AND recipe_scope = 'global-modifier'
              AND recipe_type = 'variant-modifier'
              AND is_active = true
            LIMIT 1;
            
            IF v_modifier_percentage IS NOT NULL THEN
                v_total_modifier := v_total_modifier + v_modifier_percentage;
                RAISE NOTICE 'Found modifier for %: +% percent (total: +% percent)', 
                    v_variant_value, v_modifier_percentage, v_total_modifier;
            END IF;
        END LOOP;
    END IF;
    
    -- Step C: If no override was used, apply base recipe with modifiers
    IF NOT v_has_override THEN
        RAISE NOTICE 'Using BASE recipe with modifier: +% percent', v_total_modifier;
        
        FOR v_ingredient IN
            SELECT 
                ri.inventory_item_id,
                ri.quantity_needed,
                ii.name,
                ii.current_stock,
                ii.unit
            FROM recipe_ingredients ri
            JOIN inventory_items ii ON ii.id = ri.inventory_item_id
            WHERE ri.recipe_id = v_base_recipe_id
        LOOP
            DECLARE
                v_base_qty DECIMAL(10,2);
                v_modified_qty DECIMAL(10,2);
                v_total_qty_needed DECIMAL(10,2);
            BEGIN
                v_base_qty := v_ingredient.quantity_needed;
                -- Apply modifier: base_qty * (1 + modifier_percentage/100)
                v_modified_qty := v_base_qty * (1 + v_total_modifier / 100);
                v_total_qty_needed := v_modified_qty * NEW.quantity;
                
                v_new_stock := v_ingredient.current_stock - v_total_qty_needed;
                
                UPDATE inventory_items
                SET current_stock = v_new_stock, updated_at = NOW()
                WHERE id = v_ingredient.inventory_item_id;
                
                INSERT INTO usage_transaction_details (
                    usage_transaction_id, inventory_item_id, ingredient_name,
                    quantity_used, unit, previous_stock, new_stock
                ) VALUES (
                    v_usage_tx_id, v_ingredient.inventory_item_id, v_ingredient.name,
                    v_total_qty_needed, v_ingredient.unit, v_ingredient.current_stock, v_new_stock
                );
                
                RAISE NOTICE 'BASE+MOD: % x (1 + %/100) x % = % % of %', 
                    v_base_qty, v_total_modifier, NEW.quantity,
                    v_total_qty_needed, v_ingredient.unit, v_ingredient.name;
            END;
        END LOOP;
    END IF;
    
    RAISE NOTICE '✓ Completed processing order_item_id: %', NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger on order_items table
CREATE TRIGGER trigger_deduct_inventory_on_item
    AFTER INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION deduct_inventory_on_order_item();

-- Verification
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'HYBRID TRIGGER INSTALLED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Flow:';
    RAISE NOTICE '1. Order placed in POS';
    RAISE NOTICE '2. For each variant in order:';
    RAISE NOTICE '   a. Check product-specific override';
    RAISE NOTICE '   b. If no override, get global modifier %%';
    RAISE NOTICE '3. If override found → use override recipe';
    RAISE NOTICE '4. If no override → base recipe × (1 + modifier%%)';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Example:';
    RAISE NOTICE '- Americano base = 10g Coffee Beans';
    RAISE NOTICE '- Large modifier = +50%%';
    RAISE NOTICE '- Americano Large = 10g × 1.5 = 15g';
    RAISE NOTICE '========================================';
END $$;
