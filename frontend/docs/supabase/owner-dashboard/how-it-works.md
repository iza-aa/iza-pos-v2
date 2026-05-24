Berikut alur dashboard owner kita sekarang, dari UI sampai AI recommendation.

**Big Picture**
Dashboard owner sekarang bekerja seperti ini:

1. Owner buka `/owner/dashboard`.
2. `OwnerBusinessDashboard` membaca tab aktif dari URL, misalnya `?tab=sales`.
3. Tab aktif render komponen dashboard sesuai kategori: Overview, Sales, Customer, Inventory, Staff, Operations.
4. Setiap tab punya `DateRangeFilter`.
5. Chart/metric di tab membaca data Supabase client-side untuk visual dashboard.
6. Tombol `Generate Recommendation` memanggil API server-side.
7. API membuat snapshot data sesuai tab dan filter tanggal aktif.
8. Snapshot dikirim ke Gemini.
9. Output Gemini divalidasi, dikunci oleh `allowedIssues`, lalu disimpan ke Supabase `owner_ai_recommendations`.
10. AI card membaca hasil tersimpan berdasarkan owner, category, dan period key.

**Core Dashboard UI**
[OwnerBusinessDashboard.tsx](/d:/iza-pos-v2/frontend/app/components/owner/business-dashboard/OwnerBusinessDashboard.tsx)

Ini container utama dashboard owner. Tugasnya:
- mengatur sidebar tabset utama
- membaca tab aktif dari URL
- render tab yang sesuai
- menjaga owner dashboard tetap jadi satu command center

[StandardDashboardPanels.tsx](/d:/iza-pos-v2/frontend/app/components/owner/business-dashboard/tabs/StandardDashboardPanels.tsx)

Ini kumpulan tab dashboard utama. Di sini ada:
- `SalesDashboard`
- `InventoryDashboard`
- `StaffDashboard`
- `OperationDashboard`
- export komponen dashboard lain

Fungsinya untuk UI chart, metric card, table, dan layout tiap tab. Data visual dashboard berasal dari hook client-side.

[OverviewTab.tsx](/d:/iza-pos-v2/frontend/app/components/owner/business-dashboard/tabs/OverviewTab.tsx)

Ini tab Overview. Isinya executive summary dashboard:
- revenue
- total orders
- AOV
- completed/cancelled orders
- revenue trend
- AOV trend
- business health summary

[CustomerPerformanceDashboard.tsx](/d:/iza-pos-v2/frontend/app/components/owner/business-dashboard/tabs/customer/CustomerPerformanceDashboard.tsx)

Ini tab Customer Performance. Isinya:
- member orders
- guest orders
- repeat customer rate
- member AOV
- reward usage
- discount cost
- new vs returning customer trend
- loyalty insight summary

[customerLogic.ts](/d:/iza-pos-v2/frontend/app/components/owner/business-dashboard/tabs/customer/customerLogic.ts)

Ini logic bisnis Customer tab client-side. Contoh:
- cara hitung repeat customer
- cara hitung member vs guest AOV
- cara hitung reward usage
- cara build new vs returning trend

**Shared Dashboard Data**
[useOwnerDashboardData.ts](/d:/iza-pos-v2/frontend/app/components/owner/business-dashboard/tabs/shared/useOwnerDashboardData.ts)

Ini hook client-side untuk ambil data dashboard umum dari Supabase:
- orders
- order items
- products
- inventory items
- staff
- attendance
- usage transactions
- usage transaction details

Dipakai oleh beberapa tab seperti Sales, Inventory, Staff, Operations.

[dashboardTypes.ts](/d:/iza-pos-v2/frontend/app/components/owner/business-dashboard/tabs/shared/dashboardTypes.ts)

Ini definisi tipe data untuk dashboard client-side. Misalnya:
- `OrderRow`
- `OrderItemRow`
- `InventoryItemRow`
- `StaffRow`
- `AttendanceRow`
- `UsageTransactionRow`

