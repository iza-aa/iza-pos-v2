# 🚀 QUICK COMMANDS

## START DEV SERVER
```bash
cd d:\iza-pos-v2\frontend
npm run dev
```

## OPEN SUPABASE
https://supabase.com/dashboard/project/vshazgujylroujzundzt

## TEST LOGIN URLS

### Owner
http://localhost:3000/owner/login
Email: owner@foodies.com
Password: owner123

### Manager
http://localhost:3000/manager/login
Email: manager@foodies.com
Password: manager123

### Staff - Barista
http://localhost:3000/staff/login
Code: STF001
Login: 12345678

### Staff - Cashier
http://localhost:3000/staff/login
Code: STF002
Login: 87654321

### Staff - Kitchen
http://localhost:3000/staff/login
Code: STF003
Login: 11223344

### Staff - Waiter
http://localhost:3000/staff/login
Code: STF004
Login: 44332211

### Customer
http://localhost:3000/customer/login
Phone: 08999888777
Name: Test Customer

## USEFUL SQL QUERIES

### Lihat semua staff
```sql
SELECT staff_code, name, role, staff_type, status 
FROM staff 
ORDER BY role, staff_code;
```

### Reset login code (jika expired)
```sql
UPDATE staff 
SET login_code_expires_at = NOW() + INTERVAL '24 hours'
WHERE role = 'staff';
```

### Lihat customers
```sql
SELECT phone, name, loyalty_points, created_at 
FROM customers 
ORDER BY created_at DESC;
```

### Check tables exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```
