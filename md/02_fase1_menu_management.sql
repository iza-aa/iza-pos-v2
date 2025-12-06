-- ============================================
-- FASE 1: MENU MANAGEMENT TABLES
-- Jalankan ini di Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CATEGORIES TABLE
-- ============================================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample categories
INSERT INTO categories (name, icon, sort_order) VALUES
('Coffee', '☕', 1),
('Food', '🍽️', 2),
('Snack', '🍟', 3),
('Dessert', '🍰', 4),
('Non Coffee', '🍵', 5);

-- ============================================
-- 2. PRODUCTS TABLE (Menu Items)
-- ============================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image TEXT,
  
  -- Stock & Availability
  stock INT DEFAULT 0,
  available BOOLEAN DEFAULT TRUE,
  
  -- Variants
  has_variants BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES staff(id),
  updated_by UUID REFERENCES staff(id)
);

-- Insert sample products
INSERT INTO products (name, category_id, description, price, available, has_variants) 
SELECT 
  'Americano',
  id,
  'Classic espresso with hot water',
  25000,
  true,
  true
FROM categories WHERE name = 'Coffee';

INSERT INTO products (name, category_id, description, price, available, has_variants) 
SELECT 
  'Caramel Macchiato',
  id,
  'Espresso with vanilla and caramel',
  35000,
  true,
  true
FROM categories WHERE name = 'Coffee';

INSERT INTO products (name, category_id, description, price, available, has_variants) 
SELECT 
  'Nasi Goreng',
  id,
  'Indonesian fried rice with chicken',
  30000,
  true,
  false
FROM categories WHERE name = 'Food';

INSERT INTO products (name, category_id, description, price, available, has_variants) 
SELECT 
  'French Fries',
  id,
  'Crispy golden french fries',
  20000,
  true,
  true
FROM categories WHERE name = 'Snack';

-- ============================================
-- 3. VARIANT GROUPS TABLE
-- ============================================

CREATE TABLE variant_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('single', 'multiple')),
  required BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample variant groups
INSERT INTO variant_groups (name, type, required) VALUES
('Size', 'single', true),
('Sugar Level', 'single', true),
('Temperature', 'single', true),
('Add-ons', 'multiple', false),
('Milk Type', 'single', false);

-- ============================================
-- 4. VARIANT OPTIONS TABLE
-- ============================================

