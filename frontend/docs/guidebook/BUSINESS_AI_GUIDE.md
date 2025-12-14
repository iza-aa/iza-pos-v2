# 🤖 BUSINESS AI GUIDE - IZA POS System

**Purpose:** Panduan mapping untuk AI Business Intelligence Assistant

**Format:** IF user asks X → DO Y

---

## 📊 SECTION 1: KEYWORD MAPPING (User Language → Database Terms)

### Sales / Penjualan
```
"sales" / "penjualan" / "omzet" / "revenue" → orders.total
"sales hari ini" → WHERE DATE(created_at) = CURRENT_DATE
"sales kemarin" → WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
"sales minggu ini" → WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
"sales bulan ini" → WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
"total sales" → SUM(orders.total)
"average sales" → AVG(orders.total)
```

### Products / Produk
```
"produk laris" / "best seller" / "paling laku" → ORDER BY COUNT(*) DESC
"produk" / "menu" / "item" → products table OR order_items.product_name
"kopi" / "coffee" → categories.type = 'beverage' AND name LIKE '%kopi%'
"makanan" / "food" → categories.type = 'food'
"minuman" / "beverage" / "drinks" → categories.type = 'beverage'
```

### Tables / Meja
```
"meja" / "table" → tables.table_number
"meja paling ramai" / "meja populer" → COUNT(orders) GROUP BY table_number
"meja kosong" / "available table" → tables.status = 'available'
"meja terisi" / "occupied table" → tables.status = 'occupied'
```

### Orders / Pesanan
```
"order" / "pesanan" / "transaksi" → orders table
"order baru" / "new order" → orders.status = 'new'
"order selesai" / "completed" → orders.status = 'completed'
"jumlah order" / "berapa order" → COUNT(orders.id)
"dine in" → orders.table_number IS NOT NULL
"takeaway" / "take away" / "bungkus" → orders.table_number IS NULL
```

### Staff / Karyawan
```
"staff" / "karyawan" / "pegawai" → staff table
"kasir" / "cashier" → staff.role = 'cashier'
"pelayan" / "waiter" → staff.role = 'waiter'
"barista" → staff.role = 'barista'
"dapur" / "kitchen" → staff.role = 'kitchen'
"staff paling produktif" → COUNT(orders.created_by) GROUP BY created_by
```

### Time Periods / Waktu
```
"hari ini" / "today" → DATE(created_at) = CURRENT_DATE
"kemarin" / "yesterday" → DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
"minggu ini" / "this week" → created_at >= CURRENT_DATE - INTERVAL '7 days'
"bulan ini" / "this month" → created_at >= CURRENT_DATE - INTERVAL '30 days'
"jam sibuk" / "peak hours" → EXTRACT(HOUR FROM created_at) GROUP BY hour
```

---

## 🎯 SECTION 2: COMMON QUESTIONS → SQL QUERIES

### Q1: "Berapa total sales hari ini?"
```sql
SELECT SUM(total) as total_sales 
FROM orders 
WHERE DATE(created_at) = CURRENT_DATE 
  AND payment_status = 'paid';
```
**Return:** "Total sales hari ini Rp {total_sales}"

---

### Q2: "Produk apa yang paling laku?"
```sql
SELECT 
  product_name, 
  COUNT(*) as jumlah_terjual,
  SUM(quantity) as total_qty
FROM order_items
JOIN orders ON order_items.order_id = orders.id
WHERE DATE(orders.created_at) = CURRENT_DATE
GROUP BY product_name
ORDER BY jumlah_terjual DESC
LIMIT 5;
```
**Return:** "Top 5 produk hari ini: 1. {name} ({qty}x), 2. ..."

---

### Q3: "Meja mana yang paling sering dipakai?"
```sql
SELECT 
  table_number, 
  COUNT(*) as usage_count
FROM orders
WHERE table_number IS NOT NULL
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY table_number
ORDER BY usage_count DESC
LIMIT 5;
```
**Return:** "Top 5 meja minggu ini: Table {number} ({count}x), ..."

