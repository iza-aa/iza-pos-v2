-- ============================================
-- AUTO DEDUCT INVENTORY ON ORDER
-- ============================================
-- This creates a trigger that automatically:
-- 1. Creates usage_transaction when order is paid
-- 2. Deducts inventory stock based on recipe ingredients
-- 3. Creates usage_transaction_details for tracking

-- ============================================
-- FUNCTION: Process Inventory Deduction
-- ============================================

CREATE OR REPLACE FUNCTION process_inventory_deduction()
RETURNS TRIGGER AS $$
DECLARE
  order_item RECORD;
  recipe RECORD;
  ingredient RECORD;
  transaction_id UUID;
  current_stock_amount DECIMAL;
  new_stock_amount DECIMAL;
BEGIN
  -- Only process if payment status is 'paid'
  -- For INSERT: OLD is NULL, just check NEW
  -- For UPDATE: check if changed to 'paid'
  IF NEW.payment_status = 'paid' AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'paid') THEN
    
    RAISE NOTICE 'Processing inventory deduction for order: %', NEW.order_number;
    
    -- Create a usage transaction for this order
    INSERT INTO usage_transactions (
      type,
      product_id,
      product_name,
      quantity_sold,
      notes,
      timestamp,
      performed_by
    )
    VALUES (
      'sale',
      NULL, -- Will be set per product in details
      'Order #' || NEW.order_number,
      NULL, -- Total items calculated from order_items
      'Auto-deducted from Order #' || NEW.order_number,
      NEW.updated_at,
      NEW.created_by
    )
    RETURNING id INTO transaction_id;
    
    RAISE NOTICE 'Created usage transaction: %', transaction_id;

    -- Loop through each order item
    FOR order_item IN 
      SELECT oi.*, p.name as product_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = NEW.id
    LOOP
      
      RAISE NOTICE 'Processing order item: % (product_id: %, has variants: %)', 
        order_item.product_name, order_item.product_id, (order_item.variants IS NOT NULL);
      
      -- Process variant-specific recipes if order has variants (not null and not empty object)
      IF order_item.variants IS NOT NULL AND order_item.variants::text != '{}'::text THEN
        -- Loop through each variant option in the order
        DECLARE
          variant_option JSONB;
          variant_option_id TEXT;
          variant_group_id TEXT;
          recipe_found BOOLEAN := FALSE;
        BEGIN
          FOR variant_option IN SELECT * FROM jsonb_array_elements(order_item.variants)
          LOOP
            -- Extract variant option ID and group ID from the variant object
            variant_option_id := variant_option->>'optionId';
            variant_group_id := variant_option->>'groupId';
            
            RAISE NOTICE 'Looking for recipe with groupId: % and optionId: %', variant_group_id, variant_option_id;
            
            -- Find recipe for this specific variant option
            FOR recipe IN
              SELECT r.* FROM recipes r
              WHERE r.variant_combination->>variant_group_id = variant_option_id
            LOOP
              recipe_found := TRUE;
              RAISE NOTICE 'Found variant recipe: % (id: %)', recipe.product_name, recipe.id;
              
              -- Loop through recipe ingredients
              FOR ingredient IN
                SELECT * FROM recipe_ingredients
                WHERE recipe_id = recipe.id
              LOOP
                
                -- Calculate total quantity needed (recipe amount * order quantity)
                DECLARE
                  total_needed DECIMAL;
                BEGIN
                  total_needed := ingredient.quantity_needed * order_item.quantity;
                  
                  RAISE NOTICE 'Deducting % % of %', total_needed, ingredient.unit, ingredient.ingredient_name;
                  
                  -- Get current stock
                  SELECT current_stock INTO current_stock_amount
                  FROM inventory_items
                  WHERE id = ingredient.inventory_item_id;
                  
                  -- Calculate new stock
                  new_stock_amount := current_stock_amount - total_needed;
                  
                  -- Update inventory stock
                  UPDATE inventory_items
                  SET 
                    current_stock = new_stock_amount,
                    status = CASE 
                      WHEN new_stock_amount <= 0 THEN 'out-of-stock'
                      WHEN new_stock_amount <= reorder_level THEN 'low-stock'
                      ELSE 'in-stock'
                    END,
                    updated_at = NOW()
                  WHERE id = ingredient.inventory_item_id;
                  
                  -- Create transaction detail record
                  INSERT INTO usage_transaction_details (
                    usage_transaction_id,
                    inventory_item_id,
                    ingredient_name,
                    quantity_used,
                    unit,
                    previous_stock,
                    new_stock
                  )
                  VALUES (
                    transaction_id,
                    ingredient.inventory_item_id,
                    ingredient.ingredient_name,
                    total_needed,
                    ingredient.unit,
                    current_stock_amount,
                    new_stock_amount
                  );
                  
                  RAISE NOTICE 'Stock updated: % -> %', current_stock_amount, new_stock_amount;
                  
                END;
                
              END LOOP; -- End ingredient loop
              
            END LOOP; -- End recipe loop
            
          END LOOP; -- End variant loop
          
          IF NOT recipe_found THEN
            RAISE NOTICE 'No variant recipes found, trying base recipe for product_id: %', order_item.product_id;
          END IF;
        END;
      END IF; -- End variants check
      
      -- Process base recipe if no variants or empty variants
      IF order_item.variants IS NULL 
         OR order_item.variants = '{}'::jsonb 
         OR order_item.variants = '[]'::jsonb 
         OR jsonb_typeof(order_item.variants) = 'null' THEN
        RAISE NOTICE 'No variants, looking for base recipe for product_id: %', order_item.product_id;
        
        FOR recipe IN
          SELECT r.* FROM recipes r
          WHERE r.product_id = order_item.product_id
          AND r.recipe_type = 'base'
          LIMIT 1
        LOOP
          RAISE NOTICE 'Found base recipe: % (id: %)', recipe.product_name, recipe.id;
          
          -- Loop through recipe ingredients
          FOR ingredient IN
            SELECT * FROM recipe_ingredients
            WHERE recipe_id = recipe.id
          LOOP
            
            DECLARE
              total_needed DECIMAL;
            BEGIN
              total_needed := ingredient.quantity_needed * order_item.quantity;
              
              RAISE NOTICE 'Deducting % % of %', total_needed, ingredient.unit, ingredient.ingredient_name;
              
              -- Get current stock
              SELECT current_stock INTO current_stock_amount
              FROM inventory_items
              WHERE id = ingredient.inventory_item_id;
              
              -- Calculate new stock
              new_stock_amount := current_stock_amount - total_needed;
              
              -- Update inventory stock
              UPDATE inventory_items
              SET 
                current_stock = new_stock_amount,
                status = CASE 
                  WHEN new_stock_amount <= 0 THEN 'out-of-stock'
                  WHEN new_stock_amount <= reorder_level THEN 'low-stock'
                  ELSE 'in-stock'
                END,
                updated_at = NOW()
              WHERE id = ingredient.inventory_item_id;
              
              -- Create transaction detail record
              INSERT INTO usage_transaction_details (
                usage_transaction_id,
                inventory_item_id,
                ingredient_name,
                quantity_used,
                unit,
                previous_stock,
                new_stock
              )
              VALUES (
                transaction_id,
                ingredient.inventory_item_id,
                ingredient.ingredient_name,
                total_needed,
                ingredient.unit,
                current_stock_amount,
                new_stock_amount
              );
              
              RAISE NOTICE 'Stock updated: % -> %', current_stock_amount, new_stock_amount;
              
            END;
            
          END LOOP; -- End ingredient loop
          
        END LOOP; -- End base recipe loop
      END IF; -- End base recipe check
      
    END LOOP; -- End order item loop
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Auto Deduct on Order Insert/Update
-- ============================================

DROP TRIGGER IF EXISTS trigger_auto_deduct_inventory ON orders;

CREATE TRIGGER trigger_auto_deduct_inventory
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION process_inventory_deduction();

-- ============================================
-- VERIFICATION
-- ============================================

-- Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_deduct_inventory';

-- Test query to see current stock levels
SELECT 
  name,
  current_stock,
  reorder_level,
  unit,
  status
FROM inventory_items
WHERE name IN ('Coffee Beans', 'Cup Medium', 'Milk', 'Caramel Syrup')
ORDER BY name;

COMMENT ON FUNCTION process_inventory_deduction() IS 
'Automatically deducts inventory stock based on recipe ingredients when order is marked as paid. Creates usage_transaction records for tracking.';

COMMENT ON TRIGGER trigger_auto_deduct_inventory ON orders IS 
'Triggers inventory deduction when order payment_status changes to paid';
