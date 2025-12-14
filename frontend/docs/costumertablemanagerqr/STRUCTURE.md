# Folder Structure - Restaurant Map System

## 📁 Complete Directory Tree

```
frontend/
├── app/
│   ├── customer/
│   │   ├── layout.tsx                  # 🆕 Mobile layout + bottom nav
│   │   ├── login/page.tsx              # 🆕 Customer login/register
│   │   ├── dashboard/page.tsx          # 🆕 Home/Dashboard (scan QR)
│   │   ├── order/page.tsx              # 🆕 Browse menu & order
│   │   ├── track/page.tsx              # 🆕 Track active orders
│   │   ├── settings/page.tsx           # 🆕 Customer settings
│   │   └── table/[tableId]/
│   │       ├── page.tsx                # 🆕 After QR scan → auto to order
│   │       └── menu/page.tsx           # 🆕 Menu with table context
│   │
│   ├── manager/
│   │   ├── restaurant-map/
│   │   │   ├── page.tsx                # 🆕 Floor plan editor
│   │   │   ├── settings/page.tsx       # 🆕 Table settings
│   │   │   └── qr-codes/page.tsx       # 🆕 QR generator
│   │   └── order/page.tsx              # ✅ Update: add badge
│   │
│   ├── staff/
│   │   ├── restaurant-map/page.tsx     # 🆕 Quick table view
│   │   ├── pos/page.tsx                # ✅ Update: table selector
│   │   └── order/page.tsx              # ✅ Update: add badge
│   │
│   ├── api/
│   │   ├── customer/
│   │   │   ├── table/[tableId]/route.ts       # 🆕 GET table info
│   │   │   ├── table/status/route.ts          # 🆕 PATCH status
│   │   │   └── orders/route.ts                # 🆕 POST order (qr)
│   │   │
│   │   ├── manager/
│   │   │   ├── tables/route.ts                # 🆕 GET/POST tables
│   │   │   ├── tables/[id]/route.ts           # 🆕 PATCH/DELETE
│   │   │   ├── floors/route.ts                # 🆕 Floor CRUD
│   │   │   └── qr-codes/generate/route.ts     # 🆕 Generate QR
│   │   │
│   │   └── staff/tables/route.ts              # 🆕 GET available
│   │
│   └── components/
│       ├── customer/
│       │   ├── layout/
│       │   │   ├── BottomNav.tsx              # 🆕 Bottom navigation
│       │   │   ├── MobileHeader.tsx           # 🆕 Mobile header
│       │   │   └── CustomerLayout.tsx         # 🆕 Layout wrapper
│       │   ├── dashboard/
│       │   │   ├── QRScanner.tsx              # 🆕 QR scanner
│       │   │   ├── QuickActions.tsx           # 🆕 Quick action buttons
│       │   │   └── RecentOrders.tsx           # 🆕 Recent order cards
│       │   ├── order/
│       │   │   ├── MenuCategories.tsx         # 🆕 Category tabs
│       │   │   ├── MenuItemCard.tsx           # 🆕 Product card
│       │   │   ├── CartDrawer.tsx             # 🆕 Cart drawer
│       │   │   ├── CartSummary.tsx            # 🆕 Floating cart button
│       │   │   └── TableInfo.tsx              # 🆕 Selected table info
│       │   ├── track/
│       │   │   ├── OrderTracker.tsx           # 🆕 Order status tracker
│       │   │   ├── OrderTimeline.tsx          # 🆕 Order timeline
│       │   │   └── CallWaiterButton.tsx       # 🆕 Call waiter
│       │   └── settings/
│       │       ├── ProfileSection.tsx         # 🆕 Profile info
│       │       ├── OrderHistory.tsx           # 🆕 Past orders
│       │       └── PreferencesForm.tsx        # 🆕 Settings form
│       │
│       ├── manager/restaurant-map/
│       │   ├── FloorPlanCanvas.tsx            # 🆕 Interactive map
│       │   ├── TableItem.tsx                  # 🆕 Draggable table
│       │   ├── TableEditor.tsx                # 🆕 Add/Edit modal
│       │   ├── QRCodeGenerator.tsx            # 🆕 Generate QR
│       │   └── QRPrintView.tsx                # 🆕 Print layout
│       │
│       ├── staff/
│       │   ├── pos/TableSelector.tsx          # 🆕 Select table
│       │   └── restaurant-map/QuickTableView.tsx  # 🆕 Table grid
│       │
│       └── shared/
│           ├── order/OrderSourceBadge.tsx     # 🆕 POS/QR badge
│           └── restaurant-map/
│               ├── TableShape.tsx             # 🆕 SVG shapes
│               └── TableStatusBadge.tsx       # 🆕 Status badge
│
├── lib/
│   ├── services/table/
│   │   ├── tableService.ts                    # 🆕 CRUD operations
│   │   ├── floorService.ts                    # 🆕 Floor management
│   │   ├── qrCodeService.ts                   # 🆕 Generate QR
│   │   └── tableStatusService.ts              # 🆕 Status updates
│   │
│   ├── hooks/
│   │   ├── useRestaurantMap.ts                # 🆕 Table hook
│   │   ├── useTableBooking.ts                 # 🆕 Booking hook
│   │   └── useRealtimeTableStatus.ts          # 🆕 Real-time sync
│   │
│   ├── types/
│   │   ├── table.ts                           # 🆕 Table types
│   │   ├── floor.ts                           # 🆕 Floor types
│   │   └── order.ts                           # ✅ Update: add source
│   │
│   ├── utils/restaurant-map/
│   │   ├── tableLayout.ts                     # 🆕 Position calc
│   │   ├── qrCodeGenerator.ts                 # 🆕 QR generation
│   │   └── tableValidation.ts                 # 🆕 Validation
│   │
│   └── constants/table.ts                     # 🆕 Table constants
│
├── public/
│   ├── icons/tables/
│   │   ├── round.svg                          # 🆕 Round icon
│   │   ├── square.svg                         # 🆕 Square icon
│   │   └── rectangular.svg                    # 🆕 Rectangular icon
│   │
│   └── qr-codes/                              # 🆕 Auto-generated QR
│       ├── table-1.png
│       └── ...
│
└── md/
    ├── 28_create_tables_system.sql            # 🆕 Tables schema
    ├── 29_add_order_source.sql                # 🆕 Order source
    └── 30_create_table_sessions.sql           # 🆕 Analytics
```

## 📊 File Count Summary

### New Files to Create: **~40 files**
- Pages: 8 files
- API Routes: 10 files  
- Components: 22 files
- Services/Utils: 10 files
- SQL Migrations: 3 files

### Existing Files to Update: **~5 files**
- `app/staff/pos/page.tsx`
- `app/manager/order/page.tsx`
- `app/staff/order/page.tsx`
- `lib/types/order.ts`
- `components/shared/order/OrderCard.tsx`

---

## 📝 Notes

> Tambahkan koreksi di sini:

