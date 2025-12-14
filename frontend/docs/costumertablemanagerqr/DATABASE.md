# Database Schema - Restaurant Map System

## 📋 New Tables

### 1. `floors` Table
```sql
CREATE TABLE floors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,           -- 'Ground Floor', '2nd Floor', 'Outdoor'
  floor_number INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_floors_active ON floors(is_active);
```

### 2. `tables` Table
```sql
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_number VARCHAR(10) UNIQUE NOT NULL,  -- 'T1', 'T2', 'A1'
  floor_id UUID REFERENCES floors(id) ON DELETE CASCADE,
  
  -- Table properties
  capacity INT NOT NULL DEFAULT 4,
  shape VARCHAR(20) DEFAULT 'round',   -- 'round', 'square', 'rectangular'
  
  -- Status
  status VARCHAR(20) DEFAULT 'free',   -- 'free', 'occupied', 'reserved', 'cleaning'
  
  -- QR Code
  qr_code_url TEXT UNIQUE,             -- https://yourapp.com/customer/table/{id}
  qr_code_image TEXT,                  -- /qr-codes/table-1.png
  qr_generated_at TIMESTAMPTZ,
  
  -- Layout position (pixels on canvas)
  position_x INT DEFAULT 0,
  position_y INT DEFAULT 0,
  
  -- Current session
  current_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  occupied_at TIMESTAMPTZ,
  occupied_by_customer VARCHAR(100),
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tables_floor ON tables(floor_id);
CREATE INDEX idx_tables_status ON tables(status);
CREATE INDEX idx_tables_active ON tables(is_active);
CREATE INDEX idx_tables_qr_url ON tables(qr_code_url);
```

### 3. `table_sessions` Table (Analytics)
```sql
CREATE TABLE table_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
  
  -- Session info
  customer_count INT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INT,
  
  -- Orders in this session
  total_orders INT DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_table_sessions_table ON table_sessions(table_id);
CREATE INDEX idx_table_sessions_date ON table_sessions(started_at);
```

---

## ✏️ Existing Tables - Modifications

### `orders` Table - Add Columns
```sql
-- Add table reference
ALTER TABLE orders ADD COLUMN table_id UUID REFERENCES tables(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN table_number VARCHAR(10);

-- Add order source
ALTER TABLE orders ADD COLUMN order_source VARCHAR(20) DEFAULT 'pos';
-- Values: 'pos' = cashier/staff, 'qr' = customer self-order

-- Add indexes
CREATE INDEX idx_orders_table ON orders(table_id);
CREATE INDEX idx_orders_source ON orders(order_source);
CREATE INDEX idx_orders_table_number ON orders(table_number);
```

---

## 🔄 Database Triggers

### Auto-update table status on order
```sql
-- Update table status when order created
CREATE OR REPLACE FUNCTION update_table_status_on_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.table_id IS NOT NULL AND NEW.status IN ('new', 'preparing') THEN
    UPDATE tables 
    SET 
      status = 'occupied',
      current_order_id = NEW.id,
      occupied_at = NEW.created_at,
      occupied_by_customer = NEW.customer_name
    WHERE id = NEW.table_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_table_on_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_table_status_on_order();
```

### Clear table when order completed
```sql
-- Clear table when order completed
CREATE OR REPLACE FUNCTION clear_table_on_order_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Create table session record
    INSERT INTO table_sessions (
      table_id,
      started_at,
      ended_at,
      duration_minutes,
      total_orders,
      total_revenue
    )
    SELECT 
      NEW.table_id,
      t.occupied_at,
      NOW(),
      EXTRACT(EPOCH FROM (NOW() - t.occupied_at))/60,
      1,
      NEW.total_amount
    FROM tables t
    WHERE t.id = NEW.table_id AND t.occupied_at IS NOT NULL;
    
    -- Clear table
    UPDATE tables 
    SET 
      status = 'free',
      current_order_id = NULL,
      occupied_at = NULL,
      occupied_by_customer = NULL
    WHERE id = NEW.table_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_clear_table_on_complete
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION clear_table_on_order_complete();
```

---

## 📦 Migration Files

Create in `md/` folder:

### `28_create_tables_system.sql`
```sql
-- Floor management
-- Tables with QR codes
-- Indexes & triggers
```

### `29_add_order_source.sql`
```sql
-- Add order_source, table_id, table_number to orders
-- Update existing orders to 'pos'
```

### `30_create_table_sessions.sql`
```sql
-- Analytics table
-- Session tracking
```

---

## 🔍 Common Queries

### Get available tables
```sql
SELECT * FROM tables 
WHERE status = 'free' 
  AND is_active = true
ORDER BY table_number;
```

### Get table with active order
```sql
SELECT t.*, o.*
FROM tables t
LEFT JOIN orders o ON t.current_order_id = o.id
WHERE t.floor_id = 'floor-uuid';
```

### Table turnover rate (today)
```sql
SELECT 
  table_id,
  COUNT(*) as sessions_today,
  AVG(duration_minutes) as avg_duration,
  SUM(total_revenue) as total_revenue
FROM table_sessions
WHERE DATE(started_at) = CURRENT_DATE
GROUP BY table_id;
```

---

## 📝 Notes & Corrections

> Tambahkan koreksi di sini:

