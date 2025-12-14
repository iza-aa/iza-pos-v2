# Implementation Guide - Restaurant Map System

## 🚀 Step-by-Step Implementation

### Phase 1: Database & Core Setup

#### Step 1.1: Run SQL Migrations
```bash
# In Supabase SQL Editor, run in order:
1. md/28_create_tables_system.sql
2. md/29_add_order_source.sql
3. md/30_create_table_sessions.sql
```

#### Step 1.2: Install Dependencies
```bash
cd frontend
npm install qrcode @types/qrcode
npm install jszip # for bulk QR download
```

#### Step 1.3: Create TypeScript Types
```typescript
// lib/types/table.ts
// lib/types/floor.ts
// Update: lib/types/order.ts (add order_source)
```

---

### Phase 2: Manager - Table Management

#### Step 2.1: Create Table Service
```typescript
// lib/services/table/tableService.ts
- getTables(floorId?)
- createTable(data)
- updateTable(id, data)
- deleteTable(id)
- updateTableStatus(id, status)
```

#### Step 2.2: Create Manager Pages
```bash
# Create pages:
app/manager/restaurant-map/page.tsx
app/manager/restaurant-map/settings/page.tsx
app/manager/restaurant-map/qr-codes/page.tsx
```

#### Step 2.3: Create Manager Components
```bash
# Components:
components/manager/restaurant-map/FloorPlanCanvas.tsx
components/manager/restaurant-map/TableItem.tsx
components/manager/restaurant-map/TableEditor.tsx
components/manager/restaurant-map/QRCodeGenerator.tsx
```

#### Step 2.4: Create API Routes
```bash
app/api/manager/tables/route.ts
app/api/manager/tables/[id]/route.ts
app/api/manager/floors/route.ts
app/api/manager/qr-codes/generate/route.ts
```

---

### Phase 3: QR Code Generation

#### Step 3.1: QR Service
```typescript
// lib/services/table/qrCodeService.ts
import QRCode from 'qrcode';

export async function generateTableQR(tableId: string, tableNumber: string) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/customer/table/${tableId}`;
  const qrImage = await QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' }
  });
  return { url, qrImage };
}
```

#### Step 3.2: Batch Generate QR
```typescript
// Generate QR for all tables
async function generateAllQRCodes(floorId: string) {
  const tables = await getTables(floorId);
  
  for (const table of tables) {
    const { url, qrImage } = await generateTableQR(table.id, table.table_number);
    
    await supabase
      .from('tables')
      .update({
        qr_code_url: url,
        qr_code_image: qrImage,
        qr_generated_at: new Date().toISOString()
      })
      .eq('id', table.id);
  }
}
```

---

### Phase 4: Customer Mobile App (Mobile-First + PWA)

#### Step 4.0: Install PWA Dependencies
```bash
npm install next-pwa
npm install html5-qrcode  # QR scanner
npm install @radix-ui/react-dialog  # For drawers/modals
npm install @heroicons/react  # Icon library
```

#### Step 4.1: Customer Authentication
```typescript
// app/customer/login/page.tsx
'use client';

export default function CustomerLogin() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center">Welcome</h1>
        <form onSubmit={handleLogin}>
          <input type="tel" placeholder="Phone Number" />
          <input type="password" placeholder="Password" />
          <button type="submit">Login</button>
        </form>
        <Link href="/customer/register">Create Account</Link>
      </div>
    </div>
  );
}
```

#### Step 4.2: Customer Mobile Layout
```typescript
// app/customer/layout.tsx
import BottomNav from '@/components/customer/layout/BottomNav';

