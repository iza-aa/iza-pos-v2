# 👥 STAFF TYPES & RESPONSIBILITIES - FOODIES POS

## 📋 OVERVIEW

Sistem staff dibagi menjadi **4 tipe** berdasarkan fungsi operasional di cafe/restaurant:
1. **Barista** - Pembuat minuman
2. **Kitchen** - Chef/Cook
3. **Waiter** - Pelayan
4. **Cashier** - Kasir

Semua staff login dengan cara yang sama (Staff Code + Login Code), tapi akses fitur berbeda berdasarkan `staff_type`.

---

## ☕ 1. BARISTA

### Tanggung Jawab:
- Membuat kopi dan minuman lainnya
- Mengelola mesin kopi
- Mengontrol kualitas minuman

### Akses Sistem:
- ✅ **Dashboard**: Personal performance, shift info
- ✅ **Beverage Queue**: Lihat order minuman yang masuk
- ✅ **Mark as Ready**: Tandai minuman sudah siap
- ✅ **POS (Limited)**: Hanya untuk input order beverage walk-in
- ✅ **Attendance**: Check-in/out shift
- ❌ **Food Orders**: Tidak bisa akses order makanan
- ❌ **Payment**: Tidak bisa process pembayaran
- ❌ **Menu Management**: Tidak bisa edit menu/harga

### Workflow Barista:
```
1. Check-in saat mulai shift
2. Lihat beverage queue di dashboard
3. Terima order baru (notifikasi/alert)
4. Buat minuman sesuai spesifikasi
5. Mark beverage as ready
6. Waiter akan deliver ke customer
7. Track performance (drinks made, avg time)
8. Check-out saat selesai shift
```

### Dashboard Widgets:
- Pending Beverage Orders
- Completed Drinks (today)
- Average Preparation Time
- Most Ordered Drink
- Current Shift Info

---

## 👨‍🍳 2. KITCHEN (Chef/Cook)

### Tanggung Jawab:
- Memasak makanan
- Mengelola cooking queue
- Memastikan kualitas masakan

### Akses Sistem:
- ✅ **Dashboard**: Personal performance, shift info
- ✅ **Food Queue**: Lihat order makanan yang masuk
- ✅ **Mark as Ready**: Tandai makanan sudah siap
- ✅ **Inventory View**: Lihat stock bahan (read-only)
- ✅ **Attendance**: Check-in/out shift
- ❌ **Beverage Orders**: Tidak bisa akses order minuman
- ❌ **POS**: Tidak ada akses POS
- ❌ **Payment**: Tidak bisa process pembayaran

### Workflow Kitchen:
```
1. Check-in saat mulai shift
2. Lihat food queue di dashboard
3. Terima order baru dengan prioritas
4. Cek ketersediaan bahan dari inventory
5. Masak sesuai recipe & spesifikasi
6. Mark food as ready
7. Waiter akan deliver ke customer
8. Track performance (dishes made, avg time)
9. Check-out saat selesai shift
```

### Dashboard Widgets:
- Pending Food Orders (prioritized by time)
- Completed Dishes (today)
- Average Cooking Time
- Low Stock Alerts
- Current Shift Info

---

## 🤵 3. WAITER (Server/Waitress)

### Tanggung Jawab:
- Melayani customer
- Mengambil order
- Mengantarkan makanan/minuman
- Mengelola meja (dine-in)

### Akses Sistem:
- ✅ **Dashboard**: Orders overview, table status
- ✅ **POS**: Input order customer (full menu)
- ✅ **Table Management**: Assign order ke meja
- ✅ **Order Tracking**: Track status makanan/minuman
- ✅ **Mark as Served**: Tandai sudah deliver ke customer
- ✅ **Attendance**: Check-in/out shift
- ❌ **Payment**: Redirect ke cashier untuk pembayaran
- ❌ **Menu Management**: Tidak bisa edit menu
- ❌ **Inventory**: Tidak bisa akses inventory

### Workflow Waiter:
```
1. Check-in saat mulai shift
2. Greet customer & assign table
3. Ambil order via POS
   - Pilih menu items
   - Customize variants
   - Add notes/special requests
   - Confirm order
4. Monitor order status:
   - Kitchen preparing food
   - Barista making drinks
5. Ambil item yang ready
6. Deliver ke customer & mark as served
7. Customer finish → redirect to cashier
8. Clear & clean table
9. Check-out saat selesai shift
```

### Dashboard Widgets:
- Active Tables
- Pending Orders (waiting to serve)
- Ready to Serve Items
- Orders Served Today
- Customer Feedback
- Current Shift Info

---

## 💰 4. CASHIER

### Tanggung Jawab:
- Memproses pembayaran
- Menerima order takeaway/counter
- Print receipt
- Mengelola cash drawer

### Akses Sistem:
- ✅ **Full POS Access**: Complete order & payment flow
- ✅ **Payment Processing**: Cash, Card, E-Wallet
- ✅ **Receipt Printing**: Print/email receipt
- ✅ **Order Creation**: Untuk takeaway/counter orders
- ✅ **Void/Refund**: Dengan approval manager
- ✅ **End of Day Report**: Daily sales summary
- ✅ **Attendance**: Check-in/out shift
- ❌ **Menu Management**: Tidak bisa edit menu
- ❌ **Inventory**: Tidak bisa akses inventory

