# 🚀 Quick Start - Customer Mobile App

## TL;DR - Customer App Structure

**Design:** Mobile-First + PWA  
**Navigation:** Bottom Nav (4 pages)  
**Auth:** Phone + Password  
**Main Flow:** Scan QR → Order → Track

---

## 📱 4 Main Pages

### 1. 🏠 Dashboard (`/customer/dashboard`)
- QR Scanner (camera)
- Quick actions
- Recent orders

### 2. 🍽️ Order (`/customer/order`)
- Menu browsing (2-col grid)
- Category tabs (sticky)
- Cart drawer (slide-up)
- Table info (if scanned QR)

### 3. 📦 Track (`/customer/track`)
- Active orders
- Real-time timeline
- Call waiter button

### 4. ⚙️ Settings (`/customer/settings`)
- Profile
- Order history
- Preferences

---

## 🔄 User Flow (30 seconds)

```
1. Login → Dashboard
2. Scan QR at table
3. Browse menu → Add to cart
4. Checkout → Order placed
5. Track order real-time
6. Staff serves → Done!
```

---

## 🎨 Design Tokens

### Layout
- Max width: `448px` (md)
- Bottom nav: `64px` fixed
- Header: `56px` sticky
- Content padding: `16px`

### Colors
- Primary: `blue-600`
- Success: `green-500`
- Warning: `yellow-500`
- Error: `red-500`

### Typography
- H1: `text-2xl font-bold` (24px)
- H2: `text-lg font-semibold` (18px)
- Body: `text-base` (16px)
- Small: `text-sm` (14px)

---

## 📂 Folder Structure (Minimal)

```
app/customer/
├── layout.tsx           # Mobile layout + bottom nav
├── login/page.tsx
├── dashboard/page.tsx   # QR scanner
├── order/page.tsx       # Menu
├── track/page.tsx       # Orders
└── settings/page.tsx

components/customer/
├── layout/
│   ├── BottomNav.tsx    # 4-item navigation
│   └── MobileHeader.tsx
├── dashboard/
│   └── QRScanner.tsx    # Camera
├── order/
│   ├── MenuItemCard.tsx
│   ├── CartDrawer.tsx
│   └── CartSummary.tsx  # Floating button
└── track/
    └── OrderTimeline.tsx
```

---

## 🔌 Key APIs

```typescript
// Auth
POST /api/customer/auth/login
POST /api/customer/auth/register

// Orders
POST /api/customer/orders         // Place order
GET  /api/customer/orders         // Get all orders
GET  /api/customer/orders/[id]    // Track order

// Table
GET  /api/customer/table/[id]     // Validate table
```

---

## 🛠️ Dependencies

```bash
npm install next-pwa              # PWA support
npm install html5-qrcode          # QR scanner
npm install @radix-ui/react-dialog # Modals
npm install @heroicons/react      # Icon library (monochrome)
```

---

## ✅ Implementation Checklist

**Phase 1: Setup (1 day)**
- [ ] Install dependencies
- [ ] Configure PWA
- [ ] Create layout structure
- [ ] Setup authentication

**Phase 2: Core Pages (2 days)**
- [ ] Dashboard with QR scanner
- [ ] Order page with menu
- [ ] Cart drawer
- [ ] Track order page

**Phase 3: Integration (1 day)**
- [ ] Connect APIs
- [ ] Real-time updates
- [ ] Error handling
- [ ] Loading states

**Phase 4: Polish (1 day)**
- [ ] Mobile optimizations
- [ ] PWA features
- [ ] Animations
- [ ] Testing

**Total: 5 days**

---

## 🎯 Critical Features

### Must Have
- ✅ QR scanning
- ✅ Menu browsing
- ✅ Cart & checkout
- ✅ Order tracking
- ✅ Bottom navigation

### Nice to Have
- 📱 Push notifications
- 🌙 Dark mode
- 🔍 Search menu
- ❤️ Favorites
- 📝 Order notes

---

## 🧪 Testing Points

- [ ] QR scan works on iOS/Android
- [ ] Cart persists on page reload
- [ ] Real-time updates working
- [ ] Bottom nav always visible
- [ ] Touch targets 44x44px minimum
- [ ] PWA installable
- [ ] Offline handling
- [ ] Back button works correctly

---

## 📝 Important Notes

1. **Mobile-First:** Designed for mobile only (max-w-md)
2. **Bottom Nav:** Always visible, fixed at bottom
3. **QR Source:** All customer orders have `order_source='qr'`
4. **Table Context:** Set via QR scan, stored in session
5. **Real-time:** Supabase subscriptions for order updates
6. **PWA:** Can be installed as app on home screen

---

## 🚨 Common Pitfalls

❌ **Don't:**
- Use desktop-first design
- Hide bottom navigation
- Forget safe area insets
- Skip loading states
- Ignore offline scenarios

✅ **Do:**
- Test on real devices
- Use touch-friendly sizes
- Handle camera permissions
- Implement error boundaries
- Add haptic feedback

---

## 📚 Full Documentation

For detailed information, see:
- [MOBILE_DESIGN.md](./MOBILE_DESIGN.md) - Complete UI/UX specs
- [CUSTOMER_FLOW.md](./CUSTOMER_FLOW.md) - Visual flow diagrams
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Step-by-step guide
- [PROGRESS.md](./PROGRESS.md) - Track your progress

---

**Ready to start? Begin with Phase 1 in [PROGRESS.md](./PROGRESS.md)** 🚀
