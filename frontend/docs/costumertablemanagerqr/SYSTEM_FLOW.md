# 🔄 System Flow - All Roles Interaction

## 📊 Complete System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    RESTAURANT POS SYSTEM                    │
│                 with QR Self-Order Feature                  │
└─────────────────────────────────────────────────────────────┘

        MANAGER              STAFF              CUSTOMER
           │                   │                    │
           │                   │                    │
    ┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐
    │             │     │             │     │             │
    │   SETUP     │     │   DAILY     │     │   MOBILE    │
    │   SYSTEM    │     │ OPERATIONS  │     │    APP      │
    │             │     │             │     │             │
    └─────────────┘     └─────────────┘     └─────────────┘
```

---

## 🏗️ MANAGER ROLE - Initial Setup

### Phase 1: Table Setup
```
Manager → /manager/restaurant-map

1. Create Floor Plan
   ┌─────────────────────┐
   │  [+ Add Floor]      │
   │                     │
   │  ☑️ Floor 1         │
   │  ☐ Floor 2         │
   │  ☐ Outdoor         │
   └─────────────────────┘

2. Add Tables
   ┌─────────────────────┐
   │  [+ Add Table]      │
   │                     │
   │  Table Number: T1   │
   │  Floor: Floor 1     │
   │  Capacity: 4        │
   │  Shape: Round       │
   │  Position: [Drag]   │
   │                     │
   │  [Create]           │
   └─────────────────────┘

3. Arrange Tables on Floor Plan
   ┌─────────────────────────┐
   │  Floor Plan Canvas      │
   │                         │
   │  ⭕ T1   ▢ T2   ▬ T3   │
   │    ↕️ Drag & Drop      │
   │                         │
   │  ⭕ T4   ▢ T5          │
   └─────────────────────────┘
```

### Phase 2: QR Code Generation
```
Manager → /manager/restaurant-map/qr-codes

1. Generate QR Codes
   ┌─────────────────────┐
   │ Select Floor: All   │
   │                     │
   │ Tables: 5           │
   │ T1, T2, T3, T4, T5  │
   │                     │
   │ [Generate QR Codes] │
   └─────────────────────┘
          │
          ▼
   For each table:
   • Create QR URL: /customer/table/{tableId}
   • Generate QR image
   • Save to database

2. Download & Print
   ┌─────────────────────┐
   │ ✅ Generated!       │
   │                     │
   │ [Download ZIP]      │
   │ [Print All]         │
   │                     │
   │ Preview:            │
   │ QR QR QR QR QR      │
   │ T1 T2 T3 T4 T5      │
   └─────────────────────┘

3. Physical Setup
   Print → Laminate → Place on tables
   
   ┌──────────┐
   │  Table   │
   │    1     │
   │  ┌────┐  │
   │  │ QR │  │ ← Sticker on table
   │  └────┘  │
   └──────────┘
```

### Phase 3: Monitor Operations
```
Manager → /manager/order (Unified Order Page)

┌──────────────────────────────────────┐
│ Orders | [All ▼] [POS] [QR]         │
├──────────────────────────────────────┤
│ 💳 #122 | T3 | $45 | Ready   (POS)  │ ← Staff input
│ 📱 #123 | T5 | $32 | Preparing (QR) │ ← Customer self-order
│ 💳 #124 | Counter | $15 | New (POS) │ ← No table (takeaway)
│ 📱 #125 | T2 | $67 | Ready   (QR)   │ ← Customer self-order
└──────────────────────────────────────┘
         ↑                    ↑
    Badge shows         Real-time
    order source         updates


Manager can:
✓ View all orders (POS + QR)
✓ Filter by source
✓ Monitor table usage
✓ View analytics (future)
```

---

## 👨‍🍳 STAFF ROLE - Daily Operations

### Scenario A: Customer Self-Order (QR)
```
1. Customer arrives
   Staff: "Welcome! Please have a seat at Table 5"
          "Scan the QR code to order"

2. Customer sits & scans QR
   (Customer handles order themselves)

3. Staff monitors
   Staff → /staff/order
   
   ┌──────────────────────────────────┐
   │ Active Orders                    │
   ├──────────────────────────────────┤
   │ 📱 #123 | T5 | Preparing         │ ← QR order
   │    Pizza, Burger, Coke           │
   │    [View Details]                │
   └──────────────────────────────────┘

4. Order ready → Staff serves food
   Staff brings food to Table 5
   Click [Mark as Served]

5. Customer finishes → Payment
   Staff processes payment
   Order status: completed
   Table status: free (automatic)
```

### Scenario B: Staff Takes Order (POS)
```
1. Customer arrives
   Staff: "Welcome! Table 4 is available"