[dashboardUtils.ts](/d:/iza-pos-v2/frontend/app/components/owner/business-dashboard/tabs/shared/dashboardUtils.ts)

Ini helper umum dashboard:
- format currency
- format number
- date handling
- valid sales order
- business date/hour Jakarta

**Date Filter**
[DateRangeFilter.tsx](/d:/iza-pos-v2/frontend/app/components/shared/DateRangeFilter.tsx)

Ini komponen filter tanggal bersama. Dipakai di tab yang punya chart berbasis periode. Filter ini menentukan:
- today
- yesterday
- last 7 days
- last 30 days
- custom range

Standar sekarang: default filter adalah `Today`. Jika fitur perlu membandingkan atau mendeteksi `Last 7 Days`, gunakan helper `getLast7DateRange()` supaya logic tidak lagi bergantung pada default.

Filter ini juga dikirim ke AI recommendation supaya rekomendasi mengikuti periode aktif.

**Shared UI Standards**
[theme.ts](/d:/iza-pos-v2/frontend/lib/constants/theme.ts)

Ini sumber standar warna UI untuk dashboard dan halaman operasional:
- `OWNER_SEMANTIC_TONES` untuk badge, label, infobox, status, dan signal card.
- `OWNER_CHART_SERIES` untuk warna chart.

[StandardTable.tsx](/d:/iza-pos-v2/frontend/app/components/shared/StandardTable.tsx)

Ini standar table bersama. Table baru atau table yang direvisi sebaiknya memakai komponen ini agar:
- header table konsisten
- zebra row konsisten
- hover row konsisten
- sorting konsisten
- empty state konsisten

[SidebarTabset.tsx](/d:/iza-pos-v2/frontend/app/components/shared/SidebarTabset.tsx)

Ini standar sidebar tabset. Dipakai oleh dashboard owner dan staff manager supaya parent tab dan child tab punya interaksi, spacing, dan warna yang sama.

**AI Card UI**
[GenerateRecommendationPanel.tsx](/d:/iza-pos-v2/frontend/app/components/owner/business-dashboard/ai/GenerateRecommendationPanel.tsx)

Ini wrapper untuk tombol generate AI. Tugasnya:
- menerima `category`
- menerima `period`
- load recommendation tersimpan dari API
- handle generate recommendation
- kirim request ke `/api/owner/recommendations/generate`
- render `AIInsightCarousel`

[AIInsightCarousel.tsx](/d:/iza-pos-v2/frontend/app/components/owner/business-dashboard/ai/AIInsightCarousel.tsx)

Ini tampilan AI Insight Summary card. Tugasnya:
- menampilkan empty state
- loading “Thinking through the business signals...”
- menampilkan problem dan recommendation
- carousel jika insight lebih dari 1
- modal detail berisi supporting data, recommended action, expected impact

**AI API**
[generate/route.ts](/d:/iza-pos-v2/frontend/app/api/owner/recommendations/generate/route.ts)

Ini endpoint generate AI:
`POST /api/owner/recommendations/generate`

Alurnya:
1. validasi user adalah owner
2. validasi category
3. normalisasi period
4. build `periodKey`
5. build snapshot sesuai tab
6. panggil Gemini
7. sanitize hasil Gemini
8. validasi hasil terhadap `allowedIssues`
9. kalau Gemini gagal, pakai deterministic fallback
10. simpan ke `owner_ai_recommendations`
11. catat activity log

[route.ts](/d:/iza-pos-v2/frontend/app/api/owner/recommendations/route.ts)

Ini endpoint baca recommendation:
`GET /api/owner/recommendations?category=sales&startDate=...&endDate=...`

Tugasnya:
- validasi owner
- ambil recommendation tersimpan berdasarkan owner, category, dan period key
- kalau belum ada record, return kosong
- dipakai saat pindah tab atau refresh supaya insight tidak hilang