CREATE TABLE variant_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_group_id UUID REFERENCES variant_groups(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price_modifier DECIMAL(10, 2) DEFAULT 0,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert variant options for Size
INSERT INTO variant_options (variant_group_id, name, price_modifier, sort_order)
SELECT id, 'Small', -5000, 1 FROM variant_groups WHERE name = 'Size';

INSERT INTO variant_options (variant_group_id, name, price_modifier, sort_order)
SELECT id, 'Regular', 0, 2 FROM variant_groups WHERE name = 'Size';

INSERT INTO variant_options (variant_group_id, name, price_modifier, sort_order)
SELECT id, 'Large', 8000, 3 FROM variant_groups WHERE name = 'Size';

-- Insert variant options for Sugar Level
INSERT INTO variant_options (variant_group_id, name, price_modifier, sort_order)
SELECT id, 'No Sugar', 0, 1 FROM variant_groups WHERE name = 'Sugar Level';

INSERT INTO variant_options (variant_group_id, name, price_modifier, sort_order)
SELECT id, 'Less Sugar', 0, 2 FROM variant_groups WHERE name = 'Sugar Level';

INSERT INTO variant_options (variant_group_id, name, price_modifier, sort_order)
SELECT id, 'Normal Sugar', 0, 3 FROM variant_groups WHERE name = 'Sugar Level';

INSERT INTO variant_options (variant_group_id, name, price_modifier, sort_order)
SELECT id, 'Extra Sugar', 2000, 4 FROM variant_groups WHERE name = 'Sugar Level';

-- Insert variant options for Temperature
INSERT INTO variant_options (variant_group_id, name, price_modifier, sort_order)
SELECT id, 'Hot', 0, 1 FROM variant_groups WHERE name = 'Temperature';

INSERT INTO variant_options (variant_group_id, name, price_modifier, sort_order)
SELECT id, 'Iced', 3000, 2 FROM variant_groups WHERE name = 'Temperature';

-- Insert variant options for Add-ons
INSERT INTO variant_options (variant_group_id, name, price_modifier, sort_order)
SELECT id, 'Extra Shot', 8000, 1 FROM variant_groups WHERE name = 'Add-ons';

INSERT INTO variant_options (variant_group_id, name, price_modifier, sort_order)
SELECT id, 'Whipped Cream', 5000, 2 FROM variant_groups WHERE name = 'Add-ons';

INSERT INTO variant_options (variant_group_id, name, price_modifier, sort_order)
SELECT id, 'Caramel Drizzle', 6000, 3 FROM variant_groups WHERE name = 'Add-ons';

-- Insert variant options for Milk Type
INSERT INTO variant_options (variant_group_id, name, price_modifier, sort_order)
SELECT id, 'Regular Milk', 0, 1 FROM variant_groups WHERE name = 'Milk Type';

INSERT INTO variant_options (variant_group_id, name, price_modifier, sort_order)
SELECT id, 'Soy Milk', 5000, 2 FROM variant_groups WHERE name = 'Milk Type';

INSERT INTO variant_options (variant_group_id, name, price_modifier, sort_order)
SELECT id, 'Almond Milk', 8000, 3 FROM variant_groups WHERE name = 'Milk Type';

-- ============================================
-- 5. PRODUCT-VARIANT GROUPS (Many-to-Many)
-- ============================================

CREATE TABLE product_variant_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_group_id UUID REFERENCES variant_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, variant_group_id)
);

-- Link Americano with variants (Size, Sugar, Temperature, Add-ons)
INSERT INTO product_variant_groups (product_id, variant_group_id)
SELECT p.id, vg.id
FROM products p, variant_groups vg
WHERE p.name = 'Americano' 
AND vg.name IN ('Size', 'Sugar Level', 'Temperature', 'Add-ons');

-- Link Caramel Macchiato with variants (Size, Sugar, Temperature, Add-ons, Milk Type)
INSERT INTO product_variant_groups (product_id, variant_group_id)
SELECT p.id, vg.id
FROM products p, variant_groups vg
WHERE p.name = 'Caramel Macchiato' 
AND vg.name IN ('Size', 'Sugar Level', 'Temperature', 'Add-ons', 'Milk Type');

-- ============================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_available ON products(available);
CREATE INDEX idx_variant_options_group ON variant_options(variant_group_id);
CREATE INDEX idx_product_variants_product ON product_variant_groups(product_id);
CREATE INDEX idx_product_variants_group ON product_variant_groups(variant_group_id);

-- ============================================
-- 7. VERIFICATION QUERIES
-- ============================================

-- Check categories
SELECT 'CATEGORIES' as table_name, COUNT(*) as total FROM categories;

-- Check products
SELECT 'PRODUCTS' as table_name, COUNT(*) as total FROM products;

-- Check variant groups
SELECT 'VARIANT_GROUPS' as table_name, COUNT(*) as total FROM variant_groups;

-- Check variant options
SELECT 'VARIANT_OPTIONS' as table_name, COUNT(*) as total FROM variant_options;

-- View products with categories
SELECT p.name as product, c.name as category, p.price, p.has_variants
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
ORDER BY c.name, p.name;

-- View variant groups with options count
SELECT vg.name as variant_group, vg.type, COUNT(vo.id) as options_count
FROM variant_groups vg
LEFT JOIN variant_options vo ON vg.id = vo.variant_group_id
GROUP BY vg.id, vg.name, vg.type
ORDER BY vg.name;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT '✅ FASE 1 SELESAI!' as status,
       'Tables created: categories, products, variant_groups, variant_options, product_variant_groups' as message;