---

### Q4: "Berapa order yang masih proses?"
```sql
SELECT COUNT(*) as pending_orders
FROM orders
WHERE status IN ('new', 'preparing')
  AND DATE(created_at) = CURRENT_DATE;
```
**Return:** "Saat ini ada {count} order yang masih diproses"

---

### Q5: "Sales per kategori hari ini?"
```sql
SELECT 
  c.name as category,
  COUNT(DISTINCT o.id) as order_count,
  SUM(oi.total_price) as total_sales
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN products p ON oi.product_id = p.id
JOIN categories c ON p.category_id = c.id
WHERE DATE(o.created_at) = CURRENT_DATE
GROUP BY c.name
ORDER BY total_sales DESC;
```
**Return:** "Sales per kategori: {category} Rp {sales}, ..."

---

### Q6: "Jam berapa paling ramai?"
```sql
SELECT 
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(*) as order_count
FROM orders
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY hour
ORDER BY order_count DESC
LIMIT 3;
```
**Return:** "Jam tersibuk hari ini: {hour}:00 ({count} orders)"

---

### Q7: "Staff mana yang paling banyak handle order?"
```sql
SELECT 
  created_by_staff_name as staff,
  created_by_role as role,
  COUNT(*) as total_orders
FROM orders
WHERE DATE(created_at) = CURRENT_DATE
  AND created_by_staff_name IS NOT NULL
GROUP BY created_by_staff_name, created_by_role
ORDER BY total_orders DESC
LIMIT 5;
```
**Return:** "Top staff hari ini: {name} ({role}) - {count} orders"

---

### Q8: "Metode pembayaran apa yang paling sering?"
```sql
SELECT 
  payment_method,
  COUNT(*) as usage_count,
  SUM(amount_paid) as total_amount
FROM payment_transactions
JOIN orders ON payment_transactions.order_id = orders.id
WHERE DATE(orders.created_at) = CURRENT_DATE
GROUP BY payment_method
ORDER BY usage_count DESC;
```
**Return:** "Pembayaran hari ini: {method} ({count}x, Rp {total})"

---

### Q9: "Berapa rata-rata nilai order?"
```sql
SELECT AVG(total) as avg_order_value
FROM orders
WHERE DATE(created_at) = CURRENT_DATE
  AND payment_status = 'paid';
```
**Return:** "Rata-rata nilai order hari ini: Rp {avg}"

---

### Q10: "Dine in atau takeaway lebih banyak?"
```sql
SELECT 
  CASE 
    WHEN table_number IS NOT NULL THEN 'Dine In'
    ELSE 'Takeaway'
  END as order_type,
  COUNT(*) as count
FROM orders
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY order_type;
```
**Return:** "Hari ini: Dine In {count}x, Takeaway {count}x"

---

## 📐 SECTION 3: DATABASE STRUCTURE (Essential Only)

### Table: orders
```
KEY COLUMNS:
- id (UUID, primary key)
- order_number (VARCHAR, unique identifier)
- customer_name (VARCHAR, nullable)
- table_number (VARCHAR, nullable) → NULL = takeaway, NOT NULL = dine in
- order_type (VARCHAR) → 'Dine in' or 'Take Away'
- status (VARCHAR) → 'new', 'preparing', 'served', 'completed', 'cancelled'
- subtotal (NUMERIC)
- tax (NUMERIC)
- discount (NUMERIC)
- total (NUMERIC) → subtotal + tax - discount
- payment_status (VARCHAR) → 'pending', 'paid', 'cancelled'
- payment_method (VARCHAR) → 'Cash', 'QRIS', etc
- created_by (UUID, FK to staff)
- created_by_role (VARCHAR) → 'OWN', 'MAN', 'STA'
- created_by_staff_code (VARCHAR)
- created_by_staff_name (VARCHAR)
- created_at (TIMESTAMP)
```

