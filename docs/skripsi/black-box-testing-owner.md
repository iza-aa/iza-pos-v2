# Matriks Black-Box Testing Modul Owner

Dokumen ini adalah daftar kasus uji black-box untuk fitur Owner IZA POS. Unit uji
adalah perilaku yang terlihat melalui UI atau respons API, bukan fungsi internal.
Lokasi kode dicantumkan hanya sebagai traceability implementasi.

## Aturan Pengisian

- Isi `Hasil Aktual` setelah pengujian dilakukan.
- Isi `Status` dengan `Lulus` atau `Gagal`.
- Gunakan database pengujian dan catat ID data yang dibuat selama pengujian.
- Jalankan kasus negatif dengan data yang aman dan dapat dibersihkan.
- Simpan bukti screenshot untuk minimal satu kasus positif dan negatif per fitur.

## Prasyarat dan Data Uji

| Kode | Prasyarat |
|---|---|
| P-01 | Akun owner aktif dengan email dan password yang diketahui. |
| P-02 | Akun manager/staff aktif untuk pengujian penolakan hak akses. |
| P-03 | Tersedia order valid, cancelled, paid, dan unpaid pada dua periode berbeda. |
| P-04 | Tersedia produk, kategori, inventory, batch, usage, staff, shift, dan attendance. |
| P-05 | Tersedia reward, bundle, activity log, expense, ledger, exception, dan closing. |
| P-06 | Konfigurasi Supabase dan Gemini aktif; skenario kegagalan memakai environment uji. |
| P-07 | `INTERNAL_SESSION_SECRET` tersedia di environment deployment; fallback service-role hanya untuk kompatibilitas konfigurasi saat ini. |

## A. Autentikasi dan Hak Akses

Traceability: `owner/login/page.tsx`, `api/owner/login/route.ts`, `owner/layout.tsx`,
`components/shared/auth/RoleGuard.tsx`.

| ID | Skenario dan Input | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|
| OWN-AUTH-01 | Buka `/owner/login`. | Form email dan password owner tampil. |  |  |
| OWN-AUTH-02 | Login dengan email dan password owner valid. | Login berhasil, cookie session `HttpOnly` dibuat, metadata tampilan tersimpan, dan pengguna diarahkan ke dashboard owner. |  |  |
| OWN-AUTH-03 | Login dengan email terdaftar tetapi password salah. | Login ditolak dan pesan kredensial tidak valid tampil. |  |  |
| OWN-AUTH-04 | Login dengan email yang tidak terdaftar sebagai owner. | Login ditolak tanpa membuka data owner. |  |  |
| OWN-AUTH-05 | Kirim form dengan email kosong. | Validasi form mencegah request atau menampilkan bahwa email wajib diisi. |  |  |
| OWN-AUTH-06 | Kirim form dengan password kosong. | Validasi form mencegah login atau menampilkan bahwa password wajib diisi. |  |  |
| OWN-AUTH-07 | Gunakan format email tidak valid. | Browser/form menolak format email tersebut. |  |  |
| OWN-AUTH-08 | Buka route owner tanpa cookie session yang valid. | Pengguna dialihkan ke `/owner/login`. |  |  |
| OWN-AUTH-09 | Buka route owner dengan session role manager/staff. | Area Owner ditolak dan pengguna diarahkan ke `/owner/login`. |  |  |
| OWN-AUTH-10 | Logout dari menu profil. | Cookie session dan metadata autentikasi dihapus, preferensi non-auth tetap ada, lalu pengguna kembali ke login owner. |  |  |
| OWN-AUTH-11 | Ubah `user_role` di localStorage menjadi `owner` tanpa cookie valid. | Area Owner tetap ditolak karena localStorage bukan sumber autentikasi. |  |  |
| OWN-AUTH-12 | Panggil API Owner dengan header palsu `x-user-role: owner` tanpa cookie valid. | Middleware menolak dengan HTTP `401`. |  |  |
| OWN-AUTH-13 | Nonaktifkan akun Owner setelah login lalu buka route/API Owner. | Session ditolak, cookie dicabut, dan akses Owner tidak diberikan. |  |  |
| OWN-AUTH-14 | Login tanpa mencentang Remember me lalu periksa atribut cookie. | Cookie bersifat session cookie tanpa `Max-Age`; token tetap dibatasi maksimal delapan jam. |  |  |
| OWN-AUTH-15 | Login dengan Remember me lalu buka kembali browser sebelum tujuh hari. | Session tetap valid; setelah tujuh hari pengguna wajib login kembali. |  |  |

## B. Navigasi, Profil, Role Switch, dan Notifikasi

Traceability: `components/ui/Navigation/Navbar/index.tsx`,
`components/shared/profile/ProfileModal.tsx`, `ProfileSection.tsx`,
`components/shared/notifications/useOwnerNotifications.ts`.

