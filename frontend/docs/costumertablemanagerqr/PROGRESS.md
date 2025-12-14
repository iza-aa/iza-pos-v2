# 📊 Progress Tracker - Restaurant Map & QR Self-Order System

**Project:** Restaurant Table Management with QR Self-Ordering  
**Started:** December 14, 2025  
**Last Updated:** December 14, 2025  
**Current Phase:** 📋 Planning Phase

---

## 📈 Overall Progress

```
Phase 1: Database & Core Setup        [░░░░░░░░░░] 0%
Phase 2: Manager Interface            [░░░░░░░░░░] 0%
Phase 3: Customer Self-Order          [░░░░░░░░░░] 0%
Phase 4: Staff Integration            [░░░░░░░░░░] 0%
Phase 5: Unified Order System         [░░░░░░░░░░] 0%
Phase 6: Real-time Updates            [░░░░░░░░░░] 0%
Phase 7: Analytics & Polish           [░░░░░░░░░░] 0%

Total Progress:                       [░░░░░░░░░░] 0%
```

---

## Phase 1: Database & Core Setup (0%)

### 1.1 Database Schema ❌
- [ ] Create `md/28_create_tables_system.sql`
  - [ ] `floors` table
  - [ ] `tables` table
  - [ ] Indexes
  - [ ] Triggers (auto-update table status)
  - [ ] Trigger for clearing table on order complete
- [ ] Create `md/29_add_order_source.sql`
  - [ ] Add `order_source` column to orders
  - [ ] Add `table_id` column to orders
  - [ ] Add `table_number` column to orders
  - [ ] Update existing orders to 'pos'
- [ ] Create `md/30_create_table_sessions.sql`
  - [ ] `table_sessions` table for analytics
- [ ] Run migrations in Supabase SQL Editor
- [ ] Verify tables created successfully
- [ ] Test triggers functionality

### 1.2 Dependencies Installation ❌
- [ ] Install `qrcode` library
- [ ] Install `@types/qrcode`
- [ ] Install `jszip` for bulk QR download
- [ ] Verify all dependencies installed

### 1.3 TypeScript Types ❌
- [ ] Create `lib/types/table.ts`
  - [ ] Table interface
  - [ ] TableStatus enum
  - [ ] TableShape enum
- [ ] Create `lib/types/floor.ts`
  - [ ] Floor interface
- [ ] Update `lib/types/order.ts`
  - [ ] Add order_source field
  - [ ] Add table_id field
  - [ ] Add table_number field
  - [ ] OrderSource enum ('pos' | 'qr')

### 1.4 Core Services ❌
- [ ] Create `lib/services/table/tableService.ts`
  - [ ] getTables(floorId?)
  - [ ] createTable(data)
  - [ ] updateTable(id, data)
  - [ ] deleteTable(id)
  - [ ] updateTableStatus(id, status)
- [ ] Create `lib/services/table/floorService.ts`
  - [ ] getFloors()
  - [ ] createFloor(data)
  - [ ] updateFloor(id, data)
  - [ ] deleteFloor(id)
- [ ] Create `lib/services/table/qrCodeService.ts`
  - [ ] generateTableQR(tableId, tableNumber)
  - [ ] generateBulkQR(tableIds)
  - [ ] saveQRImage(tableId, image)
- [ ] Create `lib/services/table/tableStatusService.ts`
  - [ ] updateStatus(tableId, status)
  - [ ] occupyTable(tableId, orderId, customerName)
  - [ ] clearTable(tableId)

---

## Phase 2: Manager Interface (0%)

### 2.1 Manager API Routes ❌
- [ ] Create `app/api/manager/tables/route.ts`
  - [ ] GET - Get all tables
  - [ ] POST - Create new table
- [ ] Create `app/api/manager/tables/[id]/route.ts`
  - [ ] GET - Get table by ID
  - [ ] PATCH - Update table
  - [ ] DELETE - Delete table
- [ ] Create `app/api/manager/floors/route.ts`
  - [ ] GET - Get all floors
  - [ ] POST - Create floor
  - [ ] PATCH - Update floor
  - [ ] DELETE - Delete floor
- [ ] Create `app/api/manager/qr-codes/generate/route.ts`
  - [ ] POST - Generate QR codes
- [ ] Create `app/api/manager/qr-codes/download/route.ts`
  - [ ] GET - Download QR codes as ZIP

### 2.2 Manager Pages ❌
- [ ] Create `app/manager/restaurant-map/page.tsx`
  - [ ] Floor plan canvas
  - [ ] Table list sidebar
  - [ ] Add/Edit table modal
  - [ ] Drag & drop functionality
