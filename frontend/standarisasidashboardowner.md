Berikut versi **Markdown siap copy-paste**:

````md
# Standarisasi Chart Owner Dashboard IZA POS

## Tujuan Standarisasi

Standarisasi chart ini dibuat agar dashboard owner tidak hanya menampilkan grafik, tetapi juga membantu owner mengambil keputusan bisnis secara cepat dan jelas.

Setiap kategori chart harus menjawab empat hal utama:

1. Apa yang sedang terjadi?
2. Kenapa hal itu terjadi?
3. Bagian mana yang perlu diperhatikan?
4. Keputusan apa yang bisa diambil oleh owner?

Struktur dashboard owner difokuskan pada lima kategori utama:

1. Overview
2. Sales
3. Inventory
4. Staff
5. Operation

Payment tidak dibuat sebagai tab terpisah karena lebih tepat digabungkan ke Overview, Sales, atau Operation. Promotion dan Reward juga tidak dibuat sebagai tab terpisah karena sudah masuk ke konteks Customer atau Loyalty.

---

# Palette Warna Chart

Chart menggunakan warna utama berikut:

| Warna | HEX | Fungsi |
|---|---:|---|
| Soft Sky Blue | `#A0D7FD` | Informasi, order baru, customer, QR order |
| Indigo Blue | `#4C46DA` | Data utama, revenue, proses, performa utama |
| Soft Yellow | `#FCD34D` | Pending, waiting, unpaid, perhatian ringan |
| Soft Green | `#86EFAC` | Success, paid, completed, growth |
| Soft Rose | `#FDA4AF` | Failed, cancelled, late, risiko, loss |

Urutan warna untuk chart multi-series:

```ts
[
  "#4C46DA",
  "#A0D7FD",
  "#86EFAC",
  "#FCD34D",
  "#FDA4AF"
]
````

---

# Ringkasan Chart per Kategori

| Tab       | Masalah Utama                  | Solusi Chart Utama   | Chart Pendukung                                               | Library Direkomendasikan           |
| --------- | ------------------------------ | -------------------- | ------------------------------------------------------------- | ---------------------------------- |
| Overview  | Pantau kesehatan bisnis cepat  | Area Chart Revenue   | KPI Cards, Donut Order Status, Mini Donut Payment Method      | Recharts + shadcn/ui               |
| Sales     | Menu viral vs menu profit      | Scatter Plot Kuadran | Top Menu Bar Chart, Revenue Category Bar, Profitability Table | Recharts + TanStack Table          |
| Inventory | Susu/kopi mendadak habis       | Dynamic Progress Bar | Low Stock Table, Usage Trend Bar, Stock Movement Line         | Tailwind CSS + Recharts + Supabase |
| Staff     | Performa barista tidak adil    | Radar Chart          | Productivity Bar, Attendance Trend, Performance Table         | ApexCharts / Recharts              |
| Operation | Antrean numpuk di jam tertentu | Heatmap Hari vs Jam  | Order Flow Funnel, Service Time Line, Peak Hour Bar           | ApexCharts + Recharts              |

---

# 1. Overview

## Fokus

Overview digunakan untuk melihat kesehatan bisnis secara cepat.

Owner tidak perlu melakukan analisis terlalu detail di halaman ini. Tujuan utamanya adalah memberikan gambaran besar mengenai kondisi bisnis hari ini, minggu ini, atau bulan ini.

Overview harus menjawab pertanyaan:

* Apakah bisnis sedang sehat?
* Apakah revenue naik atau turun?
* Apakah order sedang ramai atau sepi?
* Apakah ada order cancelled?
* Metode pembayaran apa yang paling sering digunakan?

## Chart dan Komponen yang Ditampilkan

| Komponen                  | Fungsi                                       |
| ------------------------- | -------------------------------------------- |
| KPI Cards                 | Menampilkan ringkasan angka utama            |
| Revenue Area Chart        | Menampilkan tren pendapatan                  |
| Order Status Donut Chart  | Menampilkan komposisi status order           |
| Payment Method Mini Donut | Menampilkan metode pembayaran paling dominan |
| Insight Summary           | Menampilkan kesimpulan singkat dari data     |

## KPI yang Ditampilkan

* Total Revenue
* Total Orders
* Average Order Value
* Completed Orders
* Cancelled Orders
* Most Used Payment Method


## Catatan

Payment tidak perlu menjadi tab sendiri. Pada Overview, payment cukup ditampilkan sebagai ringkasan kecil seperti metode pembayaran paling sering digunakan.

---

# 2. Sales

## Fokus

Sales digunakan untuk melihat performa menu dari sisi penjualan dan keuntungan.

Tab ini tidak hanya menjawab menu mana yang paling laku, tetapi juga menu mana yang paling menguntungkan.

Sales harus menjawab pertanyaan:

* Menu mana yang paling laku?
* Menu mana yang paling menguntungkan?
* Menu mana yang laku tetapi marginnya kecil?
* Menu mana yang jarang dibeli tetapi profitnya tinggi?
* Menu mana yang perlu dievaluasi?

## Chart dan Komponen yang Ditampilkan

| Komponen                      | Fungsi                                           |
| ----------------------------- | ------------------------------------------------ |
| Scatter Plot Kuadran Menu     | Membandingkan jumlah penjualan dan profit margin |
| Top Selling Menu Bar Chart    | Menampilkan menu paling laku                     |
| Revenue by Category Bar Chart | Menampilkan kategori menu paling menghasilkan    |
| Profitability Table           | Menampilkan detail performa tiap menu            |

## Scatter Plot Kuadran

Scatter Plot Kuadran digunakan untuk melihat posisi menu berdasarkan jumlah penjualan dan profit margin.

| Kuadran                  | Makna                    |
| ------------------------ | ------------------------ |
| High Sales + High Profit | Star Menu                |
| High Sales + Low Profit  | Laku tetapi margin kecil |
| Low Sales + High Profit  | Hidden Gem               |
| Low Sales + Low Profit   | Kandidat evaluasi        |

## Data yang Ditampilkan pada Profitability Table

* Menu Name
* Category
* Total Sold
* Revenue
* Estimated Cost
* Gross Profit
* Profit Margin
* Recommendation Status

## Rekomendasi Label

| Label            | Makna                                           |
| ---------------- | ----------------------------------------------- |
| Star Menu        | Menu paling ideal karena laku dan menguntungkan |
| Review Cost      | Menu laku tetapi margin kecil                   |
| Promote          | Menu profit tinggi tetapi penjualan rendah      |
| Remove Candidate | Menu kurang laku dan kurang menguntungkan       |


---

# 3. Inventory

## Fokus

Inventory digunakan untuk mencegah bahan baku habis mendadak.

Tab ini membantu owner dan manager melihat kondisi stok secara cepat, terutama bahan yang sering digunakan seperti susu, kopi, gula, cup, dan bahan baku utama lainnya.

Inventory harus menjawab pertanyaan:

* Bahan apa yang hampir habis?
* Bahan apa yang paling cepat terpakai?
* Berapa hari lagi stok akan habis?
* Bahan apa yang harus segera direstock?
* Apakah stok habis karena penjualan tinggi atau pencatatan buruk?

## Chart dan Komponen yang Ditampilkan

| Komponen                    | Fungsi                                       |
| --------------------------- | -------------------------------------------- |
| Dynamic Stock Progress Bar  | Menampilkan persentase stok bahan            |
| Low Stock Alert Table       | Menampilkan bahan yang perlu perhatian       |
| Stock Usage Trend Bar Chart | Menampilkan tren pemakaian bahan             |
| Stock Movement Line Chart   | Menampilkan pergerakan stok masuk dan keluar |

## Data yang Perlu Ditampilkan

* Current Stock
* Minimum Stock
* Usage Rate
* Estimated Days Remaining
* Last Restock Date
* Suggested Restock Quantity

## Insight Penting

Bagian terpenting pada Inventory bukan hanya menampilkan stok saat ini, tetapi juga estimasi kapan stok akan habis.

Contoh insight:

> Stok susu diperkirakan habis dalam 2 hari berdasarkan rata-rata penggunaan harian.


---

# 4. Staff

## Fokus

Staff digunakan untuk melihat performa kerja staf secara lebih adil.

Penilaian staf tidak boleh hanya berdasarkan jumlah order yang ditangani, karena staf yang bekerja pada jam ramai tentu akan terlihat lebih produktif dibanding staf yang bekerja pada jam sepi.

Staff harus menjawab pertanyaan:

* Siapa staf yang paling konsisten?
* Siapa staf yang sering terlambat?
* Siapa staf yang banyak menangani order?
* Siapa staf yang sering lembur?
* Siapa staf yang perlu evaluasi?
* Apakah performa staf stabil dari waktu ke waktu?

## Chart dan Komponen yang Ditampilkan

| Komponen                      | Fungsi                                        |
| ----------------------------- | --------------------------------------------- |
| Radar Chart Staff Performance | Membandingkan performa staf dari banyak aspek |
| Staff Productivity Bar Chart  | Menampilkan jumlah order yang ditangani staf  |
| Attendance Trend Line Chart   | Menampilkan tren kehadiran staf               |
| Staff Performance Table       | Menampilkan detail angka performa tiap staf   |

## Dimensi Radar Chart

* Attendance
* Order Handled
* Speed
* Consistency
* Overtime Control
* Reliability

## Data pada Staff Performance Table

* Staff Name
* Role
* Total Orders Handled
* Average Service Time
* Late Count
* Overtime Count
* Attendance Rate
* Performance Score

## Catatan

Radar Chart berguna untuk gambaran cepat, tetapi tetap harus didampingi tabel agar owner bisa melihat angka konkretnya.


---

# 5. Operation

## Fokus

Operation digunakan untuk melihat efisiensi operasional coffee shop.

Tab ini membantu owner mengetahui kapan order paling ramai, di tahap mana proses order tertahan, dan apakah bottleneck terjadi di kasir, kitchen, atau service.

Operation harus menjawab pertanyaan:

* Jam berapa order paling ramai?
* Hari apa paling padat?
* Tahap mana yang membuat order lama?
* Apakah bottleneck terjadi di kitchen, service, atau kasir?
* Berapa lama rata-rata order selesai?

## Chart dan Komponen yang Ditampilkan

| Komponen                        | Fungsi                                           |
| ------------------------------- | ------------------------------------------------ |
| Heatmap Hari vs Jam             | Menampilkan jam dan hari tersibuk                |
| Order Flow Funnel               | Menampilkan alur order dari masuk sampai selesai |
| Average Service Time Line Chart | Menampilkan tren waktu penyelesaian order        |
| Peak Hour Bar Chart             | Menampilkan jam paling ramai                     |

## Order Flow Funnel

Tahapan order yang ditampilkan:

1. New Order
2. Preparing
3. Ready
4. Served
5. Completed

## Metrik yang Ditampilkan

* Average Preparation Time
* Average Serving Time
* Peak Hour
* Slowest Hour
* Order Completion Rate
* Bottleneck Stage

## Contoh Insight

> Sabtu pukul 19:00–21:00 adalah waktu tersibuk, dengan rata-rata service time lebih tinggi dibanding hari lain.

> Order paling banyak tertahan pada tahap Preparing, sehingga bottleneck kemungkinan terjadi di kitchen.


---

# Kesimpulan Akhir

Struktur final chart Owner Dashboard IZA POS terdiri dari lima kategori utama:

1. Overview
2. Sales
3. Inventory
4. Staff
5. Operation

Setiap kategori memiliki tujuan yang berbeda:

| Tab       | Tujuan                                               |
| --------- | ---------------------------------------------------- |
| Overview  | Melihat kesehatan bisnis secara cepat                |
| Sales     | Melihat performa menu dari sisi penjualan dan profit |
| Inventory | Mengontrol stok dan mencegah bahan habis mendadak    |
| Staff     | Menilai performa staf secara lebih adil              |
| Operation | Menemukan jam ramai dan bottleneck operasional       |

Payment tidak dibuat sebagai tab terpisah karena dapat dimasukkan ke:

* Overview untuk ringkasan metode pembayaran dominan
* Sales untuk revenue berdasarkan metode pembayaran jika dibutuhkan
* Operation jika payment pending atau failed memengaruhi alur order

Promotion dan Reward tidak dibuat sebagai tab terpisah karena lebih cocok masuk ke bagian Customer atau Loyalty.

Dengan struktur ini, dashboard owner tidak hanya menampilkan visualisasi data, tetapi juga membantu owner mengambil keputusan operasional dan bisnis secara lebih jelas.

```
```
