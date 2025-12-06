-- ============================================
-- COMPLETE INVENTORY SETUP
-- ============================================
-- This script creates complete inventory matching existing menu:
-- - Americano
-- - Caramel Macchiato
-- - Nasi Goreng
-- - French Fries


-- ============================================
-- STEP 1: CLEAR EXISTING DATA (Optional)
-- ============================================
-- Uncomment if you want to start fresh
-- DELETE FROM usage_transaction_details;
-- DELETE FROM usage_transactions;
-- DELETE FROM recipe_ingredients;
-- DELETE FROM recipes;
-- DELETE FROM inventory_items;

-- ============================================
-- STEP 2: RAW MATERIALS (INVENTORY ITEMS)
-- ============================================

-- Coffee & Beverage Ingredients
INSERT INTO inventory_items (name, category, current_stock, reorder_level, unit, supplier, cost_per_unit, status)
SELECT * FROM (VALUES
  ('Coffee Beans', 'Ingredients', 5000, 1000, 'gram', 'PT Kopi Nusantara', 100, 'in-stock'),
  ('Milk', 'Ingredients', 10000, 3000, 'ml', 'Dairy Farm Ltd', 15, 'in-stock'),
  ('Sugar', 'Ingredients', 5000, 1000, 'gram', 'Sweet Supply Co', 10, 'in-stock'),
  ('Vanilla Syrup', 'Ingredients', 2000, 500, 'ml', 'Flavor World', 50, 'in-stock'),
  ('Caramel Syrup', 'Ingredients', 1500, 300, 'ml', 'Flavor World', 55, 'in-stock'),
  ('Whipped Cream', 'Ingredients', 1000, 500, 'gram', 'Dairy Farm Ltd', 80, 'in-stock'),
  ('Ice Cubes', 'Ingredients', 10000, 2000, 'gram', 'Local Supplier', 5, 'in-stock')
) AS v(name, category, current_stock, reorder_level, unit, supplier, cost_per_unit, status)
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_items WHERE inventory_items.name = v.name
);

-- Food Ingredients
INSERT INTO inventory_items (name, category, current_stock, reorder_level, unit, supplier, cost_per_unit, status)
SELECT * FROM (VALUES
  ('Rice', 'Ingredients', 10000, 3000, 'gram', 'Local Farm', 12, 'in-stock'),
  ('Chicken Breast', 'Ingredients', 5000, 2000, 'gram', 'Fresh Meat Ltd', 45, 'in-stock'),
  ('Eggs', 'Ingredients', 3000, 500, 'gram', 'Local Farm', 30, 'in-stock'),
  ('Vegetables Mix', 'Ingredients', 3000, 1000, 'gram', 'Veggie Mart', 20, 'in-stock'),
  ('Garlic', 'Ingredients', 1000, 200, 'gram', 'Local Farm', 25, 'in-stock'),
  ('Shallots', 'Ingredients', 1000, 200, 'gram', 'Local Farm', 25, 'in-stock'),
  ('Soy Sauce', 'Ingredients', 2000, 500, 'ml', 'Condiment Co', 15, 'in-stock'),
  ('Sweet Soy Sauce', 'Ingredients', 2000, 500, 'ml', 'Condiment Co', 18, 'in-stock'),
  ('Cooking Oil', 'Ingredients', 5000, 1000, 'ml', 'Oil Co', 25, 'in-stock'),
  ('Salt', 'Ingredients', 2000, 500, 'gram', 'Local Supplier', 5, 'in-stock'),
  ('Pepper', 'Ingredients', 500, 100, 'gram', 'Spice World', 50, 'in-stock')
) AS v(name, category, current_stock, reorder_level, unit, supplier, cost_per_unit, status)
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_items WHERE inventory_items.name = v.name
);

-- Snack Ingredients
INSERT INTO inventory_items (name, category, current_stock, reorder_level, unit, supplier, cost_per_unit, status)
SELECT * FROM (VALUES
  ('Potatoes', 'Ingredients', 8000, 2000, 'gram', 'Veggie Mart', 15, 'in-stock')
) AS v(name, category, current_stock, reorder_level, unit, supplier, cost_per_unit, status)
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_items WHERE inventory_items.name = v.name
);

