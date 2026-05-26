# Bookkeeping User Flow Guide

Dokumen ini menjelaskan cara kerja fitur `Bookkeeping` dari sudut pandang operasional bisnis. Tujuannya supaya owner, manager, dan developer memahami apa yang terjadi di setiap tab, kapan tombol dipakai, dan siapa yang bertanggung jawab terhadap data pembukuan.

## Konsep Utama

Bookkeeping adalah pembukuan otomatis. Owner tidak membuat laporan dari nol. Sistem membaca data operasional yang sudah ada, lalu mengubahnya menjadi ringkasan keuangan.

Sumber data utamanya:

- `orders`: sumber penjualan, diskon, payment method, dan cancellation.
- `order_items`: sumber menu yang terjual.
- `recipes`: resep menu untuk menghitung bahan yang dipakai.
- `recipe_ingredients`: jumlah bahan per menu.
- `inventory_items`: harga modal bahan.
- `usage_transactions`: pemakaian atau pergerakan stok.
- `usage_transaction_details`: detail bahan yang dipakai.
- `bookkeeping_expenses`: biaya operasional manual.
- `bookkeeping_entries`: ledger/jurnal otomatis.
- `bookkeeping_shift_closings`: closing per shift.
- `bookkeeping_daily_closings`: closing final harian.
- `bookkeeping_exceptions`: daftar masalah yang perlu dicek.
- `bookkeeping_reports`: snapshot laporan.

Bookkeeping tidak menggantikan POS. POS tetap tempat transaksi terjadi. Bookkeeping membaca hasil transaksi tersebut.

## Siapa Saja Yang Terlibat

### Owner

Owner adalah pihak yang bertanggung jawab atas pembukuan final.

Owner melakukan:

- melihat ringkasan keuangan harian atau periode tertentu
- generate ledger
- review exception
- close daily closing
- reopen daily closing jika ada koreksi
- generate report
- export laporan

Owner sebaiknya tidak mengubah transaksi operasional secara langsung dari bookkeeping. Jika ada koreksi, sistem idealnya membuat adjustment atau exception note.

### Manager

Manager membantu memastikan data operasional siap untuk dibukukan.

Manager biasanya melakukan:

- memastikan order sudah benar
- memastikan payment method benar
- memastikan shift berjalan sesuai jadwal
- menghitung cash per shift
- mengisi cash counted per shift jika diberi akses
- memperbaiki data recipe/inventory cost jika ada exception
- menginput expense operasional jika diberi izin

Manager tidak menjadi approver final daily closing kecuali bisnis memang memberi wewenang.

### Staff / Cashier

Staff dan cashier adalah sumber data operasional.

Mereka terlibat melalui:

- membuat order di POS
- menerima pembayaran
- memilih payment method
- menyelesaikan order
- melakukan cancellation jika ada
- menjalankan shift

Staff tidak perlu melihat halaman bookkeeping owner.

### Kitchen / Barista

Kitchen dan barista tidak langsung melakukan bookkeeping, tetapi aktivitas mereka memengaruhi data.

Contohnya:

- order item selesai dibuat
- item served
- stok terpakai dari recipe
- ada menu yang sering dibuat tetapi recipe belum lengkap

Jika recipe atau cost bahan tidak lengkap, halaman bookkeeping akan menampilkan exception.

### Sistem

Sistem melakukan sebagian besar pekerjaan otomatis.

Sistem bertugas:

- menghitung gross sales
- menghitung discount
- menghitung net sales
- menghitung payment breakdown
- menghitung cash expected
- menghitung estimated COGS
- menghitung gross profit
- membaca operating expense
- membuat ledger otomatis
- membuat shift closing draft
- membuat daily closing snapshot
- membuat exception
- membuat report snapshot

## Alur Besar Dari Order Sampai Report

Alur normal satu hari:

1. Staff/cashier membuat order di POS.
2. Customer membayar dengan Cash, QRIS, Card, atau metode lain.
3. Order selesai atau dibatalkan.
4. Sistem membaca order untuk menghitung sales.
5. Sistem membaca order item untuk melihat menu yang terjual.
6. Sistem membaca recipe dan inventory cost untuk menghitung COGS.
7. Manager/owner menambahkan expense jika ada biaya operasional.
8. Owner membuka Bookkeeping.
9. Owner mengecek Overview.
10. Owner klik Generate Ledger.
11. Owner mengecek Exceptions.
12. Owner klik Generate Shift Closing.
13. Manager/owner mengisi cash counted per shift.
14. Owner menutup Daily Closing.
15. Owner generate Report.

Flow singkatnya:

```text
Order -> Payment -> Recipe/Inventory Usage -> Expense -> Ledger -> Exception Review -> Shift Closing -> Daily Closing -> Report
```

## Date Range

Date range menentukan data apa yang dibaca.

