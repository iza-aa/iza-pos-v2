# 🚀 QUICK START GUIDE - FOODIES POS

## 📦 SETUP LANGKAH DEMI LANGKAH

### 1️⃣ Setup Database (Supabase)

1. **Buka Supabase Dashboard** → SQL Editor
2. **Copy & Paste** file `database_schema.sql`
3. **Run** SQL query
4. **Verify** tables sudah terbuat:
   - staff
   - customers
   - categories
   - products
   - variant_groups
   - variant_options
   - inventory_items
   - recipes
   - orders
   - order_items
   - dll.

### 2️⃣ Setup Environment Variables

Buat file `.env.local` di folder `frontend/`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3️⃣ Install Dependencies

```bash
cd frontend
npm install
```

### 4️⃣ Run Development Server

```bash
npm run dev
```

Server akan berjalan di: `http://localhost:3000`

---

## 🔑 TEST ACCOUNTS

### Owner Login
```
URL: http://localhost:3000/owner/login
Email: owner@foodies.com
Password: owner123
```

### Manager Login
```
URL: http://localhost:3000/manager/login
Email: manager@foodies.com
Password: manager123
```

### Staff Login
```
URL: http://localhost:3000/staff/login

# Barista
Staff Code: STF001
Login Code: 12345678

# Cashier  
Staff Code: STF002
Login Code: 87654321

# Kitchen
Staff Code: STF003
Login Code: 11223344

# Waiter
Staff Code: STF004
Login Code: 44332211
```

### Customer Login
```
URL: http://localhost:3000/customer/login
Phone: 08123456789
Name: (isi jika customer baru)
```

---

## 📂 FILE STRUCTURE

```
iza-pos-v2/
├── frontend/
│   ├── app/
│   │   ├── api/                    # API Routes
│   │   │   ├── owner/login/
│   │   │   ├── manager/login/
│   │   │   ├── staff/login/
│   │   │   └── customer/login/
│   │   │
│   │   ├── owner/                  # Owner Pages
│   │   │   ├── login/
│   │   │   ├── dashboard/
│   │   │   ├── staff-manager/
│   │   │   └── activitylog/
│   │   │
│   │   ├── manager/                # Manager Pages
│   │   │   ├── login/
│   │   │   ├── menu/
│   │   │   ├── variants/
│   │   │   ├── inventory/
│   │   │   └── order/
│   │   │
│   │   ├── staff/                  # Staff Pages
│   │   │   ├── login/
│   │   │   ├── dashboard/
│   │   │   ├── pos/
│   │   │   ├── order/
│   │   │   └── shift/
│   │   │
│   │   ├── customer/               # Customer Pages
│   │   │   ├── login/
│   │   │   └── menu/
│   │   │
│   │   └── components/             # Reusable Components
│   │       ├── owner/
│   │       ├── manager/
│   │       ├── staff/
│   │       └── ui/
│   │
│   ├── lib/
│   │   ├── mockData.ts
│   │   ├── supabaseClient.ts
│   │   └── activityTypes.ts
│   │
│   └── .env.local                  # Environment Variables
│
├── database_schema.sql             # Database Schema
├── AUTHENTICATION_STRUCTURE.md     # Auth Documentation
├── ROLE_ACCESS_MATRIX.md          # Role & Permissions
└── QUICK_START.md                 # This file
```

---

## 🗄️ DATABASE TABLES OVERVIEW

### Authentication & Users
- `staff` - Owner, Manager, Staff, Cashier
- `customers` - Customer accounts

### Menu & Products
- `categories` - Menu categories
- `products` - Menu items
- `variant_groups` - Variant groups (Size, Sugar, etc)
- `variant_options` - Variant options (Small, Medium, Large)
- `product_variant_groups` - Product-Variant relationship

### Inventory
- `inventory_items` - Raw materials & packaging
- `recipes` - Product recipes
- `recipe_ingredients` - Recipe composition
- `usage_transactions` - Inventory usage history
- `usage_transaction_details` - Detailed usage

### Orders & Payments
- `orders` - Customer orders
- `order_items` - Order line items
- `pos_sessions` - POS shift sessions
- `payment_transactions` - Payment records

### Staff Management
- `staff_shifts` - Shift schedules
- `staff_presence` - Attendance records
- `presence_codes` - QR codes for check-in

### System
- `activity_logs` - Audit trail
- `tables` - Dine-in table management
- `settings` - System configuration

---

## 🎯 FITUR UTAMA PER ROLE

### 👔 OWNER
- ✅ Dashboard analytics lengkap
- ✅ Staff management (CRUD)
- ✅ Generate login codes untuk staff
- ✅ Activity logs (audit trail)
- ✅ Financial reports
- ✅ System settings
- ✅ Full access ke semua fitur

### 👨‍💼 MANAGER
- ✅ Menu management (CRUD)
- ✅ Variants management
- ✅ Inventory tracking
- ✅ Recipe management
- ✅ Order monitoring
- ✅ Stock adjustments
- ❌ Tidak bisa manage staff
- ❌ Tidak bisa lihat activity logs

### 👨‍🍳 STAFF (Berdasarkan Type)

**Barista:**
- ✅ POS untuk beverage orders
- ✅ Coffee machine management
- ✅ Beverage preparation queue

**Kitchen:**
- ✅ Food preparation orders
- ✅ Cooking queue management
- ✅ Mark food as ready

**Waiter:**
- ✅ Take customer orders
- ✅ Table management
- ✅ Serve food & beverages
- ✅ Customer service