- [ ] Create `app/manager/restaurant-map/settings/page.tsx`
  - [ ] Floor management
  - [ ] Table configuration
- [ ] Create `app/manager/restaurant-map/qr-codes/page.tsx`
  - [ ] QR code preview
  - [ ] Generate QR button
  - [ ] Download ZIP functionality
  - [ ] Print view

### 2.3 Manager Components ❌
- [ ] Create `components/manager/restaurant-map/FloorPlanCanvas.tsx`
  - [ ] Canvas rendering
  - [ ] Drag & drop support
  - [ ] Grid snapping
  - [ ] Zoom controls
- [ ] Create `components/manager/restaurant-map/TableItem.tsx`
  - [ ] Draggable table element
  - [ ] Shape rendering (round/square/rectangular)
  - [ ] Status display
  - [ ] Click to edit
- [ ] Create `components/manager/restaurant-map/TableEditor.tsx`
  - [ ] Add/Edit modal
  - [ ] Form validation
  - [ ] Table properties inputs
- [ ] Create `components/manager/restaurant-map/QRCodeGenerator.tsx`
  - [ ] QR preview
  - [ ] Generate button
  - [ ] Progress indicator
- [ ] Create `components/manager/restaurant-map/QRPrintView.tsx`
  - [ ] Print layout
  - [ ] Multiple QR codes per page
  - [ ] Table info labels

---

## Phase 3: Customer Mobile App (Mobile-First + PWA) (0%)

### 3.0 PWA Setup ❌
- [ ] Install `next-pwa` package
- [ ] Install `html5-qrcode` for QR scanner
- [ ] Install `@radix-ui/react-dialog` for modals
- [ ] Configure `next.config.js` for PWA
- [ ] Create `public/manifest.json`
- [ ] Create PWA icons (192x192, 512x512)
- [ ] Test PWA installation

### 3.1 Customer Authentication ❌
- [ ] Create `app/customer/login/page.tsx`
  - [ ] Login form (phone + password)
  - [ ] Register link
  - [ ] Mobile-optimized layout
  - [ ] Form validation
- [ ] Create `app/customer/register/page.tsx`
  - [ ] Registration form
  - [ ] Phone validation
  - [ ] Password strength indicator
- [ ] Create `app/api/customer/auth/login/route.ts`
  - [ ] POST - Login customer
  - [ ] Return JWT token
- [ ] Create `app/api/customer/auth/register/route.ts`
  - [ ] POST - Register new customer
  - [ ] Hash password
  - [ ] Create customer record

### 3.2 Customer Mobile Layout ❌
- [ ] Create `app/customer/layout.tsx`
  - [ ] Mobile-first wrapper (max-w-md)
  - [ ] Sticky header
  - [ ] Content area with padding-bottom for nav
  - [ ] Customer auth provider
- [ ] Create `components/customer/layout/MobileHeader.tsx`
  - [ ] Logo/branding
  - [ ] Notifications icon
  - [ ] Profile icon
  - [ ] Sticky positioning
- [ ] Create `components/customer/layout/BottomNav.tsx`
  - [ ] 4 nav items (Home, Order, Track, Settings)
  - [ ] Active state highlighting
  - [ ] Icon + label layout
  - [ ] Fixed positioning at bottom

### 3.3 Dashboard Page ❌
- [ ] Create `app/customer/dashboard/page.tsx`
  - [ ] Welcome section
  - [ ] QR scanner section
  - [ ] Quick actions
  - [ ] Recent orders list
- [ ] Create `components/customer/dashboard/QRScanner.tsx`
  - [ ] Camera access
  - [ ] QR code detection
  - [ ] Redirect to table page
  - [ ] Error handling
- [ ] Create `components/customer/dashboard/QuickActions.tsx`
  - [ ] Shortcut buttons
  - [ ] Icon-based cards
- [ ] Create `components/customer/dashboard/RecentOrders.tsx`
  - [ ] Order cards
  - [ ] Status badges
  - [ ] Click to view details

### 3.4 Order Page (Menu Browsing) ❌
- [ ] Create `app/customer/order/page.tsx`
  - [ ] Table info display (if selected)
  - [ ] Category tabs (sticky)
  - [ ] Menu items grid (2 columns)
  - [ ] Floating cart button
  - [ ] Cart drawer integration
- [ ] Create `components/customer/order/TableInfo.tsx`
  - [ ] Table number
  - [ ] Capacity
  - [ ] Status indicator
- [ ] Create `components/customer/order/MenuCategories.tsx`
  - [ ] Horizontal scrollable tabs
  - [ ] Active category highlight
  - [ ] Smooth scroll