| ID | Skenario dan Input | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|
| OWN-NAV-01 | Pilih Dashboard dari navbar. | Route berpindah ke `/owner/dashboard`. |  |  |
| OWN-NAV-02 | Pilih Staff Manager. | Route berpindah ke `/owner/staff-manager`. |  |  |
| OWN-NAV-03 | Pilih Bookkeeping. | Route berpindah ke `/owner/bookkeeping`. |  |  |
| OWN-NAV-04 | Pilih Activity Log. | Route berpindah ke `/owner/activitylog`. |  |  |
| OWN-NAV-05 | Gunakan role switch Owner ke tampilan Manager lalu kembali. | Menu berubah sesuai mode akses owner dan route tujuan dapat dibuka. |  |  |
| OWN-NAV-06 | Buka menu profil. | Nama, role, avatar, tombol profil, dan logout tampil. |  |  |
| OWN-PRO-01 | Buka halaman profil owner. | Data owner dari tabel staff tampil sesuai akun aktif. |  |  |
| OWN-PRO-02 | Ubah nama, email, dan telepon dengan data valid. | Data tersimpan dan navbar ikut memperbarui identitas. |  |  |
| OWN-PRO-03 | Simpan profil dengan nama kosong. | Penyimpanan ditolak dan pesan nama wajib diisi tampil. |  |  |
| OWN-PRO-04 | Unggah foto dengan format gambar yang didukung. | Gambar dikompresi, diunggah, dan avatar diperbarui. |  |  |
| OWN-PRO-05 | Unggah file bukan gambar. | Upload ditolak dengan pesan format tidak didukung. |  |  |
| OWN-NOT-01 | Buka modal notifikasi ketika ada sinyal owner. | Daftar notifikasi, tingkat urgensi, dan jumlah unread tampil. |  |  |
| OWN-NOT-02 | Tandai satu notifikasi sebagai dibaca. | Badge unread berkurang dan status baca bertahan setelah modal dibuka ulang. |  |  |
| OWN-NOT-03 | Tandai semua notifikasi sebagai dibaca. | Badge unread menjadi nol dan status tersimpan. |  |  |
| OWN-NOT-04 | Buka notifikasi yang mempunyai target aksi. | Pengguna diarahkan ke route atau tab yang relevan. |  |  |
| OWN-NOT-05 | Database notifikasi gagal dibaca. | UI tidak crash dan menampilkan keadaan gagal/kosong yang terkendali. |  |  |

## C. Dashboard Owner Umum

Traceability: `OwnerBusinessDashboard.tsx`, `tabs/DateRangeFilter.tsx`,
`tabs/shared/useOwnerDashboardData.ts`, dan dashboard masing-masing kategori.

| ID | Skenario dan Input | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|
| OWN-DSH-01 | Buka `/owner/dashboard` tanpa query tab. | Tab default Overview tampil. |  |  |
| OWN-DSH-02 | Pilih Overview, Sales, Customer, Inventory, Staff, dan Operations bergantian. | Tab aktif dan URL berubah, sedangkan isi sesuai tab yang dipilih. |  |  |
| OWN-DSH-03 | Buka URL dengan query tab yang tidak valid. | Sistem kembali ke tab default yang valid. |  |  |
| OWN-DSH-04 | Pilih preset rentang tanggal. | Semua metrik pada tab aktif diperbarui sesuai periode. |  |  |
| OWN-DSH-05 | Pilih custom start dan end date valid. | Data periode terpilih dan pembanding dihitung serta ditampilkan. |  |  |
| OWN-DSH-06 | Ubah salah satu tanggal sehingga start date melewati end date. | Filter menormalisasi keduanya menjadi tanggal yang baru dipilih sehingga rentang menjadi satu hari. |  |  |
| OWN-DSH-07 | Periode tidak mempunyai data. | Metrik menampilkan nol/kosong dan komponen tidak crash. |  |  |
| OWN-DSH-08 | Supabase gagal membaca salah satu sumber data. | Dashboard menampilkan error/partial state yang terkendali. |  |  |
| OWN-DSH-09 | Tekan export Excel pada setiap tab analytics. | Workbook sesuai tab dan periode berhasil diunduh. |  |  |
| OWN-DSH-10 | Data sedang dimuat lalu tombol export diperiksa. | Tombol export dinonaktifkan selama data belum siap. |  |  |

## D. Overview Analytics

Traceability: `tabs/overview/OverviewDashboard.tsx`, `overviewLogic.ts`,
`BusinessHealthSummary.tsx`.

| ID | Skenario dan Input | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|
| OWN-OVR-01 | Buka Overview pada periode yang memiliki order. | Revenue, total order, AOV, status order, dan payment mix tampil. |  |  |
| OWN-OVR-02 | Bandingkan angka kartu dengan data order valid. | Nilai kartu sesuai data pada periode terpilih. |  |  |
| OWN-OVR-03 | Terdapat order cancelled/unpaid. | Order tidak valid dipisahkan sesuai aturan metrik dan tidak dibaca sebagai penjualan valid. |  |  |
| OWN-OVR-04 | Buka business health summary. | Status/ringkasan kesehatan mengikuti indikator yang ditampilkan. |  |  |
| OWN-OVR-05 | Export Overview. | Workbook berisi ringkasan, tren, payment, dan data pendukung periode aktif. |  |  |

## E. Sales Analytics

Traceability: `tabs/sales/SalesDashboard.tsx`, `useSalesDashboardData.ts`,
`useBookkeepingSalesSummary.ts`, `salesLogic.ts`.

| ID | Skenario dan Input | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|
| OWN-SAL-01 | Buka Sales dengan transaksi valid. | Gross sales/revenue, discount, tax, COGS, profit, order, dan AOV tampil. |  |  |
| OWN-SAL-02 | Cek total order dan AOV. | Total hanya memakai order valid dan AOV sama dengan revenue dibagi total order. |  |  |
| OWN-SAL-03 | Terdapat order cancelled/refunded/unpaid. | Order tersebut tidak menaikkan penjualan valid. |  |  |
| OWN-SAL-04 | Terdapat recipe dan cost lengkap. | Food cost, gross profit, net profit estimate, dan menu margin tampil. |  |  |
| OWN-SAL-05 | Cost/recipe tidak lengkap. | Status data cost menunjukkan belum siap; sistem tidak mengarang margin. |  |  |
| OWN-SAL-06 | Beberapa menu terjual. | Top menu, quantity, revenue, kategori, dan profitability table sesuai transaksi. |  |  |
| OWN-SAL-07 | Ganti periode. | Tren, perbandingan, dan seluruh metrik Sales diperbarui. |  |  |
| OWN-SAL-08 | Export Sales. | Workbook memuat summary, menu performance, kategori, dan margin. |  |  |

## F. Customer Analytics

Traceability: `tabs/customer/CustomerPerformanceDashboard.tsx`,
`useCustomerPerformanceData.ts`, `customerLogic.ts`.

| ID | Skenario dan Input | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|
| OWN-CUS-01 | Buka Customer Performance. | Member, guest, repeat customer, reward usage, dan discount cost tampil. |  |  |
| OWN-CUS-02 | Terdapat order dengan customer dan tanpa customer. | Member dan guest terkelompok sesuai relasi order. |  |  |
| OWN-CUS-03 | Customer melakukan lebih dari satu transaksi. | Repeat customer/rate dihitung sesuai transaksi pada data. |  |  |
| OWN-CUS-04 | Terdapat redemption reward. | Penggunaan reward dan biaya diskon diperbarui. |  |  |
| OWN-CUS-05 | Periode tidak mempunyai customer teridentifikasi. | Nilai member/repeat menampilkan nol tanpa pembagian tidak valid. |  |  |
| OWN-CUS-06 | Export Customer Performance. | Workbook berisi metrik customer dan reward periode aktif. |  |  |

## G. Reward/Discount Management

Traceability: `tabs/customer/CustomerDiscountDashboard.tsx`, tabel `rewards`.

| ID | Skenario dan Input | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|
| OWN-RWD-01 | Buka Customer > Create Discount. | Form dan daftar reward/discount tampil. |  |  |
| OWN-RWD-02 | Buat percentage discount dengan data valid. | Record reward dibuat dan muncul pada daftar. |  |  |
| OWN-RWD-03 | Buat fixed discount dengan data valid. | Nilai fixed tersimpan sesuai input. |  |  |
| OWN-RWD-04 | Simpan tanpa nama. | Ditolak dengan pesan nama wajib diisi dan fokus menuju nama. |  |  |
| OWN-RWD-05 | Isi discount value `0` atau negatif. | Ditolak dengan pesan nilai harus lebih besar dari nol. |  |  |
| OWN-RWD-06 | Isi percentage discount lebih dari `100`. | Ditolak dengan pesan persentase terlalu tinggi. |  |  |
| OWN-RWD-07 | Isi points required, minimum order, max discount, valid days, dan usage limit. | Seluruh batas tersimpan dan tampil kembali ketika diedit. |  |  |
| OWN-RWD-08 | Isi start date dan end date. | Periode aktif reward tersimpan sesuai tanggal. |  |  |
| OWN-RWD-09 | Nonaktifkan reward. | Status `is_active` berubah dan ditampilkan sebagai tidak aktif. |  |  |
| OWN-RWD-10 | Edit reward lalu simpan. | Record yang sama diperbarui tanpa membuat duplikat. |  |  |
| OWN-RWD-11 | Batalkan proses edit/reset form. | Form kembali ke nilai awal dan mode edit berakhir. |  |  |
| OWN-RWD-12 | Hapus reward lalu pilih Cancel pada konfirmasi. | Reward tidak dihapus. |  |  |
| OWN-RWD-13 | Hapus reward lalu konfirmasi. | Reward terhapus dan daftar dimuat ulang. |  |  |
| OWN-RWD-14 | Database menolak create/update/delete. | Pesan error tampil dan UI tidak menyatakan berhasil. |  |  |

## H. Menu Bundle Fixed Price

Traceability: `tabs/customer/CustomerDiscountDashboard.tsx`, tabel
`menu_bundles` dan `menu_bundle_items`.

