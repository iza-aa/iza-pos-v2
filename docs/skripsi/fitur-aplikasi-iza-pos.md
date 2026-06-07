# Analisis Fitur Aplikasi IZA POS

Dokumen ini disusun dari struktur route, komponen, service, dan query Supabase yang ada di repository `frontend/app` dan `frontend/lib`. Tujuannya adalah menjadi bahan skripsi yang grounded: setiap fitur di bawah punya rujukan teknis agar AI penyusun skripsi tidak menambahkan fitur yang tidak ada.

## Batasan Sistem

- Aplikasi berbasis Next.js App Router di folder `frontend/app`.
- Database dan storage menggunakan Supabase.
- Aktor utama: Owner, Manager, Staff, Customer.
- Data bisnis utama: menu/product, kategori, order, order item, transaksi pembayaran, inventory, batch inventory, recipe, laporan stok, kitchen station, staff, attendance, meja/floor, reward, bookkeeping, activity log, dan rekomendasi AI owner.
- Data pendukung operasional: QR/presence code untuk presensi, order correction untuk pembatalan/koreksi/refund, serta profile/photo/receipt upload melalui storage.
- Nilai dari database seperti nama menu, nama bahan, supplier, staff, note, dan status historis tidak diterjemahkan. Label UI bisa bilingual melalui `frontend/app/components/shared/i18n`.

## Aktor Dan Hak Akses

### Owner

Owner berfokus pada kontrol bisnis, analitik, keuangan, staff, reward, dan audit.

Route utama:
- `frontend/app/owner/dashboard/page.tsx`
- `frontend/app/owner/bookkeeping/page.tsx`
- `frontend/app/owner/staff-manager/page.tsx`
- `frontend/app/owner/activitylog/page.tsx`
- `frontend/app/owner/rewards-analytics/page.tsx`
- `frontend/app/owner/profile/page.tsx`
- `frontend/app/owner/login/page.tsx`

Fitur:

1. Dashboard bisnis owner
   - Lokasi kode:
     - `frontend/app/components/owner/business-dashboard`
     - `tabs/overview`, `tabs/sales`, `tabs/customer`, `tabs/StandardDashboardPanels.tsx`
   - Subfitur:
     - Overview bisnis: revenue, total order, AOV, order selesai/cancel, metode payment teratas.
     - Sales dashboard: revenue, net sales, discount, tax, COGS estimate, gross profit, net profit estimate, menu profitability.
     - Customer dashboard: member vs guest, repeat rate, reward usage, discount cost, loyalty insight.
     - Inventory dashboard: total SKU, critical items, restock cost, data issue, pending stock report, usage trend, batch risk, stock movement.
     - Staff analytics: staff aktif, clock-in, late count, overtime, productivity, staff performance radar.
     - Operation dashboard: total order, active order, completion rate, cancelled order, order density, order flow, service time, outcome trend.
   - Tabel utama:
     - `orders`, `order_items`, `products`, `categories`
     - `inventory_items`, `inventory_batches`, `usage_transactions`, `usage_transaction_details`
     - `stock_reports`, `kitchen_station_movements`
     - `staff`, `attendance`, `rewards`, `customer_reward_redemptions`
   - Teknis:
     - Data dashboard dibaca dari Supabase melalui hooks seperti `useOwnerDashboardData`, `useSalesDashboardData`, `useCustomerPerformanceData`.
     - Export Excel memakai util `exportWorkbook` / `downloadXlsxWorkbook`.
     - Rekomendasi AI owner memakai service `frontend/lib/services/owner-insights`.

2. Owner bookkeeping
   - Lokasi kode:
     - `frontend/app/owner/bookkeeping/page.tsx`
     - `frontend/app/components/owner/bookkeeping`
     - `frontend/lib/services/bookkeeping`
     - API: `frontend/app/api/owner/bookkeeping/*`
   - Subfitur:
     - Auto ledger dari transaksi POS, usage, expense, dan closing.
     - Cost and margin report.
     - Expense management dengan receipt upload.
     - Tax and service charge settings.
     - Shift closing review.
     - Daily closing close/reopen.
     - Bookkeeping exception review.
     - Manual ledger adjustment dengan catatan alasan.
     - Report generation dan export PDF.
   - Tabel utama:
     - `bookkeeping_entries`, `bookkeeping_exceptions`, `bookkeeping_expenses`
     - `bookkeeping_shift_closings`, `bookkeeping_daily_closings`
     - `bookkeeping_reports`, `bookkeeping_financial_settings`
     - `orders`, `order_corrections`, `usage_transactions`, `usage_transaction_details`, `inventory_batches`, `inventory_items`
   - Teknis:
     - Ledger dibuat dari service `bookkeepingServer.ts` dan API `ledger/generate`.
     - Exception bisa dibuat dari order correction dan direview owner.
     - Shift closing staff masuk ke `bookkeeping_shift_closings`, lalu owner bisa review dan daily close.
     - Report bookkeeping dapat dihasilkan dan diekspor PDF.

3. Staff manager owner
   - Lokasi kode:
     - `frontend/app/owner/staff-manager/page.tsx`
     - `frontend/app/components/owner/staffmanager`
     - API weekly shift: `frontend/app/api/owner/staff-manager/weekly-shifts/route.ts`
   - Subfitur:
     - Tambah/edit staff.
     - Generate staff passcode.
     - Staff schedule/shift assignment.
     - Attendance monitoring.
   - Tabel utama:
     - `staff`, `shifts`
     - `staff_shift_weekly_assignments`, `staff_shift_daily_assignments`
     - `attendance`, `store_settings`
   - Teknis:
     - Staff login menggunakan `staff.passcode_hash`.
     - Weekly/daily assignment digunakan untuk operasi shift dan closing.

4. Activity log owner
   - Lokasi kode:
     - `frontend/app/owner/activitylog/page.tsx`
     - `frontend/app/components/owner/activitylog`
     - `frontend/lib/services/activity/activityLogger.ts`
   - Subfitur:
     - Melihat audit aktivitas sistem seperti update order, correction, bookkeeping, dan staff activity.
     - Menelusuri aktor, aksi, entity terdampak, ringkasan perubahan, tag, dan waktu kejadian.
   - Tabel utama:
     - `activity_logs`
   - Teknis:
     - Log dibuat dari beberapa API dan service saat ada aksi penting.

5. Owner notification
   - Lokasi kode:
     - `frontend/app/components/shared/notifications/useOwnerNotifications.ts`
   - Subfitur:
     - Notifikasi inventory kritis, report stok, kitchen movement risk, order/menu availability risk, attendance, dan activity.
   - Tabel utama:
     - `inventory_items`, `stock_reports`, `kitchen_station_movements`, `orders`, `products`, `attendance`, `activity_logs`
   - Teknis:
     - Notifikasi bersifat live-query/client-side signal, bukan push notification HP.

6. Menu bundle dan discount owner
   - Lokasi kode:
     - `CustomerDiscountDashboard` di `StandardDashboardPanels.tsx`
   - Subfitur:
     - Membuat reward/discount.
     - Membuat menu bundle fixed price.
   - Tabel utama:
     - `rewards`, `menu_bundles`, `menu_bundle_items`, `products`
   - Teknis:
     - Bundle tampil di customer menu bila `is_active` dan berada dalam periode aktif.

### Manager

Manager berfokus pada operasional harian: menu, inventory, closing, order, staff, dan table.

Route utama:
- `frontend/app/manager/menu/page.tsx`
- `frontend/app/manager/inventory/page.tsx`
- `frontend/app/manager/closing/page.tsx`
- `frontend/app/manager/order/page.tsx`
- `frontend/app/manager/table-management/page.tsx`
- `frontend/app/manager/staff-manager/page.tsx`
- `frontend/app/manager/profile/page.tsx`
- `frontend/app/manager/login/page.tsx`

Fitur:

1. Manajemen menu
   - Lokasi kode:
     - `frontend/app/manager/menu/page.tsx`
     - `frontend/app/components/manager/menu`
   - Subfitur:
     - CRUD kategori.
     - CRUD product/menu.
     - Upload foto menu.
     - Setup product variant groups.
     - Mengatur price adjustment untuk variant option.
   - Tabel utama:
     - `products`, `categories`, `product_variant_groups`, `variant_groups`, `variant_options`, `product_variant_recipe_adjustments`
   - Teknis:
     - Product bisa punya `type` food/drink, category, price, stock/available status, dan relasi variant.

2. Manajemen inventory
   - Lokasi kode:
     - `frontend/app/manager/inventory/page.tsx`
     - `frontend/app/components/manager/inventory`
     - `frontend/lib/services/inventory/inventoryBatchService.ts`
   - Subfitur:
     - Raw material/master inventory.
     - Restock batch dengan supplier, receipt, expiry date, unit cost.
     - Stock adjustment untuk koreksi stok dengan alasan dan batch terkait.
     - Usage history.
     - Recipe base menu.
     - Variant recipe adjustment.
     - Variant groups/options.
     - Stock report review.
   - Tabel utama:
     - `inventory_items`, `inventory_batches`, `inventory_batch_movements`
     - `usage_transactions`, `usage_transaction_details`
     - `recipes`, `recipe_ingredients`
     - `product_variant_recipe_adjustments`
     - `stock_reports`, `kitchen_station_movements`
   - Teknis:
     - Inventory item punya tracking mode: POS deduct, kitchen deduct, opened ingredient.
     - Restock mencatat batch dan movement.
     - Adjustment dicatat sebagai usage transaction/movement agar riwayat stok tetap dapat diaudit.
     - POS/kitchen usage mencatat usage transaction dan detail.
     - Stock report dari staff masuk ke `stock_reports` dan direview manager.

3. Manager closing
   - Lokasi kode:
     - `frontend/app/manager/closing/page.tsx`
     - `frontend/app/api/manager/closing/operations/route.ts`
   - Tabel utama:
     - `bookkeeping_shift_closings`, `bookkeeping_expenses`, `staff_shift_daily_assignments`, `staff_shift_weekly_assignments`, `shifts`, `staff`, `activity_logs`
   - Fungsi:
     - Mengatur opening cash dan closing float per shift.
     - Melihat status shift closing staff.
     - Approve atau minta recheck closing shift.
     - Mencatat expense operasional harian.
   - Teknis:
     - Fitur ini adalah closing operasional manager, bukan modul bookkeeping owner.
     - Closing membaca jadwal staff dari daily/weekly assignment dan data shift.

4. Order management manager
   - Lokasi kode: `frontend/app/manager/order/page.tsx`
   - Tabel utama:
     - `orders`, `order_items`, `payment_transactions`, `usage_transactions`, `usage_transaction_details`, `tables`, `staff`
   - Fungsi:
     - Melihat dan mengubah status order.
     - Menyelesaikan payment.
     - Menangani correction/cancel/refund.
   - Teknis:
     - Saat order selesai, stok direduksi melalui usage transaction/detail dan/atau kitchen station movement sesuai recipe/tracking mode.
     - Koreksi order disimpan di `order_corrections`, dapat memicu adjustment stok dan bookkeeping exception.

5. Table management
   - Lokasi kode:
     - `frontend/app/manager/table-management/page.tsx`
     - `frontend/app/components/manager/tablemanager`
     - `frontend/lib/services/table`
     - API: `frontend/app/api/manager/tables`, `floors`, `qr`
   - Subfitur:
     - CRUD floor.
     - CRUD meja.
     - Generate/regenerate/delete QR.
     - Update table position/status.
   - Tabel utama:
     - `floors`, `tables`, `table_sessions`
   - Teknis:
     - Customer table QR memakai token untuk membuka customer menu per meja.

