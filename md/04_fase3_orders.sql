-- ============================================
-- FASE 3: ORDER & PAYMENT SYSTEM TABLES
-- Jalankan ini di Supabase SQL Editor SETELAH Fase 2
-- ============================================

-- ============================================
-- 1. ORDERS TABLE
-- ============================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  customer_name VARCHAR(100) NOT NULL,
  
  -- Order Details
  table_number VARCHAR(20),
  order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('Dine in', 'Take Away', 'Delivery')),
  status VARCHAR(30) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'preparing', 'partially-served', 'served', 'completed', 'cancelled')),
  
  -- Pricing
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  
  -- Payment
  payment_method VARCHAR(20) CHECK (payment_method IN ('Cash', 'Card', 'E-Wallet')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'cancelled')),
  
  -- Timestamps
  order_date DATE DEFAULT CURRENT_DATE,
  order_time TIME DEFAULT CURRENT_TIME,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  -- Staff References
  created_by UUID REFERENCES staff(id),
  completed_by UUID REFERENCES staff(id)
);

-- ============================================
-- 2. ORDER ITEMS TABLE
-- ============================================

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(100) NOT NULL,
  quantity INT NOT NULL,
  base_price DECIMAL(10, 2) NOT NULL,
  
  -- Variants (stored as JSON)
  variants JSONB,
  total_price DECIMAL(10, 2) NOT NULL,
  
  -- Serving Status
  served BOOLEAN DEFAULT FALSE,
  served_at TIMESTAMP,
  served_by UUID REFERENCES staff(id),
  
  -- Notes
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 3. POS SESSIONS TABLE
-- ============================================

CREATE TABLE pos_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES staff(id),
  staff_name VARCHAR(100) NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  opening_cash DECIMAL(10, 2) DEFAULT 0,
  closing_cash DECIMAL(10, 2),
  total_sales DECIMAL(10, 2) DEFAULT 0,
  total_orders INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 4. PAYMENT TRANSACTIONS TABLE
-- ============================================

CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  pos_session_id UUID REFERENCES pos_sessions(id),
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('Cash', 'Card', 'E-Wallet')),
  amount_paid DECIMAL(10, 2) NOT NULL,
  amount_change DECIMAL(10, 2) DEFAULT 0,
  transaction_reference VARCHAR(100),
  status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'void')),
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES staff(id)
);

-- ============================================
-- 5. TABLES (For Dine-in Management)
-- ============================================

CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_number VARCHAR(20) UNIQUE NOT NULL,
  capacity INT DEFAULT 4,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance')),
  current_order_id UUID REFERENCES orders(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample tables
INSERT INTO tables (table_number, capacity, status) VALUES
('Table 01', 2, 'available'),
('Table 02', 2, 'available'),
('Table 03', 4, 'available'),
('Table 04', 4, 'available'),
('Table 05', 4, 'available'),
('Table 06', 6, 'available'),
('Table 07', 6, 'available'),
('Table 08', 8, 'available'),
('Table 09', 4, 'available'),
('Table 10', 2, 'available');

-- ============================================
-- 6. INSERT SAMPLE ORDERS (For Testing)
-- ============================================

-- Get staff ID for order creation
DO $$
DECLARE
  v_staff_id UUID;
  v_customer_id UUID;
  v_order_id UUID;
  v_product_americano UUID;
  v_product_nasi_goreng UUID;
BEGIN
  -- Get staff ID (cashier)
  SELECT id INTO v_staff_id FROM staff WHERE staff_code = 'STF002' LIMIT 1;
  
  -- Get customer ID
  SELECT id INTO v_customer_id FROM customers WHERE phone = '08111222333' LIMIT 1;
  
  -- Get product IDs
  SELECT id INTO v_product_americano FROM products WHERE name = 'Americano' LIMIT 1;
  SELECT id INTO v_product_nasi_goreng FROM products WHERE name = 'Nasi Goreng' LIMIT 1;
  
  -- Create sample order
  INSERT INTO orders (
    order_number, customer_id, customer_name, table_number, 
    order_type, status, subtotal, tax, total, 
    payment_method, payment_status, created_by
  ) VALUES (
    '#FO001', v_customer_id, 'Sample Customer', 'Table 03',
    'Dine in', 'new', 55000, 5500, 60500,
    'Cash', 'pending', v_staff_id
  ) RETURNING id INTO v_order_id;
  
  -- Add order items
  INSERT INTO order_items (order_id, product_id, product_name, quantity, base_price, total_price)
  VALUES 
    (v_order_id, v_product_americano, 'Americano', 2, 25000, 50000),
    (v_order_id, v_product_nasi_goreng, 'Nasi Goreng', 1, 30000, 30000);
    
END $$;

-- ============================================
-- 7. CREATE INDEXES
-- ============================================

CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_payment_transactions_order ON payment_transactions(order_id);
CREATE INDEX idx_tables_status ON tables(status);

-- ============================================
-- 8. CREATE TRIGGER FOR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at 
BEFORE UPDATE ON orders 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at 
BEFORE UPDATE ON order_items 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. VERIFICATION QUERIES
-- ============================================

-- Check all tables
SELECT 'ORDERS' as table_name, COUNT(*) as total FROM orders
UNION ALL
SELECT 'ORDER_ITEMS', COUNT(*) FROM order_items
UNION ALL
SELECT 'TABLES', COUNT(*) FROM tables
UNION ALL
SELECT 'POS_SESSIONS', COUNT(*) FROM pos_sessions;

-- View sample order
SELECT 
  o.order_number,
  o.customer_name,
  o.table_number,
  o.status,
  o.total,
  COUNT(oi.id) as items_count
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.order_number, o.customer_name, o.table_number, o.status, o.total;

-- View order items detail
SELECT 
  o.order_number,
  oi.product_name,
  oi.quantity,
  oi.total_price,
  oi.served
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
ORDER BY o.order_number, oi.product_name;

-- Check tables
SELECT table_number, capacity, status 
FROM tables 
ORDER BY table_number;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT '✅ FASE 3 SELESAI!' as status,
       'Tables created: orders, order_items, pos_sessions, payment_transactions, tables' as message;

-- ============================================
-- FINAL VERIFICATION - ALL TABLES
-- ============================================

SELECT '🎉 DATABASE LENGKAP!' as status;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