| ID | Skenario dan Input | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|
| OWN-BND-01 | Daftar bundle dibuka. | Bundle, item, harga normal, harga bundle, periode, dan status tampil. |  |  |
| OWN-BND-02 | Buat bundle dengan nama, minimal dua produk, quantity, dan harga valid. | Bundle dan detail item tersimpan. |  |  |
| OWN-BND-03 | Simpan bundle tanpa nama. | Ditolak dan fokus menuju field nama. |  |  |
| OWN-BND-04 | Pilih kurang dari dua produk. | Ditolak dengan pesan minimal item bundle. |  |  |
| OWN-BND-05 | Isi harga bundle `0` atau negatif. | Ditolak dengan pesan harga wajib valid. |  |  |
| OWN-BND-06 | Isi quantity produk `0`/desimal. | Sistem menormalisasi quantity menjadi bilangan bulat minimal satu. |  |  |
| OWN-BND-07 | Isi periode aktif, display order, dan status aktif. | Nilai tersimpan dan tampil saat diedit ulang. |  |  |
| OWN-BND-08 | Edit komposisi bundle. | Detail lama diganti dengan komposisi baru tanpa duplikasi item. |  |  |
| OWN-BND-09 | Batalkan/reset form bundle. | Form dan mode edit kembali ke awal. |  |  |
| OWN-BND-10 | Hapus bundle dan pilih Cancel. | Bundle tetap tersimpan. |  |  |
| OWN-BND-11 | Hapus bundle dan konfirmasi. | Bundle serta relasi item tidak lagi tampil. |  |  |
| OWN-BND-12 | Gagal menyimpan header atau item bundle. | Pesan error sesuai tahap tampil dan keberhasilan tidak ditampilkan. |  |  |

## I. Inventory Analytics

Traceability: `tabs/inventory/InventoryDashboard.tsx`.

| ID | Skenario dan Input | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|
| OWN-INV-01 | Buka Inventory Analytics. | Total SKU, critical items, restock cost, data issues, dan movement tampil. |  |  |
| OWN-INV-02 | Stok item berada di/bawah reorder level. | Item masuk daftar critical/low stock. |  |  |
| OWN-INV-03 | Inventory memiliki batch dan expiry. | Batch value dan expiry risk tampil sesuai tanggal dan quantity. |  |  |
| OWN-INV-04 | Terdapat usage transaction. | Usage trend dan most-used item mengikuti movement. |  |  |
| OWN-INV-05 | Klik baris stock movement. | Modal/detail movement menampilkan sumber dan perubahan stok. |  |  |
| OWN-INV-06 | Ada stock report pending. | Pending report/risk signal tampil. |  |  |
| OWN-INV-07 | Data cost/unit/reorder level tidak lengkap. | Data issue ditandai tanpa menghasilkan estimasi menyesatkan. |  |  |
| OWN-INV-08 | Export Inventory. | Workbook memuat stock alert, movement, usage, dan batch. |  |  |

## J. Staff Analytics

Traceability: `tabs/staff/StaffDashboard.tsx`.

| ID | Skenario dan Input | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|
| OWN-STA-01 | Buka Staff Analytics. | Active staff, clock-in, late, overtime, dan productivity tampil. |  |  |
| OWN-STA-02 | Staff tidak memiliki attendance pada periode. | Staff tidak salah dihitung sebagai hadir dan empty value aman. |  |  |
| OWN-STA-03 | Attendance berstatus late/overtime. | Counter dan detail staf terkait diperbarui. |  |  |
| OWN-STA-04 | Staff membuat atau melayani order. | Orders handled menghitung ID order unik yang terkait staff. |  |  |
| OWN-STA-05 | Buka detail performance radar. | Modal radar menampilkan dimensi dan nilai staff. |  |  |
| OWN-STA-06 | Export Staff Analytics. | Workbook berisi attendance dan performance periode aktif. |  |  |

## K. Operations Analytics

Traceability: `tabs/operations/OperationDashboard.tsx`.

| ID | Skenario dan Input | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|
| OWN-OPS-01 | Buka Operations. | Total, active, completion rate, order flow, density, dan service time tampil. |  |  |
| OWN-OPS-02 | Order berstatus new/on-process/partially-served/completed. | Order masuk tahap flow yang sesuai. |  |  |
| OWN-OPS-03 | Order mempunyai timestamp valid. | Durasi pelayanan dihitung dan masuk average/trend. |  |  |
| OWN-OPS-04 | Timestamp akhir sebelum awal atau selisih tidak wajar. | Sampel tidak merusak rata-rata service time. |  |  |
| OWN-OPS-05 | Terdapat unpaid order. | Sinyal unpaid/operational risk diperbarui. |  |  |
| OWN-OPS-06 | Ganti periode harian dan rentang panjang. | Granularitas grafik berubah sesuai periode. |  |  |
| OWN-OPS-07 | Export Operations. | Workbook memuat flow, density, service trend, dan outcome. |  |  |

## L. AI Insight Owner