2. Customer prefers staff to take order
   Staff → /staff/pos
   
   ┌─────────────────────┐
   │ POS System          │
   │                     │
   │ Table: [T4 ▼] ✓     │ ← Select table
   │                     │
   │ Items:              │
   │ Pizza x1      $12   │
   │ Burger x1     $15   │
   │ Coke x2       $6    │
   │                     │
   │ Total:        $33   │
   │                     │
   │ [Submit Order]      │
   └─────────────────────┘
          │
          ▼
   POST /api/staff/orders
   {
     table_id: "T4-uuid",
     order_source: "pos", ← Important!
     items: [...]
   }

3. Order appears in unified order page
   ┌──────────────────────────────────┐
   │ 💳 #126 | T4 | $33 | Preparing   │ ← POS badge
   └──────────────────────────────────┘

4. Continue as normal...
```

### Staff Quick Table View
```
Staff → /staff/restaurant-map

┌─────────────────────────┐
│ Table Status            │
├─────────────────────────┤
│ T1 🟢 Free   (4 seats)  │ ← Available
│ T2 🔴 Occupied (#125)   │ ← Has order
│ T3 🟡 Cleaning          │ ← Being cleaned
│ T4 🔴 Occupied (#126)   │ ← Has order
│ T5 🔴 Occupied (#123)   │ ← Has order
└─────────────────────────┘

Staff can:
✓ See available tables
✓ Check table status
✓ Guide customers
```

---

## 📱 CUSTOMER ROLE - Self-Order Journey

### Complete Flow (5 minutes)
```
1. ARRIVAL (0:00)
   Customer walks in
   Staff guides to Table 5
   
   ┌──────────┐
   │  Table   │
   │    5     │
   │  [QR]    │ ← Scan this
   └──────────┘

2. SCAN QR (0:30)
   Customer opens phone
   Scan QR code
   
   QR contains: https://app.com/customer/table/uuid-t5
   
   Browser/App opens → /customer/table/uuid-t5
   
   ┌─────────────────┐
   │ Validating...   │
   │ Table 5 ✓       │
   └─────────────────┘
          │
          ▼
   Redirect to /customer/order (with table context)

3. BROWSE MENU (1:00)
   ┌─────────────────────┐
   │ Order Page          │
   │                     │
   │ Table 5 ✓           │ ← Table confirmed
   │                     │
   │ [All|Main|Drinks]   │ ← Categories
   │                     │
   │ 🍕 Pizza      $12   │
   │ 🍔 Burger     $15   │
   │ 🍝 Pasta      $18   │
   │                     │
   │    [Browse...]      │
   └─────────────────────┘

4. ADD TO CART (2:00)
   Click Pizza → Modal opens
   
   ┌─────────────────────┐
   │ Pizza               │
   │                     │
   │ Size:               │
   │ ○ Small             │
   │ ● Medium ✓          │
   │ ○ Large             │
   │                     │
   │ Extra:              │
   │ ☑ Cheese   +$2      │
   │                     │
   │ [Add to Cart] $14   │
   └─────────────────────┘
          │
          ▼
   Add Burger, Coke...
   
   ┌─────────────────────┐
   │ 🛒 (3) | $32        │ ← Floating cart
   └─────────────────────┘

5. CHECKOUT (3:00)
   Click cart button
   
   ┌─────────────────────┐
   │ Cart Drawer         │
   │                     │
   │ Pizza (M)     $14   │
   │ Burger        $15   │
   │ Coke          $3    │
   │                     │
   │ Total:        $32   │
   │                     │
   │ [PLACE ORDER]       │ ← Big button
   └─────────────────────┘
          │
          ▼
   POST /api/customer/orders
   {
     table_id: "T5-uuid",
     order_source: "qr", ← QR order!
     items: [...]
   }

6. ORDER PLACED (3:30)
   ┌─────────────────────┐
   │ ✅ Order Placed!    │
   │                     │
   │ Order #123          │
   │ Table 5             │
   │                     │
   │ [Track Order]       │
   └─────────────────────┘

7. TRACK ORDER (3:30 - 15:00)
   Auto redirect → /customer/track
   
   ┌─────────────────────┐
   │ Track Orders        │
   │                     │
   │ Order #123          │
   │ Table 5 | $32       │
   │                     │
   │ ✅ Ordered   3:30pm │
   │ ✅ Preparing 3:32pm │
   │ 🔵 Ready     ~5min  │ ← Real-time!
   │ ⚪ Served           │
   │                     │
   │ [📞 Call Waiter]    │
   └─────────────────────┘
          ↑
          │ Supabase real-time
          │ subscription updates
          │ status automatically

8. FOOD READY (13:00)
   📬 Push Notification
   "Your order is ready! 🍽️"
   
   Status → Ready ✅
   
   Staff brings food to Table 5

9. SERVED (13:30)
   Staff marks as served
   
   ┌─────────────────────┐
   │ ✅ All Done!        │
   │                     │
   │ Enjoy your meal! 😊 │
   └─────────────────────┘

10. PAYMENT & LEAVE (20:00)
    Customer calls waiter for bill
    Staff processes payment
    
    Order status: completed
    Table status: free ✅
    
    Ready for next customer!
```

---

## 🔄 Data Flow - Order Journey

```
┌─────────────────────────────────────────────────────────┐
│                    ORDER DATA FLOW                      │
└─────────────────────────────────────────────────────────┘

Customer submits order (QR)
         │
         ▼
┌────────────────────┐
│  POST /api/        │
│  customer/orders   │
│                    │
│  {                 │
│   table_id: uuid   │
│   order_source: qr │ ← Key field!
│   items: [...]     │
│  }                 │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Create Order in   │
│  Database          │
│                    │
│  orders table:     │
│  - id              │
│  - order_number    │
│  - order_source:qr │ ← Saved!
│  - table_id        │
│  - status: new     │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Database Trigger  │
│  Fires!            │
│                    │
│  update_table_     │
│  status_on_order() │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Update Table      │
│                    │
│  tables table:     │
│  - status: occupied│
│  - current_order_id│
│  - occupied_at     │
└─────────┬──────────┘
          │
          ├──────────────────────┐
          │                      │
          ▼                      ▼
┌────────────────┐    ┌────────────────┐
│ Supabase       │    │  Order appears │
│ Real-time      │    │  in unified    │
│ Broadcast      │    │  order page    │
│                │    │                │
│ All subscribed │    │ Manager/Staff  │
│ clients get    │    │ see new order  │
│ notification   │    │ with QR badge  │
└────────┬───────┘    └────────────────┘
         │
         ▼
┌────────────────────┐
│ Customer Track     │
│ Page Updates       │
│                    │
│ Status: Preparing  │
└────────────────────┘
         │
         │ Kitchen prepares food
         ▼
┌────────────────────┐
│ Staff updates      │
│ status → Ready     │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Real-time update   │
│ broadcasts to      │
│ customer           │
│                    │
│ 📬 Push notification│
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Staff serves food  │
│ Status: Served     │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Payment complete   │
│ Status: Completed  │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Database Trigger   │
│ Fires!             │
│                    │
│ clear_table_on_    │
│ order_complete()   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Create session     │
│ record (analytics) │
│                    │
│ Clear table:       │
│ - status: free     │
│ - current_order: ∅ │
│ - occupied_at: ∅   │
└────────────────────┘
          │
          ▼
       ✅ DONE!
   Table ready for
   next customer
```

---

## 🎯 Key Points - Role Responsibilities

### Manager
✅ **One-Time Setup:**
- Create floor plans
- Add tables to floor plan
- Generate QR codes
- Print & place QR codes

✅ **Ongoing:**
- Monitor all orders (POS + QR)
- View analytics
- Manage staff

### Staff
✅ **Daily Tasks:**
- Guide customers to tables
- Take orders via POS (optional)
- Monitor order status
- Serve food to tables
- Process payments

✅ **Flexibility:**
- Customer can self-order (QR)
- OR staff can take order (POS)
- Both go to same order system

### Customer
✅ **Self-Service:**
- Scan QR at table
- Browse menu on phone
- Place order independently
- Track order real-time
- Call waiter if needed

✅ **Benefits:**
- No waiting for staff
- Order at own pace
- See all items clearly
- Real-time updates

---

## 💡 System Intelligence

### Automatic Behaviors

1. **Table Status Management**
   ```
   Order created → Table occupied (automatic)
   Order complete → Table free (automatic)
   No manual intervention needed!
   ```

2. **Order Source Tracking**
   ```
   POS orders → order_source: 'pos' → 💳 Badge
   QR orders  → order_source: 'qr'  → 📱 Badge
   Same order page, different badges!
   ```

3. **Real-time Synchronization**
   ```
   Any status change → Broadcast to all clients
   Manager sees it
   Staff sees it
   Customer sees it
   All simultaneously!
   ```

4. **Session Analytics**
   ```
   Table occupied → Start timer
   Order complete → Calculate session
   Save: duration, revenue, turnover
   For analytics dashboard
   ```

---

## 📊 Summary Comparison

| Aspect | Manager | Staff | Customer |
|--------|---------|-------|----------|
| **Interface** | Desktop/Tablet | Desktop/Tablet | Mobile/PWA |
| **Main Pages** | Dashboard, Restaurant Map, Orders | POS, Orders, Table View | Dashboard, Order, Track, Settings |
| **Order Creation** | View only | POS (manual) | QR (self-order) |
| **Table Management** | Full control | View only | View assigned |
| **Order Viewing** | All orders | All orders | Own orders only |
| **Analytics** | Full access | Limited | None |
| **QR Generation** | Yes | No | No (scans only) |

---

**Conclusion:**  
Semua role bekerja bersama dalam satu sistem yang terintegrasi:
- Manager **sets up** the system
- Staff **facilitates** the service  
- Customer **self-serves** via QR
- Orders **unified** in one place
- Updates **real-time** for everyone

🎯 **Result:** Efficient, fast, modern restaurant operation!
