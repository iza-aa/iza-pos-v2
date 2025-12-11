# Quick Reference Guide - Clean Code Utilities

## 📦 Import Statements

```typescript
// Constants
import { TIME_UNITS, POLLING_INTERVALS, TIMEOUT_DURATIONS, EXPIRATION_TIMES } from '@/lib/timeConstants'
import { getWeeksAgo, getMonthsAgo, formatDuration } from '@/lib/timeConstants'
import { CURRENCY, STOCK_LEVELS, DISPLAY_LIMITS } from '@/lib/numberConstants'
import { formatRupiah, getStockStatus, calculatePercentage } from '@/lib/numberConstants'

// Types
import type { 
  Staff, StaffInfo, User,
  Order, OrderItem, OrderStatus,
  FoodItem, MenuItem, VariantGroup, VariantOption,
  InventoryItem, UsageTransaction,
  PaymentData, PaymentMethod,
  Attendance, AttendanceStatus
} from '@/lib/types'

// Validation
import { 
  validateOrder, 
  validatePayment, 
  validateStaffData,
  validateInventoryItem,
  validatePhoneNumber,
  formatPhoneNumber 
} from '@/lib/validation'

// Error Handling
import { 
  showSuccess, 
  showError, 
  showWarning, 
  showInfo,
  handleSupabaseQuery,
  handleApiFetch,
  confirmDelete,
  parseSupabaseError 
} from '@/lib/errorHandling'
```

---

## ⏰ Time Constants

### Available Constants
```typescript
TIME_UNITS = {
  SECOND: 1000,
  MINUTE: 60000,
  HOUR: 3600000,
  DAY: 86400000,
  WEEK: 604800000,
  MONTH: 2592000000  // 30 days
}

POLLING_INTERVALS = {
  FAST: 10000,      // 10 seconds
  NORMAL: 30000,    // 30 seconds
  SLOW: 60000,      // 1 minute
  VERY_SLOW: 300000 // 5 minutes
}

TIMEOUT_DURATIONS = {
  SHORT: 1500,   // 1.5 seconds
  MEDIUM: 3000,  // 3 seconds
  LONG: 5000     // 5 seconds
}

EXPIRATION_TIMES = {
  QR_CODE: 300000,        // 5 minutes
  STAFF_LOGIN: 28800000,  // 8 hours
  TEMP_PASSWORD: 86400000 // 24 hours
}
```

### Usage Examples
```typescript
// Duration calculations
const hours = Math.floor(diff / TIME_UNITS.HOUR)
const minutes = Math.floor((diff % TIME_UNITS.HOUR) / TIME_UNITS.MINUTE)

// Auto-refresh (replace: setInterval(fn, 60000))
const interval = setInterval(fetchData, POLLING_INTERVALS.SLOW)

// Timeouts (replace: setTimeout(fn, 1500))
setTimeout(() => setMessage(""), TIMEOUT_DURATIONS.SHORT)

// Expiration (replace: Date.now() + 5 * 60 * 1000)
const expiresAt = new Date(Date.now() + EXPIRATION_TIMES.QR_CODE)

// Date helpers
const lastWeek = getWeeksAgo(1)
const lastMonth = getMonthsAgo(1)
const yesterday = getDaysAgo(1)
```

---

## 💰 Number Constants

### Available Constants
```typescript
CURRENCY = {
  RUPIAH_STEP: 1000,
  THOUSAND: 1000,
  MILLION: 1000000,
  DEFAULT_DECIMAL_PLACES: 0
}

STOCK_LEVELS = {
  CRITICAL: 5,
  LOW: 10,
  MEDIUM: 50,
  HIGH: 100,
  VERY_HIGH: 500
}

DISPLAY_LIMITS = {
  DEFAULT_PAGE_SIZE: 10,
  SMALL_PAGE_SIZE: 5,
  LARGE_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MAX_ITEMS_PREVIEW: 3
}
```

### Usage Examples
```typescript
// Currency formatting (replace: Rp${amount.toLocaleString('id-ID')})
const price = formatRupiah(25000) // "Rp25.000"

// Stock status
const status = getStockStatus(item.current_stock, item.minimum_stock)
// Returns: 'critical' | 'low' | 'normal' | 'high'

if (item.current_stock <= STOCK_LEVELS.CRITICAL) {
  showWarning('Stock kritis!')
}

// Percentage calculations
const progress = calculatePercentage(completed, total) // Returns number
const progressStr = calculatePercentage(completed, total, 1) // Returns "75.5%"
```

