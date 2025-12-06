-- ====================================================================
-- FILE: 14_fix_trigger_on_order_items.sql
-- PURPOSE: Fix inventory auto-deduction by moving trigger to order_items
-- PROBLEM SOLVED: Race condition where orders trigger fires before order_items exist
-- SOLUTION: Trigger on order_items AFTER INSERT instead of orders
-- ====================================================================

-- Step 1: Drop old triggers and functions
DROP TRIGGER IF EXISTS trigger_auto_deduct_inventory ON orders;
DROP TRIGGER IF EXISTS trigger_deduct_inventory_on_item ON order_items;
DROP FUNCTION IF EXISTS process_inventory_deduction();
DROP FUNCTION IF EXISTS deduct_inventory_on_order_item();

-- Step 2: Create new function that processes per order item
CREATE OR REPLACE FUNCTION deduct_inventory_on_order_item()
RETURNS TRIGGER AS $$
DECLARE
    v_order_status TEXT;
    v_payment_status TEXT;
    v_usage_tx_id UUID;
    v_recipe_id UUID;
    v_ingredient RECORD;
    v_new_stock DECIMAL(10,2);
    v_product_name TEXT;
    v_variant_size TEXT;
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
    
    -- Find the appropriate recipe
    -- Check if variants is empty/null (base recipe) or has content (variant-specific)
    IF NEW.variants IS NULL 
       OR NEW.variants = '{}'::jsonb 
       OR NEW.variants = '[]'::jsonb
       OR jsonb_typeof(NEW.variants) = 'null' THEN
        -- Use base recipe
        SELECT id INTO v_recipe_id
        FROM recipes
        WHERE product_id = NEW.product_id
          AND recipe_type = 'base'
        LIMIT 1;
        
        RAISE NOTICE 'Using BASE recipe for product_id: %', NEW.product_id;
    ELSE
        -- Extract size variant if exists
        -- Format from POS: {"Size": ["Large"]} or {"size": "Large"}
        -- Try both formats
        v_variant_size := NEW.variants->>'size';
        IF v_variant_size IS NULL THEN
            -- Try uppercase 'Size' key and extract first element from array
            v_variant_size := NEW.variants->'Size'->>0;
        END IF;
        
        IF v_variant_size IS NOT NULL THEN
            -- Try to find variant-specific recipe
            SELECT id INTO v_recipe_id
            FROM recipes
            WHERE product_id = NEW.product_id
              AND recipe_type = 'variant-specific'
              AND variant_name = v_variant_size
            LIMIT 1;
            
            RAISE NOTICE 'Looking for VARIANT recipe: size=%', v_variant_size;
            
            -- Fallback to base recipe if variant not found
            IF v_recipe_id IS NULL THEN
                SELECT id INTO v_recipe_id
                FROM recipes
                WHERE product_id = NEW.product_id
                  AND recipe_type = 'base'
                LIMIT 1;
                
                RAISE NOTICE 'Variant recipe not found, using BASE recipe';
            END IF;
        ELSE
            -- No size variant, use base recipe
            SELECT id INTO v_recipe_id
            FROM recipes
            WHERE product_id = NEW.product_id
              AND recipe_type = 'base'
            LIMIT 1;
            
            RAISE NOTICE 'No size variant, using BASE recipe';
        END IF;
    END IF;
    
    -- If no recipe found, skip
    IF v_recipe_id IS NULL THEN
        RAISE NOTICE 'No recipe found for product_id: %', NEW.product_id;
        RETURN NEW;
    END IF;
    
    RAISE NOTICE 'Found recipe_id: %', v_recipe_id;
    
    -- Process all ingredients in the recipe
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
        -- Calculate total quantity needed (recipe quantity * order quantity)
        DECLARE
            v_total_qty_needed DECIMAL(10,2);
        BEGIN
            v_total_qty_needed := v_ingredient.quantity_needed * NEW.quantity;
            
            RAISE NOTICE 'Ingredient: % - Current stock: % %, Need: % %', 
                v_ingredient.name,
                v_ingredient.current_stock,
                v_ingredient.unit,
                v_total_qty_needed,
                v_ingredient.unit;
            
            -- Calculate new stock
            v_new_stock := v_ingredient.current_stock - v_total_qty_needed;
            
            IF v_new_stock < 0 THEN
                RAISE NOTICE 'WARNING: Negative stock for %! Current: %, Deduct: %, Result: %',
                    v_ingredient.name,
                    v_ingredient.current_stock,
                    v_total_qty_needed,
                    v_new_stock;
            END IF;
            
            -- Update inventory stock
            UPDATE inventory_items
            SET current_stock = v_new_stock,
                updated_at = NOW()
            WHERE id = v_ingredient.inventory_item_id;
            
            RAISE NOTICE 'Updated stock: % from % to %', 
                v_ingredient.name,
                v_ingredient.current_stock,
                v_new_stock;
            
            -- Create usage transaction detail
            INSERT INTO usage_transaction_details (
                usage_transaction_id,
                inventory_item_id,
                ingredient_name,
                quantity_used,
                unit,
                previous_stock,
                new_stock
            ) VALUES (
                v_usage_tx_id,
                v_ingredient.inventory_item_id,
                v_ingredient.name,
                v_total_qty_needed,
                v_ingredient.unit,
                v_ingredient.current_stock,
                v_new_stock
            );
            
            RAISE NOTICE 'Created usage_transaction_detail for %', v_ingredient.name;
        END;
    END LOOP;
    
    RAISE NOTICE '✓ Completed processing order_item_id: %', NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger on order_items table
CREATE TRIGGER trigger_deduct_inventory_on_item
    AFTER INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION deduct_inventory_on_order_item();

-- Verification queries
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TRIGGER INSTALLATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Trigger: trigger_deduct_inventory_on_item';
    RAISE NOTICE 'Table: order_items';
    RAISE NOTICE 'Event: AFTER INSERT';
    RAISE NOTICE 'Function: deduct_inventory_on_order_item()';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'HOW IT WORKS:';
    RAISE NOTICE '1. Customer places order in POS';
    RAISE NOTICE '2. Order is created with payment_status=paid';
    RAISE NOTICE '3. Order items are inserted';
    RAISE NOTICE '4. Trigger fires for EACH order item';
    RAISE NOTICE '5. Inventory is deducted immediately';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST: Order Americano Medium and check Coffee Beans stock';
    RAISE NOTICE '========================================';
END $$;
