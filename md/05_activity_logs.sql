-- ============================================
-- FASE 4: ACTIVITY LOGS TABLE
-- Jalankan ini di Supabase SQL Editor SETELAH Fase 3
-- Untuk Owner Activity Log & Audit Trail
-- ============================================

-- ============================================
-- 1. ACTIVITY LOGS TABLE
-- ============================================

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
-- 2. INSERT SAMPLE ACTIVITY LOGS
-- ============================================

-- Get staff IDs for sample logs
DO $$
DECLARE
  v_owner_id UUID;
  v_manager_id UUID;
  v_cashier_id UUID;
  v_product_id UUID;
BEGIN
  -- Get staff IDs
  SELECT id INTO v_owner_id FROM staff WHERE role = 'owner' LIMIT 1;
  SELECT id INTO v_manager_id FROM staff WHERE role = 'manager' LIMIT 1;
  SELECT id INTO v_cashier_id FROM staff WHERE staff_type = 'cashier' LIMIT 1;
  SELECT id INTO v_product_id FROM products WHERE name = 'Americano' LIMIT 1;
  
  -- Sample Login Activities
  INSERT INTO activity_logs (
    user_id, user_name, user_role, user_email,
    action, action_category, action_description,
    resource_type, severity, ip_address
  ) VALUES 
  (v_owner_id, 'Alex Manager', 'owner', 'owner@foodies.com',
   'LOGIN', 'AUTH', 'Owner logged in to system',
   'Authentication', 'info', '192.168.1.100'),
   
  (v_manager_id, 'Sarah Lee', 'manager', 'manager@foodies.com',
   'LOGIN', 'AUTH', 'Manager logged in to dashboard',
   'Authentication', 'info', '192.168.1.101');
  
  -- Sample Menu Changes
  INSERT INTO activity_logs (
    user_id, user_name, user_role, user_email,
    action, action_category, action_description,
    resource_type, resource_id, resource_name,
    previous_value, new_value, changes_summary,
    severity, is_reversible
  ) VALUES 
  (v_manager_id, 'Sarah Lee', 'manager', 'manager@foodies.com',
   'UPDATE', 'MENU', 'Updated product price',
   'Product', v_product_id::TEXT, 'Americano',
   '{"price": 22000}'::JSONB,
   '{"price": 25000}'::JSONB,
   ARRAY['Price changed from Rp 22,000 to Rp 25,000'],
   'info', TRUE);
  
  -- Sample Inventory Adjustments
  INSERT INTO activity_logs (
    user_id, user_name, user_role, user_email,
    action, action_category, action_description,
    resource_type, resource_name,
    changes_summary, severity
  ) VALUES 
  (v_manager_id, 'Sarah Lee', 'manager', 'manager@foodies.com',
   'ADJUST', 'INVENTORY', 'Adjusted stock level due to stocktake',
   'InventoryItem', 'Coffee Beans',
   ARRAY['Stock adjusted from 4.5kg to 5.0kg', 'Reason: Physical count correction'],
   'warning');
  
  -- Sample Sales Activities
  INSERT INTO activity_logs (
    user_id, user_name, user_role, user_email,
    action, action_category, action_description,
    resource_type, resource_name, severity
  ) VALUES 
  (v_cashier_id, 'Mike Wong', 'staff', NULL,
   'CREATE', 'SALES', 'Created new order #FO001',
   'Order', 'Order #FO001', 'info'),
   
  (v_cashier_id, 'Mike Wong', 'staff', NULL,
   'UPDATE', 'SALES', 'Order #FO001 marked as completed',
   'Order', 'Order #FO001', 'info');
  
  -- Sample Staff Management
  INSERT INTO activity_logs (
    user_id, user_name, user_role, user_email,
    action, action_category, action_description,
    resource_type, resource_name, severity, tags
  ) VALUES 
  (v_owner_id, 'Alex Manager', 'owner', 'owner@foodies.com',
   'CREATE', 'STAFF', 'Added new barista staff member',
   'Staff', 'John Doe',
   'info', ARRAY['staff-management', 'new-hire']);
  
  -- Sample Void/Refund Activities
  INSERT INTO activity_logs (
    user_id, user_name, user_role, user_email,
    action, action_category, action_description,
    resource_type, resource_name, severity, notes
  ) VALUES 
  (v_manager_id, 'Sarah Lee', 'manager', 'manager@foodies.com',
   'VOID', 'SALES', 'Voided order due to customer cancellation',
   'Order', 'Order #FO002',
   'warning', 'Customer changed mind before preparation started');
  
  -- Sample Report Export
  INSERT INTO activity_logs (
    user_id, user_name, user_role, user_email,
    action, action_category, action_description,
    resource_type, severity
  ) VALUES 
  (v_owner_id, 'Alex Manager', 'owner', 'owner@foodies.com',
   'EXPORT', 'REPORT', 'Exported financial report for November 2025',
   'FinancialReport', 'info');