**AI Snapshot Router**
[snapshotService.ts](/d:/iza-pos-v2/frontend/lib/services/owner-insights/snapshotService.ts)

Ini router utama snapshot AI. Sekarang sudah clean.

Tugasnya:
- membuat Supabase server client pakai `SUPABASE_SERVICE_ROLE_KEY`
- membuat `period_key`
- routing category ke builder yang benar:
  - `overview` ke Overview builder
  - `sales` ke Sales builder
  - `rewards` ke Customer builder
  - `inventory` ke Inventory builder
  - `staff` ke Staff builder
  - `operations` ke Operations builder

**AI Snapshot Builders**
[overviewSnapshotBuilder.ts](/d:/iza-pos-v2/frontend/lib/services/owner-insights/overviewSnapshotBuilder.ts)

Membuat snapshot Overview:
- total revenue
- total orders
- AOV
- completed/cancelled orders
- business health score
- comparison period
- allowed issues untuk Overview

[salesSnapshotBuilder.ts](/d:/iza-pos-v2/frontend/lib/services/owner-insights/salesSnapshotBuilder.ts)

Membuat snapshot Sales:
- revenue
- order volume
- AOV
- top menu
- weak menu
- revenue by category
- allowed issues untuk sales decline, AOV decline, weak menu, category concentration

[customerSnapshotBuilder.ts](/d:/iza-pos-v2/frontend/lib/services/owner-insights/customerSnapshotBuilder.ts)

Membuat snapshot Customer/Loyalty. Secara internal category-nya masih `rewards`, karena tab Customer memakai AI category `rewards`.

Isinya:
- member orders
- guest orders
- member share
- repeat customer rate
- member AOV
- guest AOV
- reward usage
- discount cost
- discount ratio
- allowed issues customer loyalty

[inventorySnapshotBuilder.ts](/d:/iza-pos-v2/frontend/lib/services/owner-insights/inventorySnapshotBuilder.ts)

Membuat snapshot Inventory:
- total SKUs
- critical items
- estimated restock cost
- data issues
- stock in/out value
- movement events
- highest usage item
- low stock table
- stock movement table
- expiry readiness gap

Penting: AI tidak boleh bilang barang expired karena belum ada expiry date data.

[staffSnapshotBuilder.ts](/d:/iza-pos-v2/frontend/lib/services/owner-insights/staffSnapshotBuilder.ts)

Membuat snapshot Staff:
- active staff tanpa owner role
- clocked in
- late count
- overtime count
- orders handled
- average service time
- service sample size
- radar metrics
- productivity
- attendance trend

[operationsSnapshotBuilder.ts](/d:/iza-pos-v2/frontend/lib/services/owner-insights/operationsSnapshotBuilder.ts)

Membuat snapshot Operations:
- total orders
- active orders
- completed orders
- partially served orders
- completion rate
- unpaid orders
- service time
- order flow funnel
- order density heatmap
- active vs completed trend

**Prompt & Guardrails**
[promptService.ts](/d:/iza-pos-v2/frontend/lib/services/owner-insights/promptService.ts)

Ini pembuat prompt Gemini. Tugasnya:
- memberi konteks kategori
- memberi konteks selected period dan comparison period
- memaksa output JSON
- melarang AI membuat angka/fakta sendiri
- memaksa AI memakai `allowedIssues`

[categoryPromptRules.ts](/d:/iza-pos-v2/frontend/lib/services/owner-insights/categoryPromptRules.ts)

Ini aturan khusus per tab. Contoh:
- Overview tidak boleh bicara produk/staff
- Sales tidak boleh menyebut today/yesterday kalau filter bukan single day
- Inventory tidak boleh bicara expiry kalau tidak ada expiry date
- Staff tidak boleh menyalahkan individu dari aggregate metrics
- Operations tidak boleh infer customer satisfaction

[allowedIssueInsightGuards.ts](/d:/iza-pos-v2/frontend/lib/services/owner-insights/allowedIssueInsightGuards.ts)

