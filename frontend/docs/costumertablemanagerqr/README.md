# Restaurant Map & QR Self-Order System

## 📋 Overview

System untuk table management dengan QR code self-ordering untuk customer. Customer scan QR di table, order sendiri, dan order masuk ke unified order page dengan badge pembeda (POS vs QR).

**Created:** December 14, 2025  
**Status:** 🔄 Planning Phase

---

## 🚀 Quick Links

**Start Here:**
- [📱 Customer Quick Start](./QUICK_START_CUSTOMER.md) - Start with customer mobile app
- [📊 Progress Tracker](./PROGRESS.md) - Track implementation progress
- [🔄 System Flow](./SYSTEM_FLOW.md) - How all roles interact

**Design & Flow:**
- [🎨 Design System](./DESIGN_SYSTEM.md) - Monochrome colors + Heroicons reference
- [📱 Mobile Design Guide](./MOBILE_DESIGN.md) - UI/UX specifications
- [🖼️ Visual Mockups](./VISUAL_MOCKUPS.md) - Page mockups with examples
- [�🔄 Customer Flow](./CUSTOMER_FLOW.md) - Visual journey diagrams

**Technical:**
- [📂 Folder Structure](./STRUCTURE.md) - Complete file structure
- [🗄️ Database Schema](./DATABASE.md) - Tables & migrations
- [🔌 API Documentation](./API.md) - Endpoint specifications
- [⚙️ Implementation Guide](./IMPLEMENTATION.md) - Step-by-step instructions

---

## 🎯 Core Features

### 1. **Customer Self-Order (QR System)**
- Customer scan QR code di table
- Browse menu & add to cart
- Submit order directly (no staff needed)
- Track order status real-time
- Call waiter if needed

### 2. **Manager Table Management**
- Create & edit floor plans
- Drag & drop table layout
- Generate QR codes per table
- Print QR codes for physical tables
- Real-time table status monitoring
- Analytics: revenue per table, turnover rate

### 3. **Staff Quick View**
- See table availability
- Quick table status updates
- Assign table saat POS order
- Serve orders to correct table

### 4. **Unified Order System**
- Single order page untuk semua orders
- Badge pembeda: 💳 Cashier | 📱 QR Order
- Filter by order source
- Same kitchen workflow

---

## 🔄 User Flows

### Customer Flow (Mobile App)
```
1. Login/Register
   → /customer/login

2. Dashboard (Home)
   → /customer/dashboard
   - See recent orders
   - Quick actions
   - Scan QR button

3. Scan QR Code at table
   → /customer/table/{tableId}
   → Auto redirect to /customer/order (with table context)

4. Browse & Order
   → /customer/order
   - View menu by category
   - Add items to cart
   - Review cart
   - Checkout (source='qr')

5. Track Order
   → /customer/track
   - Real-time order status
   - Timeline view
   - Call waiter button

6. Settings
   → /customer/settings
   - Profile
   - Order history
   - Preferences
```

### Staff Flow (POS)
```
1. Customer datang
2. Guide ke table kosong
3. Customer scan QR sendiri
   OR
   Staff order via POS → pilih table
4. Staff monitor orders
5. Serve food to table
6. Process payment
7. Clear table
```

### Manager Flow
```
1. Setup floor plan
2. Add/edit tables
3. Generate QR codes
4. Print QR codes
5. Monitor all tables
6. View analytics
```

---

## 📁 Key Components

### Customer Pages (Mobile-First + PWA)
- `/customer/login` - Login/Register
- `/customer/dashboard` - Home with QR scanner
- `/customer/order` - Browse menu & place order
- `/customer/track` - Track active orders  
- `/customer/settings` - Profile & preferences
- `/customer/table/[tableId]` - QR scan landing (redirects to order)

### Manager Pages
- `/manager/restaurant-map` - Table layout editor
- `/manager/restaurant-map/qr-codes` - QR generator
- `/manager/order` - Unified order monitoring (updated)

### Staff Pages
- `/staff/restaurant-map` - Quick table view
- `/staff/pos` - POS with table selector (updated)
- `/staff/order` - Order tracking with badges (updated)

---

## 🗄️ Database Changes

### New Tables
- `tables` - Table information & QR data
- `floors` - Floor/area management
- `table_sessions` - Analytics tracking

### Updated Tables
- `orders` - Add: `order_source`, `table_id`, `table_number`

---

## 📚 Documentation Files

- [README.md](./README.md) - Project overview (you are here)
- [STRUCTURE.md](./STRUCTURE.md) - Complete folder structure
- [DATABASE.md](./DATABASE.md) - Database schema & migrations
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Step-by-step implementation guide
- [API.md](./API.md) - API endpoints documentation
- [PROGRESS.md](./PROGRESS.md) - Development progress tracker
- [MOBILE_DESIGN.md](./MOBILE_DESIGN.md) - Mobile-first design guide
- [CUSTOMER_FLOW.md](./CUSTOMER_FLOW.md) - Customer journey visual flow

---

## 🚀 Implementation Priority

**Phase 1: Database & Core**
- [ ] Database schema (tables, floors)
- [ ] QR code generation service
- [ ] Basic table CRUD API

**Phase 2: Manager Interface**
- [ ] Table layout editor
- [ ] QR code generator page
- [ ] Print QR codes functionality

**Phase 3: Customer Self-Order**
- [ ] Customer landing page
- [ ] Menu browsing
- [ ] Cart & checkout
- [ ] Order submission (source='qr')

**Phase 4: Staff Integration**
- [ ] Table selector in POS
- [ ] Order source badges
- [ ] Staff table view

**Phase 5: Analytics & Polish**
- [ ] Table turnover analytics
- [ ] Revenue per table
- [ ] Real-time sync optimization

---

## ✅ Design Decisions

1. **Separate Pages, Unified Orders** - Table management terpisah, tapi semua orders masuk ke satu page dengan badge
2. **No Online Delivery** - Fokus ke dine-in only (POS + QR)
3. **QR Auto-assigns Table** - Customer scan QR = auto dapat table_id
4. **Same Kitchen Flow** - Kitchen tidak perlu tahu order dari mana (POS/QR)

---

## 🔧 Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Real-time)
- **QR Generation:** qrcode library
- **State Management:** React hooks + SWR

---

## 📝 Notes & Corrections

> User dapat menambahkan koreksi atau notes di bawah ini:

---

**Last Updated:** December 14, 2025
