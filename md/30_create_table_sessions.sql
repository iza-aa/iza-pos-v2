-- Migration: Create Table Sessions for Analytics
-- Description: Track table usage sessions for analytics and reporting
-- Created: December 14, 2025

-- =====================================================
-- 1. CREATE TABLE_SESSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS table_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  
  -- Session info
  customer_count INT,
  customer_name VARCHAR(100),
  
  -- Time tracking
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INT,
  
  -- Orders in this session
  order_ids UUID[] DEFAULT '{}',
  total_orders INT DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_duration CHECK (duration_minutes >= 0),
  CONSTRAINT valid_orders_count CHECK (total_orders >= 0),
  CONSTRAINT valid_revenue CHECK (total_revenue >= 0)
);

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================

-- Index on table_id for table-specific queries
CREATE INDEX IF NOT EXISTS idx_table_sessions_table ON table_sessions(table_id);

-- Index on started_at for date range queries
CREATE INDEX IF NOT EXISTS idx_table_sessions_started ON table_sessions(started_at);

-- Index on ended_at for completed sessions
CREATE INDEX IF NOT EXISTS idx_table_sessions_ended ON table_sessions(ended_at);

-- Composite index for analytics queries
CREATE INDEX IF NOT EXISTS idx_table_sessions_analytics 
ON table_sessions(table_id, started_at DESC) 
WHERE ended_at IS NOT NULL;

-- =====================================================
-- 3. FUNCTION: Create session when table occupied
-- =====================================================

CREATE OR REPLACE FUNCTION create_table_session_on_occupy()
RETURNS TRIGGER AS $$
BEGIN
  -- When table status changes from free to occupied
  IF NEW.status = 'occupied' AND OLD.status = 'free' THEN
    INSERT INTO table_sessions (
      table_id,
      customer_name,
      started_at,
      order_ids,
      total_orders
    ) VALUES (
      NEW.id,
      NEW.occupied_by_customer,
      NEW.occupied_at,
      CASE WHEN NEW.current_order_id IS NOT NULL 
        THEN ARRAY[NEW.current_order_id]
        ELSE '{}'::UUID[]
      END,
      CASE WHEN NEW.current_order_id IS NOT NULL THEN 1 ELSE 0 END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_create_session_on_occupy ON tables;

CREATE TRIGGER trigger_create_session_on_occupy
  AFTER UPDATE ON tables
  FOR EACH ROW
  EXECUTE FUNCTION create_table_session_on_occupy();

-- =====================================================
-- 4. FUNCTION: Complete session when table freed
-- =====================================================

CREATE OR REPLACE FUNCTION complete_table_session_on_free()
RETURNS TRIGGER AS $$
DECLARE
  v_session_id UUID;
  v_total_revenue DECIMAL(10,2);
BEGIN
  -- When table status changes from occupied to free
  IF NEW.status = 'free' AND OLD.status = 'occupied' THEN
    
    -- Get the most recent open session for this table
    SELECT id INTO v_session_id
    FROM table_sessions
    WHERE table_id = NEW.id 
      AND ended_at IS NULL
    ORDER BY started_at DESC
    LIMIT 1;
    
    IF v_session_id IS NOT NULL THEN
      -- Calculate total revenue from orders in this session
      SELECT COALESCE(SUM(o.total_amount), 0) INTO v_total_revenue
      FROM orders o
      WHERE o.table_id = NEW.id
        AND o.created_at >= (
          SELECT started_at FROM table_sessions WHERE id = v_session_id
        )
        AND o.status = 'completed';
      
      -- Update session with completion info
      UPDATE table_sessions
      SET 
        ended_at = NOW(),
        duration_minutes = EXTRACT(EPOCH FROM (NOW() - started_at))/60,
        total_revenue = v_total_revenue,
        total_orders = (
          SELECT COUNT(*) 
          FROM orders 
          WHERE table_id = NEW.id
            AND created_at >= started_at
        )
      WHERE id = v_session_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_complete_session_on_free ON tables;

CREATE TRIGGER trigger_complete_session_on_free
  AFTER UPDATE ON tables
  FOR EACH ROW
  EXECUTE FUNCTION complete_table_session_on_free();

-- =====================================================
-- 5. HELPER FUNCTIONS FOR ANALYTICS
-- =====================================================

-- Function: Get table turnover rate for a date
CREATE OR REPLACE FUNCTION get_table_turnover_rate(
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  table_id UUID,
  table_number VARCHAR(10),
  sessions_count BIGINT,
  avg_duration_minutes NUMERIC,
  total_revenue NUMERIC,
  avg_revenue_per_session NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.table_number,
    COUNT(ts.id) as sessions_count,
    ROUND(AVG(ts.duration_minutes), 2) as avg_duration_minutes,
    ROUND(SUM(ts.total_revenue), 2) as total_revenue,
    ROUND(AVG(ts.total_revenue), 2) as avg_revenue_per_session
  FROM tables t
  LEFT JOIN table_sessions ts ON t.id = ts.table_id
    AND DATE(ts.started_at) = p_date
    AND ts.ended_at IS NOT NULL
  WHERE t.is_active = true
  GROUP BY t.id, t.table_number
  ORDER BY t.table_number;
END;
$$ LANGUAGE plpgsql;

-- Function: Get peak hours for table usage
CREATE OR REPLACE FUNCTION get_peak_hours(
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  hour_of_day INT,
  sessions_started BIGINT,
  total_customers INT,
  total_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM ts.started_at)::INT as hour_of_day,
    COUNT(ts.id) as sessions_started,
    SUM(COALESCE(ts.customer_count, 1)) as total_customers,
    ROUND(SUM(ts.total_revenue), 2) as total_revenue
  FROM table_sessions ts
  WHERE DATE(ts.started_at) = p_date
  GROUP BY EXTRACT(HOUR FROM ts.started_at)
  ORDER BY hour_of_day;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'table_sessions'
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'table_sessions';

-- Check triggers
-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers
-- WHERE event_object_table = 'tables'
-- AND trigger_name LIKE '%session%';

-- Test turnover rate function
-- SELECT * FROM get_table_turnover_rate(CURRENT_DATE);

-- Test peak hours function
-- SELECT * FROM get_peak_hours(CURRENT_DATE);

-- View active sessions
-- SELECT 
--   ts.*,
--   t.table_number,
--   t.status
-- FROM table_sessions ts
-- JOIN tables t ON ts.table_id = t.id
-- WHERE ts.ended_at IS NULL
-- ORDER BY ts.started_at DESC;
