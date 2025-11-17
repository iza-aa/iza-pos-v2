-- ============================================
-- STEP 1: HAPUS SEMUA TABLE LAMA (RESET)
-- ============================================
-- Jalankan ini HANYA jika ingin reset database dari awal
-- HATI-HATI: Ini akan menghapus semua data!

DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS pos_sessions CASCADE;
DROP TABLE IF EXISTS usage_transaction_details CASCADE;
DROP TABLE IF EXISTS usage_transactions CASCADE;
DROP TABLE IF EXISTS recipe_ingredients CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS product_variant_groups CASCADE;
DROP TABLE IF EXISTS variant_options CASCADE;
DROP TABLE IF EXISTS variant_groups CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS staff_presence CASCADE;
DROP TABLE IF EXISTS presence_codes CASCADE;
DROP TABLE IF EXISTS staff_shifts CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- ============================================
-- STEP 2: ENABLE UUID EXTENSION
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 3: CREATE TABLES - AUTHENTICATION
-- ============================================

-- Table: staff (Owner, Manager, Staff dengan type)
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
  staff_type VARCHAR(20) CHECK (staff_type IN ('barista', 'kitchen', 'waiter', 'cashier')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on-leave', 'terminated')),
  
  -- Authentication
  password_hash VARCHAR(255),
  login_code VARCHAR(8),
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
-- STEP 4: INSERT TEST DATA
-- ============================================

-- Insert Owner
INSERT INTO staff (staff_code, name, email, role, password_hash, status) VALUES
('OWN001', 'John Owner', 'owner@foodies.com', 'owner', 'owner123', 'active');

-- Insert Manager
INSERT INTO staff (staff_code, name, email, role, password_hash, status) VALUES
('MGR001', 'Jane Manager', 'manager@foodies.com', 'manager', 'manager123', 'active');

-- Insert Staff dengan berbagai type
INSERT INTO staff (staff_code, name, phone, role, staff_type, login_code, login_code_expires_at, status) VALUES
('STF001', 'Alice Barista', '08123456789', 'staff', 'barista', '12345678', NOW() + INTERVAL '24 hours', 'active'),
('STF002', 'Bob Cashier', '08129876543', 'staff', 'cashier', '87654321', NOW() + INTERVAL '24 hours', 'active'),
('STF003', 'Charlie Kitchen', '08123456788', 'staff', 'kitchen', '11223344', NOW() + INTERVAL '24 hours', 'active'),
('STF004', 'Diana Waiter', '08123456787', 'staff', 'waiter', '44332211', NOW() + INTERVAL '24 hours', 'active');

-- Insert sample customer
INSERT INTO customers (phone, name, loyalty_points) VALUES
('08111222333', 'Sample Customer', 100);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Cek apakah data sudah masuk
SELECT 'STAFF' as table_name, COUNT(*) as total FROM staff
UNION ALL
SELECT 'CUSTOMERS', COUNT(*) FROM customers;

-- Lihat detail staff
SELECT staff_code, name, role, staff_type, status FROM staff ORDER BY role, staff_code;