- [ ] Create `components/customer/order/MenuItemCard.tsx`
  - [ ] Product image
  - [ ] Name & short description
  - [ ] Price display
  - [ ] Quick add (+) button
  - [ ] Modal for variants/modifiers
- [ ] Create `components/customer/order/CartSummary.tsx`
  - [ ] Floating button (bottom-right)
  - [ ] Item count badge
  - [ ] Total amount
  - [ ] Animation on update
- [ ] Create `components/customer/order/CartDrawer.tsx`
  - [ ] Slide from bottom
  - [ ] Cart items list
  - [ ] Quantity controls (+/-)
  - [ ] Remove button
  - [ ] Subtotal, tax, total
  - [ ] Place order button

### 3.5 Track Order Page ❌
- [ ] Create `app/customer/track/page.tsx`
  - [ ] Active orders list
  - [ ] Real-time updates
  - [ ] Empty state
- [ ] Create `components/customer/track/OrderTracker.tsx`
  - [ ] Order card
  - [ ] Order details
  - [ ] Timeline integration
- [ ] Create `components/customer/track/OrderTimeline.tsx`
  - [ ] Visual timeline
  - [ ] Status icons (✅🔵⚪)
  - [ ] Estimated time
  - [ ] Pulsing animation for current
- [ ] Create `components/customer/track/CallWaiterButton.tsx`
  - [ ] Call waiter action
  - [ ] Notification to staff
  - [ ] Haptic feedback

### 3.6 Settings Page ❌
- [ ] Create `app/customer/settings/page.tsx`
  - [ ] Profile section
  - [ ] Order history
  - [ ] Preferences
  - [ ] Logout button
- [ ] Create `components/customer/settings/ProfileSection.tsx`
  - [ ] Profile photo
  - [ ] Name, email, phone
  - [ ] Edit profile button
- [ ] Create `components/customer/settings/OrderHistory.tsx`
  - [ ] Past orders list
  - [ ] Order details modal
  - [ ] Pagination/infinite scroll
- [ ] Create `components/customer/settings/PreferencesForm.tsx`
  - [ ] Notifications toggle
  - [ ] Dark mode toggle (future)
  - [ ] Language selector

### 3.7 QR Scan Flow ❌
- [ ] Create `app/customer/table/[tableId]/page.tsx`
  - [ ] Validate table ID
  - [ ] Set table in context/session
  - [ ] Redirect to order page
  - [ ] Error handling

### 3.8 Customer APIs ❌
- [ ] Create `app/api/customer/orders/route.ts`
  - [ ] POST - Submit order (source='qr')
  - [ ] GET - Get customer's orders
- [ ] Create `app/api/customer/orders/[orderId]/route.ts`
  - [ ] GET - Track specific order
  - [ ] Real-time status
- [ ] Create `app/api/customer/table/[tableId]/route.ts`
  - [ ] GET - Validate & get table info
- [ ] Create `app/api/customer/profile/route.ts`
  - [ ] GET - Get customer profile
  - [ ] PATCH - Update profile

### 3.9 Mobile Optimizations ❌
- [ ] Safe area insets for notch/home bar
- [ ] Touch targets minimum 44x44px
- [ ] Smooth animations (react-spring)
- [ ] Pull to refresh
- [ ] Haptic feedback
- [ ] Loading skeletons
- [ ] Error boundaries
- [ ] iOS Safari address bar handling
- [ ] Android back button handling
- [ ] Landscape mode optimization

---

## Phase 4: Staff Integration (0%)

### 4.1 Staff API Routes ❌
- [ ] Create `app/api/staff/tables/route.ts`
  - [ ] GET - Get available tables
- [ ] Create `app/api/staff/tables/[id]/status/route.ts`
  - [ ] PATCH - Update table status

### 4.2 Staff Pages ❌
- [ ] Create `app/staff/restaurant-map/page.tsx`
  - [ ] Simple table grid view
  - [ ] Status badges
  - [ ] Quick table info

### 4.3 Update Existing POS ❌
- [ ] Create `components/staff/pos/TableSelector.tsx`
  - [ ] Dropdown/modal for table selection
  - [ ] Show available tables only
  - [ ] Display capacity & status
- [ ] Update `app/staff/pos/page.tsx`
  - [ ] Integrate TableSelector component
  - [ ] Add table selection to order flow
  - [ ] Pass table_id & table_number to order
  - [ ] Set order_source='pos'

### 4.4 Staff Components ❌
- [ ] Create `components/staff/restaurant-map/QuickTableView.tsx`
  - [ ] Grid layout
  - [ ] Table status badges
  - [ ] Click for details

---

