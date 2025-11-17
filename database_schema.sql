-- ============================================
-- FOODIES POS - DATABASE SCHEMA
-- PostgreSQL / Supabase
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. AUTHENTICATION & USER MANAGEMENT
-- ============================================

-- Table: staff (Owner, Manager, Staff)
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
  staff_type VARCHAR(20) CHECK (staff_type IN ('barista', 'kitchen', 'waiter', 'cashier')), -- Hanya untuk role 'staff'
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on-leave', 'terminated')),
  
  -- Authentication
  password_hash VARCHAR(255), -- For owner & manager (bcrypt hash)
  login_code VARCHAR(8), -- For staff (temporary code)
  login_code_expires_at TIMESTAMP,
  
  -- Additional Info
  profile_picture TEXT,
  hired_date DATE DEFAULT CURRENT_DATE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES staff(id)
);

-- Table: customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  
  -- Loyalty Program
  loyalty_points INT DEFAULT 0,
  member_since DATE DEFAULT CURRENT_DATE,
  total_spent DECIMAL(12, 2) DEFAULT 0,
  visit_count INT DEFAULT 0,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 2. MENU MANAGEMENT
-- ============================================

-- Table: categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: products (Menu Items)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image TEXT,
  
  -- Stock & Availability
  stock INT DEFAULT 0,
  available BOOLEAN DEFAULT TRUE,
  
  -- Variants
  has_variants BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES staff(id),
  updated_by UUID REFERENCES staff(id)
);

-- ============================================
-- 3. VARIANTS MANAGEMENT
-- ============================================

-- Table: variant_groups
CREATE TABLE variant_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('single', 'multiple')),
  required BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: variant_options
CREATE TABLE variant_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_group_id UUID REFERENCES variant_groups(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price_modifier DECIMAL(10, 2) DEFAULT 0,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: product_variant_groups (Many-to-Many)
CREATE TABLE product_variant_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_group_id UUID REFERENCES variant_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, variant_group_id)
);

-- ============================================
-- 4. INVENTORY MANAGEMENT
-- ============================================

-- Table: inventory_items (Raw Materials)
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) CHECK (category IN ('Ingredients', 'Packaging', 'Supplies')),
  current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
  reorder_level DECIMAL(10, 2) NOT NULL DEFAULT 0,
  unit VARCHAR(20) NOT NULL,
  supplier VARCHAR(100),
  cost_per_unit DECIMAL(10, 2) DEFAULT 0,
  last_restocked DATE,
  status VARCHAR(20) DEFAULT 'in-stock' CHECK (status IN ('in-stock', 'low-stock', 'out-of-stock')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: recipes
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  product_name VARCHAR(100) NOT NULL,
  recipe_type VARCHAR(20) NOT NULL CHECK (recipe_type IN ('base', 'variant-specific')),
  variant_combination JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES staff(id)
);

-- Table: recipe_ingredients
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  ingredient_name VARCHAR(100) NOT NULL,
  quantity_needed DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table: usage_transactions (Inventory History)