6. Staff manager manager
   - Lokasi kode: `frontend/app/manager/staff-manager/page.tsx`
   - Tabel utama: `staff`, `attendance`, `shifts`
   - Fungsi:
     - Monitoring staff dan attendance dari sisi manager.

7. Manager notification
   - Lokasi kode: `frontend/app/components/shared/notifications/useManagerNotifications.ts`
   - Tabel utama:
     - `inventory_items`, `stock_reports`, `kitchen_station_movements`, `products`, `orders`, `attendance`, `order_corrections`
   - Fungsi:
     - Memberi sinyal stok, report staff, kitchen movement, menu/order risk, attendance, dan correction.

### Staff

Staff adalah aktor operasional kasir/barista/kitchen.

Route utama:
- `frontend/app/staff/pos/page.tsx`
- `frontend/app/staff/order/page.tsx`
- `frontend/app/staff/kitchen/page.tsx`
- `frontend/app/staff/stock-check/page.tsx`
- `frontend/app/staff/attendance/page.tsx`
- `frontend/app/staff/profile/page.tsx`
- `frontend/app/staff/login/page.tsx`

Fitur:

1. Staff login
   - Lokasi kode:
     - `frontend/app/staff/login/page.tsx`
     - `frontend/app/api/staff/login/route.ts`
   - Tabel utama: `staff`
   - Teknis:
     - Staff masuk memakai passcode/PIN, bukan auth customer.

2. POS staff
   - Lokasi kode: `frontend/app/staff/pos/page.tsx`
   - Tabel utama:
     - `categories`, `products`, `orders`, `order_items`, `payment_transactions`
   - Fungsi:
     - Memilih produk, membuat order, memproses pembayaran.
   - Teknis:
     - POS membaca availability product dan recipe readiness.
     - Payment dicatat di `payment_transactions` dengan metode seperti cash, QRIS, debit/card sesuai UI.

3. Staff order board
   - Lokasi kode: `frontend/app/staff/order/page.tsx`
   - Tabel utama:
     - `orders`, `order_items`, `payment_transactions`, `usage_transactions`, `usage_transaction_details`, `tables`, `staff`
   - Fungsi:
     - Melihat order aktif.
     - Mengubah status order item/order.
     - Menyelesaikan order.
     - Mengajukan order correction bila ada cancel/refund/koreksi fisik pesanan.
   - Teknis:
     - Saat fulfillment, item order dapat memicu inventory deduction.
     - Koreksi order disimpan melalui API `frontend/app/api/orders/corrections/route.ts`.

4. Kitchen station
   - Lokasi kode: `frontend/app/staff/stock-check/page.tsx`
   - Tabel utama:
     - `inventory_items`, `inventory_batches`, `inventory_batch_movements`
     - `kitchen_station_batches`, `kitchen_station_movements`, `kitchen_station_shift_counts`
     - `stock_reports`, `usage_transactions`, `usage_transaction_details`
   - Fungsi:
     - Move to kitchen dari master stock.
     - Opened ingredient untuk bahan informal/bulk.
     - Update batch kitchen: thawing, prep, ready.
     - Report item kitchen/opened ingredient.
     - Mark used up dan mark waste.
     - Test ingredient/menu yang menjadi COGS/usage.
   - Teknis:
     - Kitchen item kritikal seperti ayam memakai kitchen station batch dan POS deduct.
     - Bulk/opened ingredient seperti rice/salt/cucumber dicatat sebagai movement/report informal.
     - Report masuk ke `stock_reports` dan dapat dilihat manager/owner.
     - Movement masuk ke `kitchen_station_movements` dan usage history manager.

5. Kitchen order page
   - Lokasi kode: `frontend/app/staff/kitchen/page.tsx`
   - Tabel utama: `order_items`
   - Fungsi:
     - Dapur melihat item order dan update ready/served timestamp.

6. Staff attendance
   - Lokasi kode: `frontend/app/staff/attendance/page.tsx`
   - Tabel utama:
     - `staff`, `store_settings`, `attendance`
   - Fungsi:
     - Clock in/out staff.
     - Menentukan check-in status seperti late berdasarkan setting.
     - Presensi memakai data `attendance` dan pengaturan shift/store.

