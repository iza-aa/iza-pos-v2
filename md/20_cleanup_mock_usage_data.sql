-- ============================================
-- CLEANUP MOCK USAGE TRANSACTIONS DATA
-- ============================================
-- This script removes sample/mock usage transactions
-- So you can test with real orders from POS system

-- Step 1: Delete mock transaction details first (foreign key constraint)
DELETE FROM usage_transaction_details 
WHERE usage_transaction_id IN (
  SELECT id FROM usage_transactions 
  WHERE notes LIKE '%Morning rush hour%' 
     OR notes LIKE '%Weekly stock replenishment%'
     OR notes LIKE '%Stock count adjustment%'
);

-- Step 2: Delete mock transactions
DELETE FROM usage_transactions 
WHERE notes LIKE '%Morning rush hour%' 
   OR notes LIKE '%Weekly stock replenishment%'
   OR notes LIKE '%Stock count adjustment%';

-- Step 3: Verify cleanup
SELECT 
  COUNT(*) as remaining_transactions,
  COUNT(CASE WHEN type = 'sale' THEN 1 END) as sales,
  COUNT(CASE WHEN type = 'restock' THEN 1 END) as restocks,
  COUNT(CASE WHEN type = 'adjustment' THEN 1 END) as adjustments
FROM usage_transactions;

-- Expected result: 0 transactions if no real orders exist yet

-- ============================================
-- OPTIONAL: Reset inventory stock to initial values
-- ============================================
-- Run this if you want to reset stock levels after removing mock data

UPDATE inventory_items SET current_stock = 5000 WHERE name = 'Coffee Beans';
UPDATE inventory_items SET current_stock = 8000 WHERE name = 'Milk';
UPDATE inventory_items SET current_stock = 5000 WHERE name = 'Sugar';
UPDATE inventory_items SET current_stock = 2000 WHERE name = 'Vanilla Syrup';
UPDATE inventory_items SET current_stock = 500 WHERE name = 'Caramel Syrup';
UPDATE inventory_items SET current_stock = 1000 WHERE name = 'Whipped Cream';
UPDATE inventory_items SET current_stock = 500 WHERE name = 'Cup Small';
UPDATE inventory_items SET current_stock = 200 WHERE name = 'Cup Medium';
UPDATE inventory_items SET current_stock = 300 WHERE name = 'Cup Large';
UPDATE inventory_items SET current_stock = 150 WHERE name = 'Plastic Lids';
UPDATE inventory_items SET current_stock = 10000 WHERE name = 'Rice';
UPDATE inventory_items SET current_stock = 5000 WHERE name = 'Chicken';
UPDATE inventory_items SET current_stock = 3000 WHERE name = 'Vegetables';
UPDATE inventory_items SET current_stock = 5000 WHERE name = 'Cooking Oil';
UPDATE inventory_items SET current_stock = 8000 WHERE name = 'Potatoes';

-- Verify stock reset
SELECT name, current_stock, unit, status 
FROM inventory_items 
ORDER BY category, name;

-- ============================================
-- NOTES
-- ============================================
-- After running this cleanup:
-- 1. Usage History tab will show empty (0 transactions)
-- 2. Create a new order from POS system
-- 3. Pay the order (set payment_status = 'paid')
-- 4. Trigger will automatically:
--    - Create usage_transaction with performed_by = staff
--    - Deduct ingredients based on recipe
--    - Link to order via order_id field
-- 5. Check Usage History - should show real transaction with correct data
