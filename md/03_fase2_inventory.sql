-- ============================================
-- FASE 2: INVENTORY MANAGEMENT TABLES
-- Jalankan ini di Supabase SQL Editor SETELAH Fase 1
-- ============================================

-- ============================================
-- 1. INVENTORY ITEMS TABLE (Raw Materials)
-- ============================================

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) CHECK (category IN ('Ingredients', 'Packaging', 'Supplies')),
  current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
  reorder_level DECIMAL(10, 2) NOT NULL DEFAULT 0,
  unit VARCHAR(20) NOT NULL,
  supplier VARCHAR(100),
  cost_per_unit DECIMAL(10, 2) DEFAULT 0,
  last_restocked DATE,
  status VARCHAR(20) DEFAULT 'in-stock' CHECK (status IN ('in-stock', 'low-stock', 'out-of-stock')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample inventory items
INSERT INTO inventory_items (name, category, current_stock, reorder_level, unit, supplier, cost_per_unit, status) VALUES
-- Coffee Ingredients
('Coffee Beans', 'Ingredients', 5000, 1000, 'gram', 'PT Kopi Nusantara', 100, 'in-stock'),
('Milk', 'Ingredients', 8000, 3000, 'ml', 'Dairy Farm Ltd', 15, 'in-stock'),
('Sugar', 'Ingredients', 5000, 1000, 'gram', 'Sweet Supply Co', 10, 'in-stock'),
('Vanilla Syrup', 'Ingredients', 2000, 500, 'ml', 'Flavor World', 50, 'in-stock'),
('Caramel Syrup', 'Ingredients', 500, 300, 'ml', 'Flavor World', 55, 'low-stock'),
('Whipped Cream', 'Ingredients', 1000, 500, 'gram', 'Dairy Farm Ltd', 80, 'in-stock'),

-- Packaging
('Cup Small', 'Packaging', 500, 100, 'pcs', 'Package Pro', 1000, 'in-stock'),
('Cup Medium', 'Packaging', 200, 150, 'pcs', 'Package Pro', 1200, 'low-stock'),
('Cup Large', 'Packaging', 300, 100, 'pcs', 'Package Pro', 1500, 'in-stock'),
('Plastic Lids', 'Packaging', 150, 300, 'pcs', 'Package Pro', 500, 'low-stock'),

-- Food Ingredients
('Rice', 'Ingredients', 10000, 3000, 'gram', 'Local Farm', 12, 'in-stock'),
('Chicken', 'Ingredients', 5000, 2000, 'gram', 'Fresh Meat Ltd', 45, 'in-stock'),
('Vegetables', 'Ingredients', 3000, 1000, 'gram', 'Veggie Mart', 20, 'in-stock'),
('Cooking Oil', 'Ingredients', 5000, 1000, 'ml', 'Oil Co', 25, 'in-stock'),
('Potatoes', 'Ingredients', 8000, 2000, 'gram', 'Veggie Mart', 15, 'in-stock');

-- ============================================
-- 2. RECIPES TABLE
-- ============================================

CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  product_name VARCHAR(100) NOT NULL,
  recipe_type VARCHAR(20) NOT NULL CHECK (recipe_type IN ('base', 'variant-specific')),
  variant_combination JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES staff(id)
);

-- Insert sample recipes
INSERT INTO recipes (product_id, product_name, recipe_type)
SELECT id, 'Americano', 'base'
FROM products WHERE name = 'Americano';

INSERT INTO recipes (product_id, product_name, recipe_type)
SELECT id, 'Caramel Macchiato', 'base'
FROM products WHERE name = 'Caramel Macchiato';

INSERT INTO recipes (product_id, product_name, recipe_type)
SELECT id, 'Nasi Goreng', 'base'
FROM products WHERE name = 'Nasi Goreng';

INSERT INTO recipes (product_id, product_name, recipe_type)
SELECT id, 'French Fries', 'base'
FROM products WHERE name = 'French Fries';

-- ============================================
-- 3. RECIPE INGREDIENTS TABLE
-- ============================================

CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  ingredient_name VARCHAR(100) NOT NULL,
  quantity_needed DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Recipe for Americano (base)
INSERT INTO recipe_ingredients (recipe_id, inventory_item_id, ingredient_name, quantity_needed, unit)
SELECT r.id, i.id, 'Coffee Beans', 18, 'gram'
FROM recipes r, inventory_items i
WHERE r.product_name = 'Americano' AND r.recipe_type = 'base' AND i.name = 'Coffee Beans';

INSERT INTO recipe_ingredients (recipe_id, inventory_item_id, ingredient_name, quantity_needed, unit)
SELECT r.id, i.id, 'Cup Medium', 1, 'pcs'
FROM recipes r, inventory_items i
WHERE r.product_name = 'Americano' AND r.recipe_type = 'base' AND i.name = 'Cup Medium';

-- Recipe for Caramel Macchiato
INSERT INTO recipe_ingredients (recipe_id, inventory_item_id, ingredient_name, quantity_needed, unit)
SELECT r.id, i.id, 'Coffee Beans', 18, 'gram'
FROM recipes r, inventory_items i
WHERE r.product_name = 'Caramel Macchiato' AND i.name = 'Coffee Beans';