7. Staff notification
   - Lokasi kode: `frontend/app/components/shared/notifications/useStaffNotifications.ts`
   - Tabel utama:
     - `attendance`, `stock_reports`, `inventory_items`, `orders`, `order_items`, `kitchen_station_batches`
   - Fungsi:
     - Memberi sinyal attendance, stock report status, low stock, order baru/ready, dan kitchen ready stock.

### Customer

Customer adalah pemesan dari web customer/table QR.

Route utama:
- `frontend/app/customer/page.tsx`
- `frontend/app/customer/menu/page.tsx`
- `frontend/app/customer/menu/checkout/page.tsx`
- `frontend/app/customer/table/[token]/page.tsx`
- `frontend/app/customer/track/page.tsx`
- `frontend/app/customer/rewards/page.tsx`
- `frontend/app/customer/login/page.tsx`
- `frontend/app/customer/register/page.tsx`
- `frontend/app/customer/complete-profile/page.tsx`
- `frontend/app/customer/settings/page.tsx`
- `frontend/app/customer/auth/callback/page.tsx`

Fitur:

1. Customer login/register/profile
   - Lokasi kode:
     - `frontend/app/api/customer/login/route.ts`
     - `frontend/app/api/customer/register/route.ts`
     - `frontend/app/api/customer/auth/*`
   - Tabel utama:
     - `customers`
   - Teknis:
     - Customer auth dipisah dari internal staff/owner/manager login.

2. Table QR session
   - Lokasi kode:
     - `frontend/app/customer/table/[token]/page.tsx`
     - API `frontend/app/api/customer/table-session/*`
   - Tabel utama:
     - `tables`, `floors`, `table_sessions`
   - Fungsi:
     - Customer membuka menu dari QR meja.
     - Sistem membuat/validasi/end table session.

3. Customer menu dan checkout
   - Lokasi kode:
     - `frontend/app/customer/menu/page.tsx`
     - `frontend/app/customer/menu/checkout/page.tsx`
     - `frontend/app/components/customer/menu/VariantModal.tsx`
   - Tabel utama:
     - `products`, `categories`, `product_variant_groups`, `variant_groups`, `variant_options`
     - `menu_bundles`, `menu_bundle_items`
     - `orders`, `order_items`, `table_sessions`, `payment_transactions`
   - Fungsi:
     - Melihat menu product dan bundle aktif.
     - Memilih variant.
     - Checkout order.
     - Membayar melalui QRIS pada checkout customer.
   - Teknis:
     - Menu availability dipengaruhi `products.available/is_available` dan readiness bahan kritikal.
     - Customer tidak diberi detail internal seperti “kitchen station habis”; UI cukup menampilkan menu tidak tersedia.
     - Komponen QRIS menghasilkan kode QR pembayaran sederhana untuk order checkout customer.

4. Customer order tracking
   - Lokasi kode: `frontend/app/customer/track/page.tsx`
   - Tabel utama: `orders`
   - Fungsi:
     - Customer mengecek status pesanan dari web.
   - Batasan:
     - Tidak ada push notification HP; customer perlu membuka/mengecek halaman web.

5. Customer rewards
   - Lokasi kode: `frontend/app/customer/rewards/page.tsx`
   - Tabel utama:
     - `customers`, `rewards`, `customer_reward_redemptions`, `customer_point_transactions`
   - Fungsi:
     - Melihat point/reward.
     - Redeem reward.
     - Melihat riwayat transaksi point yang bersumber dari order.

## Fitur Cross-Cutting

1. Role-based login terpisah
   - Owner login: `frontend/app/api/owner/login/route.ts`
   - Manager login: `frontend/app/api/manager/login/route.ts`
   - Staff login: `frontend/app/api/staff/login/route.ts`
   - Customer login/register/auth: `frontend/app/api/customer/*`
   - Alasan teknis:
     - Internal user memakai tabel `staff` dengan role owner/manager/staff.
     - Customer memakai tabel `customers` dan alur auth/profile berbeda.
     - Pemisahan memudahkan permission, UI shell, dan data akses per aktor.

