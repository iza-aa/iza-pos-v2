-- ============================================
-- ADD KITCHEN STATUS TO ORDER_ITEMS
-- ============================================

-- Add kitchen_status column
ALTER TABLE order_items 
ADD COLUMN kitchen_status VARCHAR(20) DEFAULT 'pending' CHECK (kitchen_status IN ('pending', 'cooking', 'ready', 'not_required'));

-- Add kitchen timestamps
ALTER TABLE order_items 
ADD COLUMN cooking_started_at TIMESTAMP,
ADD COLUMN ready_at TIMESTAMP,
ADD COLUMN ready_by UUID REFERENCES staff(id);

-- Add comment
COMMENT ON COLUMN order_items.kitchen_status IS 'Status: pending (waiting), cooking (in progress), ready (done), not_required (drinks/no cooking needed)';

-- Create index for kitchen queries
CREATE INDEX idx_order_items_kitchen_status ON order_items(kitchen_status);

SELECT 'Kitchen status columns added to order_items table' as message;
