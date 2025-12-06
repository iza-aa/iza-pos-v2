# 🎯 MULAI DARI SINI - LANGKAH DEMI LANGKAH

## ✅ CHECKLIST - Ikuti Urutan Ini!

### 📝 PERSIAPAN (5 menit)
- [x] Supabase sudah ada ✓
- [x] .env.local sudah ada ✓
- [ ] Buka Supabase Dashboard
- [ ] Siapkan SQL Editor

---

## 🚀 LANGKAH 1: SETUP DATABASE (10 menit)

### A. Buka Supabase Dashboard
1. Buka browser, ke: https://supabase.com/dashboard
2. Login dengan akun Anda
3. Pilih project: `vshazgujylroujzundzt`

### B. Jalankan SQL Script
1. Klik menu **"SQL Editor"** di sidebar kiri
2. Klik tombol **"New Query"**
3. Copy seluruh isi file `01_setup_authentication.sql`
4. Paste ke SQL Editor
5. Klik tombol **"Run"** (atau tekan Ctrl+Enter)
6. Tunggu sampai selesai (akan muncul "Success")

### C. Verifikasi
1. Di SQL Editor yang sama, jalankan query ini:
```sql
SELECT staff_code, name, role, staff_type 
FROM staff 
ORDER BY role, staff_code;
```
2. Harusnya muncul 6 records:
   - 1 Owner (OWN001)
   - 1 Manager (MGR001)
   - 4 Staff (STF001-004 dengan type berbeda)

✅ **Jika sudah muncul 6 staff, LANJUT ke Step 2!**

---

## 🧪 LANGKAH 2: TEST LOGIN (5 menit)

### A. Start Development Server
Buka terminal/command prompt di folder `frontend`:
```bash
cd d:\iza-pos-v2\frontend
npm run dev
```

Tunggu sampai muncul: `Ready on http://localhost:3000`

### B. Test Login Owner
1. Buka browser: http://localhost:3000/owner/login
2. Masukkan:
   - Email: `owner@foodies.com`
   - Password: `owner123`
3. Klik "Login as Owner"
4. **Harusnya redirect ke `/owner/dashboard`**

### C. Test Login Manager
1. Buka: http://localhost:3000/manager/login
2. Masukkan:
   - Email: `manager@foodies.com`
   - Password: `manager123`
3. **Harusnya redirect ke `/manager/menu`**

### D. Test Login Staff (Barista)
1. Buka: http://localhost:3000/staff/login
2. Masukkan:
   - Staff Code: `STF001`
   - Login Code: `12345678`
3. **Harusnya redirect ke `/staff/dashboard`**

### E. Test Login Customer
1. Buka: http://localhost:3000/customer/login
2. Masukkan:
   - Phone: `08999888777`
   - Centang "I'm a new customer"
   - Name: `Test Customer`
3. **Harusnya redirect ke `/customer/menu`**

✅ **Jika semua login berhasil, database Anda SUDAH BENAR!**

---

## ❌ TROUBLESHOOTING

### Problem: "Email tidak ditemukan"
**Fix:**
1. Buka Supabase SQL Editor
2. Jalankan query:
```sql
SELECT * FROM staff WHERE email = 'owner@foodies.com';
```
3. Jika kosong, jalankan ulang INSERT query di `01_setup_authentication.sql`

### Problem: "Login code expired"
**Fix:**
1. Update login code dengan query ini:
```sql
UPDATE staff 
SET login_code_expires_at = NOW() + INTERVAL '24 hours'
WHERE role = 'staff';
```

### Problem: "Table does not exist"
**Fix:**
1. Jalankan ulang seluruh file `01_setup_authentication.sql`
2. Atau jalankan file `database_schema.sql` (complete version)

---

## 📊 LANGKAH 3: VERIFIKASI STRUKTUR DATABASE

Jalankan query ini di Supabase SQL Editor:

```sql
-- Cek semua tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Minimal yang HARUS ADA sekarang:**
- ✅ staff
- ✅ customers

**Nanti akan ditambahkan:**
- categories
- products
- variant_groups
- variant_options
- inventory_items
- orders
- order_items
- dll.

---

## 🎯 LANGKAH SELANJUTNYA (Setelah Login Berhasil)

### FASE 1 - Menu Management (Next)
1. Create table `categories`
2. Create table `products`
3. Create table `variant_groups` & `variant_options`
4. Test di halaman Manager/Menu

### FASE 2 - Inventory Management
1. Create table `inventory_items`
2. Create table `recipes` & `recipe_ingredients`
3. Test di halaman Manager/Inventory

### FASE 3 - Order System
1. Create table `orders` & `order_items`
2. Integrate dengan POS
3. Test complete order flow

---

## 💡 TIPS

1. **Jangan skip langkah!** Ikuti urutan dari atas ke bawah
2. **Test setiap langkah** sebelum lanjut
3. **Screenshot error** jika ada masalah
4. **Gunakan SQL Editor Supabase** - lebih mudah daripada pgAdmin

---

## 🆘 BUTUH BANTUAN?

Jika ada error:
1. Copy pesan error lengkap
2. Screenshot layar
3. Tanya saya dengan detail errornya

---

## ✅ CHECKLIST PROGRESS

Tandai yang sudah selesai:

- [ ] Database setup selesai (staff & customers table ada)
- [ ] Login Owner berhasil
- [ ] Login Manager berhasil
- [ ] Login Staff berhasil
- [ ] Login Customer berhasil
- [ ] Siap lanjut ke Menu Management

**SELAMAT! Anda sudah siap mulai development! 🎉**
