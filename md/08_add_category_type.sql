-- ============================================
-- ADD TYPE TO CATEGORIES (FOOD vs BEVERAGE)
-- ============================================

-- Add type column to categories
ALTER TABLE categories 
ADD COLUMN type VARCHAR(20) DEFAULT 'food' CHECK (type IN ('food', 'beverage'));

-- Add comment
COMMENT ON COLUMN categories.type IS 'Category type: food (requires cooking) or beverage (no cooking needed)';

-- Update existing categories
-- Set beverage categories
UPDATE categories 
SET type = 'beverage' 
WHERE LOWER(name) IN ('coffee', 'drinks', 'beverages', 'tea', 'juice', 'smoothies');

-- Set food categories (default, but explicit)
UPDATE categories 
SET type = 'food' 
WHERE LOWER(name) IN ('main course', 'appetizers', 'desserts', 'snacks', 'breakfast', 'lunch', 'dinner', 'salads', 'sandwiches', 'burgers', 'pizza', 'pasta');

SELECT 'Category type column added and updated' as message;
