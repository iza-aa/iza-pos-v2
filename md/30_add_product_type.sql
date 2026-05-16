-- ============================================
-- Add Type Field to Products Table
-- Type determines order routing: 'food' (kitchen) or 'drink' (waiter/barista)
-- ============================================

-- Step 1: Add type column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'food';

-- Step 2: Add check constraint
ALTER TABLE products
ADD CONSTRAINT products_type_check 
CHECK (type IN ('food', 'drink'));

-- Step 3: Remove type from categories (if exists)
ALTER TABLE categories 
DROP COLUMN IF EXISTS type;

-- Step 4: Set product types based on product names (intelligent assignment)

-- Set drink type for coffee products
UPDATE products 
SET type = 'drink'
WHERE LOWER(name) LIKE '%coffee%' 
   OR LOWER(name) LIKE '%espresso%'
   OR LOWER(name) LIKE '%cappuccino%'
   OR LOWER(name) LIKE '%latte%'
   OR LOWER(name) LIKE '%americano%'
   OR LOWER(name) LIKE '%macchiato%'
   OR LOWER(name) LIKE '%mocha%';

-- Set drink type for non-coffee beverages
UPDATE products 
SET type = 'drink'
WHERE LOWER(name) LIKE '%tea%'
   OR LOWER(name) LIKE '%juice%'
   OR LOWER(name) LIKE '%smoothie%'
   OR LOWER(name) LIKE '%milkshake%'
   OR LOWER(name) LIKE '%soda%'
   OR LOWER(name) LIKE '%water%'
   OR LOWER(name) LIKE '%chocolate%' AND LOWER(name) LIKE '%drink%'
   OR LOWER(name) LIKE '%matcha%';

-- Set food type for food items (default, so only update if needed)
UPDATE products 
SET type = 'food'
WHERE LOWER(name) LIKE '%burger%'
   OR LOWER(name) LIKE '%pizza%'
   OR LOWER(name) LIKE '%pasta%'
   OR LOWER(name) LIKE '%rice%'
   OR LOWER(name) LIKE '%noodle%'
   OR LOWER(name) LIKE '%sandwich%'
   OR LOWER(name) LIKE '%steak%'
   OR LOWER(name) LIKE '%chicken%'
   OR LOWER(name) LIKE '%cake%' AND LOWER(name) NOT LIKE '%shake%';

-- Verify the result
SELECT 
  p.name as product_name,
  p.type as product_type,
  c.name as category_name,
  p.price
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
ORDER BY p.type, c.name, p.name;
