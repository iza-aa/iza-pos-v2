# SOURCE OF TRUTH SKRIPSI

Dokumen ini adalah acuan final untuk penulisan BAB I, BAB II, BAB III, BAB IV, diagram, mockup/wireframe, dan pengujian sistem IZA POS. Dokumen ini harus dipakai bersama:

- `docs/skripsi/fitur-aplikasi-iza-pos.md`
- `docs/skripsi/erd-iza-pos.puml`
- `docs/skripsi/activity-diagram-per-aktor.puml`
- `docs/skripsi/prompt-pack-ai-skripsi.md`

## 1. Judul dan Arah Penelitian

Judul skripsi yang dipakai:

**Rancang Bangun Sistem Point of Sale Berbasis Web untuk Mendukung Operasional dan Monitoring Bisnis Coffee Shop**

Sistem yang diteliti adalah aplikasi Point of Sale berbasis web untuk coffee shop. Fokus sistem adalah POS multi-aktor yang membantu pemesanan, pembayaran, order fulfillment, manajemen menu, manajemen meja, inventory operasional, presensi staff, closing, monitoring bisnis, bookkeeping owner, activity log, reward customer, dan AI Insight untuk owner.

Sistem ini bukan:

- sistem akuntansi formal,
- sistem inventory enterprise,
- sistem AI utama,
- sistem reward bundling,
- sistem archive.

Istilah yang benar adalah **Point of Sale** atau **POS**, bukan "Point of Sales".

## 2. Batas Scope Final

| Kategori | Isi |
|---|---|
| IN SCOPE | Customer QR Ordering, menu digital, cart, checkout, QRIS display/confirmation, order tracking, customer rewards, Staff POS, order board, kitchen/barista queue, serving flow, attendance, Stock Check, Stock Reports, Manager Menu, Inventory, Closing, Order, Staff, Table, Owner Dashboard, Bookkeeping, Reports, Reward Management, Activity Log, Export Activity Log, AI Insight |
| OUT OF SCOPE | Sistem akuntansi formal, inventory enterprise, payment gateway otomatis, mobile push notification, AI sebagai pengambil keputusan otomatis, AI chatbot bebas query database sebagai fokus skripsi, manager reward management langsung, manager reward request jika tidak ada kode, reward bundling sebagai fitur reward/poin |
| DEPRECATED / NOT IN THESIS SCOPE | Archive, owner archives route, manager dashboard route, manager rewards route, manager bookkeeping route lama, staff dashboard route |
| PLANNED BUT NOT CLAIMED | Fitur yang belum ditemukan route/komponen/API final tidak boleh diklaim. Jika ingin dibahas, tulis sebagai rencana pengembangan, bukan implementasi. |

Catatan khusus:

- `Archive` tidak menjadi fitur final skripsi.
- `Export Activity Log` masuk scope karena halaman `frontend/app/owner/activitylog/page.tsx` memiliki export Excel/PDF.
- `Reward bundling` tidak boleh diklaim sebagai fitur reward.
- `menu_bundles` ada sebagai fitur menu bundle/fixed price di area owner/customer menu, tetapi tidak boleh ditulis sebagai reward bundling berbasis poin.

## 3. Aktor dan Tanggung Jawab

| Aktor | Tanggung jawab |
|---|---|
| Customer | QR Ordering, melihat menu digital, memilih varian, cart, checkout, pembayaran QRIS berbasis tampilan/konfirmasi web, order tracking, melihat/redeem reward jika login sebagai customer |
| Staff - Cashier | POS, membuat order langsung, memproses pembayaran, update order, attendance, submit shift closing jika diwajibkan |
| Staff - Kitchen | Melihat kitchen queue, update item ready/served sesuai alur dapur, attendance, Stock Check dengan limited inventory visibility |
| Staff - Barista | Melihat barista/order queue, attendance, Stock Check untuk item barista/shared, membuat Stock Reports |
| Staff - Waiter | Serving flow, update status order/served, attendance |
| Manager | Menu and category management, table management, inventory management, recipe management, staff management, shift management, attendance monitoring, order monitoring, Stock Reports follow-up, closing operasional |
| Owner | Owner Dashboard, Overview, Sales Analytics, Customer Analytics, Inventory Analytics, Staff Analytics, Operations Analytics, Bookkeeping, Reports, Reward Management, Activity Log, Export Activity Log, AI Insight |