-- Packaging Materials
INSERT INTO inventory_items (name, category, current_stock, reorder_level, unit, supplier, cost_per_unit, status)
SELECT * FROM (VALUES
  ('Cup Small (8oz)', 'Packaging', 500, 100, 'pcs', 'Package Pro', 1000, 'in-stock'),
  ('Cup Medium (12oz)', 'Packaging', 400, 150, 'pcs', 'Package Pro', 1200, 'in-stock'),
  ('Cup Large (16oz)', 'Packaging', 300, 100, 'pcs', 'Package Pro', 1500, 'in-stock'),
  ('Plastic Lids', 'Packaging', 800, 300, 'pcs', 'Package Pro', 500, 'in-stock'),
  ('Straws', 'Packaging', 1000, 200, 'pcs', 'Package Pro', 300, 'in-stock'),
  ('Food Container', 'Packaging', 300, 100, 'pcs', 'Package Pro', 2000, 'in-stock'),
  ('Napkins', 'Packaging', 2000, 500, 'pcs', 'Package Pro', 100, 'in-stock')
) AS v(name, category, current_stock, reorder_level, unit, supplier, cost_per_unit, status)
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_items WHERE inventory_items.name = v.name
);

-- ============================================
-- STEP 3: RECIPES (BASE RECIPES)
-- ============================================

-- Recipe for Americano (Base - Regular/Medium size)
DO $$
DECLARE
  v_product_id UUID;
  v_recipe_id UUID;
  v_coffee_beans_id UUID;
  v_cup_medium_id UUID;
  v_lid_id UUID;
BEGIN
  -- Get product and ingredient IDs
  SELECT id INTO v_product_id FROM products WHERE name = 'Americano' LIMIT 1;
  SELECT id INTO v_coffee_beans_id FROM inventory_items WHERE name = 'Coffee Beans';
  SELECT id INTO v_cup_medium_id FROM inventory_items WHERE name = 'Cup Medium (12oz)';
  SELECT id INTO v_lid_id FROM inventory_items WHERE name = 'Plastic Lids';
  
  -- Check if recipe already exists
  SELECT id INTO v_recipe_id FROM recipes 
  WHERE product_id = v_product_id AND recipe_type = 'base';
  
  IF v_recipe_id IS NULL THEN
    -- Insert recipe
    INSERT INTO recipes (product_id, product_name, recipe_type)
    VALUES (v_product_id, 'Americano', 'base')
    RETURNING id INTO v_recipe_id;
    
    -- Insert recipe ingredients
    INSERT INTO recipe_ingredients (recipe_id, inventory_item_id, ingredient_name, quantity_needed, unit)
    VALUES 
      (v_recipe_id, v_coffee_beans_id, 'Coffee Beans', 18, 'gram'),
      (v_recipe_id, v_cup_medium_id, 'Cup Medium (12oz)', 1, 'pcs'),
      (v_recipe_id, v_lid_id, 'Plastic Lids', 1, 'pcs');
  END IF;
END $$;

-- Recipe for Caramel Macchiato (Base - Regular/Medium size)
DO $$
DECLARE
  v_product_id UUID;
  v_recipe_id UUID;
  v_coffee_id UUID;
  v_milk_id UUID;
  v_vanilla_id UUID;
  v_caramel_id UUID;
  v_cup_id UUID;
  v_lid_id UUID;
  v_whipped_id UUID;