Traceability: `business-dashboard/ai/*`, `api/owner/recommendations/*`, dan
`lib/services/owner-insights/*`.

| ID | Skenario dan Input | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|
| OWN-AI-01 | Buka kategori yang telah memiliki insight tersimpan untuk periode tersebut. | Insight tersimpan dimuat tanpa menekan Generate. |  |  |
| OWN-AI-02 | Generate insight Overview. | Insight berisi masalah, evidence, rekomendasi, dampak, priority, dan confidence. |  |  |
| OWN-AI-03 | Ulangi generate pada Sales, Customer, Inventory, Staff, Operations, dan Activity Log. | Snapshot dan rekomendasi sesuai kategori, bukan tercampur kategori lain. |  |  |
| OWN-AI-04 | Ganti date range lalu generate. | Record memakai period key baru dan evidence sesuai periode baru. |  |  |
| OWN-AI-05 | Generate dengan data yang memicu allowed issue. | ID dan evidence hasil sesuai allowed issue snapshot. |  |  |
| OWN-AI-06 | Gemini mengembalikan JSON valid. | Maksimal lima insight valid ditampilkan dan disimpan. |  |  |
| OWN-AI-07 | Integration black-box dengan test double: Gemini mengembalikan teks/JSON rusak. | Sistem mencoba JSON repair dan hanya menampilkan hasil yang valid. |  |  |
| OWN-AI-08 | Gemini gagal/quota/unavailable tetapi snapshot berhasil dibuat. | Deterministic fallback tampil dan dashboard tetap dapat digunakan. |  |  |
| OWN-AI-09 | Integration black-box dengan test double: Gemini menyebut issue ID yang tidak diizinkan. | Insight tersebut dibuang oleh guard. |  |  |
| OWN-AI-10 | Integration black-box dengan test double: Gemini menghasilkan evidence berbeda dari snapshot. | Evidence akhir ditambatkan kembali ke evidence allowed issue. |  |  |
| OWN-AI-11 | Integration black-box dengan test double: Gemini memakai today/yesterday untuk periode multi-hari. | Insight temporal yang tidak sesuai dibuang. |  |  |
| OWN-AI-12 | Tekan Generate sampai lebih dari tiga kali untuk kategori/periode/hari sama. | Generate berikutnya ditolak dengan pesan daily limit. |  |  |
| OWN-AI-13 | Action link insight ditekan. | Pengguna diarahkan hanya ke internal route yang diizinkan. |  |  |
| OWN-AI-14 | Request rekomendasi memakai role bukan owner. | API mengembalikan `403 Owner access required`. |  |  |

## M. Staff Manager Owner

Traceability: `owner/staff-manager/page.tsx`, `components/owner/staffmanager/*`,
`api/owner/staff-manager/weekly-shifts/route.ts`.

| ID | Skenario dan Input | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|
| OWN-SM-01 | Buka Staff Manager. | Daftar staff, status, role, type, shift, dan access state tampil. |  |  |
| OWN-SM-02 | Cari staff berdasarkan nama/email/role/status. | Daftar hanya menampilkan staff yang cocok. |  |  |
| OWN-SM-03 | Tambah staff operasional dengan data lengkap. | Staff dibuat dengan role, staff type, dan shift yang dipilih. |  |  |
| OWN-SM-04 | Tambah staff tanpa nama. | Form ditolak dengan pesan nama wajib. |  |  |
| OWN-SM-05 | Tambah staff operasional tanpa staff type. | Form ditolak. |  |  |
| OWN-SM-06 | Shift aktif tersedia tetapi shift tidak dipilih. | Form ditolak dengan pesan shift wajib. |  |  |
| OWN-SM-07 | Tambah manager tanpa email. | Form ditolak dengan pesan email wajib. |  |  |
| OWN-SM-08 | Tambah manager dengan password kurang dari enam karakter. | Form ditolak dengan pesan panjang minimum password. |  |  |
| OWN-SM-09 | Tambah staff dengan email/kode yang sudah digunakan. | Database menolak duplikasi dan pesan error tampil. |  |  |
| OWN-SM-10 | Edit nama, role, type, shift, dan status staff. | Record yang sama diperbarui dan daftar dimuat ulang. |  |  |
| OWN-SM-11 | Edit staff tanpa nama/type/shift wajib. | Penyimpanan ditolak sesuai field yang kosong. |  |  |
| OWN-SM-12 | Tambah weekly shift override. | Assignment mingguan tersimpan dan tampil saat dibuka kembali. |  |  |
| OWN-SM-13 | Hapus weekly shift override. | Assignment hari tersebut dihapus tanpa mengubah hari lain. |  |  |
| OWN-SM-14 | Generate/reset kode akses staff yang mendukung PIN. | Kode sementara dibuat dan masa berlaku tampil. |  |  |
| OWN-SM-15 | Gunakan kode akses pada login staff. | Kode dapat dipakai sesuai flow dan aturan masa berlaku. |  |  |
| OWN-SM-16 | Hapus staff yang masih mempunyai ketergantungan terlarang. | Penghapusan ditolak dengan pesan yang sesuai. |  |  |
| OWN-SM-17 | Pilih Cancel pada konfirmasi hapus. | Staff tetap tersimpan. |  |  |
| OWN-SM-18 | Konfirmasi penghapusan staff yang aman dihapus. | Staff dan log terkait yang ditangani flow terhapus, daftar diperbarui. |  |  |