## Phase 5: Unified Order System with Badges (0%)

### 5.1 Shared Components ❌
- [ ] Create `components/shared/order/OrderSourceBadge.tsx`
  - [ ] Badge for 'pos' (💳 Cashier)
  - [ ] Badge for 'qr' (📱 QR Order)
  - [ ] Color coding
- [ ] Create `components/shared/restaurant-map/TableShape.tsx`
  - [ ] SVG shapes for tables
  - [ ] Round, square, rectangular
- [ ] Create `components/shared/restaurant-map/TableStatusBadge.tsx`
  - [ ] Status badges (free, occupied, reserved, cleaning)
  - [ ] Color coding

### 5.2 Update Order Pages ❌
- [ ] Update `app/manager/order/page.tsx`
  - [ ] Add OrderSourceBadge to order cards
  - [ ] Add filter by order_source
  - [ ] Display table_number if available
  - [ ] Filter: All | POS | QR
- [ ] Update `app/staff/order/page.tsx`
  - [ ] Add OrderSourceBadge to order cards
  - [ ] Add filter by order_source
  - [ ] Display table_number if available
  - [ ] Filter: All | POS | QR

### 5.3 Update Order Card Component ❌
- [ ] Update `components/shared/order/OrderCard.tsx`
  - [ ] Add OrderSourceBadge display
  - [ ] Add table_number display
  - [ ] Highlight QR orders differently (optional)

---

## Phase 6: Real-time Updates (0%)

### 6.1 Real-time Hooks ❌
- [ ] Create `lib/hooks/useRestaurantMap.ts`
  - [ ] Fetch tables by floor
  - [ ] Real-time table updates
  - [ ] Update local state on changes
- [ ] Create `lib/hooks/useTableBooking.ts`
  - [ ] Book table
  - [ ] Release table
  - [ ] Update status
- [ ] Create `lib/hooks/useRealtimeTableStatus.ts`
  - [ ] Subscribe to table changes
  - [ ] Update UI on status change
  - [ ] Handle multiple simultaneous updates

### 6.2 Supabase Real-time Setup ❌
- [ ] Configure Supabase real-time for `tables` table
- [ ] Configure Supabase real-time for `orders` table
- [ ] Test real-time updates
- [ ] Handle connection issues gracefully

---

## Phase 7: Analytics & Polish (0%)

### 7.1 Analytics Features ❌
- [ ] Table turnover rate dashboard
- [ ] Revenue per table report
- [ ] Peak hours analysis
- [ ] Most popular tables
- [ ] Average session duration

### 7.2 Utilities ❌
- [ ] Create `lib/utils/restaurant-map/tableLayout.ts`
  - [ ] Position calculations
  - [ ] Collision detection
  - [ ] Grid snapping logic
- [ ] Create `lib/utils/restaurant-map/qrCodeGenerator.ts`
  - [ ] QR generation helpers
  - [ ] Image optimization
  - [ ] Bulk generation
- [ ] Create `lib/utils/restaurant-map/tableValidation.ts`
  - [ ] Table number validation
  - [ ] Position validation
  - [ ] Capacity validation

### 7.3 Constants ❌
- [ ] Create `lib/constants/table.ts`
  - [ ] Table shapes
  - [ ] Table statuses
  - [ ] Default capacities
  - [ ] QR code settings

### 7.4 Polish & UX ❌
- [ ] Loading states for all components
- [ ] Error handling & user feedback
- [ ] Responsive design for mobile
- [ ] Print QR codes styling
- [ ] Tooltips & help text
- [ ] Accessibility improvements
- [ ] Performance optimization

---

## 🧪 Testing Checklist

### Database Testing ❌
- [ ] Verify all tables created
- [ ] Test triggers (auto-update table status on order)
- [ ] Test trigger (clear table on order complete)
- [ ] Test foreign key constraints
- [ ] Test cascade deletes
- [ ] Test indexes performance

### Manager Testing ❌
- [ ] Create table successfully
- [ ] Edit table properties
- [ ] Delete table with confirmation
- [ ] Drag & drop table on floor plan
- [ ] Save table positions
- [ ] Generate QR codes for all tables
- [ ] Generate QR codes for specific floor
- [ ] Download QR codes as ZIP
- [ ] Print QR codes layout
- [ ] Floor management (CRUD)

### Customer Testing ❌
- [ ] Scan QR code redirects correctly
- [ ] Invalid table ID shows error
- [ ] Browse menu categories
- [ ] Add item to cart
- [ ] Add item with variants
- [ ] Add item with modifiers
- [ ] Update cart quantities
- [ ] Remove item from cart
- [ ] Submit order successfully
- [ ] Order has order_source='qr'
- [ ] Order has correct table_id
- [ ] Order appears in unified order page
- [ ] Track order status real-time
- [ ] Call waiter functionality