### Workflow Cashier:
```
1. Check-in & open cash drawer
2. Count opening balance
3. Handle 2 type orders:
   a. Takeaway/Counter:
      - Terima order dari customer
      - Input via POS
      - Process payment immediately
      - Print receipt
   b. Dine-in:
      - Customer datang untuk bayar
      - Lihat order dari table number
      - Process payment
      - Print receipt
4. Handle payment methods:
   - Cash: Hitung kembalian
   - Card: Swipe/tap, confirm
   - E-Wallet: Scan QR, confirm
5. Void/refund jika ada error (need manager)
6. End of day:
   - Count cash drawer
   - Print daily report
   - Reconcile transactions
7. Check-out saat selesai shift
```

### Dashboard Widgets:
- Today's Sales
- Orders Count
- Payment Methods Breakdown
- Pending Payments
- Cash Drawer Balance
- Current Shift Info

---

## 🔄 STAFF TYPE INTERACTIONS

### Typical Order Flow (Dine-in):
```
1. WAITER → Take order via POS
   ├─> Food items → Kitchen Queue
   └─> Beverage items → Barista Queue

2. KITCHEN → Prepare food
   └─> Mark as ready

3. BARISTA → Prepare drinks
   └─> Mark as ready

4. WAITER → Collect ready items
   └─> Deliver to customer
   └─> Mark as served

5. Customer finish eating
   
6. CASHIER → Process payment
   └─> Print receipt
   └─> Update order status: completed
```

### Typical Order Flow (Takeaway):
```
1. CASHIER → Take order at counter
   ├─> Input via POS
   ├─> Food → Kitchen Queue
   └─> Beverage → Barista Queue

2. KITCHEN + BARISTA → Prepare items
   └─> Mark as ready

3. CASHIER → Collect items
   └─> Process payment
   └─> Hand over to customer
   └─> Print receipt
```

---

## 📊 PERMISSION MATRIX BY STAFF TYPE

| Feature | Barista | Kitchen | Waiter | Cashier |
|---------|---------|---------|--------|---------|
| **POS - Create Order** | ✅ Beverage only | ❌ No | ✅ Full menu | ✅ Full menu |
| **POS - Payment** | ❌ No | ❌ No | ❌ No | ✅ Yes |
| **Beverage Queue** | ✅ Yes | ❌ No | ✅ View only | ✅ View only |
| **Food Queue** | ❌ No | ✅ Yes | ✅ View only | ✅ View only |
| **Table Management** | ❌ No | ❌ No | ✅ Yes | ✅ View only |
| **Mark as Ready** | ✅ Beverages | ✅ Food | ❌ No | ❌ No |
| **Mark as Served** | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| **Void/Refund** | ❌ No | ❌ No | ❌ No | ✅ With approval |
| **Daily Report** | ✅ Personal | ✅ Personal | ✅ Personal | ✅ Full sales |
| **Inventory View** | ❌ No | ✅ Read only | ❌ No | ❌ No |
| **Attendance** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |

---

## 🎯 PERFORMANCE METRICS BY TYPE

### Barista KPIs:
- Drinks made per shift
- Average preparation time per drink
- Customer satisfaction (optional)
- Waste/remakes

### Kitchen KPIs:
- Dishes made per shift
- Average cooking time per dish
- Order accuracy
- Waste/rejected dishes

### Waiter KPIs:
- Tables served per shift
- Orders taken
- Average service time
- Customer tips/feedback

### Cashier KPIs:
- Transactions processed
- Average transaction value
- Payment accuracy (no voids/errors)
- Cash drawer reconciliation accuracy

---

## 💡 IMPLEMENTATION NOTES

### Database:
```sql
-- staff table sudah include staff_type
SELECT * FROM staff WHERE role = 'staff';
-- Returns: staff_type IN ('barista', 'kitchen', 'waiter', 'cashier')
```

### Frontend (localStorage):
```javascript
// After login
localStorage.getItem('staff_type') // 'barista', 'kitchen', 'waiter', or 'cashier'

// Conditional rendering
if (staffType === 'barista') {
  showBeverageQueue();
} else if (staffType === 'kitchen') {
  showFoodQueue();
}
```

### Dashboard Components:
```typescript
// Components per staff type
components/staff/dashboard/
├── barista/
│   ├── BeverageQueue.tsx
│   └── BaristaMetrics.tsx
├── kitchen/
│   ├── FoodQueue.tsx
│   └── KitchenMetrics.tsx
├── waiter/
│   ├── TableManager.tsx
│   └── WaiterMetrics.tsx
└── cashier/
    ├── PaymentTerminal.tsx
    └── CashierMetrics.tsx
```

---

## 🚀 NEXT STEPS

1. ✅ Update database schema dengan staff_type
2. ✅ Update login API untuk return staff_type
3. ✅ Update localStorage untuk store staff_type
4. ⏳ Create conditional dashboard berdasarkan staff_type
5. ⏳ Build Beverage Queue untuk Barista
6. ⏳ Build Food Queue untuk Kitchen
7. ⏳ Build Table Manager untuk Waiter
8. ⏳ Build Payment Terminal untuk Cashier
9. ⏳ Implement role-based component visibility
10. ⏳ Add performance tracking per staff type

---

**Dengan struktur ini, sistem menjadi lebih terorganisir dan sesuai dengan workflow cafe/restaurant yang sebenarnya!** ☕🍽️