### Table: order_items
```
KEY COLUMNS:
- id (UUID, primary key)
- order_id (UUID, FK to orders)
- product_id (UUID, FK to products)
- product_name (VARCHAR)
- quantity (INTEGER)
- base_price (NUMERIC)
- total_price (NUMERIC) → base_price * quantity + variants
- variants (JSONB, nullable) → variant details
- kitchen_status (VARCHAR) → 'pending', 'cooking', 'ready', 'not_required'
- served (BOOLEAN)
- served_at (TIMESTAMP)
```

### Table: products
```
KEY COLUMNS:
- id (UUID, primary key)
- name (VARCHAR)
- category_id (UUID, FK to categories)
- price (NUMERIC)
- available (BOOLEAN)
- has_variants (BOOLEAN)
- image (TEXT)
```

### Table: categories
```
KEY COLUMNS:
- id (UUID, primary key)
- name (VARCHAR)
- type (VARCHAR) → 'food' or 'beverage'
- is_active (BOOLEAN)
```

### Table: tables
```
KEY COLUMNS:
- id (UUID, primary key)
- table_number (VARCHAR, unique)
- capacity (INTEGER)
- status (VARCHAR) → 'available', 'occupied', 'reserved'
- qr_code (TEXT, nullable)
```

### Table: staff
```
KEY COLUMNS:
- id (UUID, primary key)
- staff_code (VARCHAR, unique)
- name (VARCHAR)
- role (VARCHAR) → 'owner', 'manager', 'kitchen', 'cashier', 'barista', 'waiter'
- phone (VARCHAR)
- status (VARCHAR) → 'Aktif', 'Nonaktif'
```

### Table: payment_transactions
```
KEY COLUMNS:
- id (UUID, primary key)
- order_id (UUID, FK to orders)
- payment_method (VARCHAR) → 'Cash', 'QRIS', 'Debit', 'Credit'
- amount_paid (NUMERIC)
- amount_change (NUMERIC)
- status (VARCHAR) → 'pending', 'success', 'failed'
- created_by (UUID, FK to staff)
```

---

## 🔗 SECTION 4: RELATIONSHIPS (How to JOIN)

### Get Order with Items
```sql
SELECT o.*, oi.*
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.id = {order_id};
```

### Get Order with Product Details
```sql
SELECT o.*, oi.*, p.name, p.image, c.name as category
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
WHERE o.id = {order_id};
```

### Get Order with Payment
```sql
SELECT o.*, pt.*
FROM orders o
LEFT JOIN payment_transactions pt ON o.id = pt.order_id
WHERE o.id = {order_id};
```

### Get Staff Performance
```sql
SELECT 
  s.name,
  s.role,
  COUNT(o.id) as total_orders
FROM staff s
LEFT JOIN orders o ON s.id = o.created_by
WHERE DATE(o.created_at) = CURRENT_DATE
GROUP BY s.id, s.name, s.role;
```

---

## ⚠️ SECTION 5: BUSINESS RULES & FILTERS

### Rule 1: Only Count Paid Orders for Sales
```
ALWAYS add: payment_status = 'paid'
REASON: Unpaid/cancelled orders should not be counted as sales
```

### Rule 2: Table Number Logic
```
table_number IS NOT NULL → Dine In order
table_number IS NULL → Takeaway order
```

### Rule 3: Order Status Flow
```
new → preparing → served → completed
new → cancelled (direct)

Active orders: status IN ('new', 'preparing')
Finished orders: status IN ('completed', 'cancelled')
```

### Rule 4: Kitchen Status for Beverages
```
categories.type = 'beverage' → kitchen_status = 'not_required'
categories.type = 'food' → kitchen_status = 'pending' → 'cooking' → 'ready'
```

### Rule 5: Time Zones
```
All timestamps are stored in UTC
Use CURRENT_DATE for today (automatically converts to server timezone)
For specific timezone: AT TIME ZONE 'Asia/Jakarta'
```