Manager tidak memiliki fitur final:

- manager dashboard,
- manager reward management langsung,
- manager bookkeeping page.

Staff tidak memiliki fitur final:

- staff dashboard.

## 4. Modul Final Sistem

### Customer Module

- Status: `IMPLEMENTED`
- Route: `frontend/app/customer/page.tsx`, `customer/menu/page.tsx`, `customer/menu/checkout/page.tsx`, `customer/table/[token]/page.tsx`, `customer/track/page.tsx`, `customer/rewards/page.tsx`, `customer/login/page.tsx`, `customer/register/page.tsx`, `customer/complete-profile/page.tsx`, `customer/settings/page.tsx`
- API utama: `api/customer/login`, `api/customer/register`, `api/customer/auth/*`, `api/customer/table-session/*`, `api/customer/validate-table`
- Tabel: `customers`, `products`, `categories`, `variant_groups`, `variant_options`, `product_variant_groups`, `menu_bundles`, `menu_bundle_items`, `orders`, `order_items`, `payment_transactions`, `tables`, `floors`, `table_sessions`, `rewards`, `customer_reward_redemptions`, `customer_point_transactions`
- Batasan: QRIS hanya tampilan/kode pembayaran dan konfirmasi web, bukan integrasi payment gateway otomatis.

### Staff Module

- Status: `IMPLEMENTED`
- Route: `frontend/app/staff/pos/page.tsx`, `staff/order/page.tsx`, `staff/kitchen/page.tsx`, `staff/stock-check/page.tsx`, `staff/attendance/page.tsx`, `staff/profile/page.tsx`, `staff/login/page.tsx`
- API utama: `api/staff/login`, `api/staff/bookkeeping/shift-closing`, `api/orders/corrections`
- Tabel: `staff`, `attendance`, `orders`, `order_items`, `payment_transactions`, `inventory_items`, `inventory_batches`, `kitchen_station_batches`, `kitchen_station_movements`, `stock_reports`, `usage_transactions`, `usage_transaction_details`
- Batasan: kitchen/barista tidak mengelola inventory penuh. Mereka memakai Stock Check dan membuat Stock Reports.

### Manager Module

- Status: `IMPLEMENTED`
- Route: `frontend/app/manager/menu/page.tsx`, `manager/inventory/page.tsx`, `manager/closing/page.tsx`, `manager/order/page.tsx`, `manager/table-management/page.tsx`, `manager/staff-manager/page.tsx`, `manager/profile/page.tsx`, `manager/login/page.tsx`
- API utama: `api/manager/closing/operations`, `api/manager/tables`, `api/manager/floors`, `api/manager/qr`, `api/manager/inventory/receipt`, `api/orders/corrections`
- Tabel: `products`, `categories`, `variant_groups`, `variant_options`, `product_variant_groups`, `inventory_items`, `inventory_batches`, `inventory_batch_movements`, `recipes`, `recipe_ingredients`, `product_variant_recipe_adjustments`, `stock_reports`, `orders`, `order_items`, `tables`, `floors`, `table_sessions`, `staff`, `shifts`, `attendance`, `bookkeeping_shift_closings`, `bookkeeping_expenses`
- Batasan: Manager tidak mengelola reward langsung dan tidak memiliki manager dashboard final.

### Owner Module

- Status: `IMPLEMENTED`
- Route: `frontend/app/owner/dashboard/page.tsx`, `owner/bookkeeping/page.tsx`, `owner/staff-manager/page.tsx`, `owner/activitylog/page.tsx`, `owner/rewards-analytics/page.tsx`, `owner/profile/page.tsx`, `owner/login/page.tsx`
- API utama: `api/owner/login`, `api/owner/recommendations/*`, `api/owner/bookkeeping/*`, `api/owner/staff-manager/weekly-shifts`
- Tabel: `orders`, `order_items`, `products`, `categories`, `inventory_items`, `inventory_batches`, `usage_transactions`, `usage_transaction_details`, `stock_reports`, `kitchen_station_movements`, `staff`, `attendance`, `rewards`, `customer_reward_redemptions`, `bookkeeping_entries`, `bookkeeping_exceptions`, `bookkeeping_expenses`, `bookkeeping_shift_closings`, `bookkeeping_daily_closings`, `bookkeeping_reports`, `activity_logs`
- Batasan: Owner melihat inventory signal/risk dan dashboard; owner tidak memproses laporan stok harian sebagai tugas operasional utama.