Contoh:

- `Today`: hanya membaca transaksi hari ini.
- `Yesterday`: hanya membaca transaksi kemarin.
- `Last 7 Days`: membaca transaksi 7 hari terakhir.
- `Last 30 Days`: membaca transaksi 30 hari terakhir.
- Custom date: membaca tanggal sesuai input.

Semua tab memakai date range yang sama. Jika owner memilih `Today`, maka Overview, Ledger, Cost & Margin, Expense, Exception, Closing, dan Report membaca periode hari ini.

## Tab Overview

Overview adalah halaman ringkasan hasil keuangan.

Owner membaca:

- `Gross Sales`: total nilai order sebelum diskon.
- `Discounts`: total potongan harga.
- `Net Sales`: sales valid setelah diskon.
- `Estimated COGS`: perkiraan modal bahan dari recipe dan inventory cost.
- `Gross Profit`: net sales dikurangi estimated COGS.
- `Operating Expenses`: biaya operasional manual.
- `Cash Expected`: uang tunai yang seharusnya ada dari order cash.
- `Exceptions`: jumlah masalah yang perlu dicek.

Contoh:

```text
Gross Sales: Rp 140.000
Discounts: Rp 5.000
Net Sales: Rp 135.000
Estimated COGS: Rp 18.950
Gross Profit: Rp 116.050
Cash Expected: Rp 65.000
```

Artinya:

- bisnis menjual total Rp 140.000 sebelum diskon
- diskon Rp 5.000
- uang penjualan valid Rp 135.000
- perkiraan modal bahan Rp 18.950
- profit kotor sekitar Rp 116.050
- cash fisik yang harus dicek kasir Rp 65.000

Payment Method Breakdown menjawab:

```text
Berapa uang masuk lewat Cash?
Berapa lewat QRIS?
Berapa lewat Card?
```

## Tab Auto Ledger

Auto Ledger adalah jurnal otomatis.

Tab ini menjawab:

```text
Gerakan keuangan apa saja yang terjadi dalam periode ini?
```

Jenis ledger:

- `Sales Income`: uang masuk dari order valid.
- `Discount Cost`: nilai diskon yang mengurangi revenue.
- `COGS Estimate`: perkiraan biaya bahan yang keluar.
- `Operating Expense`: biaya operasional manual.
- `Cancellation Adjustment`: order batal yang perlu dicek.
- `Stock Purchase`: pembelian/restock stok jika sudah dihubungkan.

Tombol `Generate Ledger` menyimpan hasil kalkulasi ledger ke database `bookkeeping_entries`.

Sebelum generate, data yang terlihat bisa berasal dari kalkulasi live. Setelah generate, ledger menjadi record yang bisa diaudit.

Aturan penting:

- Auto ledger tidak diedit langsung.
- Jika ada salah data, perbaiki sumbernya atau buat adjustment.
- Ledger menyimpan sumber data lewat `source_table` dan `source_id`.

## Tab Cost & Margin

Cost & Margin menjawab:

```text
Menu mana yang menguntungkan dan berapa modal bahannya?
```

Kolom penting:

- `Menu Name`: nama menu.
- `Quantity Sold`: jumlah terjual.
- `Revenue`: total penjualan menu.
- `Estimated COGS`: modal bahan.
- `Gross Profit`: revenue dikurangi COGS.
- `Margin`: persentase profit kotor.
- `Status`: apakah data cost siap.

Status:

- `Ready`: recipe dan cost bahan cukup lengkap.
- `Recipe Needed`: menu terjual tetapi belum punya recipe.
- `Cost Data Needed`: recipe ada, tetapi harga bahan belum lengkap.

Jika status bukan `Ready`, owner tidak boleh menganggap profit menu tersebut akurat.

Contoh:

```text
Americano
Revenue: Rp 50.000
Estimated COGS: Rp 2.000
Gross Profit: Rp 48.000
Margin: 96%
Status: Ready
```

Artinya Americano sangat menguntungkan menurut data recipe dan cost yang ada.

## Tab Expenses

Expenses adalah biaya operasional yang tidak otomatis berasal dari order.

Contoh expense:

- packaging
- listrik
- air
- sewa
- transport
- cleaning supplies
- gaji harian
- perbaikan alat
- biaya lain

Expense masuk ke:

- Operating Expenses di Overview
- Auto Ledger sebagai `Operating Expense`
- Report

Expense bisa memiliki receipt upload jika bucket storage sudah aktif.

Expense berbeda dengan COGS:

- COGS adalah biaya bahan per menu.
- Expense adalah biaya operasional umum.

Contoh:

```text
Packaging Rp 18.000
```

Ini bukan modal bahan menu tertentu, tetapi biaya operasional hari itu.

## Tab Exceptions

Exceptions adalah daftar masalah yang menghambat pembukuan bersih.