---

## 🎨 SECTION 6: RESPONSE FORMATTING RULES

### Format 1: Currency
```
ALWAYS format as: Rp {amount:,}
Example: Rp 2.450.000 (NOT Rp 2450000)
```

### Format 2: Large Numbers
```
Use thousand separators: 1.234 (NOT 1234)
```

### Format 3: Percentages
```
Show as: 45% (NOT 0.45)
Round to 1 decimal: 45.3%
```

### Format 4: Lists (Top 5)
```
1. {item} ({count}x)
2. {item} ({count}x)
3. {item} ({count}x)
...
```

### Format 5: Comparisons
```
"Hari ini: {value} (+12% vs kemarin)"
"Minggu ini: {value} (-5% vs minggu lalu)"
```

### Format 6: Time
```
Show hours in 24h format: 14:00 (NOT 2 PM)
Show dates: 14 Des 2025 (NOT 2025-12-14)
```

---

## 🚨 SECTION 7: ERROR HANDLING

### If Query Returns Empty
```
Response: "Tidak ada data untuk periode ini"
NOT: "0" or "null"
```

### If Invalid Time Period
```
Response: "Mohon spesifikasikan periode waktu (hari ini, minggu ini, bulan ini)"
```

### If Ambiguous Request
```
Response: "Apakah Anda maksud: 
1. Total sales hari ini?
2. Sales per produk?
3. Sales per kategori?"
```

### If Out of Scope
```
Response: "Maaf, saya hanya bisa membantu dengan data sales, produk, meja, dan staff. Untuk {topic} silakan hubungi admin."
```

---

## 🔍 SECTION 8: QUERY OPTIMIZATION TIPS

### Tip 1: Always Use Indexes
```
✅ WHERE DATE(created_at) = CURRENT_DATE (indexed)
❌ WHERE created_at::date = CURRENT_DATE (slower)
```

### Tip 2: Limit Results
```
ALWAYS add LIMIT for list queries (default: 10)
For "top X" queries: LIMIT X
```

### Tip 3: Use LEFT JOIN for Optional Data
```
✅ LEFT JOIN (includes orders without items)
❌ INNER JOIN (excludes orders without items)
```

### Tip 4: Aggregate First, Then Filter
```
✅ Use HAVING for aggregate filters
✅ Use WHERE for row filters
```

---

## 📝 SECTION 9: EXAMPLE CONVERSATIONS

### Example 1: Simple Query
```
User: "Berapa sales hari ini?"
AI: [Execute query Q1]
AI: "Total sales hari ini Rp 2.450.000 dari 48 transaksi"
```

### Example 2: Multi-Part Answer
```
User: "Gimana performa hari ini?"
AI: [Execute multiple queries: Q1, Q2, Q4, Q9]
AI: "Performa hari ini:
- Total sales: Rp 2.450.000 (48 transaksi)
- Rata-rata order: Rp 51.000
- Produk terlaris: Cappuccino (25x)
- Order masih proses: 3"
```

### Example 3: Comparison
```
User: "Sales hari ini vs kemarin?"
AI: [Execute Q1 for today and yesterday]
AI: "Sales hari ini Rp 2.450.000 (+12% vs kemarin Rp 2.187.500)"
```

### Example 4: Clarification Needed
```
User: "Produk?"
AI: "Apakah Anda ingin tahu:
1. Produk terlaris hari ini?
2. Total produk available?
3. Produk per kategori?"
```

---

## 🎯 SECTION 10: PRIORITY ORDER (What to Show First)

When user asks general question like "gimana hari ini?", show in order:

1. **Total Sales** (most important)
2. **Number of Orders**
3. **Top 3 Products**
4. **Average Order Value**
5. **Dine In vs Takeaway ratio**
6. **Active Orders** (still processing)

---

**END OF GUIDE**

Total: ~500 lines (vs 2000 lines sebelumnya)
Focus: Actionable mappings & clear rules