CREATE TABLE usage_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP DEFAULT NOW(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('sale', 'restock', 'adjustment', 'waste')),
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(100),
  quantity_sold INT,
  notes TEXT,
  performed_by UUID REFERENCES staff(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table: usage_transaction_details
CREATE TABLE usage_transaction_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usage_transaction_id UUID REFERENCES usage_transactions(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id),
  ingredient_name VARCHAR(100) NOT NULL,
  quantity_used DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  previous_stock DECIMAL(10, 2) NOT NULL,
  new_stock DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 5. ORDER MANAGEMENT
-- ============================================

-- Table: orders
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

-- Table: order_items
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
-- 6. POS & PAYMENT
-- ============================================

-- Table: pos_sessions
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

-- Table: payment_transactions
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
-- 7. STAFF MANAGEMENT & ATTENDANCE
-- ============================================

-- Table: staff_shifts
CREATE TABLE staff_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  shift_type VARCHAR(20) CHECK (shift_type IN ('morning', 'afternoon', 'evening', 'full-day')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'missed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: staff_presence (Attendance)
CREATE TABLE staff_presence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  staff_name VARCHAR(100) NOT NULL,
  shift_id UUID REFERENCES staff_shifts(id),
  check_in TIMESTAMP NOT NULL,
  check_out TIMESTAMP,
  presence_code VARCHAR(20),
  status VARCHAR(20) DEFAULT 'on-time' CHECK (status IN ('on-time', 'late', 'absent', 'on-leave')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table: presence_codes
CREATE TABLE presence_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMP DEFAULT NOW(),
  used_count INT DEFAULT 0
);

-- ============================================
-- 8. ACTIVITY LOGS
-- ============================================

-- Table: activity_logs
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP DEFAULT NOW(),
  
  -- Actor (Who)
  user_id UUID REFERENCES staff(id),
  user_name VARCHAR(100) NOT NULL,
  user_role VARCHAR(20) NOT NULL,
  user_email VARCHAR(100),
  
  -- Action (What)
  action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VOID', 'REFUND', 'VIEW', 'EXPORT', 'ADJUST')),
  action_category VARCHAR(20) NOT NULL CHECK (action_category IN ('AUTH', 'SALES', 'INVENTORY', 'MENU', 'STAFF', 'FINANCIAL', 'SYSTEM', 'REPORT')),
  action_description TEXT NOT NULL,
  
  -- Target (Resource)
  resource_type VARCHAR(50),
  resource_id VARCHAR(100),
  resource_name VARCHAR(200),
  
  -- Changes
  previous_value JSONB,
  new_value JSONB,
  changes_summary TEXT[],
  
  -- Context
  ip_address VARCHAR(45),
  device_info TEXT,
  session_id VARCHAR(100),
  location VARCHAR(200),
  
  -- Metadata
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  tags TEXT[],
  notes TEXT,
  is_reversible BOOLEAN DEFAULT FALSE,
  related_log_ids UUID[],
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 9. ADDITIONAL TABLES
-- ============================================

-- Table: tables (Dine-in Management)
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_number VARCHAR(20) UNIQUE NOT NULL,
  capacity INT DEFAULT 4,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance')),
  current_order_id UUID REFERENCES orders(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: settings (System Configuration)
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  category VARCHAR(50),
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES staff(id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Staff indexes
CREATE INDEX idx_staff_code ON staff(staff_code);
CREATE INDEX idx_staff_email ON staff(email);
CREATE INDEX idx_staff_role ON staff(role);
CREATE INDEX idx_staff_status ON staff(status);

-- Customer indexes
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_status ON customers(status);

-- Product indexes
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_available ON products(available);

-- Order indexes
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_orders_customer ON orders(customer_id);

-- Inventory indexes
CREATE INDEX idx_inventory_status ON inventory_items(status);
CREATE INDEX idx_inventory_category ON inventory_items(category);

-- Activity log indexes
CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_activity_action ON activity_logs(action);
CREATE INDEX idx_activity_category ON activity_logs(action_category);
CREATE INDEX idx_activity_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX idx_activity_severity ON activity_logs(severity);

-- ============================================
-- SEED DATA (Testing)
-- ============================================

-- Insert Owner
INSERT INTO staff (staff_code, name, email, role, password_hash, status) VALUES
('OWN001', 'John Owner', 'owner@foodies.com', 'owner', 'owner123', 'active');

-- Insert Manager
INSERT INTO staff (staff_code, name, email, role, password_hash, status) VALUES
('MGR001', 'Jane Manager', 'manager@foodies.com', 'manager', 'manager123', 'active');

-- Insert Staff
INSERT INTO staff (staff_code, name, phone, role, staff_type, login_code, login_code_expires_at, status) VALUES
('STF001', 'Alice Barista', '08123456789', 'staff', 'barista', '12345678', NOW() + INTERVAL '24 hours', 'active'),
('STF002', 'Bob Cashier', '08129876543', 'staff', 'cashier', '87654321', NOW() + INTERVAL '24 hours', 'active'),
('STF003', 'Charlie Kitchen', '08123456788', 'staff', 'kitchen', '11223344', NOW() + INTERVAL '24 hours', 'active'),
('STF004', 'Diana Waiter', '08123456787', 'staff', 'waiter', '44332211', NOW() + INTERVAL '24 hours', 'active');

-- Insert Categories
INSERT INTO categories (name, icon, sort_order) VALUES
('Coffee', '☕', 1),
('Food', '🍽️', 2),
('Snack', '🍟', 3),
('Dessert', '🍰', 4),
('Non Coffee', '🍵', 5);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
