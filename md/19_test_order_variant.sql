-- ====================================================================
-- FILE: 19_test_order_variant.sql
-- PURPOSE: Test order dengan variant - cek apakah inventory berkurang
-- ====================================================================

-- ============================================
-- STEP 1: CEK KONDISI AWAL
-- ============================================

-- Lihat stok Coffee Beans saat ini
SELECT id, name, current_stock, unit 
FROM inventory_items 
WHERE name ILIKE '%coffee%' OR name ILIKE '%kopi%';

-- Lihat produk yang ada
SELECT id, name, category_id FROM products WHERE name ILIKE '%americano%' OR name ILIKE '%coffee%' LIMIT 5;

-- Lihat variant options yang tersedia
SELECT vo.id, vo.name, vg.name as group_name 
FROM variant_options vo
JOIN variant_groups vg ON vo.variant_group_id = vg.id
ORDER BY vg.name, vo.name;

-- ============================================
-- STEP 2: CEK RECIPES YANG ADA
-- ============================================

-- Lihat base recipes
SELECT 
    r.id,
    r.product_id,
    r.product_name,
    r.recipe_type,
    r.recipe_scope,
    r.variant_name,
    r.modifier_percentage
FROM recipes r
WHERE r.recipe_type = 'base'
ORDER BY r.product_name;

-- Lihat global modifiers
SELECT 
    r.id,
    r.variant_name,
    r.modifier_percentage,
    CONCAT('Base × ', (1 + r.modifier_percentage/100)::DECIMAL(10,2)) as effect
FROM recipes r
WHERE r.recipe_scope = 'global-modifier'
ORDER BY r.variant_name;

-- Lihat recipe ingredients untuk base recipe
SELECT 
    r.product_name,
    ri.quantity_needed,
    ii.name as ingredient_name,
    ii.unit
FROM recipes r
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
JOIN inventory_items ii ON ii.id = ri.inventory_item_id
WHERE r.recipe_type = 'base'
ORDER BY r.product_name;

-- ============================================
-- STEP 3: UPDATE MODIFIER PERCENTAGE (JIKA BELUM)
-- ============================================

-- Set Large = +50% (10g → 15g)
UPDATE recipes
SET modifier_percentage = 50
WHERE recipe_scope = 'global-modifier'
  AND variant_name = 'Large';

-- Set Small = -20% (10g → 8g)
UPDATE recipes
SET modifier_percentage = -20
WHERE recipe_scope = 'global-modifier'
  AND variant_name = 'Small';

-- Verifikasi
SELECT variant_name, modifier_percentage
FROM recipes
WHERE recipe_scope = 'global-modifier'
AND variant_name IN ('Large', 'Small', 'Medium', 'Regular');

-- ============================================
-- STEP 4: SIMULASI ORDER
-- ============================================

-- Simpan stok sebelum order
DO $$
DECLARE
    v_product_id UUID;
    v_order_id UUID;
    v_item_id UUID;
    v_stock_before DECIMAL;
    v_stock_after DECIMAL;
    v_coffee_id UUID;
BEGIN
    -- Dapatkan ID Coffee Beans
    SELECT id, current_stock INTO v_coffee_id, v_stock_before
    FROM inventory_items
    WHERE name ILIKE '%coffee%'
    LIMIT 1;
    
    RAISE NOTICE '======================================';
    RAISE NOTICE 'STOK COFFEE BEANS SEBELUM: % gram', v_stock_before;
    RAISE NOTICE '======================================';
    
    -- Dapatkan produk (misal Americano atau produk pertama dengan resep)
    SELECT p.id INTO v_product_id
    FROM products p
    JOIN recipes r ON r.product_id = p.id AND r.recipe_type = 'base'
    LIMIT 1;
    
    IF v_product_id IS NULL THEN
        RAISE NOTICE 'Tidak ada produk dengan base recipe!';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Produk ID: %', v_product_id;
    
    -- Buat order baru (status paid agar trigger berjalan)
    INSERT INTO orders (
        order_type, status, payment_status, total_amount, created_at
    ) VALUES (
        'dine-in', 'completed', 'paid', 25000, NOW()
    ) RETURNING id INTO v_order_id;
    
    RAISE NOTICE 'Order ID: %', v_order_id;
    
    -- Tambah order item DENGAN VARIANT LARGE
    INSERT INTO order_items (
        order_id, product_id, quantity, price, variants
    ) VALUES (
        v_order_id,
        v_product_id,
        1,
        25000,
        '{"Size": ["Large"]}'::jsonb
    ) RETURNING id INTO v_item_id;
    
    RAISE NOTICE 'Order Item ID: %', v_item_id;
    
    -- Cek stok setelah (trigger seharusnya sudah jalan)
    SELECT current_stock INTO v_stock_after
    FROM inventory_items
    WHERE id = v_coffee_id;
    
    RAISE NOTICE '======================================';
    RAISE NOTICE 'STOK COFFEE BEANS SESUDAH: % gram', v_stock_after;
    RAISE NOTICE 'PENGURANGAN: % gram', (v_stock_before - v_stock_after);
    RAISE NOTICE '======================================';
    
    -- Expected: Jika base = 10g dan Large = +50%, maka dikurangi 15g
END $$;

-- ============================================
-- STEP 5: VERIFIKASI HASIL
-- ============================================

-- Cek usage_transactions terbaru
SELECT 
    ut.id,
    ut.order_id,
    ut.transaction_type,
    ut.notes,
    ut.created_at
FROM usage_transactions ut
ORDER BY ut.created_at DESC
LIMIT 3;

-- Cek usage_transaction_details
SELECT 
    utd.ingredient_name,
    utd.quantity_used,
    utd.unit,
    utd.previous_stock,
    utd.new_stock,
    (utd.previous_stock - utd.new_stock) as actual_deducted
FROM usage_transaction_details utd
JOIN usage_transactions ut ON ut.id = utd.usage_transaction_id
ORDER BY ut.created_at DESC
LIMIT 5;

-- Cek current stock
SELECT name, current_stock, unit
FROM inventory_items
WHERE name ILIKE '%coffee%';