### Staff Testing ❌
- [ ] View available tables
- [ ] Select table in POS
- [ ] Create order with table (order_source='pos')
- [ ] Order appears with correct badge
- [ ] View table status in quick view
- [ ] Update table status manually
- [ ] Filter orders by source (POS/QR)

### Integration Testing ❌
- [ ] POS orders have order_source='pos'
- [ ] QR orders have order_source='qr'
- [ ] Both show in unified order page with badges
- [ ] Table status updates automatically on new order
- [ ] Table clears automatically on order complete
- [ ] Multiple orders from same table (edge case)
- [ ] Table session recorded correctly
- [ ] Analytics data populates correctly

### Real-time Testing ❌
- [ ] Table status updates in real-time
- [ ] Order list updates in real-time
- [ ] Multiple users see same updates
- [ ] No race conditions
- [ ] Graceful handling of connection loss

---

## 🐛 Issues & Blockers

### Active Issues
*No issues yet - add them here as they come up*

### Resolved Issues
*Track resolved issues here*

---

## 📝 Notes & Decisions

### Design Decisions
1. ✅ **Separate Pages, Unified Orders** - Table management terpisah, tapi semua orders masuk ke satu page dengan badge
2. ✅ **No Online Delivery** - Fokus ke dine-in only (POS + QR)
3. ✅ **QR Auto-assigns Table** - Customer scan QR = auto dapat table_id
4. ✅ **Same Kitchen Flow** - Kitchen tidak perlu tahu order dari mana (POS/QR)

### Tech Stack
- Frontend: Next.js 14, TypeScript, Tailwind CSS
- Backend: Supabase (PostgreSQL + Real-time)
- QR Generation: qrcode library
- State Management: React hooks + SWR

### Implementation Notes
*Add notes during implementation here*

---

## 📅 Timeline

| Phase | Estimated Duration | Status |
|-------|-------------------|--------|
| Phase 1: Database & Core | 1-2 days | ❌ Not Started |
| Phase 2: Manager Interface | 2-3 days | ❌ Not Started |
| Phase 3: Customer Self-Order | 2-3 days | ❌ Not Started |
| Phase 4: Staff Integration | 1-2 days | ❌ Not Started |
| Phase 5: Unified Order System | 1 day | ❌ Not Started |
| Phase 6: Real-time Updates | 1-2 days | ❌ Not Started |
| Phase 7: Analytics & Polish | 2-3 days | ❌ Not Started |
| **Total** | **10-16 days** | **0% Complete** |

---

## 🎯 Next Actions

### Immediate Next Steps
1. [ ] Review and confirm all requirements
2. [ ] Start Phase 1: Create database migration files
3. [ ] Set up development environment
4. [ ] Install required dependencies

### Quick Win Tasks (Easy to start)
- [ ] Install npm packages (qrcode, jszip)
- [ ] Create TypeScript type definitions
- [ ] Create folder structure for new files

---

## 📊 Phase Progress Details

### Phase 1: Database & Core Setup
```
[░░░░░░░░░░] 0% (0/15 tasks)
```

### Phase 2: Manager Interface
```
[░░░░░░░░░░] 0% (0/16 tasks)
```

### Phase 3: Customer Self-Order
```
[░░░░░░░░░░] 0% (0/15 tasks)
```

### Phase 4: Staff Integration
```
[░░░░░░░░░░] 0% (0/9 tasks)
```

### Phase 5: Unified Order System
```
[░░░░░░░░░░] 0% (0/8 tasks)
```

### Phase 6: Real-time Updates
```
[░░░░░░░░░░] 0% (0/6 tasks)
```

### Phase 7: Analytics & Polish
```
[░░░░░░░░░░] 0% (0/13 tasks)
```

---

## 💡 Tips for Implementation

1. **Start with Database** - Get schema right first, changes later are painful
2. **Test Triggers Early** - Verify auto-updates work before building UI
3. **Manager First** - Build table management before customer interface
4. **Mock QR Codes** - Use placeholder QR codes for initial testing
5. **Incremental Testing** - Test each phase before moving to next
6. **Real-time Last** - Build everything first, add real-time as enhancement
7. **Keep Documentation Updated** - Update this file as you progress!

---

**Legend:**
- ✅ Complete
- 🔄 In Progress
- ❌ Not Started
- 🐛 Has Issues
- ⏸️ Blocked/On Hold

---

*Last updated: December 14, 2025 - Initial planning complete*
