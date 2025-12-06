-- ============================================
-- FASE 5: STAFF SHIFT & ATTENDANCE SYSTEM
-- Jalankan ini di Supabase SQL Editor SETELAH Fase 4
-- Untuk Staff Presensi & Shift Management
-- ============================================

-- ============================================
-- 1. PRESENCE CODE TABLE (Kode Presensi Harian)
-- ============================================

CREATE TABLE presence_code (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMP DEFAULT NOW(),
  used_count INT DEFAULT 0
);

-- Insert sample presence code (valid untuk hari ini)
INSERT INTO presence_code (code, expires_at, used_count)
VALUES ('ABC123', NOW() + INTERVAL '24 hours', 0);

-- ============================================
-- 2. PRESENSI SHIFT TABLE (Staff Attendance)
-- ============================================

CREATE TABLE presensi_shift (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  waktu_masuk TIMESTAMP DEFAULT NOW(),
  waktu_keluar TIMESTAMP,
  status VARCHAR(20) DEFAULT 'hadir' CHECK (status IN ('hadir', 'terlambat', 'izin', 'sakit', 'alpha')),
  keterangan TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraint: Staff hanya bisa presensi 1x per hari
  UNIQUE(staff_id, tanggal)
);

-- ============================================
-- 3. STAFF SHIFTS TABLE (Jadwal Shift)
-- ============================================

CREATE TABLE staff_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  shift_type VARCHAR(20) CHECK (shift_type IN ('Pagi', 'Siang', 'Malam', 'Full Day')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES staff(id)
);

-- Insert sample shifts untuk staff
DO $$
DECLARE
  v_barista_id UUID;
  v_cashier_id UUID;
  v_kitchen_id UUID;
  v_waiter_id UUID;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Get staff IDs
  SELECT id INTO v_barista_id FROM staff WHERE staff_type = 'barista' LIMIT 1;
  SELECT id INTO v_cashier_id FROM staff WHERE staff_type = 'cashier' LIMIT 1;
  SELECT id INTO v_kitchen_id FROM staff WHERE staff_type = 'kitchen' LIMIT 1;
  SELECT id INTO v_waiter_id FROM staff WHERE staff_type = 'waiter' LIMIT 1;
  
  -- Create shifts for today
  INSERT INTO staff_shifts (staff_id, shift_date, shift_type, start_time, end_time, status)
  VALUES 
    (v_barista_id, v_today, 'Pagi', '07:00', '15:00', 'scheduled'),
    (v_cashier_id, v_today, 'Siang', '12:00', '20:00', 'scheduled'),
    (v_kitchen_id, v_today, 'Pagi', '08:00', '16:00', 'scheduled'),
    (v_waiter_id, v_today, 'Full Day', '09:00', '21:00', 'scheduled');
    
  -- Create shifts for tomorrow
  INSERT INTO staff_shifts (staff_id, shift_date, shift_type, start_time, end_time, status)
  VALUES 
    (v_barista_id, v_today + 1, 'Pagi', '07:00', '15:00', 'scheduled'),
    (v_cashier_id, v_today + 1, 'Malam', '15:00', '23:00', 'scheduled'),
    (v_kitchen_id, v_today + 1, 'Pagi', '08:00', '16:00', 'scheduled'),
    (v_waiter_id, v_today + 1, 'Siang', '12:00', '20:00', 'scheduled');
    
END $$;

-- ============================================
-- 4. SAMPLE PRESENSI DATA
-- ============================================

-- Insert sample presensi untuk hari ini
DO $$
DECLARE
  v_barista_id UUID;
  v_kitchen_id UUID;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT id INTO v_barista_id FROM staff WHERE staff_type = 'barista' LIMIT 1;
  SELECT id INTO v_kitchen_id FROM staff WHERE staff_type = 'kitchen' LIMIT 1;
  
  INSERT INTO presensi_shift (staff_id, tanggal, waktu_masuk, status)
  VALUES 
    (v_barista_id, v_today, NOW() - INTERVAL '2 hours', 'hadir'),
    (v_kitchen_id, v_today, NOW() - INTERVAL '1 hour', 'hadir');
    
