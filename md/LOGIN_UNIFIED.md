# ✅ Unified Login System

## 📝 Perubahan

Login untuk **Staff** dan **Manager** sekarang **digabung** menjadi satu di `/staff/login`.

Sistem akan otomatis redirect berdasarkan `role` dari database:
- **Role = "manager"** → Redirect ke `/manager/menu`
- **Role = "staff"** → Redirect ke `/staff/dashboard`

---

## 🔧 Files Modified

### 1. **Backend API** - `frontend/app/api/staff/login/route.ts`
```typescript
// ✅ SEBELUM: Hanya terima role "staff"
.eq("role", "staff")

// ✅ SESUDAH: Terima semua role (staff & manager)
// Hapus filter .eq("role", "staff")
```

**Changes:**
- Hapus filter `role = "staff"` di query Supabase
- Return `user_role` yang sebenarnya dari database
- Validasi login_code expiry hanya untuk staff (manager permanent)

---

### 2. **Frontend Login Page** - `frontend/app/staff/login/page.tsx`
```typescript
// ✅ Auto redirect berdasarkan role
if (result.user_role === "manager") {
  window.location.href = "/manager/menu";
} else {
  window.location.href = "/staff/dashboard";
}
```

**Changes:**
- Save `user_role` dari API response (bukan hardcode "staff")
- Conditional redirect berdasarkan role
- Pindahkan error message ke atas form untuk visibility

---

### 3. **Manager Login Redirect** - `frontend/app/manager/login/page.tsx`
```typescript
// Redirect ke /staff/login
useEffect(() => {
  window.location.href = "/staff/login";
}, []);
```

**Changes:**
- Halaman `/manager/login` sekarang redirect ke `/staff/login`
- Backward compatibility untuk link lama

---

## 🧪 Testing Credentials

### Login sebagai Manager
```
URL: http://localhost:3000/staff/login

Staff ID: MGR001
Password: manager123
### Login sebagai Manager (2 CARA)

**Opsi 1: Menggunakan Staff Code**
```
URL: http://localhost:3000/staff/login

Staff ID: MGR001
Password: manager123
```

**Opsi 2: Menggunakan Email**
```
URL: http://localhost:3000/staff/login

Staff ID: manager@foodies.com
Password: manager123
```
**Expected Result:**
- ✅ Login berhasil
- ✅ Redirect ke `/manager/dashboard`
- ✅ localStorage.user_role = "manager"
- ✅ Greeting: "Good Morning, Jane Manager!"

---

### Login sebagai Staff (Cashier)
```
URL: http://localhost:3000/staff/login

Staff ID: STF002
Password: TEMP1234
```
**Expected Result:**
- ✅ Login berhasil
- ✅ Redirect ke `/staff/dashboard`
- ✅ localStorage.user_role = "staff"
- ✅ localStorage.staff_type = "cashier"

---

### Login sebagai Staff (Kitchen)
```
URL: http://localhost:3000/staff/login

Staff ID: STF004
Password: TEMP5678
```
**Expected Result:**
- ✅ Login berhasil
- ✅ Redirect ke `/staff/dashboard`
- ✅ localStorage.user_role = "staff"
- ✅ localStorage.staff_type = "kitchen"

---

## 📊 Database Structure

### Table: `staff`
```sql
CREATE TABLE staff (
  id UUID PRIMARY KEY,
  staff_code VARCHAR(20) UNIQUE,    -- MGR001, STF002, dll
  name VARCHAR(100),
  email VARCHAR(100),
  role VARCHAR(20),                  -- 'manager' atau 'staff'
  staff_type VARCHAR(50),            -- cashier, kitchen, waiter, barista (null untuk manager)
  login_code VARCHAR(100),           -- Password/PIN
  login_code_expires_at TIMESTAMP,   -- Expiry (hanya staff)
  status VARCHAR(20)                 -- 'active', 'inactive'
);
```

---

## 🎯 Benefits

1. **Single Login Page** - User tidak bingung mau login di mana
2. **Auto Redirect** - Sistem otomatis arahkan ke halaman yang sesuai
3. **Role-based Access** - Manager dapat akses fitur manager, staff dapat akses fitur staff
4. **Backward Compatible** - Link lama `/manager/login` masih work (redirect otomatis)
5. **Simpler Maintenance** - Hanya maintain 1 login flow

---

## 🔐 Security Notes

- **Manager**: Login code permanent (tidak expire)
- **Staff**: Login code bisa expire, harus request baru ke manager
- **Validation**: Check `status = 'active'` sebelum allow login
- **LocalStorage**: Store role untuk client-side routing

---

## 🚀 Next Steps

1. Test semua credential
2. Verify redirect behavior
3. Test expired staff login code
4. Test inactive user login (should fail)

---

**Last Updated:** November 18, 2025
**Status:** ✅ Completed & Ready to Test
