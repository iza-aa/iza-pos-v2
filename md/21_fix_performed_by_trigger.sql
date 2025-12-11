-- ====================================================================
-- FILE: 21_fix_performed_by_trigger.sql
-- PURPOSE: Add performed_by field to usage_transactions trigger
-- FIX: Trigger tidak set performed_by saat create transaction
-- ====================================================================

-- Drop and recreate the trigger function with performed_by support
CREATE OR REPLACE FUNCTION deduct_inventory_on_order_item()
RETURNS TRIGGER AS $$
DECLARE
    v_order_status TEXT;
    v_payment_status TEXT;
    v_created_by UUID;
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
    -- Get order payment status and creator
    SELECT status, payment_status, created_by 
    INTO v_order_status, v_payment_status, v_created_by
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
            performed_by,
            created_at
        ) VALUES (
            NEW.order_id,
            'order_usage',
            'Auto-deduct from order #' || NEW.order_id,
            v_created_by,  -- ← ADD THIS: Set staff who created the order
            NOW()
        ) RETURNING id INTO v_usage_tx_id;
        
        RAISE NOTICE 'Created usage_transaction: % by staff: %', v_usage_tx_id, v_created_by;
    END IF;
    
    -- Get product name for logging
    SELECT name INTO v_product_name
    FROM products
    WHERE id = NEW.product_id;
    
    RAISE NOTICE 'Processing order_item: product=%, variants=%', v_product_name, NEW.variants;
    
    -- ============================================
    -- HYBRID SYSTEM: Check Override → Base + Modifier
    -- ============================================
    
    -- Step 1: Try to find product override recipe
    IF NEW.variants IS NOT NULL AND jsonb_array_length(NEW.variants) > 0 THEN
        RAISE NOTICE 'Checking for product override...';
        
        SELECT pr.id INTO v_recipe_id
        FROM product_recipe_overrides pr
        WHERE pr.product_id = NEW.product_id
        AND pr.variant_combination = NEW.variants
        LIMIT 1;
        
        IF v_recipe_id IS NOT NULL THEN
            v_has_override := true;
            RAISE NOTICE 'Found product override: %', v_recipe_id;
            
            -- Deduct ingredients from override recipe
            FOR v_ingredient IN
                SELECT ri.*, ii.current_stock, ii.name as ingredient_name
                FROM recipe_ingredients ri
                JOIN inventory_items ii ON ri.inventory_item_id = ii.id
                WHERE ri.recipe_id = v_recipe_id
            LOOP
                -- Calculate new stock
                v_new_stock := v_ingredient.current_stock - (v_ingredient.quantity_needed * NEW.quantity);
                
                -- Update inventory
                UPDATE inventory_items
                SET current_stock = v_new_stock,
                    updated_at = NOW()
                WHERE id = v_ingredient.inventory_item_id;
                
                -- Insert usage transaction detail
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
                    v_ingredient.ingredient_name,
                    v_ingredient.quantity_needed * NEW.quantity,
                    v_ingredient.unit,
                    v_ingredient.current_stock,
                    v_new_stock
                );
                
                RAISE NOTICE 'Deducted from override: % - % %', 
                    v_ingredient.ingredient_name, 
                    v_ingredient.quantity_needed * NEW.quantity,
                    v_ingredient.unit;
            END LOOP;
        END IF;
    END IF;
    
    -- Step 2: If no override, use base recipe + modifiers
    IF NOT v_has_override THEN
        RAISE NOTICE 'No override found, using base recipe + modifiers';
        
        -- Get base recipe
        SELECT r.id INTO v_base_recipe_id
        FROM recipes r
        WHERE r.product_id = NEW.product_id
        AND r.recipe_type = 'base'
        LIMIT 1;
        
        IF v_base_recipe_id IS NULL THEN
            RAISE NOTICE 'No base recipe found for product: %', NEW.product_id;
            RETURN NEW;
        END IF;
        
        RAISE NOTICE 'Using base recipe: %', v_base_recipe_id;
        
        -- Deduct base recipe ingredients
        FOR v_ingredient IN
            SELECT ri.*, ii.current_stock, ii.name as ingredient_name
            FROM recipe_ingredients ri
            JOIN inventory_items ii ON ri.inventory_item_id = ii.id
            WHERE ri.recipe_id = v_base_recipe_id
        LOOP
            -- Reset modifier for each ingredient
            v_total_modifier := 0;
            
            -- Calculate modifiers from variants
            IF NEW.variants IS NOT NULL AND jsonb_array_length(NEW.variants) > 0 THEN
                FOR v_variant_key, v_variant_value IN
                    SELECT key, value 
                    FROM jsonb_each_text(NEW.variants::jsonb)
                LOOP
                    SELECT dm.quantity_modifier INTO v_modifier_percentage
                    FROM default_modifiers dm
                    WHERE dm.inventory_item_id = v_ingredient.inventory_item_id
                    AND dm.variant_option_id::text = v_variant_value;
                    
                    IF v_modifier_percentage IS NOT NULL THEN
                        v_total_modifier := v_total_modifier + v_modifier_percentage;
                        RAISE NOTICE 'Applied modifier: % = %', v_variant_value, v_modifier_percentage;
                    END IF;
                END LOOP;
            END IF;
            
            -- Calculate final quantity with modifier
            DECLARE
                v_final_quantity DECIMAL(10,2);
            BEGIN
                v_final_quantity := v_ingredient.quantity_needed * (1 + v_total_modifier / 100) * NEW.quantity;
                v_new_stock := v_ingredient.current_stock - v_final_quantity;
                
                -- Update inventory
                UPDATE inventory_items
                SET current_stock = v_new_stock,
                    updated_at = NOW()
                WHERE id = v_ingredient.inventory_item_id;
                
                -- Insert usage transaction detail
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
                    v_ingredient.ingredient_name,
                    v_final_quantity,
                    v_ingredient.unit,
                    v_ingredient.current_stock,
                    v_new_stock
                );
                
                RAISE NOTICE 'Deducted with modifier: % - % % (modifier: %)', 
                    v_ingredient.ingredient_name, 
                    v_final_quantity,
                    v_ingredient.unit,
                    v_total_modifier;
            END;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- NOTES
-- ====================================================================
-- After running this fix:
-- 1. New orders will automatically set performed_by = staff who created order
-- 2. For existing orders without performed_by, you may need to update manually:
--    UPDATE usage_transactions ut
--    SET performed_by = o.created_by
--    FROM orders o
--    WHERE ut.order_id = o.id
--    AND ut.performed_by IS NULL;