export default function CustomerLayout({ children }) {
  return (
    <div className="mobile-layout min-h-screen pb-16 bg-gray-50">
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <MobileHeader />
      </header>
      <main className="px-4 py-4 max-w-md mx-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
```

#### Step 4.3: Bottom Navigation
```typescript
// components/customer/layout/BottomNav.tsx
'use client';
import { HomeIcon, ShoppingBagIcon, ClockIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { HomeIcon as HomeIconSolid, ShoppingBagIcon as ShoppingBagIconSolid, ClockIcon as ClockIconSolid, Cog6ToothIcon as Cog6ToothIconSolid } from '@heroicons/react/24/solid';

export function BottomNav() {
  const pathname = usePathname();
  const navItems = [
    { href: '/customer/dashboard', icon: HomeIcon, iconSolid: HomeIconSolid, label: 'Home' },
    { href: '/customer/order', icon: ShoppingBagIcon, iconSolid: ShoppingBagIconSolid, label: 'Order' },
    { href: '/customer/track', icon: ClockIcon, iconSolid: ClockIconSolid, label: 'Track' },
    { href: '/customer/settings', icon: Cog6ToothIcon, iconSolid: Cog6ToothIconSolid, label: 'Settings' },
  ];
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-md mx-auto flex justify-around">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = isActive ? item.iconSolid : item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-3 px-4 transition-colors
                ${isActive ? 'text-gray-900' : 'text-gray-400'}`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

#### Step 4.4: Dashboard Page
```typescript
// app/customer/dashboard/page.tsx
'use client';

export default function CustomerDashboard() {
  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg p-6 shadow">
        <h1 className="text-2xl font-bold">Welcome, {customer?.name}! 👋</h1>
      </section>
      
      {/* QR Scanner */}
      <section className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-xl font-bold mb-3">Scan QR to Order</h2>
        <QRScanner onScan={(tableId) => router.push(`/customer/table/${tableId}`)} />
      </section>
      
      <QuickActions />
      <RecentOrders />
    </div>
  );
}
```

#### Step 4.5: Order Page
```typescript
// app/customer/order/page.tsx
'use client';

export default function OrderPage() {
  const { selectedTable } = useTableContext();
  const { cart, addToCart } = useCart();
  const [showCart, setShowCart] = useState(false);
  
  return (
    <div className="pb-20">
      {selectedTable && <TableInfo table={selectedTable} />}
      
      <div className="sticky top-16 bg-white z-40 -mx-4 px-4 py-3 border-b">
        <MenuCategories />
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-3">
        {menuItems.map(item => (
          <MenuItemCard key={item.id} item={item} onAddToCart={addToCart} />
        ))}
      </div>
      
      {cart.length > 0 && <CartSummary cart={cart} onClick={() => setShowCart(true)} />}
      <CartDrawer open={showCart} cart={cart} onCheckout={handleCheckout} />
    </div>
  );
}
```

#### Step 4.6: Track Order Page
```typescript
// app/customer/track/page.tsx
'use client';

export default function TrackOrderPage() {
  const { activeOrders } = useActiveOrders();
  
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Track Orders</h1>
      {activeOrders.map(order => (
        <div key={order.id} className="bg-white rounded-lg shadow p-4">
          <OrderTimeline status={order.status} />
          <CallWaiterButton tableId={order.table_id} />
        </div>
      ))}
    </div>
  );
}
```

#### Step 4.7: Settings Page
```typescript
// app/customer/settings/page.tsx
'use client';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <ProfileSection />
      <OrderHistory />
      <PreferencesForm />
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
```

#### Step 4.8: QR Scan Handler
```typescript
// app/customer/table/[tableId]/page.tsx
export default async function TableQRPage({ params }) {
  const table = await validateTable(params.tableId);
  if (!table) redirect('/customer/dashboard?error=invalid-table');
  
  cookies().set('selected_table', table.id);
  redirect('/customer/order');
}
```

#### Step 4.9: Customer APIs
```typescript
// POST /api/customer/auth/login
// POST /api/customer/auth/register
// POST /api/customer/orders
// GET /api/customer/orders (get customer's orders)
// GET /api/customer/orders/[orderId] (track order)
```

#### Step 4.10: PWA Configuration
```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
});

module.exports = withPWA({ /* config */ });
```

---

### Phase 5: Staff Integration

#### Step 5.1: Update POS - Add Table Selector
```typescript
// components/staff/pos/TableSelector.tsx