2. Role guard dan akses halaman
   - Lokasi kode:
     - `frontend/app/components/shared/auth/RoleGuard.tsx`
     - Layout per role: `frontend/app/owner/layout.tsx`, `frontend/app/manager/layout.tsx`, `frontend/app/staff/layout.tsx`, `frontend/app/customer/layout.tsx`
   - Fungsi:
     - Menjaga halaman internal agar hanya dibuka oleh role yang sesuai.
     - Memisahkan navigasi dan UI shell owner, manager, staff, dan customer.

3. Activity logging
   - Tabel: `activity_logs`
   - Dipakai oleh owner/manager untuk audit aksi penting.

4. Notification shared
   - Lokasi kode:
     - `frontend/app/components/shared/notifications`
   - Hook per aktor:
     - `useOwnerNotifications.ts`
     - `useManagerNotifications.ts`
     - `useStaffNotifications.ts`
   - Sumber data:
     - Inventory, stock report, kitchen movement, orders, attendance, activity log.

5. Bilingual internal UI
   - Lokasi kode:
     - `frontend/app/components/shared/i18n`
   - Fungsi:
     - Mengganti label UI internal ke English/Indonesia.
   - Batasan:
     - Data Supabase asli tidak diterjemahkan.

6. AI owner insights
   - Lokasi kode:
     - `frontend/lib/services/owner-insights`
     - API `frontend/app/api/owner/recommendations/*`
   - Fungsi:
     - Membuat snapshot sales, inventory, staff, customer, operation, activity.
     - Menghasilkan rekomendasi owner dengan guardrails dan schema.
   - Tabel utama:
     - Tabel sumber dashboard dan storage rekomendasi internal service.

7. Profile dan upload file
   - Lokasi kode:
     - `frontend/app/components/shared/profile`
     - API `frontend/app/api/profile/photo/route.ts`
     - API receipt/photo: `frontend/app/api/manager/inventory/receipt/route.ts`, `frontend/app/api/owner/bookkeeping/expenses/receipt/route.ts`, `frontend/app/api/staff/menu/photo/route.ts`
   - Fungsi:
     - Upload foto profile, foto menu, receipt restock, dan receipt expense melalui storage Supabase.
   - Batasan:
     - File upload mendukung dokumentasi operasional, bukan sistem arsip legal formal yang berdiri sendiri.

## Catatan Untuk Penulisan Skripsi

- Jangan menulis bahwa sistem memiliki mobile push notification. Yang ada adalah notification modal/signal di web.
- Jangan menulis bahwa customer menerima detail stok dapur. Customer hanya melihat ketersediaan menu dan status order.
- Jangan menulis bahwa semua bahan bulk dihitung per gram otomatis akurat. Sistem mendukung pencatatan informal/opened ingredient dan report staff untuk praktik coffee shop.
- Jangan menulis bahwa semua laporan inventory berasal dari audit timbang ketat. Kitchen report memang dirancang sebagai operational note/report.
- Jangan menulis ERD berdasarkan asumsi SQL migration lengkap. Repository saat ini lebih jelas menunjukkan tabel dari query Supabase di app/service.
- Jangan menulis bahwa QRIS sudah terintegrasi payment gateway otomatis. Komponen checkout menampilkan QRIS dan konfirmasi pembayaran di web.
- Jangan menulis bahwa aplikasi memiliki fitur archive.
- Jangan menulis bahwa manager memiliki dashboard, reward management, atau bookkeeping page. Fitur manager hanya Menu, Inventory, Closing, Order, Staff, dan Table.
- Jangan menulis bahwa staff memiliki dashboard. Staff masuk ke fitur operasional seperti POS, Order, Kitchen, Stock Check, Attendance, dan Profile.
