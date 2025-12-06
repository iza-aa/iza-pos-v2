-- =====================================================
-- Role Tracking System for Orders
-- =====================================================
-- Purpose: Track which role (Staff/Manager/Owner) creates 
--          and serves orders for audit and accountability
-- =====================================================

-- 1. Add role tracking columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS created_by_role VARCHAR(10),
ADD COLUMN IF NOT EXISTS created_by_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS served_by_roles TEXT[] DEFAULT '{}';

-- 2. Add role tracking columns to order_items table
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS served_by_role VARCHAR(10),
ADD COLUMN IF NOT EXISTS served_by_code VARCHAR(20);

-- 3. Add comments for documentation
COMMENT ON COLUMN orders.created_by_role IS 'Role abbreviation who created order: STA (Staff), MAN (Manager), OWN (Owner)';
COMMENT ON COLUMN orders.created_by_code IS 'Staff/Manager/Owner code from staff table (e.g., STF001, MGR001)';
COMMENT ON COLUMN orders.served_by_roles IS 'Array of unique roles who served items in this order (e.g., {STA, OWN})';

COMMENT ON COLUMN order_items.served_by_role IS 'Role who marked this item as served';
COMMENT ON COLUMN order_items.served_by_code IS 'Code of person who marked item as served';

-- 4. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_created_by_role ON orders(created_by_role);
CREATE INDEX IF NOT EXISTS idx_orders_served_by_roles ON orders USING GIN(served_by_roles);

-- =====================================================
-- How it works:
-- =====================================================
-- 1. When creating order in POS:
--    - created_by_role = 'STA', 'MAN', or 'OWN'
--    - created_by_code = staff code from localStorage
--
-- 2. When marking items as served:
--    - order_items.served_by_role = current user's role
--    - order_items.served_by_code = current user's code
--    - orders.served_by_roles = array adds role if not exists
--
-- 3. Display in UI:
--    - OrderSummary shows "as STA" badge
--    - OrderCard shows "Created by STA" and "Served by OWN, STA"
--    - Multiple roles can serve same order (tracked uniquely)
-- =====================================================

-- Example queries:
-- Get all orders created by staff
-- SELECT * FROM orders WHERE created_by_role = 'STA';

-- Get all orders served by multiple roles
-- SELECT * FROM orders WHERE array_length(served_by_roles, 1) > 1;

-- Get statistics by role
-- SELECT created_by_role, COUNT(*) as order_count 
-- FROM orders 
-- WHERE created_at >= NOW() - INTERVAL '1 day'
-- GROUP BY created_by_role;