---

## 🔒 Type Safety

### Order Types
```typescript
// Define order data
const order: Order = {
  id: '123',
  order_number: 'ORD-20241211-0001',
  status: 'new', // Type-checked: 'new' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled'
  total_amount: 50000,
  created_by: staffId,
  created_at: new Date().toISOString(),
  order_items: []
}

// Order items with full type checking
const item: OrderItem = {
  id: '456',
  order_id: order.id,
  menu_item_id: 'product-123',
  quantity: 2,
  price: 25000,
  subtotal: 50000,
  served: false
}
```

### Staff Types
```typescript
// Full staff data
const staff: Staff = {
  id: '123',
  staff_code: 'STF001',
  name: 'John Doe',
  role: 'cashier', // Type-checked: 'owner' | 'manager' | 'kitchen' | 'cashier' | 'barista' | 'waiter'
  phone: '+6281234567890',
  status: 'Aktif' // Type-checked: 'Aktif' | 'Nonaktif'
}

// Minimal staff info
const staffInfo: StaffInfo = {
  id: '123',
  name: 'John Doe',
  role: 'cashier',
  staff_code: 'STF001'
}
```

### Inventory Types
```typescript
const item: InventoryItem = {
  id: '123',
  name: 'Kopi Arabica',
  category: 'raw_material', // Type-checked
  unit: 'kg', // Type-checked: 'kg' | 'gram' | 'liter' | 'ml' | 'pcs' | 'pack' | 'box' | 'bottle'
  current_stock: 25,
  minimum_stock: 10
}

// Type guard
if (isInventoryItem(data)) {
  console.log(data.current_stock) // TypeScript knows this exists
}
```

---

## ✅ Validation

### Order Validation
```typescript
// Validate before submitting
const validation = validateOrder(orderItems, tableNumber)

if (!validation.isValid) {
  showError(validation.errors[0])
  return
}

// Validate payment
const paymentValidation = validatePayment(paymentData, totalAmount)
if (!paymentValidation.isValid) {
  validation.errors.forEach(error => showError(error))
  return
}
```

### Staff Validation
```typescript
const validation = validateStaffData({
  name: staffName,
  role: staffRole,
  phone: staffPhone
})

if (!validation.isValid) {
  showError(parseValidationErrors(validation.errors))
  return
}

// Phone formatting
const cleanPhone = formatPhoneNumber('081234567890') // Returns: '+6281234567890'
```

### Stock Validation
```typescript
const validation = validateStockAdjustment({
  inventory_item_id: itemId,
  adjustment_quantity: quantity,
  transaction_type: 'adjustment',
  performed_by: staffId
})

if (!validation.isValid) {
  showError(validation.errors[0])
  return
}

// Stock checks
if (isLowStock(item.current_stock, item.minimum_stock)) {
  showWarning('Stock rendah!')
}

if (isCriticalStock(item.current_stock, item.minimum_stock)) {
  showError('Stock kritis!')
}
```

---

## 🚨 Error Handling

### Toast Notifications
```typescript
// Replace all alert() calls with toasts

// Success (green, 3 seconds)
showSuccess('Data berhasil disimpan')

// Error (red, 5 seconds)
showError('Gagal menyimpan data')

// Warning (yellow, 4 seconds)
showWarning('Stock hampir habis')

// Info (blue, 3 seconds)
showInfo('Memproses data...')

// Custom duration
showSuccess('Berhasil!', 5000) // 5 seconds
```

### Supabase Queries
```typescript
// OLD WAY (lots of boilerplate)
try {
  const { data, error } = await supabase.from('orders').select('*')
  if (error) {
    alert(error.message)
    return
  }
  setOrders(data)
} catch (err) {
  alert('Error')
}

// NEW WAY (clean and simple)
const data = await handleSupabaseQuery(
  supabase.from('orders').select('*'),
  'Gagal memuat orders'
)
if (data) {
  setOrders(data)
  showSuccess('Orders berhasil dimuat')
}
```

### API Calls
```typescript
// OLD WAY
try {
  const res = await fetch('/api/staff/add', {
    method: 'POST',
    body: JSON.stringify(staffData)
  })
  const result = await res.json()
  
  if (!res.ok) {
    alert(result.error || 'Gagal')
    return
  }
  
  alert('Berhasil!')
  fetchStaff()
} catch (err) {
  alert('Error')
}

// NEW WAY
const result = await handleApiFetch('/api/staff/add', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(staffData)
}, 'Gagal menambah staff')

if (result) {
  showSuccess('Staff berhasil ditambahkan')
  fetchStaff()
}
```