### Inventory Module

- Status: `IMPLEMENTED`
- Route: `frontend/app/manager/inventory/page.tsx`, `frontend/app/staff/stock-check/page.tsx`
- File utama: `frontend/app/components/manager/inventory/*`, `frontend/lib/services/inventory/inventoryBatchService.ts`
- Tabel: `inventory_items`, `inventory_batches`, `inventory_batch_movements`, `recipes`, `recipe_ingredients`, `product_variant_recipe_adjustments`, `stock_reports`, `kitchen_station_batches`, `kitchen_station_movements`, `kitchen_station_shift_counts`, `usage_transactions`, `usage_transaction_details`
- Batasan: Bahan bulk/opened ingredient dicatat secara operasional, bukan audit gram/kg ketat.

### Reward Module

- Status: `IMPLEMENTED`
- Route: owner melalui dashboard/customer discount section, `frontend/app/customer/rewards/page.tsx`
- File utama: `frontend/app/components/owner/business-dashboard/tabs/StandardDashboardPanels.tsx`, `frontend/app/customer/rewards/page.tsx`
- Tabel: `rewards`, `customer_reward_redemptions`, `customer_point_transactions`, `customers`, `orders`
- Batasan: reward management utama berada pada owner. Manager reward management/request tidak diimplementasikan. Reward bundling tidak boleh diklaim.

### Bookkeeping Module

- Status: `IMPLEMENTED`
- Route: `frontend/app/owner/bookkeeping/page.tsx`, `frontend/app/manager/closing/page.tsx`, `frontend/app/staff/attendance/page.tsx`
- API: `frontend/app/api/owner/bookkeeping/*`, `frontend/app/api/manager/closing/operations/route.ts`, `frontend/app/api/staff/bookkeeping/shift-closing/route.ts`
- Tabel: `bookkeeping_entries`, `bookkeeping_exceptions`, `bookkeeping_expenses`, `bookkeeping_shift_closings`, `bookkeeping_daily_closings`, `bookkeeping_reports`, `bookkeeping_financial_settings`, `orders`, `usage_transactions`, `activity_logs`
- Batasan: bukan sistem akuntansi formal.

### Activity Log Module

- Status: `IMPLEMENTED`
- Route: `frontend/app/owner/activitylog/page.tsx`
- File utama: `frontend/app/components/owner/activitylog/*`, `frontend/lib/services/activity/activityLogger.ts`
- Tabel: `activity_logs`
- Fitur: audit aktivitas, filter, detail log, statistik, export Excel, export PDF.
- Batasan: Activity Log dan Export Activity Log menggantikan archive sebagai scope final.

### AI Insight Module

- Status: `IMPLEMENTED`
- Route/API: `frontend/app/api/owner/recommendations/route.ts`, `frontend/app/api/owner/recommendations/generate/route.ts`
- File utama: `frontend/lib/services/owner-insights/*`, `frontend/app/components/owner/business-dashboard/ai/*`
- Tabel/storage: service owner insights menyimpan/mengambil rekomendasi owner; gunakan `owner_ai_recommendations` hanya jika tabel itu tersedia di Supabase project final.
- Batasan: AI menyusun ringkasan dari structured snapshot, bukan menghitung data utama dan bukan pengambil keputusan otomatis.

## 5. Reward Source of Truth

Kondisi final reward:

- Owner membuat dan mengelola reward/customer discount melalui komponen owner dashboard.
- Customer dapat melihat dan redeem reward melalui halaman customer rewards.
- Reward memakai poin melalui `points_required` dan transaksi poin customer.
- Reward dapat berbentuk discount/free benefit sesuai kolom reward yang tersedia.
- Manager tidak memiliki route final untuk mengelola reward.
- Manager reward request tidak ditemukan sebagai fitur final, sehingga tidak boleh diklaim.
- Menu bundle ada di kode (`menu_bundles`, `menu_bundle_items`) sebagai bundle menu/fixed price yang tampil pada customer menu jika aktif.
- Reward bundling tidak diimplementasikan sebagai fitur reward/poin dan tidak boleh diklaim.

Kalimat wajib:

`Reward bundling is not implemented and must not be claimed in the thesis.`

`Manager reward request is not implemented and must not be claimed in the thesis.`

## 6. Inventory dan Stock Reports Source of Truth

Inventory memakai `inventory_items`, `inventory_batches`, `inventory_batch_movements`, `usage_transactions`, `usage_transaction_details`, recipe, dan kitchen station.

`inventory_items.station_scope`:

- `barista`
- `kitchen`
- `shared`

Hak lihat operasional:

- kitchen melihat item `kitchen` dan `shared`,
- barista melihat item `barista` dan `shared`,
- manager/owner melihat semua.

`stock_reports.report_type` yang dipakai:

- `low_stock`
- `out_of_stock`
- `waste_damaged`
- `restock_request`
- `testing_usage`

`stock_reports.status` yang dipakai:

- `pending`
- `resolved`
- `rejected`

Alur:

1. Staff kitchen/barista membuat report dari Stock Check.
2. Manager meninjau dan menindaklanjuti Stock Reports.
3. Owner melihat sinyal inventory risk dari dashboard/notification.

Jangan menulis status `approved` untuk `stock_reports` jika tidak ada di database final.

## 7. Attendance / Presensi Source of Truth

Presensi adalah fitur utama operasional staff.

Rantai alur:

1. Owner/manager mengelola staff dan shift.
2. Sistem menyimpan jadwal weekly/daily assignment.
3. Sistem memakai setting toko dan data shift untuk validasi presensi.
4. Staff melakukan clock in/clock out dari halaman attendance.
5. Sistem menilai status seperti late berdasarkan setting/jadwal.
6. Manager memantau rekap presensi.
7. Staff cashier dapat mengirim shift closing/cash count pada end-shift jika diwajibkan.

Tabel terkait:

- `staff`
- `shifts`
- `attendance`
- `presence_code`
- `presensi_shift`
- `store_settings`
- `staff_shift_weekly_assignments`
- `staff_shift_daily_assignments`
- `bookkeeping_shift_closings`

`attendance_requests` tidak diklaim karena belum ditemukan sebagai bagian UI final.

## 8. Owner Dashboard Source of Truth

Owner Dashboard terdiri dari:

- Overview
- Sales
- Customer
- Inventory
- Staff
- Operations

Fitur owner lain:

- Bookkeeping
- Reports
- Reward Management
- Activity Log
- Export Activity Log
- AI Insight
- Staff Manager

Jangan menulis Archive sebagai fitur final.

## 9. AI Insight Source of Truth

Cara kerja AI Insight:

1. Sistem mengambil data dari database.
2. Sistem menghitung indikator.
3. Sistem membuat structured snapshot.
4. AI menyusun ringkasan dari snapshot.
5. Sistem menampilkan insight kepada owner.

Tegaskan:

- AI tidak menghitung data utama.
- AI tidak mengambil keputusan.
- AI tidak boleh membuat klaim di luar data.
- AI bukan fokus utama penelitian.
- AI Insight hanya mendukung owner dalam membaca kondisi bisnis.

File/API terkait:

- `frontend/lib/services/owner-insights/*`
- `frontend/app/api/owner/recommendations/route.ts`
- `frontend/app/api/owner/recommendations/generate/route.ts`
- `frontend/app/components/owner/business-dashboard/ai/*`

## 10. Database Source of Truth