export function TableSelector({ onSelectTable }) {
  const [tables, setTables] = useState([]);
  
  // Fetch available tables
  useEffect(() => {
    fetchAvailableTables();
  }, []);
  
  return (
    <select onChange={(e) => onSelectTable(e.target.value)}>
      <option value="">Select Table (Optional)</option>
      {tables.map(t => (
        <option key={t.id} value={t.id}>
          Table {t.table_number} (Cap: {t.capacity})
        </option>
      ))}
    </select>
  );
}
```

#### Step 5.2: Add to POS Page
```typescript
// app/staff/pos/page.tsx

const [selectedTable, setSelectedTable] = useState<string | null>(null);

// In order submission:
const orderData = {
  ...items,
  order_source: 'pos',
  table_id: selectedTable,
  table_number: tables.find(t => t.id === selectedTable)?.table_number
};
```

#### Step 5.3: Staff Quick Table View
```typescript
// app/staff/restaurant-map/page.tsx

// Simple grid view of tables
// Show status badges
// Click to see table details
```

---

### Phase 6: Unified Order System with Badges

#### Step 6.1: Create Order Source Badge
```typescript
// components/shared/order/OrderSourceBadge.tsx

export function OrderSourceBadge({ source }: { source: 'pos' | 'qr' }) {
  const config = {
    pos: { icon: '💳', text: 'Cashier', color: 'blue' },
    qr: { icon: '📱', text: 'QR Order', color: 'green' }
  };
  
  const badge = config[source];
  
  return (
    <span className={`badge badge-${badge.color}`}>
      {badge.icon} {badge.text}
    </span>
  );
}
```

#### Step 6.2: Update Order Pages
```typescript
// app/manager/order/page.tsx & app/staff/order/page.tsx

// Add filter
const [sourceFilter, setSourceFilter] = useState<'all' | 'pos' | 'qr'>('all');

// Filter logic
const filteredOrders = orders.filter(order => {
  if (sourceFilter !== 'all' && order.order_source !== sourceFilter) {
    return false;
  }
  return true;
});

// Display badge in OrderCard
<OrderSourceBadge source={order.order_source} />
```

#### Step 6.3: Update OrderCard Component
```typescript
// components/shared/order/OrderCard.tsx

<div className="order-card">
  <div className="flex justify-between items-center">
    <h3>Order #{order.orderNumber}</h3>
    <OrderSourceBadge source={order.order_source} />
  </div>
  
  {order.table_number && (
    <div className="text-sm text-gray-600">
      Table: {order.table_number}
    </div>
  )}
  
  {/* Rest of card */}
</div>
```

---

### Phase 7: Real-time Updates

#### Step 7.1: Table Status Real-time
```typescript
// lib/hooks/useRealtimeTableStatus.ts

export function useRealtimeTableStatus(floorId: string) {
  const [tables, setTables] = useState([]);
  
  useEffect(() => {
    // Subscribe to table changes
    const channel = supabase
      .channel('table-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tables',
        filter: `floor_id=eq.${floorId}`
      }, (payload) => {
        // Update local state
        fetchTables();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [floorId]);
  
  return tables;
}
```

---

## ✅ Testing Checklist

### Database
- [ ] Tables created successfully
- [ ] Triggers working (auto-update status)
- [ ] Foreign keys enforced

### Manager
- [ ] Can create/edit/delete tables
- [ ] Can drag & drop tables on floor plan
- [ ] Can generate QR codes
- [ ] Can print QR codes

### Customer
- [ ] QR scan redirects correctly
- [ ] Can browse menu
- [ ] Can add to cart
- [ ] Order submission works
- [ ] Order has source='qr' and table_id

### Staff
- [ ] Can see available tables
- [ ] Can select table in POS
- [ ] Orders show correct badge
- [ ] Can filter by order source

### Integration
- [ ] POS orders have source='pos'
- [ ] QR orders have source='qr'
- [ ] Both show in unified order page
- [ ] Table status updates automatically
- [ ] Table clears after order complete

---

## 📝 Notes & Issues

> Track implementation issues here:

