# 🎯 LANGKAH SELANJUTNYA - SETUP DATABASE LENGKAP

Anda sudah sampai di sini! Sekarang waktunya setup database lengkap dan connect ke frontend.

---

## 📋 YANG SUDAH SELESAI ✅
- ✅ 6 SQL scripts sudah dibuat
- ✅ Authentication sudah tested (Owner, Manager, Staff, Customer login works)
- ✅ Frontend components sudah ready
- ✅ Bug profile.tsx sudah diperbaiki

---

## 🚀 LANGKAH BERIKUTNYA (30-45 MENIT)

### FASE 1: JALANKAN SEMUA SQL SCRIPTS

#### Step 1: Menu Management (5 menit)
```
1. Buka Supabase Dashboard → SQL Editor
2. New Query
3. Copy semua isi: 02_fase1_menu_management.sql
4. Run
5. Scroll ke bawah, pastikan ada ✅ success message
```

**Verifikasi:**
- Table Editor → Harus ada: categories, products, variant_groups, variant_options, product_variant_groups
- Check data: 5 categories, 4 products, 5 variant groups

---

#### Step 2: Inventory Management (5 menit)
```
1. New Query di SQL Editor
2. Copy semua isi: 03_fase2_inventory.sql
3. Run
4. Pastikan success ✅
```

**Verifikasi:**
- Table Editor → Harus ada: inventory_items, recipes, recipe_ingredients, usage_transactions, usage_transaction_details
- Check data: 15 raw materials, 4 recipes

---

#### Step 3: Orders & Payment (5 menit)
```
1. New Query
2. Copy: 04_fase3_orders.sql
3. Run
```

**Verifikasi:**
- Tables: orders, order_items, pos_sessions, payment_transactions, tables
- Check: 10 tables (Table 01-10), 1 sample order

---

#### Step 4: Activity Logs (5 menit)
```
1. New Query
2. Copy: 05_activity_logs.sql
3. Run
```

**Verifikasi:**
- Table: activity_logs
- Check: Sample log activities muncul

---

#### Step 5: Staff Attendance (5 menit)
```
1. New Query
2. Copy: 06_staff_attendance.sql
3. Run
```

**Verifikasi:**
- Tables: presensi_shift, staff_shifts, presence_code
- Check: Kode presensi ABC123 ada
- Check: 8 jadwal shift (4 today, 4 tomorrow)

---

### FASE 2: REPLACE MOCK DATA DENGAN REAL DATA (15-30 menit)

Sekarang database sudah lengkap, tapi frontend masih pakai `mockData`. Kita perlu replace semua dengan query real.

#### Files yang perlu diupdate:

**Manager Pages:**
1. `frontend/app/manager/menu/page.tsx`
   - Replace mockCategories & mockProducts dengan query dari Supabase
   
2. `frontend/app/manager/variants/page.tsx`
   - Replace mockVariantGroups dengan query real
   
3. `frontend/app/manager/inventory/page.tsx`
   - Replace mockInventory dengan query real

**Staff Pages:**
4. `frontend/app/staff/pos/page.tsx`
   - Connect ke orders & products table
   
5. `frontend/app/staff/order/page.tsx`
   - Query real orders

**Owner Pages:**
6. `frontend/app/owner/activitylog/page.tsx`
   - Query real activity_logs (sudah ada sample data)

---

### FASE 3: TEST SEMUA FITUR (10 menit)

#### Test sebagai Manager:
```
Login: manager@foodies.com / Manager123!

1. Menu Management:
   - ✅ Lihat categories & products
   - ✅ Tambah product baru
   - ✅ Edit product
   - ✅ Delete product

2. Variants:
   - ✅ Lihat variant groups
   - ✅ Tambah variant option
   
3. Inventory:
   - ✅ Lihat raw materials
   - ✅ Update stock
   - ✅ Lihat recipes

4. Orders:
   - ✅ Lihat active orders
```

#### Test sebagai Staff:
```
Login: STF002 / TEMP1234 (Cashier)

1. POS:
   - ✅ Create new order
   - ✅ Add items
   - ✅ Apply variants
   - ✅ Process payment
   
2. My Shift:
   - ✅ Presensi dengan kode ABC123
   - ✅ Lihat shift schedule
```

#### Test sebagai Owner:
```
Login: owner@foodies.com / Owner123!

1. Dashboard:
   - ✅ Lihat sales overview
   
2. Activity Log:
   - ✅ Lihat semua aktivitas staff
   - ✅ Filter by category
   - ✅ Search logs

3. Staff Manager:
   - ✅ Lihat semua staff
   - ✅ Generate login code untuk staff
   - ✅ Generate presence code
```

---

## 🎯 PRIORITAS TASK

### HIGH PRIORITY (Hari ini):
1. ✅ Jalankan semua 6 SQL scripts (Fase 1)
2. ⚠️ Replace mockData di Manager/Menu page
3. ⚠️ Replace mockData di Manager/Inventory page

### MEDIUM PRIORITY (Besok):
4. ⚠️ Connect Staff/POS ke real database
5. ⚠️ Test full order flow
6. ⚠️ Fix any bugs yang muncul

### LOW PRIORITY (Minggu depan):
7. ⚠️ Add validations
8. ⚠️ Add loading states
9. ⚠️ Optimize queries
10. ⚠️ Add error handling

---

## 📝 QUICK COMMANDS

### Jalankan semua SQL (Copy-paste satu per satu):
```bash
# Di Supabase SQL Editor:

# 1. Menu
# Copy isi 02_fase1_menu_management.sql → Run

# 2. Inventory  
# Copy isi 03_fase2_inventory.sql → Run

# 3. Orders
# Copy isi 04_fase3_orders.sql → Run

# 4. Activity Logs
# Copy isi 05_activity_logs.sql → Run

# 5. Attendance
# Copy isi 06_staff_attendance.sql → Run
```

### Verify semua tables:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected result: **21 tables**

---

## 🆘 TROUBLESHOOTING

### Jika SQL script error:
1. Pastikan urutan: 01 → 02 → 03 → 04 → 05 → 06
2. Jangan skip script
3. Check apakah ada typo di copy-paste
4. Lihat error message di Supabase

### Jika frontend tidak muncul data:
1. Check apakah SQL sudah dijalankan semua
2. Buka browser DevTools → Console
3. Lihat error messages
4. Check network tab untuk API calls

### Jika presensi tidak work:
1. Pastikan kode presence_code masih valid (ABC123)
2. Check expires_at di database
3. Generate kode baru kalau sudah expired

---

## 💡 TIPS

1. **Jalankan SQL satu per satu** - Jangan rush, verifikasi tiap phase
2. **Check Console** - Selalu buka DevTools untuk lihat errors
3. **Backup database** - Export SQL sebelum test besar
4. **Test incrementally** - Jangan test semuanya sekaligus

---

## ✅ SUCCESS CRITERIA

Database setup **BERHASIL** jika:
- ✅ 21 tables ada di Supabase
- ✅ Sample data muncul di setiap table
- ✅ Semua login types work
- ✅ Manager bisa lihat products & categories
- ✅ Staff bisa presensi dengan kode
- ✅ Owner bisa lihat activity logs

---

**MULAI DARI: Jalankan 02_fase1_menu_management.sql di Supabase! 🚀**