Tab ini menjawab:

```text
Apa yang harus dicek sebelum closing?
```

Contoh exception:

- cancelled order masih punya nilai
- order paid tidak punya payment method
- menu terjual belum punya recipe
- ingredient belum punya cost
- cash counted tidak cocok
- shift closing belum submitted

Status exception:

- `Open`: belum dibereskan.
- `Acknowledged`: owner/manager sudah sadar masalahnya, tetapi belum dianggap selesai.
- `Resolved`: sudah selesai.

Contoh:

```text
Cancelled Order With Value
Order BKD-0525-03 punya nilai dan perlu dicek.
```

Artinya ada order batal, tetapi totalnya masih ada. Owner harus memastikan apakah:

- ini benar batal tanpa refund
- refund sudah dilakukan
- perlu adjustment
- order seharusnya tidak cancelled

Daily closing sebaiknya tidak `Closed` jika masih ada exception `Open`.

## Tab Closings

Closings punya dua bagian:

- Shift Closing
- Daily Closing

### Shift Closing

Shift Closing adalah penutupan kas per shift.

Tujuannya:

```text
Memastikan uang cash per shift cocok dengan transaksi cash.
```

Data yang dihitung:

- gross sales shift
- discount shift
- net sales shift
- cash expected
- cash counted
- cash difference
- non-cash sales
- cancelled count

Flow:

1. Owner klik `Generate Shift Closing`.
2. Sistem membaca order dalam date range.
3. Sistem mencocokkan jam order dengan jam shift.
4. Sistem membuat draft shift closing.
5. Manager/owner menghitung cash fisik.
6. Manager/owner input `Cash Counted`.
7. Sistem menghitung `Cash Difference`.

Status:

- `Draft`: belum dihitung cash.
- `Needs Review`: ada selisih atau butuh review.
- `Submitted`: cash count sudah disimpan.
- `Closed`: sudah dikunci.
- `Reopened`: dibuka ulang.

Jika muncul:

```text
0 created, 0 updated, 0 protected
```

Kemungkinan:

- order tidak masuk jam shift aktif
- belum ada shift aktif
- data shift tidak cocok dengan jam order
- closing sebelumnya sudah tersimpan dan tidak perlu dibuat ulang
- date range tidak berisi order valid

### Daily Closing

Daily Closing adalah penutupan final harian oleh owner.

Daily closing menjawab:

```text
Apakah hari ini sudah aman untuk dikunci sebagai hasil pembukuan?
```

Daily closing harus mengecek:

- shift closing sudah submitted/closed
- cash counted sudah diisi
- cash counted sama dengan cash expected
- exception terbuka sudah selesai
- owner sudah yakin dengan hasilnya

Status:

- `Draft`: belum final.
- `Needs Review`: ada hal yang belum beres.
- `Closed`: pembukuan hari itu sudah dikunci.
- `Reopened`: pernah ditutup lalu dibuka ulang.

Rule sehat:

```text
Cash Expected Rp 65.000
Cash Counted Rp 0
```

Tidak boleh langsung dianggap `Closed` bersih. Harus menjadi `Needs Review` sampai cash counted benar.

## Tab Reports

Reports adalah riwayat laporan.

Tombol `Generate Report` membuat snapshot dari kondisi bookkeeping saat itu.

Snapshot berisi:

- summary
- payment breakdown
- ledger entries
- expenses
- cost & margin
- shift closing
- daily closing
- exceptions

Report dipakai untuk:

- arsip owner
- export accounting
- audit
- perbandingan periode

Report detail sebaiknya menampilkan ringkasan manusiawi, bukan raw JSON.

Export yang tersedia:

- CSV
- Excel
- PDF

## Flow Harian Yang Direkomendasikan

### Pagi / Saat Operasional

Staff dan cashier:

1. Input order dengan benar.
2. Pilih payment method yang benar.
3. Selesaikan order saat transaksi selesai.
4. Batalkan order hanya jika memang batal.

Manager:

1. Pastikan staff masuk shift.
2. Pastikan menu available benar.
3. Pastikan inventory dan recipe tidak bermasalah.

### Akhir Shift

Manager atau owner:

1. Buka Bookkeeping.
2. Pilih date range `Today`.
3. Buka `Closings > Shift Closing`.
4. Klik `Generate Shift Closing`.
5. Hitung cash fisik.
6. Input `Cash Counted`.
7. Save.
8. Jika ada selisih, beri note atau cek transaksi.

### Akhir Hari

Owner:

1. Buka `Overview`.
2. Cek Gross Sales, Net Sales, Cash Expected, COGS, Expenses.
3. Buka `Auto Ledger`.
4. Klik `Generate Ledger`.
5. Buka `Exceptions`.
6. Resolve atau acknowledge masalah.
7. Buka `Closings > Daily Closing`.
8. Input cash counted total.
9. Close Daily.
10. Buka `Reports`.
11. Generate Report.
12. Export jika perlu.

