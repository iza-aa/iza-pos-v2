-- Migration Script for Supabase RLS using Custom JWT
-- This script replaces the overly permissive default policies with Role-Based policies.
-- It relies on the new JWT structure which contains:
-- {
--   "role": "authenticated",
--   "app_role": "owner" | "manager" | "staff" | "customer",
--   "staff_type": "barista" | "cashier" | "waiter" | "kitchen" (if app_role is staff),
--   "sub": "user-id"
-- }

-------------------------------------------------------------------------------
-- 1. UTILITY FUNCTION (Optional but recommended for cleaner policies)
-------------------------------------------------------------------------------
-- Create a helper function to easily get the app_role from the JWT
CREATE OR REPLACE FUNCTION get_app_role() RETURNS text AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', true)::jsonb ->> 'app_role';
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_staff_type() RETURNS text AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', true)::jsonb ->> 'staff_type';
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_jwt_sub() RETURNS text AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', true)::jsonb ->> 'sub';
END;
$$ LANGUAGE plpgsql STABLE;

-------------------------------------------------------------------------------
-- 2. TABLE: tables
-------------------------------------------------------------------------------
-- Drop existing policies
DROP POLICY IF EXISTS "authenticated can manage tables" ON tables;
DROP POLICY IF EXISTS "anon can read tables" ON tables;

-- Everyone (including customers) can view tables
CREATE POLICY "Everyone can view tables" 
ON tables FOR SELECT 
USING ( auth.role() = 'authenticated' );

-- Waiters, Managers, and Owners can update tables (e.g. status)
CREATE POLICY "Staff and Management can update tables" 
ON tables FOR UPDATE 
USING ( 
  get_app_role() IN ('owner', 'manager') OR 
  (get_app_role() = 'staff' AND get_staff_type() = 'waiter')
);

-- Only Managers and Owners can insert/delete tables
CREATE POLICY "Management can insert tables" 
ON tables FOR INSERT 
WITH CHECK ( get_app_role() IN ('owner', 'manager') );

CREATE POLICY "Management can delete tables" 
ON tables FOR DELETE 
USING ( get_app_role() IN ('owner', 'manager') );


-------------------------------------------------------------------------------
-- 3. TABLE: customers
-------------------------------------------------------------------------------
-- Drop existing policies
-- Note: Replace with actual policy names if different
DROP POLICY IF EXISTS "anon can insert customers" ON customers;
DROP POLICY IF EXISTS "authenticated can read customers" ON customers;

-- Customers can read and update their own data
CREATE POLICY "Customers can manage own data" 
ON customers FOR ALL 
USING ( 
  get_app_role() = 'customer' AND get_jwt_sub() = id::text 
);

-- Cashiers, Managers, Owners can read and update all customers
CREATE POLICY "Staff can manage customers" 
ON customers FOR ALL 
USING ( 
  get_app_role() IN ('owner', 'manager') OR 
  (get_app_role() = 'staff' AND get_staff_type() = 'cashier')
);

-- Allow inserting new customers during registration (must allow anon if registration is public, 
-- BUT since registration is handled via backend API route /api/customer/register using anon key, 
-- we need an anon insert policy or use SERVICE_ROLE in the API).
-- If the API uses anon key, we MUST allow anon inserts.
CREATE POLICY "Anon can register customers" 
ON customers FOR INSERT 
WITH CHECK ( auth.role() = 'anon' OR auth.role() = 'authenticated' );

-------------------------------------------------------------------------------
-- 4. TABLE: staff
-------------------------------------------------------------------------------
-- Owners can do everything
CREATE POLICY "Owners can manage staff" 
ON staff FOR ALL 
USING ( get_app_role() = 'owner' );

-- Managers can read staff and update non-owners
CREATE POLICY "Managers can read staff" 
ON staff FOR SELECT 
USING ( get_app_role() = 'manager' );

CREATE POLICY "Managers can update staff" 
ON staff FOR UPDATE 
USING ( get_app_role() = 'manager' AND role != 'owner' );

-- Staff can read their own data
CREATE POLICY "Staff can view own data" 
ON staff FOR SELECT 
USING ( get_jwt_sub() = id::text );

-------------------------------------------------------------------------------
-- SUMMARY
-------------------------------------------------------------------------------
-- You can apply this pattern to all other tables like `orders`, `order_items`, 
-- `inventory_items`, etc. by checking `get_app_role()` and `get_staff_type()`.