INSERT INTO recipe_ingredients (recipe_id, inventory_item_id, ingredient_name, quantity_needed, unit)
SELECT r.id, i.id, 'Milk', 150, 'ml'
FROM recipes r, inventory_items i
WHERE r.product_name = 'Caramel Macchiato' AND i.name = 'Milk';

INSERT INTO recipe_ingredients (recipe_id, inventory_item_id, ingredient_name, quantity_needed, unit)
SELECT r.id, i.id, 'Caramel Syrup', 20, 'ml'
FROM recipes r, inventory_items i
WHERE r.product_name = 'Caramel Macchiato' AND i.name = 'Caramel Syrup';

INSERT INTO recipe_ingredients (recipe_id, inventory_item_id, ingredient_name, quantity_needed, unit)
SELECT r.id, i.id, 'Cup Medium', 1, 'pcs'
FROM recipes r, inventory_items i
WHERE r.product_name = 'Caramel Macchiato' AND i.name = 'Cup Medium';

-- Recipe for Nasi Goreng
INSERT INTO recipe_ingredients (recipe_id, inventory_item_id, ingredient_name, quantity_needed, unit)
SELECT r.id, i.id, 'Rice', 200, 'gram'
FROM recipes r, inventory_items i
WHERE r.product_name = 'Nasi Goreng' AND i.name = 'Rice';

INSERT INTO recipe_ingredients (recipe_id, inventory_item_id, ingredient_name, quantity_needed, unit)
SELECT r.id, i.id, 'Chicken', 100, 'gram'
FROM recipes r, inventory_items i
WHERE r.product_name = 'Nasi Goreng' AND i.name = 'Chicken';

INSERT INTO recipe_ingredients (recipe_id, inventory_item_id, ingredient_name, quantity_needed, unit)
SELECT r.id, i.id, 'Vegetables', 50, 'gram'
FROM recipes r, inventory_items i
WHERE r.product_name = 'Nasi Goreng' AND i.name = 'Vegetables';

INSERT INTO recipe_ingredients (recipe_id, inventory_item_id, ingredient_name, quantity_needed, unit)
SELECT r.id, i.id, 'Cooking Oil', 20, 'ml'
FROM recipes r, inventory_items i
WHERE r.product_name = 'Nasi Goreng' AND i.name = 'Cooking Oil';

-- Recipe for French Fries
INSERT INTO recipe_ingredients (recipe_id, inventory_item_id, ingredient_name, quantity_needed, unit)
SELECT r.id, i.id, 'Potatoes', 200, 'gram'
FROM recipes r, inventory_items i
WHERE r.product_name = 'French Fries' AND i.name = 'Potatoes';

INSERT INTO recipe_ingredients (recipe_id, inventory_item_id, ingredient_name, quantity_needed, unit)
SELECT r.id, i.id, 'Cooking Oil', 50, 'ml'
FROM recipes r, inventory_items i
WHERE r.product_name = 'French Fries' AND i.name = 'Cooking Oil';

-- ============================================
-- 4. USAGE TRANSACTIONS TABLE
-- ============================================

CREATE TABLE usage_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP DEFAULT NOW(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('sale', 'restock', 'adjustment', 'waste')),
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(100),
  quantity_sold INT,
  notes TEXT,
  performed_by UUID REFERENCES staff(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 5. USAGE TRANSACTION DETAILS TABLE
-- ============================================

CREATE TABLE usage_transaction_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usage_transaction_id UUID REFERENCES usage_transactions(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id),
  ingredient_name VARCHAR(100) NOT NULL,
  quantity_used DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  previous_stock DECIMAL(10, 2) NOT NULL,
  new_stock DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 6. CREATE INDEXES
-- ============================================

CREATE INDEX idx_inventory_status ON inventory_items(status);
CREATE INDEX idx_inventory_category ON inventory_items(category);
CREATE INDEX idx_recipes_product ON recipes(product_id);
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_usage_transactions_type ON usage_transactions(type);
CREATE INDEX idx_usage_transactions_timestamp ON usage_transactions(timestamp DESC);

-- ============================================
-- 7. VERIFICATION QUERIES
-- ============================================

-- Check all tables
SELECT 'INVENTORY_ITEMS' as table_name, COUNT(*) as total FROM inventory_items
UNION ALL
SELECT 'RECIPES', COUNT(*) FROM recipes
UNION ALL
SELECT 'RECIPE_INGREDIENTS', COUNT(*) FROM recipe_ingredients;

-- View inventory by category
SELECT category, COUNT(*) as items, SUM(current_stock * cost_per_unit) as total_value
FROM inventory_items
GROUP BY category;

-- View recipes with ingredient count
SELECT r.product_name, COUNT(ri.id) as ingredients_count
FROM recipes r
LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
GROUP BY r.id, r.product_name;

-- View low stock items
SELECT name, current_stock, reorder_level, unit, status
FROM inventory_items
WHERE status = 'low-stock'
ORDER BY name;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT '✅ FASE 2 SELESAI!' as status,
       'Tables created: inventory_items, recipes, recipe_ingredients, usage_transactions' as message;