## N. Attendance Monitoring dan Settings

Traceability: `components/owner/staffmanager/AttendanceSection.tsx`.

| ID | Skenario dan Input | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|
| OWN-ATT-01 | Buka Attendance > Monitor pada tanggal tertentu. | Attendance dan staff absent pada tanggal tersebut tampil. |  |  |
| OWN-ATT-02 | Pilih preset today/week/month/custom. | Rentang data attendance berubah sesuai pilihan. |  |  |
| OWN-ATT-03 | Attendance memiliki clock-in early/on-time/late. | Label status check-in tampil sesuai record. |  |  |
| OWN-ATT-04 | Attendance memiliki early leave/on-time/overtime. | Label status check-out tampil sesuai record. |  |  |
| OWN-ATT-05 | Staff aktif tidak mempunyai record pada satu hari. | Staff ditampilkan sebagai absent, bukan hilang dari monitoring. |  |  |
| OWN-ATT-06 | Buka Attendance Settings. | Store settings dan daftar shift aktif tampil. |  |  |
| OWN-ATT-07 | Simpan setting lokasi, radius, tolerance, dan aturan waktu valid. | Setting tersimpan dan tampil kembali setelah reload. |  |  |
| OWN-ATT-08 | Masukkan radius/tolerance tidak valid. | Penyimpanan ditolak atau nilai dinormalisasi sesuai aturan form. |  |  |
| OWN-ATT-09 | Buat shift dengan nama dan jam valid. | Shift baru tampil dalam daftar aktif. |  |  |
| OWN-ATT-10 | Edit nama/jam shift. | Perubahan tersimpan dan dipakai pada pilihan assignment. |  |  |
| OWN-ATT-11 | Nonaktifkan/hapus shift yang dapat diubah. | Shift tidak lagi tersedia sebagai pilihan aktif. |  |  |
| OWN-ATT-12 | Query salah satu tabel attendance gagal. | Pesan error tampil dan halaman tidak crash. |  |  |

## O. Activity Log dan Export

Traceability: `components/owner/activitylog/*`.

| ID | Skenario dan Input | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|
| OWN-LOG-01 | Buka Activity Log. | Statistik, pencarian, filter, daftar log, dan AI panel tampil. |  |  |
| OWN-LOG-02 | Cari berdasarkan user/resource/description/notes. | Hanya log yang cocok ditampilkan setelah debounce. |  |  |
| OWN-LOG-03 | Filter severity. | Hanya severity terpilih yang tampil. |  |  |
| OWN-LOG-04 | Filter category. | Hanya action category terpilih yang tampil. |  |  |
| OWN-LOG-05 | Filter role, action, dan user. | Query gabungan menghasilkan data yang sesuai seluruh filter. |  |  |
| OWN-LOG-06 | Ganti rentang tanggal. | Hanya log dalam batas awal 00:00 hingga akhir 23:59 tampil. |  |  |
| OWN-LOG-07 | Kombinasikan search, filter, dan date range. | Tabel, count, statistik, dan export memakai hasil yang konsisten. |  |  |
| OWN-LOG-08 | Reset seluruh filter. | Search/filter kosong dan daftar kembali ke kondisi default. |  |  |
| OWN-LOG-09 | Buka detail sebuah log. | Aktor, aksi, resource, waktu, changes, tag, dan notes tampil. |  |  |
| OWN-LOG-10 | Log order mempunyai usage detail. | Ringkasan perubahan inventory terkait order tampil jika tersedia. |  |  |
| OWN-LOG-11 | Data lebih dari satu halaman. | Pagination mengubah baris tanpa merusak filter/count. |  |  |
| OWN-LOG-12 | Export Excel pada hasil terfilter. | File Excel hanya berisi data yang sesuai filter aktif. |  |  |
| OWN-LOG-13 | Export PDF pada hasil terfilter. | PDF berisi total dan tabel data yang sesuai filter aktif. |  |  |
| OWN-LOG-14 | Tidak ada data yang cocok. | Empty state tampil dan halaman tidak error. |  |  |
| OWN-LOG-15 | Log critical baru masuk melalui realtime. | Data/statistik diperbarui dan notifikasi terkait dapat muncul. |  |  |

## P. Bookkeeping Overview dan Navigasi

Traceability: `components/owner/bookkeeping/OwnerBookkeeping.tsx`,
`api/owner/bookkeeping/overview/route.ts`.