END $$;

-- ============================================
-- 5. CREATE INDEXES
-- ============================================

CREATE INDEX idx_presensi_staff ON presensi_shift(staff_id);
CREATE INDEX idx_presensi_tanggal ON presensi_shift(tanggal DESC);
CREATE INDEX idx_presensi_status ON presensi_shift(status);
CREATE INDEX idx_staff_shifts_date ON staff_shifts(shift_date);
CREATE INDEX idx_staff_shifts_staff ON staff_shifts(staff_id);
CREATE INDEX idx_presence_code_expires ON presence_code(expires_at);

-- ============================================
-- 6. CREATE TRIGGERS
-- ============================================

-- Trigger to update updated_at on presensi_shift
CREATE TRIGGER update_presensi_shift_updated_at 
BEFORE UPDATE ON presensi_shift 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on staff_shifts
CREATE TRIGGER update_staff_shifts_updated_at 
BEFORE UPDATE ON staff_shifts 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-set status based on waktu_masuk
CREATE OR REPLACE FUNCTION set_presensi_status()
RETURNS TRIGGER AS $$
DECLARE
  v_shift_start TIME;
BEGIN
  -- Get shift start time untuk staff ini
  SELECT start_time INTO v_shift_start
  FROM staff_shifts
  WHERE staff_id = NEW.staff_id 
    AND shift_date = NEW.tanggal
  LIMIT 1;
  
  -- Jika ada shift dan terlambat lebih dari 15 menit
  IF v_shift_start IS NOT NULL THEN
    IF NEW.waktu_masuk::TIME > (v_shift_start + INTERVAL '15 minutes')::TIME THEN
      NEW.status := 'terlambat';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_presensi_status
BEFORE INSERT ON presensi_shift
FOR EACH ROW
EXECUTE FUNCTION set_presensi_status();

-- ============================================
-- 7. VERIFICATION QUERIES
-- ============================================

-- Check all tables
SELECT 'PRESENSI_SHIFT' as table_name, COUNT(*) as total FROM presensi_shift
UNION ALL
SELECT 'STAFF_SHIFTS', COUNT(*) FROM staff_shifts
UNION ALL
SELECT 'PRESENCE_CODE', COUNT(*) FROM presence_code;

-- View today's attendance
SELECT 
  p.tanggal,
  s.name,
  s.staff_code,
  s.staff_type,
  p.waktu_masuk,
  p.status,
  p.keterangan
FROM presensi_shift p
JOIN staff s ON p.staff_id = s.id
WHERE p.tanggal = CURRENT_DATE
ORDER BY p.waktu_masuk;

-- View today's shifts
SELECT 
  s.name,
  s.staff_code,
  s.staff_type,
  sh.shift_type,
  sh.start_time,
  sh.end_time,
  sh.status
FROM staff_shifts sh
JOIN staff s ON sh.staff_id = s.id
WHERE sh.shift_date = CURRENT_DATE
ORDER BY sh.start_time;

-- View active presence codes
SELECT 
  code,
  expires_at,
  used_count,
  CASE 
    WHEN expires_at > NOW() THEN 'ACTIVE'
    ELSE 'EXPIRED'
  END as status
FROM presence_code
ORDER BY created_at DESC
LIMIT 5;

-- Check who hasn't checked in today
SELECT 
  s.name,
  s.staff_code,
  s.staff_type,
  sh.shift_type,
  sh.start_time
FROM staff s
JOIN staff_shifts sh ON s.id = sh.staff_id
LEFT JOIN presensi_shift p ON s.id = p.staff_id AND p.tanggal = CURRENT_DATE
WHERE sh.shift_date = CURRENT_DATE
  AND s.status = 'active'
  AND s.role = 'staff'
  AND p.id IS NULL
ORDER BY sh.start_time;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT '✅ STAFF SHIFT & ATTENDANCE SELESAI!' as status,
       'Staff bisa presensi dengan kode/QR, Owner bisa lihat jadwal shift' as message;

SELECT '🎉 DATABASE 100% LENGKAP!' as status,
       'Semua 20 tables sudah dibuat!' as details;