## Flow Dengan Dummy Seed

Dummy seed digunakan untuk QA saja.

Seed membuat:

- 2 order completed hari ini
- 1 order cancelled hari ini
- 2 order completed kemarin
- order items dari produk existing
- usage transaksi dari recipe existing
- expense packaging hari ini
- expense utilities kemarin

Cara test:

1. Jalankan `bookkeeping_dummy_seed.sql`.
2. Buka `/owner/bookkeeping`.
3. Pilih `Today` untuk melihat data hari ini.
4. Pilih `Last 7 Days` untuk melihat hari ini + kemarin.
5. Cek `Overview`.
6. Klik `Generate Ledger`.
7. Cek `Auto Ledger`.
8. Cek `Cost & Margin`.
9. Cek `Expenses`.
10. Cek `Exceptions`.
11. Klik `Generate Shift Closing`.
12. Input cash counted.
13. Close Daily.
14. Generate Report.

## Contoh Interpretasi Angka

Jika Overview menunjukkan:

```text
Gross Sales: Rp 140.000
Discounts: Rp 5.000
Net Sales: Rp 135.000
Estimated COGS: Rp 18.950
Gross Profit: Rp 116.050
Cash Expected: Rp 65.000
```

Artinya:

- total transaksi valid sebelum diskon Rp 140.000
- diskon Rp 5.000
- omzet bersih Rp 135.000
- modal bahan sekitar Rp 18.950
- profit kotor sekitar Rp 116.050
- uang cash yang harus ada di kasir Rp 65.000

Jika Expense menunjukkan:

```text
Packaging Rp 18.000
```

Maka net profit estimate kira-kira:

```text
Gross Profit - Operating Expenses
Rp 116.050 - Rp 18.000 = Rp 98.050
```

Jika Exceptions menunjukkan cancelled order:

```text
Cancelled Order With Value
```

Maka owner harus mengecek order tersebut sebelum closing dianggap bersih.

## Data Yang Harus Benar Agar Bookkeeping Akurat

### Order

Order harus punya:

- status benar
- payment status benar
- payment method benar
- total benar
- discount benar
- created_at benar
- completed_at jika selesai

### Menu

Product harus punya:

- nama
- harga
- availability

### Recipe

Menu yang ingin dihitung margin harus punya:

- base recipe
- recipe ingredients
- quantity needed
- inventory item link

### Inventory

Inventory item harus punya:

- nama bahan
- unit
- current stock
- cost per unit

Jika `cost_per_unit` kosong, COGS tidak bisa dipercaya.

### Shift

Shift harus punya:

- shift name
- start time
- end time
- active status

Order akan dicocokkan ke shift berdasarkan jam order.

### Expense

Expense harus punya:

- tanggal
- kategori
- amount
- payment method
- vendor jika ada
- receipt jika ada

## Kapan Data Disebut Final

Data masih draft jika:

- ledger belum generated
- shift cash belum disubmit
- daily closing belum closed
- masih ada exception open
- cash counted belum cocok

Data lebih aman dianggap final jika:

- ledger sudah generated
- semua shift closing submitted/closed
- exception open = 0
- cash difference = 0
- daily closing status = closed
- report sudah generated

## Rekomendasi UI Agar Owner Paham

Setiap tab sebaiknya menjawab satu pertanyaan:

| Tab | Pertanyaan |
| --- | --- |
| Overview | Hari ini hasil bisnis saya berapa? |
| Auto Ledger | Gerakan uang otomatisnya apa saja? |
| Cost & Margin | Menu mana yang untung dan modalnya berapa? |
| Expenses | Biaya operasional apa saja yang keluar? |
| Exceptions | Apa yang harus saya cek sebelum closing? |
| Shift Closing | Cash per shift sudah cocok belum? |
| Daily Closing | Hari ini sudah aman dikunci belum? |
| Reports | Laporan mana yang sudah tersimpan dan bisa diexport? |

## Red Flags

Hal yang harus dianggap bermasalah:

- Cash expected ada, tetapi cash counted 0.
- Daily closing closed padahal exception masih open.
- COGS muncul `Cost Data Needed`, tetapi report profit dianggap akurat.
- Shift closing generated 0 padahal ada order.
- Auto Ledger hanya menampilkan COGS tanpa sales.
- Report detail hanya raw JSON.
- Expense tidak masuk ledger.

## Kesimpulan

Bookkeeping harus dipahami sebagai alur kontrol bisnis:

```text
Transaksi terjadi -> Sistem hitung -> Owner review -> Owner closing -> Report tersimpan
```

Owner tidak perlu input semua angka manual. Owner hanya perlu memastikan data sumber benar, exception diselesaikan, cash cocok, lalu closing dan generate report.