| ID | Skenario dan Input | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|
| OWN-BK-01 | Buka `/owner/bookkeeping`. | Tab default Closings dan data tanggal aktif tampil. |  |  |
| OWN-BK-02 | Pilih Closings, Ledger, Cost & Margin, Expenses, Exceptions. | Isi dan query tab berubah sesuai pilihan. |  |  |
| OWN-BK-03 | Buka query tab tidak valid/reports/settings lama. | Route dinormalisasi ke tab final yang didukung. |  |  |
| OWN-BK-04 | Pilih Today, Yesterday, atau tanggal lain. | Seluruh data bookkeeping diperbarui sesuai business date. |  |  |
| OWN-BK-05 | Overview API dipanggil tanpa role owner. | API mengembalikan `403`. |  |  |
| OWN-BK-06 | Sumber data kosong. | Kartu/tabel menampilkan nol atau empty state tanpa crash. |  |  |

## Q. Bookkeeping Closings

Traceability: `tabs/ClosingsTab.tsx`, API `closings/daily/*` dan `closings/shift/*`.

| ID | Skenario dan Input | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|
| OWN-CLS-01 | Buka tanggal dengan shift closing. | Net sales, expected cash, counted cash, difference, dan status tampil. |  |  |
| OWN-CLS-02 | Ada shift yang belum cash count/review. | Approve Daily dinonaktifkan dan status menunggu/review tampil. |  |  |
| OWN-CLS-03 | Semua shift selesai dan approved. | Approve Daily aktif. |  |  |
| OWN-CLS-04 | Approve Daily. | Daily closing dibuat/ditutup dan status menjadi closed. |  |  |
| OWN-CLS-05 | Approve Daily dua kali. | Sistem mencegah duplikasi closing atau mengembalikan hasil idempoten. |  |  |
| OWN-CLS-06 | Reopen daily closing. | Status berubah menjadi reopened dan audit reason tersimpan. |  |  |
| OWN-CLS-07 | Reopen closing yang tidak valid/tidak ditemukan. | Request ditolak dengan pesan yang jelas. |  |  |
| OWN-CLS-08 | Export daily closing workbook. | Workbook memuat shift, sales, expense, exception, dan closing terkait. |  |  |
| OWN-CLS-09 | API close/reopen dipanggil role non-owner. | API mengembalikan `403`. |  |  |

## R. Auto Ledger dan Manual Adjustment

Traceability: `tabs/AutoLedgerTab.tsx`, `api/owner/bookkeeping/ledger/*`.

| ID | Skenario dan Input | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|
| OWN-LED-01 | Buka Auto Ledger dengan transaksi tersedia. | Entry dari sales, COGS/usage, expense, dan closing tampil sesuai sumber. |  |  |
| OWN-LED-02 | Terdapat beberapa entry dari sumber yang sama. | Group/status ledger tampil konsisten dan tidak menggandakan entry yang didedup. |  |  |
| OWN-LED-03 | Buat adjustment `in` dengan data valid. | Entry posted bertambah dengan arah masuk dan audit note. |  |  |
| OWN-LED-04 | Buat adjustment `out` dengan data valid. | Entry posted bertambah dengan arah keluar. |  |  |
| OWN-LED-05 | Buat adjustment `neutral` dengan data valid. | Entry koreksi/review tersimpan tanpa arah kas masuk/keluar. |  |  |
| OWN-LED-06 | Tanggal adjustment kosong/tidak valid. | Request ditolak. |  |  |
| OWN-LED-07 | Category kosong atau amount `0`/negatif. | Request ditolak. |  |  |
| OWN-LED-08 | Direction bukan `in`, `out`, atau `neutral`. | Request ditolak. |  |  |
| OWN-LED-09 | Note kosong. | Ditolak karena alasan adjustment wajib untuk audit trail. |  |  |
| OWN-LED-10 | Generate ledger untuk periode valid melalui API. | Ledger tergenerasi dan respons sukses tanpa duplikasi tidak sah. |  |  |

## S. Cost and Margin

Traceability: `tabs/CostMarginTab.tsx`, `lib/services/bookkeeping/*`.

| ID | Skenario dan Input | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|
| OWN-MRG-01 | Produk mempunyai recipe dan unit cost lengkap. | Revenue, estimated COGS, gross profit, dan margin tampil. |  |  |
| OWN-MRG-02 | Produk tidak mempunyai recipe/cost lengkap. | Status cost data needed tampil dan margin tidak diklaim siap. |  |  |
| OWN-MRG-03 | Quantity/revenue berubah pada tanggal lain. | Tabel margin mengikuti business date aktif. |  |  |
| OWN-MRG-04 | Tidak ada penjualan. | Empty state/angka nol tampil tanpa NaN atau Infinity. |  |  |

## T. Expense dan Financial Settings

Traceability: `tabs/ExpensesTab.tsx`, `tabs/SettingsTab.tsx`, API
`expenses/*`, `settings/route.ts`, `expenses/receipt/route.ts`.

