# Prompt Pack Untuk AI Skripsi

Gunakan prompt ini saat memberikan dokumen ke AI skripsi.

## Prompt Utama

Saya sedang menyusun skripsi untuk aplikasi IZA POS. Gunakan hanya informasi dari dokumen berikut:

- `fitur-aplikasi-iza-pos.md`
- `erd-iza-pos.puml`
- `activity-diagram-per-aktor.puml`

Jangan menambahkan fitur, tabel, aktor, atau alur yang tidak disebutkan di dokumen. Jika ada bagian yang kurang jelas, tulis sebagai asumsi atau kebutuhan klarifikasi, bukan sebagai fakta.

Tolong bantu saya menyusun:

1. Deskripsi sistem.
2. Identifikasi aktor.
3. Analisis kebutuhan fungsional.
4. Analisis kebutuhan non-fungsional.
5. Narasi ERD.
6. Narasi activity diagram per aktor.
7. Batasan sistem.

Gunakan bahasa formal akademik, tetapi tetap jelas dan tidak berlebihan.

## Aturan Anti-Halusinasi

- Jangan menulis bahwa aplikasi memiliki mobile push notification.
- Jangan menulis bahwa customer mendapat detail internal stok dapur.
- Jangan menulis bahwa semua bahan bulk dihitung otomatis secara presisi gram/kg.
- Jangan menulis bahwa sistem memakai audit inventory restoran modern yang ketat untuk semua bahan.
- Jangan membuat tabel database baru selain yang ada di ERD.
- Jangan membuat aktor baru selain Owner, Manager, Staff, Customer.
- Jika menyebut AI, jelaskan sebagai fitur owner insight/recommendation berbasis snapshot data, bukan sistem keputusan otomatis.
- Jika menyebut QRIS, jelaskan sebagai tampilan/kode pembayaran dan konfirmasi di web, bukan integrasi payment gateway otomatis.
- Jangan menulis fitur archive.
- Jangan menulis manager dashboard, manager reward management, atau manager bookkeeping page. Manager hanya memiliki fitur Menu, Inventory, Closing, Order, Staff, dan Table.
- Jangan menulis staff dashboard. Staff hanya memiliki fitur operasional seperti POS, Order, Kitchen, Stock Check, Attendance, dan Profile.

## Fokus Teknis Yang Harus Disebut

- Next.js App Router sebagai frontend dan API route.
- Supabase sebagai database dan storage.
- Tabel internal user memakai `staff`, sedangkan customer memakai `customers`.
- Order utama memakai `orders`, `order_items`, dan `payment_transactions`.
- Inventory memakai `inventory_items`, `inventory_batches`, `inventory_batch_movements`, `usage_transactions`, dan `usage_transaction_details`.
- Kitchen station memakai `kitchen_station_batches`, `kitchen_station_movements`, dan `stock_reports`.
- Bookkeeping memakai `bookkeeping_entries`, `bookkeeping_exceptions`, `bookkeeping_expenses`, `bookkeeping_shift_closings`, `bookkeeping_daily_closings`, dan `bookkeeping_reports`.
- Table QR memakai `floors`, `tables`, dan `table_sessions`.
- Presensi operasional memakai `attendance`, `presensi_shift`, `presence_code`, `shifts`, `staff_shift_weekly_assignments`, dan `staff_shift_daily_assignments`.
- Koreksi/cancel/refund order memakai `order_corrections` dan dapat terkait dengan `usage_transactions`, `usage_transaction_details`, `bookkeeping_exceptions`, dan `activity_logs`.
- Activity log memakai `activity_logs` dengan field audit seperti `user_id`, `user_name`, `user_role`, `action`, `action_category`, `action_description`, `resource_type`, `resource_id`, `resource_name`, `severity`, `tags`, dan `changes_summary`.
- Upload profile, foto menu, receipt restock, dan receipt expense menggunakan Supabase storage melalui API upload terkait.

## Output Yang Diinginkan

Tulis dengan struktur bab skripsi:

- Gambaran Umum Sistem
- Aktor Sistem
- Kebutuhan Fungsional
- Kebutuhan Non-Fungsional
- Perancangan Basis Data
- Perancangan Proses Bisnis
- Batasan Sistem

Jika menjelaskan fitur, selalu sertakan:

- Aktor pengguna
- Tujuan fitur
- Data/tabel yang terlibat
- Alur singkat
- Output yang dihasilkan

Tambahkan juga bagian ringkas tentang:

- Alur login dan role guard per aktor.
- Alur table QR customer dari token sampai `table_sessions`.
- Alur stok dari restock batch, kitchen station, POS deduction, stock report, sampai usage history.
- Alur owner bookkeeping dari transaksi, expense, correction, shift closing, daily closing, dan report.
- Alur manager closing dari opening cash, expense operasional, status shift closing, approve, dan recheck.
- Alur owner insight AI dari snapshot data sampai rekomendasi owner.
