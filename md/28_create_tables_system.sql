-- Migration: Create Tables System
-- Description: Create floors and tables tables with QR code support
-- Created: December 14, 2025

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 0. DROP EXISTING TABLES (if any)
-- =====================================================
-- Drop tables first to ensure clean migration
DROP TABLE IF EXISTS table_sessions CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS floors CASCADE;

-- =====================================================
-- 1. FLOORS TABLE
-- =====================================================
CREATE TABLE floors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  floor_number INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for floors
CREATE INDEX IF NOT EXISTS idx_floors_active ON floors(is_active);
CREATE INDEX IF NOT EXISTS idx_floors_number ON floors(floor_number);

-- =====================================================
-- 2. TABLES TABLE
-- =====================================================
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_number VARCHAR(10) UNIQUE NOT NULL,
  floor_id UUID REFERENCES floors(id) ON DELETE CASCADE,
  
  -- Table properties
  capacity INT NOT NULL DEFAULT 4,
  shape VARCHAR(20) DEFAULT 'round',
  
  -- Status: 'free', 'occupied', 'reserved', 'cleaning'
  status VARCHAR(20) DEFAULT 'free',
  
  -- QR Code
  qr_code_url TEXT UNIQUE,
  qr_code_image TEXT,
  qr_generated_at TIMESTAMPTZ,
  
  -- Layout position (pixels on canvas)
  position_x INT DEFAULT 0,
  position_y INT DEFAULT 0,
  
  -- Current session
  current_order_id UUID,
  occupied_at TIMESTAMPTZ,
  occupied_by_customer VARCHAR(100),
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('free', 'occupied', 'reserved', 'cleaning')),
  CONSTRAINT valid_shape CHECK (shape IN ('round', 'square', 'rectangular')),
  CONSTRAINT valid_capacity CHECK (capacity > 0)
);

-- Indexes for tables
CREATE INDEX IF NOT EXISTS idx_tables_floor ON tables(floor_id);
CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status);
CREATE INDEX IF NOT EXISTS idx_tables_active ON tables(is_active);
CREATE INDEX IF NOT EXISTS idx_tables_qr_url ON tables(qr_code_url);
CREATE INDEX IF NOT EXISTS idx_tables_number ON tables(table_number);

-- =====================================================
-- 3. TRIGGERS FOR AUTO-UPDATE
-- =====================================================

-- Trigger: Update updated_at timestamp on floors
CREATE OR REPLACE FUNCTION update_floors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_floors_updated_at
  BEFORE UPDATE ON floors
  FOR EACH ROW
  EXECUTE FUNCTION update_floors_updated_at();

-- Trigger: Update updated_at timestamp on tables
CREATE OR REPLACE FUNCTION update_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tables_updated_at
  BEFORE UPDATE ON tables
  FOR EACH ROW
  EXECUTE FUNCTION update_tables_updated_at();

-- =====================================================
-- 4. SAMPLE DATA (OPTIONAL - for testing)
-- =====================================================

-- Insert sample floors
INSERT INTO floors (name, floor_number) VALUES
  ('Ground Floor', 1),
  ('Second Floor', 2)
ON CONFLICT DO NOTHING;

-- Insert sample tables using subquery for floor_id
INSERT INTO tables (table_number, floor_id, capacity, shape, position_x, position_y) 
VALUES 
  ('T1', (SELECT id FROM floors WHERE floor_number = 1 LIMIT 1), 4, 'round', 100, 100),
  ('T2', (SELECT id FROM floors WHERE floor_number = 1 LIMIT 1), 2, 'square', 250, 100),
  ('T3', (SELECT id FROM floors WHERE floor_number = 1 LIMIT 1), 6, 'rectangular', 400, 100),
  ('T4', (SELECT id FROM floors WHERE floor_number = 1 LIMIT 1), 4, 'round', 100, 250),
  ('T5', (SELECT id FROM floors WHERE floor_number = 1 LIMIT 1), 4, 'round', 250, 250)
ON CONFLICT (table_number) DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check floors
-- SELECT * FROM floors ORDER BY floor_number;

-- Check tables
-- SELECT t.*, f.name as floor_name 
-- FROM tables t 
-- LEFT JOIN floors f ON t.floor_id = f.id 
-- ORDER BY t.table_number;

-- Check indexes
-- SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('floors', 'tables');