| ID | Skenario dan Input | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|
| OWN-EXP-01 | Buat expense dengan date, category, dan amount positif. | Expense tersimpan dan total expense diperbarui. |  |  |
| OWN-EXP-02 | Category kosong. | Form fokus ke category dan penyimpanan tidak dilakukan. |  |  |
| OWN-EXP-03 | Amount kosong, nol, negatif, atau bukan angka. | Form/API menolak expense. |  |  |
| OWN-EXP-04 | Isi payment method, vendor, receipt URL, dan note. | Field opsional tersimpan dan tampil kembali. |  |  |
| OWN-EXP-05 | Edit expense. | Record yang sama diperbarui. |  |  |
| OWN-EXP-06 | Hapus expense. | Expense hilang dan summary dimuat ulang. |  |  |
| OWN-EXP-07 | Expense date tidak valid melalui API. | API mengembalikan `400`. |  |  |
| OWN-EXP-08 | Upload receipt gambar valid melalui endpoint receipt. | File tersimpan dan URL dikembalikan. |  |  |
| OWN-EXP-09 | Upload receipt dengan tipe/ukuran tidak valid. | Upload ditolak dengan pesan validasi. |  |  |
| OWN-SET-01 | Buka Financial Settings. | Tax, service charge, label, dan metadata update tampil. |  |  |
| OWN-SET-02 | Aktifkan tax dan service charge dengan rate 0-100. | Setting tersimpan dan preview dihitung sesuai rate. |  |  |
| OWN-SET-03 | Isi tax/service rate kurang dari 0 atau lebih dari 100. | Penyimpanan ditolak. |  |  |
| OWN-SET-04 | Kosongkan tax label. | Penyimpanan ditolak. |  |  |
| OWN-SET-05 | Batalkan modal edit settings. | Nilai tersimpan tidak berubah. |  |  |

## U. Bookkeeping Exceptions dan Reports API

Traceability: `tabs/ExceptionsTab.tsx`, API `exceptions/update`,
`reports/generate`, dan `reports/export/pdf`.

| ID | Skenario dan Input | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|
| OWN-EXC-01 | Buka Exceptions dengan data open/waiting review. | Daftar exception dan status review tampil. |  |  |
| OWN-EXC-02 | Exception sudah direview. | Reviewer dan waktu review tampil. |  |  |
| OWN-EXC-03 | Update exception dengan keputusan valid melalui API/UI yang tersedia. | Review status, reviewer, dan timestamp tersimpan. |  |  |
| OWN-EXC-04 | Update exception tanpa owner access atau payload valid. | API menolak request. |  |  |
| OWN-RPT-01 | Generate report untuk periode valid melalui API. | Report tersimpan dan metadata report dikembalikan. |  |  |
| OWN-RPT-02 | Generate report dengan periode/payload tidak valid. | API mengembalikan validasi error. |  |  |
| OWN-RPT-03 | Export PDF report valid melalui API. | Respons PDF berhasil dan isi sesuai report. |  |  |
| OWN-RPT-04 | Export report tidak ditemukan atau tanpa owner access. | Request ditolak dengan status yang sesuai. |  |  |

Catatan: kasus `OWN-RPT-*`, receipt upload, ledger generate, dan exception update
harus diberi label **API black-box** apabila kontrol UI final memang belum tersedia.
Jangan menyatakan fitur UI telah diuji hanya karena endpoint backend ada.

## V. Ringkasan Coverage

| Kelompok | Jumlah Kasus |
|---|---:|
| Autentikasi dan akses | 15 |
| Navigasi, profil, notifikasi | 16 |
| Dashboard umum dan analytics | 50 |
| Reward dan menu bundle | 26 |
| AI Insight | 14 |
| Staff manager dan attendance | 30 |
| Activity Log | 15 |
| Bookkeeping dan report API | 51 |
| **Total** | **217** |

Jumlah pada ringkasan adalah target audit lengkap. Untuk tabel inti BAB IV, pilih
kasus representatif per fitur dan pindahkan matriks penuh ke lampiran agar naskah
utama tidak terlalu panjang.

## W. Temuan Scope yang Harus Diverifikasi Sebelum Pengujian

1. Route `/owner/rewards-analytics` hanya mengarahkan ke tab Customer; uji sebagai
   compatibility redirect, bukan halaman analitik terpisah.
2. Endpoint report generation/export tersedia, tetapi kontrol UI final harus
   diverifikasi sebelum diklaim sebagai fitur UI.
3. Expense UI saat ini menerima receipt URL; endpoint upload receipt harus diuji
   sebagai API apabila tidak ada file picker yang menggunakannya.
4. AI daily limit diterapkan per owner, kategori, tanggal lokal, dan period key.
5. Owner notification adalah notifikasi dalam aplikasi, bukan mobile push notification.
6. Menu bundle adalah bundle menu fixed price, bukan reward bundling berbasis poin.
7. Customer table session adalah fitur aktor Customer dan diuji pada dokumen
   `black-box-testing-customer-table-session.md`, bukan dicampur ke matriks Owner.
8. Middleware sekarang mengamankan route dan API Next.js Owner. Kebijakan RLS
   Supabase tetap wajib diaudit karena beberapa modul lama membaca/menulis tabel
   langsung melalui anon client; policy database tidak tersedia di repository ini.