| Kelompok | Tabel | Fungsi | ERD |
|---|---|---|---|
| User & Access | `staff` | user internal owner/manager/staff, role, passcode | utama |
| User & Access | `customers` | akun customer, kontak, poin | utama |
| User & Access | `activity_logs` | audit aktivitas sistem | utama |
| Sales & Orders | `orders` | header transaksi/order | utama |
| Sales & Orders | `order_items` | detail item order | utama |
| Sales & Orders | `payment_transactions` | pembayaran order | utama |
| Sales & Orders | `pos_sessions` | sesi POS jika tersedia di database final | lampiran/opsional |
| Menu & Variants | `categories` | kategori menu | utama |
| Menu & Variants | `products` | data menu/product | utama |
| Menu & Variants | `variant_groups` | grup varian | utama |
| Menu & Variants | `variant_options` | pilihan varian | utama |
| Menu & Variants | `product_variant_groups` | relasi product-varian | utama |
| Menu & Variants | `menu_bundles` | bundle menu fixed price jika aktif | utama jika dibahas |
| Menu & Variants | `menu_bundle_items` | item penyusun bundle menu | utama jika dibahas |
| Table Management | `floors` | area/floor meja | utama |
| Table Management | `tables` | data meja dan QR token | utama |
| Table Management | `table_sessions` | sesi customer per meja | utama |
| Inventory & Recipe | `inventory_items` | master bahan/stok | utama |
| Inventory & Recipe | `inventory_batches` | batch restock | utama |
| Inventory & Recipe | `inventory_batch_movements` | movement batch | utama |
| Inventory & Recipe | `recipes` | recipe menu | utama |
| Inventory & Recipe | `recipe_ingredients` | bahan recipe | utama |
| Inventory & Recipe | `product_variant_recipe_adjustments` | adjustment bahan karena varian | utama |
| Inventory & Recipe | `usage_transactions` | transaksi pemakaian stok | utama |
| Inventory & Recipe | `usage_transaction_details` | detail pemakaian stok | utama |
| Inventory & Recipe | `stock_reports` | laporan stok dari staff | utama |
| Inventory & Recipe | `kitchen_station_batches` | ready/prep stock station | utama |
| Inventory & Recipe | `kitchen_station_movements` | movement station/waste/testing | utama |
| Inventory & Recipe | `kitchen_station_shift_counts` | closing count station | lampiran/utama jika dibahas |
| Attendance | `shifts` | master shift | utama |
| Attendance | `presence_code` | kode presensi | utama jika dipakai UI final |
| Attendance | `presensi_shift` | presensi kode legacy/operasional | lampiran |
| Attendance | `attendance` | clock in/out staff | utama |
| Attendance | `staff_shift_weekly_assignments` | jadwal mingguan | utama |
| Attendance | `staff_shift_daily_assignments` | jadwal harian | utama |
| Reward | `rewards` | reward/diskon customer | utama |
| Reward | `customer_point_transactions` | transaksi poin customer | utama |
| Reward | `customer_reward_redemptions` | redeem reward | utama |
| Reward | `reward_settings` | setting reward jika tersedia di database final | lampiran/opsional |
| Bookkeeping | `bookkeeping_entries` | ledger operasional | utama |
| Bookkeeping | `bookkeeping_exceptions` | exception review | utama |
| Bookkeeping | `bookkeeping_expenses` | biaya operasional | utama |
| Bookkeeping | `bookkeeping_shift_closings` | closing shift | utama |
| Bookkeeping | `bookkeeping_daily_closings` | closing harian owner | utama |
| Bookkeeping | `bookkeeping_reports` | report bookkeeping | utama |
| Bookkeeping | `bookkeeping_financial_settings` | setting tax/service/finance | utama jika dibahas |
| AI | `owner_ai_recommendations` | storage rekomendasi AI jika tersedia di database final | lampiran/utama jika dipakai |

Jangan memasukkan tabel palsu ke ERD. Jika tabel tidak ditemukan di kode/database final, tulis sebagai opsional/lampiran atau hapus dari narasi utama.

## 11. Diagram Source of Truth

Activity diagram final BAB III:

1. Activity Diagram QR Ordering Customer
   - Scan QR, validasi meja, mulai table session, lihat menu, pilih varian, cart, checkout, QRIS, tracking.
2. Activity Diagram Order Fulfillment Staff
   - Cashier POS, order masuk, kitchen/barista queue, update ready/served, waiter serving flow, payment/order status.