BEGIN
  -- Get IDs
  SELECT id INTO v_product_id FROM products WHERE name = 'Caramel Macchiato' LIMIT 1;
  SELECT id INTO v_coffee_id FROM inventory_items WHERE name = 'Coffee Beans';
  SELECT id INTO v_milk_id FROM inventory_items WHERE name = 'Milk';
  SELECT id INTO v_vanilla_id FROM inventory_items WHERE name = 'Vanilla Syrup';
  SELECT id INTO v_caramel_id FROM inventory_items WHERE name = 'Caramel Syrup';
  SELECT id INTO v_cup_id FROM inventory_items WHERE name = 'Cup Medium (12oz)';
  SELECT id INTO v_lid_id FROM inventory_items WHERE name = 'Plastic Lids';
  SELECT id INTO v_whipped_id FROM inventory_items WHERE name = 'Whipped Cream';
  
  -- Check if exists
  SELECT id INTO v_recipe_id FROM recipes 
  WHERE product_id = v_product_id AND recipe_type = 'base';
  
  IF v_recipe_id IS NULL THEN
    INSERT INTO recipes (product_id, product_name, recipe_type)
    VALUES (v_product_id, 'Caramel Macchiato', 'base')
    RETURNING id INTO v_recipe_id;
    
    INSERT INTO recipe_ingredients (recipe_id, inventory_item_id, ingredient_name, quantity_needed, unit)
    VALUES 
      (v_recipe_id, v_coffee_id, 'Coffee Beans', 18, 'gram'),
      (v_recipe_id, v_milk_id, 'Milk', 150, 'ml'),
      (v_recipe_id, v_vanilla_id, 'Vanilla Syrup', 15, 'ml'),
      (v_recipe_id, v_caramel_id, 'Caramel Syrup', 20, 'ml'),
      (v_recipe_id, v_whipped_id, 'Whipped Cream', 10, 'gram'),
      (v_recipe_id, v_cup_id, 'Cup Medium (12oz)', 1, 'pcs'),
      (v_recipe_id, v_lid_id, 'Plastic Lids', 1, 'pcs');
  END IF;
END $$;

-- Recipe for Nasi Goreng
DO $$
DECLARE
  v_product_id UUID;
  v_recipe_id UUID;
  v_rice_id UUID;
  v_chicken_id UUID;
  v_egg_id UUID;
  v_veg_id UUID;
  v_garlic_id UUID;
  v_shallot_id UUID;
  v_soy_id UUID;
  v_sweet_soy_id UUID;
  v_oil_id UUID;
  v_salt_id UUID;
  v_pepper_id UUID;
  v_container_id UUID;
BEGIN
  -- Get IDs
  SELECT id INTO v_product_id FROM products WHERE name = 'Nasi Goreng' LIMIT 1;
  SELECT id INTO v_rice_id FROM inventory_items WHERE name = 'Rice';
  SELECT id INTO v_chicken_id FROM inventory_items WHERE name = 'Chicken Breast';
  SELECT id INTO v_egg_id FROM inventory_items WHERE name = 'Eggs';
  SELECT id INTO v_veg_id FROM inventory_items WHERE name = 'Vegetables Mix';
  SELECT id INTO v_garlic_id FROM inventory_items WHERE name = 'Garlic';
  SELECT id INTO v_shallot_id FROM inventory_items WHERE name = 'Shallots';
  SELECT id INTO v_soy_id FROM inventory_items WHERE name = 'Soy Sauce';
  SELECT id INTO v_sweet_soy_id FROM inventory_items WHERE name = 'Sweet Soy Sauce';
  SELECT id INTO v_oil_id FROM inventory_items WHERE name = 'Cooking Oil';
  SELECT id INTO v_salt_id FROM inventory_items WHERE name = 'Salt';
  SELECT id INTO v_pepper_id FROM inventory_items WHERE name = 'Pepper';
  SELECT id INTO v_container_id FROM inventory_items WHERE name = 'Food Container';
  
  SELECT id INTO v_recipe_id FROM recipes 
  WHERE product_id = v_product_id AND recipe_type = 'base';
  
  IF v_recipe_id IS NULL THEN
    INSERT INTO recipes (product_id, product_name, recipe_type)
    VALUES (v_product_id, 'Nasi Goreng', 'base')
    RETURNING id INTO v_recipe_id;
    
    INSERT INTO recipe_ingredients (recipe_id, inventory_item_id, ingredient_name, quantity_needed, unit)
    VALUES 
      (v_recipe_id, v_rice_id, 'Rice', 200, 'gram'),
      (v_recipe_id, v_chicken_id, 'Chicken Breast', 80, 'gram'),
      (v_recipe_id, v_egg_id, 'Eggs', 50, 'gram'),
      (v_recipe_id, v_veg_id, 'Vegetables Mix', 50, 'gram'),
      (v_recipe_id, v_garlic_id, 'Garlic', 5, 'gram'),
      (v_recipe_id, v_shallot_id, 'Shallots', 5, 'gram'),
      (v_recipe_id, v_soy_id, 'Soy Sauce', 10, 'ml'),
      (v_recipe_id, v_sweet_soy_id, 'Sweet Soy Sauce', 15, 'ml'),
      (v_recipe_id, v_oil_id, 'Cooking Oil', 20, 'ml'),
      (v_recipe_id, v_salt_id, 'Salt', 2, 'gram'),
      (v_recipe_id, v_pepper_id, 'Pepper', 1, 'gram'),
      (v_recipe_id, v_container_id, 'Food Container', 1, 'pcs');
  END IF;
