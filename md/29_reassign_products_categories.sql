-- ============================================
-- Re-assign Products to New Categories
-- After cleanup, products need to be re-assigned to new category IDs
-- ============================================

-- Get the new category IDs (you'll need to check your actual IDs from Supabase)
-- This is a template - adjust category IDs based on your database

-- Option 1: If you want to assign all products to "Food" category temporarily
UPDATE products 
SET category_id = (SELECT id FROM categories WHERE name = 'Food' LIMIT 1)
WHERE category_id IS NULL OR category_id NOT IN (SELECT id FROM categories);

-- Option 2: Assign products based on product name keywords (more intelligent)
-- Assign Coffee products
UPDATE products 
SET category_id = (SELECT id FROM categories WHERE name = 'Coffee' LIMIT 1)
WHERE (LOWER(name) LIKE '%coffee%' 
   OR LOWER(name) LIKE '%espresso%'
   OR LOWER(name) LIKE '%cappuccino%'
   OR LOWER(name) LIKE '%latte%'
   OR LOWER(name) LIKE '%americano%'
   OR LOWER(name) LIKE '%macchiato%')
  AND (category_id IS NULL OR category_id NOT IN (SELECT id FROM categories));

-- Assign Non Coffee drinks
UPDATE products 
SET category_id = (SELECT id FROM categories WHERE name = 'Non Coffee' LIMIT 1)
WHERE (LOWER(name) LIKE '%tea%'
   OR LOWER(name) LIKE '%chocolate%'
   OR LOWER(name) LIKE '%milk%'
   OR LOWER(name) LIKE '%juice%'
   OR LOWER(name) LIKE '%matcha%')
  AND (category_id IS NULL OR category_id NOT IN (SELECT id FROM categories));

-- Assign Desserts
UPDATE products 
SET category_id = (SELECT id FROM categories WHERE name = 'Dessert' LIMIT 1)
WHERE (LOWER(name) LIKE '%cake%'
   OR LOWER(name) LIKE '%pudding%'
   OR LOWER(name) LIKE '%ice cream%'
   OR LOWER(name) LIKE '%dessert%')
  AND (category_id IS NULL OR category_id NOT IN (SELECT id FROM categories));

-- Assign Snacks
UPDATE products 
SET category_id = (SELECT id FROM categories WHERE name = 'Snack' LIMIT 1)
WHERE (LOWER(name) LIKE '%fries%'
   OR LOWER(name) LIKE '%chips%'
   OR LOWER(name) LIKE '%nugget%'
   OR LOWER(name) LIKE '%snack%')
  AND (category_id IS NULL OR category_id NOT IN (SELECT id FROM categories));

-- Assign remaining products to Food category
UPDATE products 
SET category_id = (SELECT id FROM categories WHERE name = 'Food' LIMIT 1)
WHERE category_id IS NULL OR category_id NOT IN (SELECT id FROM categories);

-- Verify the result
SELECT 
  p.name as product_name,
  c.name as category_name,
  p.price
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
ORDER BY c.name, p.name;