3. Activity Diagram Staff Attendance Management
   - Manager mengelola staff/shift, sistem validasi, staff clock in/out, manager pantau rekap, staff end-shift jika diwajibkan.
4. Activity Diagram Operational Management Manager
   - Menu, inventory, recipe, stock reports, table, order, staff, closing.
   - Tidak memuat reward management langsung.
5. Activity Diagram Business Monitoring Owner
   - Owner Dashboard: Overview, Sales, Customer, Inventory, Staff, Operations.
   - Bookkeeping, Reports, Reward Management, Activity Log Export, AI Insight.

Diagram lain:

- Metode Penelitian
- Alur Sistem Berjalan
- Gambaran Umum Sistem
- Use Case Diagram
- ERD
- Alur AI Insight
- Mockup/Wireframe per aktor

## 12. BAB I Impact

Revisi BAB I:

- Latar belakang fokus pada kebutuhan coffee shop untuk POS web multi-aktor, monitoring operasional, stok, presensi, dan laporan bisnis.
- Rumusan masalah jangan melebar ke akuntansi formal, inventory enterprise, atau AI otomatis.
- Batasan masalah harus menyebut aktor Customer, Staff, Manager, Owner.
- Tujuan penelitian: merancang dan membangun POS berbasis web untuk operasional dan monitoring bisnis coffee shop.
- Manfaat: membantu pemesanan, pembayaran, order fulfillment, manajemen stok operasional, presensi, closing, laporan owner, reward customer, dan insight bisnis.

## 13. BAB II Impact

Subbab BAB II yang relevan:

- Operasional Coffee Shop
- Point of Sale Berbasis Web
- Role-Based Access Control
- Basis Data dan Supabase
- Inventory Management Operasional
- Dashboard dan KPI
- Activity Log dan Audit Trail
- AI-Based Business Insight
- Pengujian Sistem

Jangan menambah subbab yang tidak mendukung fitur final.

## 14. BAB III Impact

Struktur BAB III final:

3.1 Pengumpulan Data

- 3.1.1 Objek Penelitian
- 3.1.2 Teknik Pengumpulan Data
- 3.1.3 Hasil Pengumpulan Data

3.2 Analisis Kebutuhan Sistem

- 3.2.1 Analisis Sistem Berjalan
- 3.2.2 Analisis Permasalahan
- 3.2.3 Analisis Kebutuhan Berdasarkan Aktor
- 3.2.4 Kebutuhan Fungsional
- 3.2.5 Kebutuhan Non-Fungsional

3.3 Perancangan Sistem

- 3.3.1 Gambaran Umum Sistem
- 3.3.2 Perancangan Hak Akses Pengguna
- 3.3.3 Use Case Diagram
- 3.3.4 Activity Diagram
- 3.3.5 Perancangan Database
- 3.3.6 Perancangan AI Insight
- 3.3.7 Perancangan Mockup Antarmuka

3.4 Tahapan Iterasi Pengembangan Sistem

## 15. BAB IV Impact

Struktur BAB IV final berbasis aktor:

4.1 Hasil Implementasi Sistem

4.2 Implementasi Sistem pada Customer

- QR Ordering
- Menu Digital
- Cart dan Checkout
- QRIS display/confirmation
- Order Tracking
- Customer Reward Access

4.3 Implementasi Sistem pada Staff

- POS Cashier
- Order Fulfillment
- Kitchen dan Barista Queue
- Serving Flow Waiter
- Presensi Staff
- Stock Check dan Stock Reports

4.4 Implementasi Sistem pada Manager

- Menu dan Category Management
- Table Management
- Inventory dan Recipe Management
- Stock Reports
- Staff, Shift, dan Presensi Management
- Order Monitoring dan Correction Review
- Closing Operasional

Tidak menulis Manager Dashboard, Reward Request, atau Manager Bookkeeping Page.

4.5 Implementasi Sistem pada Owner

- Owner Dashboard
- Overview
- Sales Analytics
- Customer Analytics
- Inventory Analytics
- Staff Analytics
- Operations Analytics
- Bookkeeping dan Reports
- Reward Management
- Activity Log dan Export Activity Log
- AI Insight

