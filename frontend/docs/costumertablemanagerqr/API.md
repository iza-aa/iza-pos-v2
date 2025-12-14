# API Documentation - Restaurant Map System

## 🔌 API Endpoints

### Manager APIs

#### 1. Tables Management

**GET** `/api/manager/tables`
```typescript
// Get all tables (optional: filter by floor)
Query: ?floorId=uuid

Response: {
  success: true,
  data: Table[]
}
```

**POST** `/api/manager/tables`
```typescript
// Create new table
Body: {
  table_number: string,
  floor_id: string,
  capacity: number,
  shape: 'round' | 'square' | 'rectangular',
  position_x: number,
  position_y: number
}

Response: {
  success: true,
  data: Table
}
```

**PATCH** `/api/manager/tables/[id]`
```typescript
// Update table
Body: Partial<Table>

Response: {
  success: true,
  data: Table
}
```

**DELETE** `/api/manager/tables/[id]`
```typescript
// Delete table
Response: {
  success: true,
  message: 'Table deleted'
}
```

#### 2. Floors Management

**GET** `/api/manager/floors`
```typescript
// Get all floors
Response: {
  success: true,
  data: Floor[]
}
```

**POST** `/api/manager/floors`
```typescript
// Create floor
Body: {
  name: string,
  floor_number: number
}

Response: {
  success: true,
  data: Floor
}
```

#### 3. QR Code Generation

**POST** `/api/manager/qr-codes/generate`
```typescript
// Generate QR codes for tables
Body: {
  tableIds?: string[],  // specific tables
  floorId?: string      // or all tables in floor
}

Response: {
  success: true,
  data: {
    generated: number,
    tables: { id, qr_code_url, qr_code_image }[]
  }
}
```

**GET** `/api/manager/qr-codes/download`
```typescript
// Download all QR codes as ZIP
Query: ?floorId=uuid

Response: application/zip
```

---

### Staff APIs

#### 1. Tables (Staff View)

**GET** `/api/staff/tables`
```typescript
// Get available tables
Query: ?status=free

Response: {
  success: true,
  data: Table[]
}
```

**PATCH** `/api/staff/tables/[id]/status`
```typescript
// Update table status
Body: {
  status: 'free' | 'occupied' | 'cleaning'
}

Response: {
  success: true,
  data: Table
}
```

---

### Customer APIs

#### 1. Table Validation

**GET** `/api/customer/table/[tableId]`
```typescript
// Validate table & get info
Response: {
  success: true,
  data: {
    id: string,
    table_number: string,
    capacity: number,
    status: string,
    floor_name: string
  }
}
```

**PATCH** `/api/customer/table/status`
```typescript
// Update table status (when customer sits)
Body: {
  table_id: string,
  status: 'occupied',
  customer_name?: string
}

Response: {
  success: true
}
```

#### 2. Customer Orders

**POST** `/api/customer/orders`
```typescript
// Create order from QR self-order
Body: {
  table_id: string,
  table_number: string,
  order_source: 'qr',  // Always 'qr' for customer
  order_type: 'dine-in',
  customer_name: string,
  items: OrderItem[],
  total_amount: number
}

Response: {
  success: true,
  data: {
    order_id: string,
    order_number: string,
    message: 'Order placed successfully'
  }
}
```

---

## 🔐 Authentication & Authorization

### Manager Endpoints
- Require: `user_role === 'manager'` OR `user_role === 'owner'`
- Check in API middleware

### Staff Endpoints
- Require: Valid staff session
- Check `staff_type` for specific permissions

### Customer Endpoints
- No authentication required (public)
- Rate limiting recommended
- Validate table_id exists

---

## 📝 Error Responses

```typescript
// Standard error format
{
  success: false,
  error: {
    code: 'TABLE_NOT_FOUND' | 'UNAUTHORIZED' | 'VALIDATION_ERROR',
    message: 'Human readable error message',
    details?: any
  }
}
```

---

## 📊 Common Error Codes

- `TABLE_NOT_FOUND` - Table ID tidak ditemukan
- `TABLE_OCCUPIED` - Table sudah occupied
- `QR_GENERATION_FAILED` - Gagal generate QR code
- `FLOOR_NOT_FOUND` - Floor tidak ditemukan
- `UNAUTHORIZED` - Tidak ada akses
- `VALIDATION_ERROR` - Data invalid

---

## 📝 Notes

> Tambahkan API changes di sini:

