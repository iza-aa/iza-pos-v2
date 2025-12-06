# 🔐 SISTEM LOGIN & AUTENTIKASI - FOODIES POS

## 📋 STRUKTUR LOGIN

### 1️⃣ **OWNER** (Super Admin)
- **Login Method**: Email + Password
- **Access**: Full system access
- **Features**: 
  - Dashboard analytics
  - Staff management
  - Activity logs
  - Financial reports
  - System settings
- **Login Page**: `/owner/login`
- **Default Redirect**: `/owner/dashboard`
- **localStorage Keys**:
  - `user_id` - Staff ID dengan role owner
  - `user_name` - Nama owner
  - `user_role` - "owner"

---

### 2️⃣ **MANAGER**
- **Login Method**: Email + Password
- **Access**: Operational management
- **Features**:
  - Menu management
  - Variants management
  - Inventory management
  - Order monitoring
- **Login Page**: `/manager/login`
- **Default Redirect**: `/manager/menu`
- **localStorage Keys**:
  - `user_id` - Staff ID dengan role manager
  - `user_name` - Nama manager
  - `user_role` - "manager"

---

### 3️⃣ **STAFF** (Barista, Kitchen, Waiter, Cashier)
- **Login Method**: Staff Code + Login Code (temporary)
- **Access**: Daily operations (berbeda berdasarkan staff_type)
- **Staff Types**:
  - **Barista** - Buat minuman, akses POS untuk beverage
  - **Kitchen** - Masak makanan, terima order kitchen
  - **Waiter** - Layani customer, input order, deliver food
  - **Cashier** - Full POS access, payment processing
- **Features**:
  - POS (Point of Sale) - sesuai staff_type
  - Order management
  - Staff dashboard
  - Shift tracking
- **Login Page**: `/staff/login`
- **Default Redirect**: `/staff/dashboard`
- **localStorage Keys**:
  - `user_id` - Staff ID
  - `user_name` - Nama staff
  - `user_role` - "staff"
  - `staff_type` - "barista" | "kitchen" | "waiter" | "cashier"
  - `staff_code` - Kode staff (e.g., "STF001")

**Notes**: 
- Login code bersifat temporary dan expire dalam 24 jam
- Manager/Owner bisa generate login code baru untuk staff
- Staff tidak punya password permanent untuk keamanan
- Access level berbeda berdasarkan staff_type

---

### 4️⃣ **CUSTOMER**
- **Login Method**: Phone Number (OTP-less untuk development)
- **Access**: Customer features
- **Features**:
  - Browse menu
  - Order history
  - Loyalty points
  - Profile management
- **Login Page**: `/customer/login`
- **Default Redirect**: `/customer/menu`
- **localStorage Keys**:
  - `customer_id` - Customer ID
  - `customer_name` - Nama customer
  - `customer_phone` - Nomor telepon

**Notes**:
- Auto-register jika nomor telepon baru
- Checkbox "I'm a new customer" untuk input nama
- Untuk production, bisa ditambahkan OTP verification

---

## 🗄️ DATABASE STRUCTURE

### Table: `staff`
```sql
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
  staff_type VARCHAR(20) CHECK (staff_type IN ('barista', 'kitchen', 'waiter', 'cashier')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on-leave', 'terminated')),
  
  -- Authentication
  password_hash VARCHAR(255), -- For owner & manager
  login_code VARCHAR(8), -- For staff (temporary)
  login_code_expires_at TIMESTAMP,
  
  -- Additional Info
  profile_picture TEXT,
  hired_date DATE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES staff(id)
);

-- Indexes
CREATE INDEX idx_staff_code ON staff(staff_code);
CREATE INDEX idx_staff_email ON staff(email);
CREATE INDEX idx_staff_role ON staff(role);
CREATE INDEX idx_staff_status ON staff(status);
```

### Table: `customers`
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  
  -- Loyalty
  loyalty_points INT DEFAULT 0,
  member_since DATE DEFAULT CURRENT_DATE,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_status ON customers(status);
```

---

## 🔄 FLOW DIAGRAM

### Owner/Manager Login Flow:
```
1. User input email + password
2. Frontend → POST /api/owner/login atau /api/manager/login
3. Backend cek di table staff dengan role = 'owner' atau 'manager'
4. Validasi password_hash
5. Return user_id, user_name, user_role
6. Frontend simpan ke localStorage
7. Redirect ke dashboard masing-masing
```

### Staff Login Flow:
```
1. User input staff_code + login_code
2. Frontend → POST /api/staff/login
3. Backend cek di table staff dengan role = 'staff'
4. Validasi login_code dan expiry time
5. Return user_id, user_name, user_role, staff_type, staff_code
6. Frontend simpan ke localStorage
7. Redirect ke /staff/dashboard
   - Dashboard tampilkan features sesuai staff_type
```

### Customer Login Flow:
```
1. User input phone number
2. Jika new customer, centang checkbox dan input nama
3. Frontend → POST /api/customer/login
4. Backend cek apakah phone sudah terdaftar
5a. Jika ada → Return existing customer data
5b. Jika baru → Insert ke table customers → Return new customer data
6. Frontend simpan ke localStorage
7. Redirect ke /customer/menu
```

---

## 🔒 SECURITY NOTES

### Development (Current):
- Password disimpan sebagai plain text
- Login code tidak di-hash
- Tidak ada rate limiting
- Tidak ada session management

### Production (Recommended):
```typescript
// 1. Hash password dengan bcrypt
import bcrypt from 'bcrypt';
const hashedPassword = await bcrypt.hash(password, 10);

// 2. Compare password
const isValid = await bcrypt.compare(inputPassword, hashedPassword);

// 3. JWT untuk session
import jwt from 'jsonwebtoken';
const token = jwt.sign({ user_id, role }, SECRET_KEY, { expiresIn: '24h' });

// 4. Rate limiting
// Batasi login attempts per IP/user

// 5. OTP untuk customer
// Kirim SMS/WhatsApp OTP untuk verifikasi phone
```

---

## 📱 FRONTEND ROUTES

### Public Routes (No Auth Required):
- `/owner/login`
- `/manager/login`
- `/staff/login`
- `/customer/login`

### Protected Routes:
- `/owner/*` - Requires role: owner
- `/manager/*` - Requires role: manager
- `/staff/*` - Requires role: staff, cashier
- `/customer/*` - Requires customer_id

---

## 🧪 TESTING DATA

### Owner Account:
```
Email: owner@foodies.com
Password: owner123
Role: owner
```

### Manager Account:
```
Email: manager@foodies.com
Password: manager123
Role: manager
```

### Staff Account:
```
Staff Code: STF001
Login Code: 12345678 (temporary, 24 hours)
Role: staff
```

### Customer Account:
```
Phone: 08123456789
Name: John Doe
(Auto-created on first login)
```

---

## 🚀 NEXT STEPS

1. ✅ Setup Supabase tables (staff, customers)
2. ✅ Implement login APIs
3. ✅ Create login pages for all roles
4. ⏳ Add middleware untuk protected routes
5. ⏳ Implement logout functionality
6. ⏳ Add session management
7. ⏳ Implement password hashing (production)
8. ⏳ Add OTP verification untuk customer (production)

---

## 📝 MIDDLEWARE EXAMPLE (Next.js)

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Get user role from cookie or header
  const userRole = request.cookies.get('user_role')?.value;
  
  // Owner routes
  if (path.startsWith('/owner') && userRole !== 'owner') {
    return NextResponse.redirect(new URL('/owner/login', request.url));
  }
  
  // Manager routes
  if (path.startsWith('/manager') && userRole !== 'manager') {
    return NextResponse.redirect(new URL('/manager/login', request.url));
  }
  
  // Staff routes
  if (path.startsWith('/staff') && !['staff', 'cashier'].includes(userRole || '')) {
    return NextResponse.redirect(new URL('/staff/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/owner/:path*', '/manager/:path*', '/staff/:path*', '/customer/:path*'],
};
```