END $$;

-- ============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_activity_action ON activity_logs(action);
CREATE INDEX idx_activity_category ON activity_logs(action_category);
CREATE INDEX idx_activity_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX idx_activity_severity ON activity_logs(severity);
CREATE INDEX idx_activity_resource ON activity_logs(resource_type, resource_id);

-- ============================================
-- 4. CREATE TRIGGER FOR AUTO-LOGGING
-- ============================================

-- Function to log product changes
CREATE OR REPLACE FUNCTION log_product_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_user_name VARCHAR(100);
  v_user_role VARCHAR(20);
  v_changes TEXT[];
BEGIN
  -- Get current user info (this would come from app context in real implementation)
  SELECT id, name, role INTO v_user_id, v_user_name, v_user_role
  FROM staff WHERE id = NEW.updated_by LIMIT 1;
  
  -- Build changes array
  v_changes := ARRAY[]::TEXT[];
  
  IF OLD.name != NEW.name THEN
    v_changes := array_append(v_changes, 'Name changed from "' || OLD.name || '" to "' || NEW.name || '"');
  END IF;
  
  IF OLD.price != NEW.price THEN
    v_changes := array_append(v_changes, 'Price changed from Rp ' || OLD.price || ' to Rp ' || NEW.price);
  END IF;
  
  IF OLD.available != NEW.available THEN
    v_changes := array_append(v_changes, 'Availability changed to ' || NEW.available);
  END IF;
  
  -- Insert log if there are changes
  IF array_length(v_changes, 1) > 0 THEN
    INSERT INTO activity_logs (
      user_id, user_name, user_role,
      action, action_category, action_description,
      resource_type, resource_id, resource_name,
      previous_value, new_value, changes_summary,
      severity, is_reversible
    ) VALUES (
      v_user_id, v_user_name, v_user_role,
      'UPDATE', 'MENU', 'Updated product: ' || NEW.name,
      'Product', NEW.id::TEXT, NEW.name,
      row_to_json(OLD)::JSONB,
      row_to_json(NEW)::JSONB,
      v_changes,
      'info', TRUE
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to products table
CREATE TRIGGER trigger_log_product_changes
AFTER UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION log_product_changes();

-- ============================================
-- 5. VERIFICATION QUERIES
-- ============================================

-- Check activity logs count
SELECT 'ACTIVITY_LOGS' as table_name, COUNT(*) as total FROM activity_logs;

-- View all activity logs
SELECT 
  timestamp,
  user_name,
  user_role,
  action,
  action_category,
  action_description,
  resource_name,
  severity
FROM activity_logs
ORDER BY timestamp DESC
LIMIT 20;

-- Activity by category
SELECT 
  action_category,
  COUNT(*) as total_activities,
  COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical,
  COUNT(CASE WHEN severity = 'warning' THEN 1 END) as warning,
  COUNT(CASE WHEN severity = 'info' THEN 1 END) as info
FROM activity_logs
GROUP BY action_category
ORDER BY total_activities DESC;

-- Recent activities by user
SELECT 
  user_name,
  user_role,
  COUNT(*) as total_actions,
  MAX(timestamp) as last_activity
FROM activity_logs
GROUP BY user_id, user_name, user_role
ORDER BY last_activity DESC;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT '✅ ACTIVITY LOGS SELESAI!' as status,
       'Owner sekarang bisa track semua aktivitas staff' as message;

SELECT '🎉 DATABASE 100% LENGKAP!' as status,
       'Semua 17 tables sudah dibuat!' as message;