END $$;

-- Recipe for French Fries (Base - Regular/Medium size)
DO $$
DECLARE
  v_product_id UUID;
  v_recipe_id UUID;
  v_potato_id UUID;
  v_oil_id UUID;
  v_salt_id UUID;
  v_container_id UUID;
BEGIN
  -- Get IDs
  SELECT id INTO v_product_id FROM products WHERE name = 'French Fries' LIMIT 1;
  SELECT id INTO v_potato_id FROM inventory_items WHERE name = 'Potatoes';
  SELECT id INTO v_oil_id FROM inventory_items WHERE name = 'Cooking Oil';
  SELECT id INTO v_salt_id FROM inventory_items WHERE name = 'Salt';
  SELECT id INTO v_container_id FROM inventory_items WHERE name = 'Food Container';
  
  SELECT id INTO v_recipe_id FROM recipes 
  WHERE product_id = v_product_id AND recipe_type = 'base';
  
  IF v_recipe_id IS NULL THEN
    INSERT INTO recipes (product_id, product_name, recipe_type)
    VALUES (v_product_id, 'French Fries', 'base')
    RETURNING id INTO v_recipe_id;
    
    INSERT INTO recipe_ingredients (recipe_id, inventory_item_id, ingredient_name, quantity_needed, unit)
    VALUES 
      (v_recipe_id, v_potato_id, 'Potatoes', 150, 'gram'),
      (v_recipe_id, v_oil_id, 'Cooking Oil', 50, 'ml'),
      (v_recipe_id, v_salt_id, 'Salt', 3, 'gram'),
      (v_recipe_id, v_container_id, 'Food Container', 1, 'pcs');
  END IF;
END $$;

-- ============================================
-- STEP 4: VERIFICATION QUERIES
-- ============================================

-- Check inventory items
SELECT 
  category,
  COUNT(*) as item_count,
  SUM(current_stock * cost_per_unit) as total_value
FROM inventory_items
GROUP BY category
ORDER BY category;

-- Check recipes
SELECT 
  r.product_name,
  r.recipe_type,
  COUNT(ri.id) as ingredient_count
FROM recipes r
LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
GROUP BY r.id, r.product_name, r.recipe_type
ORDER BY r.product_name;

-- Check recipe details
SELECT 
  r.product_name,
  ri.ingredient_name,
  ri.quantity_needed,
  ri.unit,
  ii.current_stock as available_stock,
  FLOOR(ii.current_stock / ri.quantity_needed) as can_make
FROM recipes r
JOIN recipe_ingredients ri ON r.id = ri.recipe_id
JOIN inventory_items ii ON ri.inventory_item_id = ii.id
WHERE r.recipe_type = 'base'
ORDER BY r.product_name, ri.ingredient_name;

-- Summary
SELECT 
  'Inventory Items' as item_type, 
  COUNT(*) as total 
FROM inventory_items
UNION ALL
SELECT 'Recipes', COUNT(*) FROM recipes
UNION ALL
SELECT 'Recipe Ingredients', COUNT(*) FROM recipe_ingredients;