4.6 Pembahasan Hasil Implementasi

4.7 Pengujian Sistem

4.8 Ringkasan Hasil Pengujian

## 16. Terminology Rules

- Naskah skripsi menggunakan bahasa Indonesia.
- Nama fitur aplikasi boleh bahasa Inggris.
- Istilah asing dicetak miring jika diperlukan.
- Status database ditulis sesuai kode.
- Nama tabel ditulis sesuai database.
- Jangan menerjemahkan status sistem seperti `pending`, `resolved`, `completed`, `served`, `cancelled`, `critical`, dan `warning`.
- Gunakan istilah Point of Sale atau POS.
- Jangan gunakan istilah Point of Sales.

## 17. Things That Must Not Be Claimed

- Sistem akuntansi formal.
- Sistem inventory enterprise.
- AI mengambil keputusan otomatis.
- AI langsung query database bebas tanpa guardrails sebagai fokus skripsi.
- Manager mengelola reward langsung.
- Manager reward request.
- Reward bundling.
- Archive sebagai fitur final.
- Staff kitchen/barista mengubah stok utama langsung.
- Payment gateway langsung jika hanya mencatat metode pembayaran atau menampilkan QRIS.
- Mobile push notification.
- Customer melihat detail internal stok dapur.

## 18. Final Checklist

- [ ] Apakah semua fitur di BAB I ada di kode?
- [ ] Apakah semua teori BAB II relevan dengan fitur?
- [ ] Apakah semua kebutuhan BAB III punya implementasi di BAB IV?
- [ ] Apakah semua activity diagram sesuai alur sistem?
- [ ] Apakah ERD tidak memuat tabel palsu?
- [ ] Apakah reward tidak salah otoritas?
- [ ] Apakah archive sudah dikeluarkan dari scope?
- [ ] Apakah Export Activity Log sudah menggantikan archive?
- [ ] Apakah AI Insight tidak dilebih-lebihkan?
- [ ] Apakah manager hanya memiliki Menu, Inventory, Closing, Order, Staff, dan Table?
- [ ] Apakah staff dashboard tidak ditulis sebagai fitur final?

## Ringkasan Audit

### Confirmed Implemented

- Customer QR Ordering, menu digital, cart, checkout, order tracking, customer rewards.
- Staff POS, order board, kitchen/barista queue, Stock Check, Stock Reports, attendance, shift closing.
- Manager Menu, Inventory, Closing, Order, Staff, Table.
- Owner Dashboard, Bookkeeping, Reports, Reward Management, Activity Log, Export Activity Log, AI Insight.

### Partial / Planned

- `pos_sessions`, `reward_settings`, `attendance_requests`, dan `owner_ai_recommendations` hanya boleh ditulis jika benar-benar tersedia pada database final. Jika tidak, jadikan lampiran/opsional atau hapus dari narasi utama.
- AI chatbot bebas query database tidak menjadi fokus skripsi.

### Harus Dikeluarkan dari Skripsi

- Archive.
- Manager Dashboard.
- Manager Reward Management.
- Manager Reward Request.
- Manager Bookkeeping Page.
- Staff Dashboard.
- Reward Bundling.
- Payment gateway otomatis.
- Sistem akuntansi formal.
- Inventory enterprise.

### Perubahan Wajib BAB I-IV

- BAB I harus fokus pada POS web coffee shop multi-aktor.
- BAB II hanya memuat teori yang mendukung scope final.
- BAB III harus memakai activity diagram final yang sesuai aktor dan alur.
- BAB IV harus ditulis berbasis aktor dan tidak memasukkan fitur deprecated.

### Pertanyaan yang Masih Perlu Dijawab

- Apakah tabel `owner_ai_recommendations` benar ada di Supabase final?
- Apakah tabel `pos_sessions`, `reward_settings`, dan `attendance_requests` ada dan dipakai UI final?
- Apakah menu bundle ingin dibahas sebagai fitur menu/promosi owner, atau dikeluarkan agar reward tidak melebar?
- Apakah judul skripsi final sudah ditetapkan persis seperti bagian 1, atau masih perlu disesuaikan dengan judul kampus?
