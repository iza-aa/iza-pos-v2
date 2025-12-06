-- ============================================
-- SAMPLE USAGE TRANSACTIONS
-- ============================================
-- This script adds sample usage transactions for testing the Usage History tab

-- Insert sample SALE transaction
INSERT INTO usage_transactions (type, product_id, product_name, quantity_sold, notes, timestamp)
SELECT 
  'sale',
  p.id,
  'Americano',
  2,
  'Morning rush hour sales',
  NOW() - INTERVAL '2 hours'
FROM products p
WHERE p.name = 'Americano'
LIMIT 1;

-- Get the last inserted transaction ID
DO $$
DECLARE
  last_transaction_id UUID;
  coffee_beans_id UUID;
  cup_medium_id UUID;
BEGIN
  -- Get the transaction ID
  SELECT id INTO last_transaction_id 
  FROM usage_transactions 
  ORDER BY timestamp DESC 
  LIMIT 1;

  -- Get inventory item IDs
  SELECT id INTO coffee_beans_id FROM inventory_items WHERE name = 'Coffee Beans';
  SELECT id INTO cup_medium_id FROM inventory_items WHERE name = 'Cup Medium';

  -- Insert transaction details for Americano sale (2 cups)
  INSERT INTO usage_transaction_details 
    (usage_transaction_id, inventory_item_id, ingredient_name, quantity_used, unit, previous_stock, new_stock)
  VALUES
    (last_transaction_id, coffee_beans_id, 'Coffee Beans', 36, 'gram', 5000, 4964),
    (last_transaction_id, cup_medium_id, 'Cup Medium', 2, 'pcs', 100, 98);
END $$;

-- Insert sample RESTOCK transaction
INSERT INTO usage_transactions (type, notes, timestamp)
VALUES 
  ('restock', 'Weekly stock replenishment', NOW() - INTERVAL '1 day');

-- Add restock details
DO $$
DECLARE
  last_transaction_id UUID;
  coffee_beans_id UUID;
  milk_id UUID;
BEGIN
  -- Get the transaction ID
  SELECT id INTO last_transaction_id 
  FROM usage_transactions 
  ORDER BY timestamp DESC 
  LIMIT 1;

  -- Get inventory item IDs
  SELECT id INTO coffee_beans_id FROM inventory_items WHERE name = 'Coffee Beans';
  SELECT id INTO milk_id FROM inventory_items WHERE name = 'Milk';

  -- Insert restock details
  INSERT INTO usage_transaction_details 
    (usage_transaction_id, inventory_item_id, ingredient_name, quantity_used, unit, previous_stock, new_stock)
  VALUES
    (last_transaction_id, coffee_beans_id, 'Coffee Beans', 5000, 'gram', 4964, 9964),
    (last_transaction_id, milk_id, 'Milk', 10000, 'ml', 3000, 13000);
END $$;

-- Insert sample ADJUSTMENT transaction
INSERT INTO usage_transactions (type, notes, timestamp)
VALUES 
  ('adjustment', 'Stock count adjustment - found discrepancy', NOW() - INTERVAL '3 hours');

-- Add adjustment details
DO $$
DECLARE
  last_transaction_id UUID;
  rice_id UUID;
BEGIN
  -- Get the transaction ID
  SELECT id INTO last_transaction_id 
  FROM usage_transactions 
  ORDER BY timestamp DESC 
  LIMIT 1;

  -- Get inventory item ID
  SELECT id INTO rice_id FROM inventory_items WHERE name = 'Rice';

  -- Insert adjustment details
  INSERT INTO usage_transaction_details 
    (usage_transaction_id, inventory_item_id, ingredient_name, quantity_used, unit, previous_stock, new_stock)
  VALUES
    (last_transaction_id, rice_id, 'Rice', 500, 'gram', 10000, 9500);
END $$;

-- Verify inserted data
SELECT 
  ut.id,
  ut.type,
  ut.product_name,
  ut.quantity_sold,
  ut.notes,
  ut.timestamp,
  COUNT(utd.id) as detail_count
FROM usage_transactions ut
LEFT JOIN usage_transaction_details utd ON ut.id = utd.usage_transaction_id
GROUP BY ut.id, ut.type, ut.product_name, ut.quantity_sold, ut.notes, ut.timestamp
ORDER BY ut.timestamp DESC;
