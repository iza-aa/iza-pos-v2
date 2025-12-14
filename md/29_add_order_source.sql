-- Migration: Add Order Source to Orders Table
-- Description: Add columns to track order source (POS vs QR) and table assignment
-- Created: December 14, 2025

-- =====================================================
-- 1. ADD COLUMNS TO ORDERS TABLE
-- =====================================================

-- Add order_source column
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_source VARCHAR(20) DEFAULT 'pos';

-- Add table_id column (foreign key to tables)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS table_id UUID;

-- Add table_number column (denormalized for quick access)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS table_number VARCHAR(10);

-- =====================================================
-- 2. ADD CONSTRAINTS
-- =====================================================

-- Add check constraint for order_source
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_order_source'
  ) THEN
    ALTER TABLE orders 
    ADD CONSTRAINT valid_order_source 
    CHECK (order_source IN ('pos', 'qr'));
  END IF;
END $$;

-- Add foreign key constraint to tables
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_table_id'
  ) THEN
    ALTER TABLE orders 
    ADD CONSTRAINT fk_orders_table_id 
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================

-- Index on order_source for filtering
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(order_source);

-- Index on table_id for lookups
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);

-- Index on table_number for quick search
CREATE INDEX IF NOT EXISTS idx_orders_table_number ON orders(table_number);

-- Composite index for active table orders
CREATE INDEX IF NOT EXISTS idx_orders_table_status 
ON orders(table_id, status) 
WHERE table_id IS NOT NULL;

-- =====================================================
-- 4. UPDATE EXISTING ORDERS
-- =====================================================

-- Set all existing orders to 'pos' source (cashier orders)
UPDATE orders 
SET order_source = 'pos' 
WHERE order_source IS NULL;

-- =====================================================
-- 5. TRIGGER: Auto-update table status when order created
-- =====================================================

CREATE OR REPLACE FUNCTION update_table_status_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update table if table_id is provided and order is new/preparing
  IF NEW.table_id IS NOT NULL AND NEW.status IN ('new', 'preparing') THEN
    UPDATE tables 
    SET 
      status = 'occupied',
      current_order_id = NEW.id,
      occupied_at = NEW.created_at,
      occupied_by_customer = NEW.customer_name,
      updated_at = NOW()
    WHERE id = NEW.table_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_table_on_order ON orders;

CREATE TRIGGER trigger_update_table_on_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_table_status_on_order();

-- =====================================================
-- 6. TRIGGER: Clear table when order completed
-- =====================================================

CREATE OR REPLACE FUNCTION clear_table_on_order_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- When order status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.table_id IS NOT NULL THEN
    
    -- Clear table status
    UPDATE tables 
    SET 
      status = 'free',
      current_order_id = NULL,
      occupied_at = NULL,
      occupied_by_customer = NULL,
      updated_at = NOW()
    WHERE id = NEW.table_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_clear_table_on_complete ON orders;

CREATE TRIGGER trigger_clear_table_on_complete
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION clear_table_on_order_complete();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if columns added
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'orders' 
-- AND column_name IN ('order_source', 'table_id', 'table_number');

-- Check constraints
-- SELECT conname, contype, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'orders'::regclass 
-- AND conname LIKE '%order_source%' OR conname LIKE '%table%';

-- Check triggers
-- SELECT trigger_name, event_manipulation, event_object_table, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table = 'orders';

-- Test query: Get orders with source and table info
-- SELECT 
--   o.id,
--   o.order_number,
--   o.order_source,
--   o.table_number,
--   o.status,
--   t.table_number as actual_table,
--   t.status as table_status
-- FROM orders o
-- LEFT JOIN tables t ON o.table_id = t.id
-- ORDER BY o.created_at DESC
-- LIMIT 10;
