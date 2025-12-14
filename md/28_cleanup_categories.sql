-- ============================================
-- Cleanup Categories - Remove duplicates and incorrect data
-- ============================================

-- Step 1: Delete incorrect/duplicate categories
DELETE FROM categories 
WHERE name IN ('Coffee Coffee', 'Utensils', 'Crossed Food')
  OR name LIKE '%Utensils%'
  OR name LIKE '%Crossed%';

-- Step 2: Delete all existing categories to start fresh
-- WARNING: This will delete all categories. Make sure products can handle NULL category_id
-- or run this when no critical data depends on category IDs
DELETE FROM categories;

-- Step 3: Insert correct categories with Heroicon names
INSERT INTO categories (name, icon, sort_order, is_active) VALUES
  ('Coffee', 'Coffee', 1, true),
  ('Food', 'UtensilsCrossed', 2, true),
  ('Snack', 'Cookie', 3, true),
  ('Dessert', 'Cake', 4, true),
  ('Non Coffee', 'Milk', 5, true);

-- Verify the result
SELECT * FROM categories WHERE is_active = true ORDER BY sort_order;
