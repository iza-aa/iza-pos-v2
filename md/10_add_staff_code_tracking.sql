-- =====================================================
-- Migration 10: Add Staff Code Tracking to Orders
-- =====================================================
-- Purpose: Track specific staff IDs (STF001, STF002, etc.) who created and served orders
-- Date: November 18, 2025
-- Dependencies: 09_add_role_tracking.sql

-- =====================================================
-- 1. ADD STAFF CODE COLUMNS TO ORDERS TABLE
-- =====================================================

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS created_by_staff_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS created_by_staff_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS served_by_staff_codes TEXT[] DEFAULT '{}';

-- =====================================================
-- 2. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN orders.created_by_staff_code IS 'Staff code who created the order (e.g., STF001, MAN001, OWN001)';
COMMENT ON COLUMN orders.created_by_staff_name IS 'Name of staff who created the order';
COMMENT ON COLUMN orders.served_by_staff_codes IS 'Array of unique staff codes who served items (e.g., {STF001, STF002})';

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_orders_created_by_staff_code ON orders(created_by_staff_code);
CREATE INDEX IF NOT EXISTS idx_orders_served_by_staff_codes ON orders USING GIN(served_by_staff_codes);

-- =====================================================
-- 4. USAGE EXAMPLES
-- =====================================================

-- When creating an order (from POS):
-- INSERT INTO orders (
--   customer_name, order_number, order_type, status, total,
--   created_by_role, created_by_staff_code, created_by_staff_name
-- ) VALUES (
--   'John Doe', 'ORD-001', 'dine-in', 'new', 50000,
--   'STA', 'STF001', 'Budi Santoso'
-- );

-- When serving an item (from Order page):
-- 1. Update order_items.served = true
-- 2. Get current staff info from localStorage
-- 3. Add staff_code to served_by_staff_codes if not exists:
--    UPDATE orders 
--    SET served_by_staff_codes = array_append(
--      CASE WHEN 'STF001' = ANY(served_by_staff_codes) 
--      THEN served_by_staff_codes 
--      ELSE served_by_staff_codes 
--      END, 
--      'STF001'
--    )
--    WHERE id = 'order_id' AND NOT ('STF001' = ANY(served_by_staff_codes));

-- Query orders by specific staff:
-- SELECT * FROM orders WHERE created_by_staff_code = 'STF001';

-- Query orders served by specific staff:
-- SELECT * FROM orders WHERE 'STF001' = ANY(served_by_staff_codes);

-- Get staff performance:
-- SELECT 
--   created_by_staff_code,
--   created_by_staff_name,
--   COUNT(*) as orders_created,
--   SUM(total) as total_sales
-- FROM orders
-- WHERE created_by_staff_code IS NOT NULL
-- GROUP BY created_by_staff_code, created_by_staff_name
-- ORDER BY total_sales DESC;

-- =====================================================
-- 5. VERIFICATION QUERIES
-- =====================================================

-- Check if columns were added:
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'orders'
AND column_name IN ('created_by_staff_code', 'created_by_staff_name', 'served_by_staff_codes');

-- =====================================================
-- MIGRATION COMPLETE ✅
-- =====================================================
-- Next Steps:
-- 1. Execute this SQL in Supabase SQL Editor
-- 2. Update POS page to save created_by_staff_code and created_by_staff_name
-- 3. Update Order page to add staff_code to served_by_staff_codes array
-- 4. Update OrderCard component to display staff codes instead of just roles
-- =====================================================
