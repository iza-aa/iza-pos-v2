-- ====================================================================
-- FILE: 22_update_existing_performed_by.sql
-- PURPOSE: Update existing usage_transactions with performed_by from orders
-- RUN THIS: After running 21_fix_performed_by_trigger.sql
-- ====================================================================

-- Step 1: Check current state
SELECT 
    COUNT(*) as total_transactions,
    COUNT(ut.performed_by) as with_performer,
    COUNT(*) - COUNT(ut.performed_by) as missing_performer
FROM usage_transactions ut;

-- Step 2: Update existing transactions with performed_by from orders
UPDATE usage_transactions ut
SET performed_by = o.created_by
FROM orders o
WHERE ut.order_id = o.id
  AND ut.performed_by IS NULL
  AND o.created_by IS NOT NULL;

-- Step 3: Verify the update
SELECT 
    ut.id,
    ut.order_id,
    o.order_number,
    ut.transaction_type,
    ut.performed_by,
    s.name as staff_name,
    ut.created_at
FROM usage_transactions ut
LEFT JOIN orders o ON ut.order_id = o.id
LEFT JOIN staff s ON ut.performed_by = s.id
ORDER BY ut.created_at DESC
LIMIT 10;

-- Step 4: Summary report
SELECT 
    'Total Transactions' as metric,
    COUNT(*) as count
FROM usage_transactions
UNION ALL
SELECT 
    'With Performer' as metric,
    COUNT(*) as count
FROM usage_transactions
WHERE performed_by IS NOT NULL
UNION ALL
SELECT 
    'Missing Performer' as metric,
    COUNT(*) as count
FROM usage_transactions
WHERE performed_by IS NULL;