**Cashier:**
- ✅ Full POS access
- ✅ Payment processing (Cash/Card/E-Wallet)
- ✅ Receipt printing
- ✅ Daily sales summary

**All Staff:**
- ✅ Personal dashboard
- ✅ View own performance
- ✅ Check-in/out attendance
- ❌ Tidak bisa edit menu
- ❌ Tidak bisa akses inventory

### 👤 CUSTOMER
- ✅ Browse menu
- ✅ View order history
- ✅ Track loyalty points
- ✅ Update profile
- ❌ Tidak bisa akses admin features

---

## 🔄 TYPICAL WORKFLOW

### 1. Owner Setup (Pertama Kali)
```
1. Login sebagai Owner
2. Tambah categories di Manager/Menu
3. Tambah products di Manager/Menu
4. Tambah variant groups di Manager/Variants
5. Setup inventory items di Manager/Inventory
6. Tambah recipes di Manager/Inventory
7. Tambah staff di Owner/Staff Manager
8. Generate login codes untuk staff
```

### 2. Manager Daily Tasks
```
1. Login sebagai Manager
2. Cek inventory stock levels
3. Update menu items jika perlu
4. Monitor incoming orders
5. Adjust inventory jika ada restock
6. Review daily sales
```

### 3. Staff Daily Tasks
```
1. Login dengan Staff Code + Login Code
2. Check-in attendance
3. Buka POS session
4. Terima orders dari customer
5. Process payments
6. Mark items as served
7. Check-out saat selesai shift
```

### 4. Customer Flow
```
1. Login dengan Phone Number
2. Browse menu & pilih items
3. Customize dengan variants
4. Place order
5. Track order status
6. Lihat loyalty points
```

---

## 🐛 TROUBLESHOOTING

### Login Tidak Berhasil
**Owner/Manager:**
- Pastikan email & password benar
- Cek di database apakah status = 'active'
- Cek di database apakah role sudah sesuai

**Staff:**
- Pastikan staff_code benar (case-sensitive)
- Cek apakah login_code sudah expire
- Minta login_code baru ke Owner jika expire

**Customer:**
- Pastikan nomor telepon format benar (08xxx)
- Jika customer baru, centang checkbox & isi nama

### Database Connection Error
```
Error: Invalid Supabase URL or Key
Fix:
1. Cek .env.local sudah benar
2. Restart dev server (npm run dev)
3. Clear browser cache & localStorage
```

### Role Access Denied
```
Error: 403 Forbidden
Fix:
1. Logout dan login ulang
2. Cek localStorage - pastikan user_role benar
3. Clear localStorage dan login ulang
```

---

## 📊 MONITORING & MAINTENANCE

### Check Database Health
```sql
-- Cek jumlah records
SELECT 
  'staff' as table_name, COUNT(*) as count FROM staff
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'orders', COUNT(*) FROM orders;

-- Cek login codes yang expire
SELECT staff_code, name, login_code_expires_at 
FROM staff 
WHERE role IN ('staff', 'cashier') 
AND login_code_expires_at < NOW();

-- Cek inventory low stock
SELECT name, current_stock, reorder_level
FROM inventory_items
WHERE current_stock < reorder_level;
```

### Clear Test Data
```sql
-- Hati-hati! Ini akan hapus semua data
TRUNCATE TABLE activity_logs CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE customers CASCADE;
-- etc...
```

---

## 🚀 NEXT DEVELOPMENT STEPS

### Phase 1: Core Features (Current) ✅
- [x] Authentication system
- [x] Database schema
- [x] Basic login pages
- [x] Role-based access

### Phase 2: Backend API 🔄
- [ ] Create RESTful API untuk semua entities
- [ ] Implement CRUD operations
- [ ] Add validation & error handling
- [ ] Setup proper authentication middleware

### Phase 3: Frontend Integration 📋
- [ ] Connect frontend dengan real API (bukan mockData)
- [ ] Implement real-time updates (Supabase Realtime)
- [ ] Add loading states & error handling
- [ ] Implement proper form validations

### Phase 4: Advanced Features 🎯
- [ ] Password hashing (bcrypt)
- [ ] JWT sessions
- [ ] Email notifications
- [ ] OTP verification untuk customer
- [ ] Export to PDF/Excel
- [ ] Print receipts

### Phase 5: Production Ready 🚀
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] Deployment setup
- [ ] Documentation

---

## 📞 SUPPORT

Jika ada pertanyaan atau issue:
1. Cek dokumentasi di `AUTHENTICATION_STRUCTURE.md`
2. Lihat role matrix di `ROLE_ACCESS_MATRIX.md`
3. Review database schema di `database_schema.sql`
4. Check console browser untuk error messages

---

## 📝 NOTES PENTING

1. **Security Development vs Production**:
   - Development: Plain text passwords untuk testing
   - Production: HARUS gunakan bcrypt & JWT

2. **Staff Login Codes**:
   - Valid 24 jam
   - Generate via Owner/Staff Manager
   - Tidak bisa di-reset oleh staff sendiri

3. **Customer Data**:
   - Auto-register saat login pertama
   - Phone number sebagai unique identifier
   - Production: tambahkan OTP verification

4. **Activity Logs**:
   - Semua action penting ter-log otomatis
   - Hanya Owner yang bisa akses
   - Gunakan untuk audit & troubleshooting

5. **Inventory Tracking**:
   - Stock auto-decrease saat order dibuat
   - Usage history ter-record
   - Alert jika stock < reorder level

---

**Happy Coding! 🎉**