### Confirmations
```typescript
// Generic confirmation
const confirmed = await showConfirmation('Yakin ingin lanjut?')
if (!confirmed) return

// Delete confirmation with warning
const confirmed = await confirmDelete(itemName)
if (!confirmed) return

// Discard changes
const confirmed = await confirmDiscardChanges()
if (!confirmed) return
```

### Error Parsing
```typescript
// Parse Supabase errors to user-friendly messages
try {
  const { error } = await supabase.from('orders').insert(data)
  if (error) throw error
} catch (error) {
  const message = parseSupabaseError(error)
  showError(message) // Shows friendly Indonesian message
}
```

---

## 🎨 Setup Toast Container

Add to your **root layout** (one time only):

```typescript
// app/layout.tsx or app/owner/layout.tsx, app/manager/layout.tsx, etc.
import ToastContainer from '@/app/components/ui/Toast'
import { setupNetworkMonitoring } from '@/lib/errorHandling'
import { useEffect } from 'react'

export default function Layout({ children }) {
  useEffect(() => {
    // Setup network monitoring once
    setupNetworkMonitoring()
  }, [])
  
  return (
    <div>
      {children}
      <ToastContainer /> {/* Add this */}
    </div>
  )
}
```

---

## 🔄 Migration Checklist

### Replacing Magic Numbers
- [ ] Find: `60000` or `60 * 1000` → Replace: `POLLING_INTERVALS.SLOW`
- [ ] Find: `1500` → Replace: `TIMEOUT_DURATIONS.SHORT`
- [ ] Find: `3000` → Replace: `TIMEOUT_DURATIONS.MEDIUM`
- [ ] Find: `5 * 60 * 1000` → Replace: `EXPIRATION_TIMES.QR_CODE`
- [ ] Find: `24 * 60 * 60 * 1000` → Replace: `EXPIRATION_TIMES.TEMP_PASSWORD`

### Replacing Types
- [ ] Find: `: any` → Replace: `: FoodItem` or appropriate type
- [ ] Find: `: any[]` → Replace: `: FoodItem[]` or appropriate array type

### Replacing Validation
- [ ] Find inline validation → Extract to validation function
- [ ] Find: `if (!field) alert(...)` → Use `validateRequired()`

### Replacing Error Handling
- [ ] Find: `alert(...)` → Replace: `showError(...)` or `showSuccess(...)`
- [ ] Find: try-catch with alert → Use `handleSupabaseQuery()` or `handleApiFetch()`
- [ ] Find: `window.confirm(...)` → Replace: `confirmDelete()` or `showConfirmation()`

---

## 📖 Best Practices

### DO ✅
- Use constants instead of magic numbers
- Use proper TypeScript types instead of `any`
- Use validation functions for data validation
- Use toast notifications instead of alert()
- Use error handling wrappers for async operations
- Parse errors to user-friendly messages
- Show loading states during async operations

### DON'T ❌
- Don't use magic numbers: `setTimeout(fn, 1500)` ❌
- Don't use `any` type unless absolutely necessary
- Don't use `alert()` for notifications ❌
- Don't duplicate validation logic across components
- Don't show raw error messages to users
- Don't ignore error handling

---

## 🆘 Common Issues

### Issue: Toast not showing
**Solution:** Make sure `<ToastContainer />` is added to your layout

### Issue: Type errors after importing types
**Solution:** Check if the type has all required fields. Use Partial<T> if needed:
```typescript
const partialStaff: Partial<Staff> = { name: 'John' }
```

### Issue: Validation errors not showing
**Solution:** Make sure to check `validation.isValid` and display `validation.errors`:
```typescript
if (!validation.isValid) {
  validation.errors.forEach(error => showError(error))
  return
}
```

---

## 📚 Additional Resources

- **Types:** See `lib/types.ts` for all available interfaces
- **Validation:** See `lib/validation.ts` for all validation functions
- **Error Handling:** See `lib/errorHandling.ts` for all error utilities
- **Constants:** See `lib/timeConstants.ts` and `lib/numberConstants.ts`

For detailed examples and implementation, see `REFACTORING_SUMMARY.md`