Ini pagar utama anti-halusinasi. Tugasnya:
- hanya menerima insight yang `id`-nya cocok dengan `allowedIssues`
- mengganti problem/evidence/recommendation AI dengan versi anchored dari snapshot
- membuat deterministic fallback kalau Gemini gagal

Dengan ini, Gemini boleh membantu wording, tapi keputusan masalah tetap dari sistem kita.

[geminiInsightService.ts](/d:/iza-pos-v2/frontend/lib/services/owner-insights/geminiInsightService.ts)

Ini service yang memanggil Gemini. Tugasnya:
- memilih model Gemini
- set temperature rendah
- retry model fallback kalau quota/high demand
- parse JSON output
- repair JSON kalau format rusak
- validasi insight terhadap snapshot

**Storage**
[storageService.ts](/d:/iza-pos-v2/frontend/lib/services/owner-insights/storageService.ts)

Ini service simpan/baca AI insight ke Supabase.

Tugasnya:
- simpan recommendation per owner, category, local date, period key
- batasi generate 3 kali per hari per category/period
- menyimpan `insights_json`
- menyimpan `snapshot_json`
- tidak expire otomatis karena kita set `9999-12-31`

[owner_ai_recommendations.sql](/d:/iza-pos-v2/frontend/docs/supabase/owner_ai_recommendations.sql)

Ini SQL setup Supabase untuk tabel AI recommendation.

Tabel ini menyimpan:
- owner id
- category
- local date
- period key
- insights JSON
- snapshot JSON
- generation count
- generated time

Index uniknya:
`owner_id + category + local_date + period_key`

Jadi insight untuk Sales 7 days berbeda dari Sales 30 days.

**Helper**
[periodService.ts](/d:/iza-pos-v2/frontend/lib/services/owner-insights/periodService.ts)

Mengatur periode AI:
- normalize period
- selected period
- comparison period
- granularity:
  - today/yesterday pakai hour
  - range pendek pakai day
  - range panjang bisa week/month

[metricSnapshotBuilder.ts](/d:/iza-pos-v2/frontend/lib/services/owner-insights/metricSnapshotBuilder.ts)

Helper metric:
- `toNumber`
- `percentChange`
- `buildMetric`
- `average`

[recommendationSnapshotTypes.ts](/d:/iza-pos-v2/frontend/lib/services/owner-insights/recommendationSnapshotTypes.ts)

Definisi struktur snapshot AI:
- metrics
- charts
- tables
- allowedIssues
- dataQuality
- diagnostics

[insightSchema.ts](/d:/iza-pos-v2/frontend/lib/services/owner-insights/insightSchema.ts)

Definisi struktur hasil AI:
- `AIInsight`
- category yang valid
- sanitize output Gemini
- fallback data summary insight

[errorUtils.ts](/d:/iza-pos-v2/frontend/lib/services/owner-insights/errorUtils.ts)

Mengubah error teknis menjadi pesan yang lebih aman dan mudah dimengerti owner.

**Alur Generate AI Singkat**
Contoh owner di tab Inventory filter 30 days:

1. UI kirim:
   `category = inventory`
   `period = 2026-04-25 to 2026-05-24`

2. API panggil:
   `buildOwnerInsightSnapshot("inventory", period)`

3. `snapshotService` arahkan ke:
   `buildInventoryRecommendationSnapshot`

4. Builder ambil data Supabase server-side:
   `inventory_items`, `usage_transactions`, `usage_transaction_details`

5. Builder membuat:
   - metrics
   - charts
   - tables
   - allowedIssues

6. Prompt Gemini dibuat dari snapshot.

7. Gemini return JSON.

8. Guard memvalidasi:
   - id harus cocok `allowedIssues.id`
   - tidak boleh hallucinate
   - evidence harus nyata

9. Record disimpan ke Supabase.

10. AI card menampilkan recommendation.
